import { converse } from "./aws/bedrock";
import { CONTROLS, FRAMEWORK_LABEL, toFinding } from "./frameworks";
import { createId } from "./ids";
import { retrieve } from "./rag";
import { fetchRegulationFeed } from "./regulations";
import { addReport, getOrg, listDocuments } from "./store";
import type {
  ChatEvent,
  FrameworkId,
  GapFinding,
  Report,
  RetrievedChunk,
  RoadmapItem,
} from "./types";

const AUDIT_RE =
  /\b(report|audit|gap|implement|roadmap|readiness|soc\s*2|pci|gdpr|nist|keep up|what to do)\b/i;

export async function* runCopilot(input: {
  messages: { role: "user" | "assistant"; content: string }[];
  mode?: "chat" | "analyze" | "report";
}): AsyncGenerator<ChatEvent> {
  const last = [...input.messages].reverse().find((m) => m.role === "user");
  if (!last?.content.trim()) {
    yield { type: "error", message: "Empty message." };
    yield { type: "done" };
    return;
  }

  const query = last.content.trim();
  const wantReport =
    input.mode === "report" ||
    input.mode === "analyze" ||
    AUDIT_RE.test(query);

  yield { type: "status", step: "Retrieving policies, evidence, and regs", agent: "scout" };
  const [org, docs, retrieved, feed] = await Promise.all([
    getOrg(),
    listDocuments(),
    retrieve(query, 8),
    fetchRegulationFeed().catch(() => []),
  ]);

  yield {
    type: "citations",
    citations: retrieved.map((r) => ({
      title: r.chunk.metadata.title,
      kind: r.chunk.metadata.kind,
    })),
  };

  yield {
    type: "status",
    step: "Scout: mapping obligations against the org",
    agent: "scout",
  };

  const scoutNotes = await runScout({
    query,
    orgName: org.name,
    orgNotes: `${org.industry}. Frameworks: ${org.frameworks.map((f) => FRAMEWORK_LABEL[f]).join(", ")}. ${org.notes}`,
    retrieved,
    recentRegs: feed.slice(0, 5).map((r) => `${r.publishedAt} — ${r.agency}: ${r.title}`),
  });

  if (!wantReport) {
    yield { type: "delta", text: scoutNotes };
    yield { type: "done" };
    return;
  }

  yield {
    type: "status",
    step: "Auditor: scoring gaps and drafting the memo",
    agent: "auditor",
  };

  const frameworks = inferFrameworks(query, org.frameworks);
  const orgCorpus = docs
    .filter((d) => d.kind !== "regulation")
    .map((d) => d.text);
  const report = await runAuditor({
    query,
    orgName: org.name,
    orgNotes: org.notes,
    frameworks,
    orgCorpus,
    scoutNotes,
    docTitles: docs
      .filter((d) => d.kind !== "regulation")
      .map((d) => d.title),
  });
  await addReport(report);

  yield { type: "delta", text: report.markdown };
  yield { type: "report", report };
  yield { type: "done" };
}

async function runScout(input: {
  query: string;
  orgName: string;
  orgNotes: string;
  retrieved: RetrievedChunk[];
  recentRegs: string[];
}) {
  const context = input.retrieved
    .map(
      (r, i) =>
        `[${i + 1}] ${r.chunk.metadata.title} (${r.chunk.metadata.kind})\n${r.chunk.text}`,
    )
    .join("\n\n");

  const llm = await converse({
    system:
      "You are Scout, a regulation analyst for a governance copilot. Be concrete. Cite retrieved document titles. Do not claim this is a legal opinion. If context is thin, say what is missing.",
    user: `Org: ${input.orgName}\n${input.orgNotes}\n\nRecent federal items:\n${input.recentRegs.join("\n") || "(none)"}\n\nRetrieved context:\n${context || "(none)"}\n\nUser question:\n${input.query}`,
  });

  if (llm) return llm;

  const bullets = input.retrieved.slice(0, 4).map((r) => {
    const snippet = r.chunk.text.replace(/\s+/g, " ").slice(0, 220);
    return `- **${r.chunk.metadata.title}** — ${snippet}`;
  });

  const regs = input.recentRegs.slice(0, 3).map((r) => `- ${r}`);

  return [
    `**Scout** reviewed ${input.orgName} against your question.`,
    "",
    input.recentRegs.length
      ? `New / recent government items on the radar:\n${regs.join("\n")}`
      : "No live Federal Register items loaded (offline fallback).",
    "",
    bullets.length
      ? `What we already have on file:\n${bullets.join("\n")}`
      : "No matching org documents yet. Upload policies or a regulation to ground this.",
    "",
    "Ask me to **run a gap report** (SOC 2, PCI DSS, or GDPR) and Auditor will score controls, list gaps, and give a 30/60/90-day plan. This is an internal readiness memo, not an attestation.",
  ].join("\n");
}

