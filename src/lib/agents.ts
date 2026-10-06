import { completeChat } from "./llm/openai";
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
  /\b(report|audit|gap|implement|roadmap|readiness|soc\s*2|pci|gdpr|nist|keep up|what to do|cms|medicare|part d|manufacturer discount|j&j|jnj)\b/i;

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
    retrieve(query, 10),
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
  const policyDocuments = docs.filter((d) => d.kind !== "regulation");
  const report = await runAuditor({
    query,
    orgName: org.name,
    orgNotes: org.notes,
    frameworks,
    orgCorpus,
    scoutNotes,
    policyDocuments,
    docTitles: policyDocuments.map((d) => d.title),
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
    .map((r, i) => {
      const bucket =
        r.chunk.metadata.kind === "regulation" ? "REGULATION" : "POLICY";
      return `[${i + 1}] ${bucket} — ${r.chunk.metadata.title} (${r.chunk.metadata.kind})\n${r.chunk.text}`;
    })
    .join("\n\n");

  const llm = await completeChat({
    system:
      "You are Scout, a regulation analyst for a governance copilot. Retrieved passages are labeled POLICY (company) or REGULATION (government). Never treat a REGULATION as proof the company already complies. Cite document titles. Not a legal opinion. If context is thin, say what is missing.",
    user: `Org: ${input.orgName}\n${input.orgNotes}\n\nRecent federal items:\n${input.recentRegs.join("\n") || "(none)"}\n\nRetrieved context:\n${context || "(none)"}\n\nUser question:\n${input.query}`,
  });

  if (llm) return llm;

  const bullets = input.retrieved.slice(0, 6).map((r) => {
    const bucket =
      r.chunk.metadata.kind === "regulation" ? "Regulation" : "Policy";
    const snippet = r.chunk.text.replace(/\s+/g, " ").slice(0, 220);
    return `- **[${bucket}] ${r.chunk.metadata.title}** — ${snippet}`;
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
    "Ask me to **run a gap report** (CMS MA/Part D, SOC 2) and Auditor will score controls, list gaps, and give a 30/60/90-day plan. This is an internal readiness memo, not an attestation or CMS filing.",
  ].join("\n");
}

async function runAuditor(input: {
  query: string;
  orgName: string;
  orgNotes: string;
  frameworks: FrameworkId[];
  orgCorpus: string[];
  scoutNotes: string;
  policyDocuments: { title: string; text: string }[];
  docTitles: string[];
}): Promise<Report> {
  const corpus = [input.orgNotes, ...input.orgCorpus].join("\n");
  const snippets = input.orgCorpus.map((t) => t.replace(/\s+/g, " "));
  const findings = CONTROLS.filter((c) =>
    input.frameworks.includes(c.framework),
  ).map((c) => {
    const base = toFinding(c, corpus, snippets);
    const policyRefs = inferPolicyRefs(c, input.policyDocuments);
    const status: "open" | "done" =
      base.status === "covered" ? "done" : "open";
    return {
      ...base,
      policyRefs,
      updateText:
        base.status === "covered"
          ? `No change required for ${c.title}; keep evidence current.`
          : `${c.action} Update the relevant policy text in ${policyRefs.join(", ")}.`,
      owner: pickOwner(c.framework),
      dueDate: fmtDueDate(
        base.status === "covered" ? 14 : base.status === "partial" ? 30 : 45,
      ),
      remediationStatus: status,
    };
  });

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

  const narrative = await completeChat({
    system:
      "You are Auditor. Rewrite the readiness memo in clear English. Keep every finding. Do not invent evidence. Label this as an internal memo, not a CMS filing, SOC attestation, or legal opinion. Use markdown. For Johnson & Johnson, treat the org as a manufacturer / plan partner, not an MA organization, unless the org notes say otherwise.",
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
  if (/\bcms|medicare|part d|manufacturer discount|ssbci|star ratings\b/i.test(query))
    hit.push("cms-ma-pd");
  if (/\bsoc\b/i.test(query)) hit.push("soc2");
  if (/\bpci\b/i.test(query)) hit.push("pci-dss");
  if (/\bgdpr|privacy\b/i.test(query)) hit.push("gdpr");
  if (/\bnist\b/i.test(query)) hit.push("nist-csf");
  const unique = [...new Set(hit.length ? hit : org)];
  return unique.length ? unique : ["cms-ma-pd"];
}

function inferPolicyRefs(
  control: { title: string; requirement: string; keywords: string[] },
  documents: { title: string; text: string }[],
): string[] {
  const phrases = [control.title, control.requirement, ...control.keywords];
  const matches = documents
    .filter((doc) => {
      const text = `${doc.title} ${doc.text}`.toLowerCase();
      return phrases.some((phrase) => {
        const q = phrase.toLowerCase();
        return q.length > 4 && text.includes(q);
      });
    })
    .map((doc) => doc.title);

  if (matches.length) return [...new Set(matches)].slice(0, 3);

  const fallback = control.keywords
    .map((keyword) => keyword.toLowerCase())
    .filter((keyword) => keyword.length > 3);
  if (fallback.length === 0) return ["Policy review"];
  return [`${fallback[0]} policy review`];
}

function pickOwner(framework: FrameworkId) {
  const owners: Record<FrameworkId, string> = {
    soc2: "Security Governance Lead",
    "pci-dss": "Security Operations Lead",
    gdpr: "Privacy Program Manager",
    "nist-csf": "Risk & Controls Manager",
    "cms-ma-pd": "Market Access & Finance Lead",
  };
  return owners[framework] ?? "Compliance Lead";
}

function fmtDueDate(offsetDays: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
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
        detail: f.updateText ?? f.action,
        controlIds: [f.controlId],
        policyRefs: f.policyRefs ?? ["Policy review"],
        owner: f.owner ?? pickOwner(f.framework),
        dueDate: f.dueDate ?? fmtDueDate(30),
        status: f.remediationStatus ?? (f.status === "covered" ? "done" : "open"),
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
      policyRefs: ["Policy review"],
      owner: "Compliance Lead",
      dueDate: fmtDueDate(15),
      status: "open",
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
    "> This is an internal readiness memo. It is not a CMS filing, SOC 2 attestation, PCI ROC, or legal advice.",
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
      `Policy target: ${(f.policyRefs ?? ["Policy review"]).join(", ")}`,
      `Required change: ${f.updateText ?? f.action}`,
      `Owner: ${f.owner ?? pickOwner(f.framework)}`,
      `Due: ${f.dueDate ?? fmtDueDate(30)}`,
      `Status: ${f.remediationStatus ?? (f.status === "covered" ? "done" : "open")}`,
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