async function runAuditor(input: {
  query: string;
  orgName: string;
  orgNotes: string;
  frameworks: FrameworkId[];
  orgCorpus: string[];
  scoutNotes: string;
  docTitles: string[];
}): Promise<Report> {
  const corpus = [input.orgNotes, ...input.orgCorpus].join("\n");
  const snippets = input.orgCorpus.map((t) => t.replace(/\s+/g, " "));
  const findings = CONTROLS.filter((c) =>
    input.frameworks.includes(c.framework),
  ).map((c) => toFinding(c, corpus, snippets));

  const covered = findings.filter((f) => f.status === "covered").length;
  const coveragePct = findings.length
    ? Math.round((covered / findings.length) * 100)
    : 0;
  const roadmap = buildRoadmap(findings);
  const title = `${input.frameworks.map((f) => FRAMEWORK_LABEL[f]).join(" / ")} readiness memo`;

  const structured = renderReport({
    title,
    orgName: input.orgName,
    orgNotes: input.orgNotes,
    query: input.query,
    coveragePct,
    findings,
    roadmap,
    docTitles: input.docTitles,
  });

  const narrative = await converse({
    system:
      "You are Auditor. Rewrite the readiness memo in clear English. Keep every finding. Do not invent evidence. Label this as an internal memo, not a SOC/PCI attestation. Use markdown.",
    user: `${structured}\n\nScout notes (use for context, do not treat as org evidence):\n${input.scoutNotes}`,
    maxTokens: 1800,
  });

  return {
    id: createId("rpt"),
    title,
    frameworks: input.frameworks,
    summary: summarize(findings, coveragePct),
    coveragePct,
    findings,
    roadmap,
    markdown: narrative || structured,
    createdAt: new Date().toISOString(),
  };
}

export async function generateStandaloneReport(frameworks: FrameworkId[]) {
  const events: ChatEvent[] = [];
  for await (const event of runCopilot({
    mode: "report",
    messages: [
      {
        role: "user",
        content: `Produce an audit-style readiness report for ${frameworks.map((f) => FRAMEWORK_LABEL[f]).join(" and ")}. Include gaps, what we already cover, and a 30/60/90 plan to keep up with current requirements.`,
      },
    ],
  })) {
    events.push(event);
    if (event.type === "report") return event.report;
  }
  const fallback = events.find((e) => e.type === "delta");
  throw new Error(
    fallback && fallback.type === "delta"
      ? "Report text produced but not saved."
      : "Could not generate report.",
  );
}

function inferFrameworks(query: string, org: FrameworkId[]): FrameworkId[] {
  const hit: FrameworkId[] = [];
  if (/\bsoc\b/i.test(query)) hit.push("soc2");
  if (/\bpci\b/i.test(query)) hit.push("pci-dss");
  if (/\bgdpr|privacy\b/i.test(query)) hit.push("gdpr");
  if (/\bnist\b/i.test(query)) hit.push("nist-csf");
  const unique = [...new Set(hit.length ? hit : org)];
  return unique.length ? unique : ["soc2"];
}

function buildRoadmap(findings: GapFinding[]): RoadmapItem[] {
  const missing = findings.filter((f) => f.status === "missing");
  const partial = findings.filter((f) => f.status === "partial");
  const items: RoadmapItem[] = [];
  const take = (window: RoadmapItem["window"], list: GapFinding[]) => {
    for (const f of list.slice(0, 3)) {
      items.push({
        window,
        title: f.title,
        detail: f.action,
        controlIds: [f.controlId],
      });
    }
  };
  take("0-30 days", missing);
  take("30-60 days", partial);
  take(
    "60-90 days",
    findings.filter((f) => f.status === "covered"),
  );
  if (items.length === 0) {
    items.push({
      window: "0-30 days",
      title: "Keep the evidence pack current",
      detail: "Re-upload policies after each material change and re-run this memo.",
      controlIds: [],
    });
  }
  return items;
}

function summarize(findings: GapFinding[], pct: number) {
  const missing = findings.filter((f) => f.status === "missing").length;
  const partial = findings.filter((f) => f.status === "partial").length;
  return `${pct}% of scored controls look covered. ${missing} missing, ${partial} partial. Internal memo only — not an attestation.`;
}

function renderReport(input: {
  title: string;
  orgName: string;
  orgNotes: string;
  query: string;
  coveragePct: number;
  findings: GapFinding[];
  roadmap: RoadmapItem[];
  docTitles: string[];
}) {
  const lines = [
    `# ${input.title}`,
    "",
    `**Organization:** ${input.orgName}`,
    `**Asked:** ${input.query}`,
    `**Coverage (heuristic):** ${input.coveragePct}% of scored controls have supporting language on file.`,
    "",
    "> This is an internal readiness memo. It is not a SOC 2 attestation, PCI ROC, or legal advice.",
    "",
    "## Org snapshot",
    input.orgNotes,
    "",
    "## Sources on file",
    input.docTitles.map((t) => `- ${t}`).join("\n") || "- None",
    "",
    "## Findings",
  ];

  for (const f of input.findings) {
    lines.push(
      `### ${FRAMEWORK_LABEL[f.framework]} — ${f.title} (${f.status})`,
      f.requirement,
      `Evidence: ${f.evidence}`,
      `Do next: ${f.action}`,
      "",
    );
  }

  lines.push("## 30 / 60 / 90 days");
  for (const item of input.roadmap) {
    lines.push(`- **${item.window} — ${item.title}:** ${item.detail}`);
  }
  lines.push(
    "",
    "## How to keep up",
    "- Watch the Regulations feed weekly (FTC, CFPB, SEC, HHS).",
    "- Ingest each new rule into Aegis and re-run this memo.",
    "- Treat missing controls as tickets, not a once-a-year project.",
  );
  return lines.join("\n");
}
