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
  PolicyChange,
  Report,
  RetrievedChunk,
  RoadmapItem,
  StoredDocument,
} from "./types";

const AUDIT_RE =
  /\b(report|audit|gap|implement|roadmap|readiness|soc\s*2|pci|gdpr|nist|keep up|what to do|cms|medicare|part d|manufacturer discount|j&j|jnj)\b/i;

export async function* runCopilot(input: {
  messages: { role: "user" | "assistant"; content: string }[];
  mode?: "chat" | "analyze" | "report";
  regulationTitle?: string;
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
  const report = await runAuditor({
    query,
    orgName: org.name,
    orgNotes: org.notes,
    frameworks,
    orgCorpus,
    scoutNotes,
    retrieved,
    regulationTitle: input.regulationTitle,
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
  retrieved: RetrievedChunk[];
  docTitles: string[];
  regulationTitle?: string;
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
  const title = input.regulationTitle
    ? `What to change — ${input.regulationTitle}`
    : `${input.frameworks.map((f) => FRAMEWORK_LABEL[f]).join(" / ")} readiness memo`;

  const changes = await draftPolicyChanges({
    orgName: input.orgName,
    retrieved: input.retrieved,
    scoutNotes: input.scoutNotes,
    query: input.query,
    docTitles: input.docTitles,
  });

  const structured = renderReport({
    title,
    orgName: input.orgName,
    orgNotes: input.orgNotes,
    query: input.query,
    coveragePct,
    findings,
    changes,
    roadmap,
    docTitles: input.docTitles,
    regulationTitle: input.regulationTitle,
  });

  const narrative = await completeChat({
    system:
      "You are Auditor. Rewrite the readiness memo in clear English. Keep every finding and every policy change. Do not invent evidence. Label this as an internal memo, not a CMS filing, SOC attestation, or legal opinion. Use markdown. For Johnson & Johnson, treat the org as a manufacturer / plan partner, not an MA organization, unless the org notes say otherwise.",
    user: `${structured}\n\nScout notes (use for context, do not treat as org evidence):\n${input.scoutNotes}`,
    maxTokens: 1800,
  });

  return {
    id: createId("rpt"),
    title,
    frameworks: input.frameworks,
    regulationTitle: input.regulationTitle,
    summary: summarize(findings, coveragePct, changes.length),
    coveragePct,
    findings,
    changes,
    roadmap,
    markdown: narrative || structured,
    createdAt: new Date().toISOString(),
  };
}

async function draftPolicyChanges(input: {
  orgName: string;
  retrieved: RetrievedChunk[];
  scoutNotes: string;
  query: string;
  docTitles: string[];
}): Promise<PolicyChange[]> {
  const policies = input.retrieved.filter(
    (r) => r.chunk.metadata.kind !== "regulation",
  );
  const regs = input.retrieved.filter(
    (r) => r.chunk.metadata.kind === "regulation",
  );
  if (policies.length === 0 && input.docTitles.length === 0) return [];

  const policyBlock = policies
    .slice(0, 6)
    .map(
      (r) =>
        `POLICY “${r.chunk.metadata.title}”:\n${r.chunk.text.slice(0, 900)}`,
    )
    .join("\n\n");
  const regBlock = regs
    .slice(0, 4)
    .map(
      (r) =>
        `REGULATION “${r.chunk.metadata.title}”:\n${r.chunk.text.slice(0, 900)}`,
    )
    .join("\n\n");

  const raw = await completeChat({
    system:
      'Return ONLY a JSON array of objects with keys policyTitle, issue, action. Each item is one concrete edit to a named internal policy already on file. Never treat regulation text as proof of compliance. If unsure, still propose the most likely SOP edits. No markdown.',
    user: `Org: ${input.orgName}\nInternal policies on file: ${input.docTitles.join("; ") || "(none)"}\nQuestion: ${input.query}\n\n${regBlock || "(no regulation passages)"}\n\n${policyBlock || "(no retrieved policy passages)"}\n\nScout:\n${input.scoutNotes.slice(0, 1500)}`,
    maxTokens: 900,
  });
  const fallback = () =>
    policies.length > 0
      ? fallbackChanges(policies)
      : input.docTitles.slice(0, 3).map((title) => ({
          policyTitle: title,
          issue:
            "This SOP is on file but may not match the new rule language we retrieved.",
          action: `Have the owner of “${title}” compare it to the new regulation and update stale coverage-gap, cost-sharing, or marketing language.`,
        }));
  if (!raw) return fallback();
  try {
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    const parsed = JSON.parse(
      start >= 0 && end > start ? raw.slice(start, end + 1) : raw,
    ) as PolicyChange[];
    const rows = parsed
      .filter((row) => row.policyTitle && row.action)
      .slice(0, 8)
      .map((row) => ({
        policyTitle: String(row.policyTitle).slice(0, 200),
        issue: String(row.issue || "").slice(0, 400),
        action: String(row.action).slice(0, 400),
      }));
    return rows.length > 0 ? rows : fallback();
  } catch {
    return fallback();
  }
}

function fallbackChanges(policies: RetrievedChunk[]): PolicyChange[] {
  return policies.slice(0, 3).map((r) => ({
    policyTitle: r.chunk.metadata.title,
    issue: "This internal document may not match the new rule language we retrieved.",
    action: `Have the owner of “${r.chunk.metadata.title}” compare it to the new regulation and update stale coverage-gap, cost-sharing, or marketing language.`,
  }));
}

export async function generateStandaloneReport(
  frameworks: FrameworkId[],
  opts?: { regulationTitle?: string; query?: string },
) {
  const events: ChatEvent[] = [];
  const asked =
    opts?.query ||
    (opts?.regulationTitle
      ? `Analyze “${opts.regulationTitle}” against our current internal policies. List what we must change in each SOP, then a 30/60/90 plan.`
      : `Produce an audit-style readiness report for ${frameworks.map((f) => FRAMEWORK_LABEL[f]).join(" and ")}. Include gaps, what we already cover, and a 30/60/90 plan to keep up with current requirements.`);
  for await (const event of runCopilot({
    mode: "report",
    regulationTitle: opts?.regulationTitle,
    messages: [{ role: "user", content: asked }],
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

export async function analyzeRegulationDocument(doc: StoredDocument) {
  const org = await getOrg();
  const frameworks: FrameworkId[] = org.frameworks.length
    ? org.frameworks
    : ["cms-ma-pd"];
  return generateStandaloneReport(frameworks, {
    regulationTitle: doc.title,
    query: `New regulation on file: ${doc.title}\n\n${doc.text.slice(0, 6000)}\n\nCompare this to our internal policies (not the regulation itself as evidence). List what each named SOP still has wrong and what to change.`,
  });
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

function summarize(
  findings: GapFinding[],
  pct: number,
  changeCount = 0,
) {
  const missing = findings.filter((f) => f.status === "missing").length;
  const partial = findings.filter((f) => f.status === "partial").length;
  const changeBit =
    changeCount > 0 ? ` ${changeCount} policy change(s) listed.` : "";
  return `${pct}% of scored controls look covered. ${missing} missing, ${partial} partial.${changeBit} Internal memo only — not an attestation.`;
}

function renderReport(input: {
  title: string;
  orgName: string;
  orgNotes: string;
  query: string;
  coveragePct: number;
  findings: GapFinding[];
  changes: PolicyChange[];
  roadmap: RoadmapItem[];
  docTitles: string[];
  regulationTitle?: string;
}) {
  const lines = [
    `# ${input.title}`,
    "",
    `**Organization:** ${input.orgName}`,
    input.regulationTitle
      ? `**Regulation:** ${input.regulationTitle}`
      : "",
    `**Asked:** ${input.query}`,
    `**Coverage (heuristic):** ${input.coveragePct}% of scored controls have supporting language on file.`,
    "",
    "> This is an internal readiness memo. It is not a CMS filing, SOC 2 attestation, PCI ROC, or legal advice.",
    "",
    "## Org snapshot",
    input.orgNotes,
    "",
    "## Sources on file (policies only)",
    input.docTitles.map((t) => `- ${t}`).join("\n") || "- None",
    "",
    "## What to change in our policies",
  ].filter((line) => line !== "");

  if (input.changes.length === 0) {
    lines.push("- No policy-specific edits extracted. Use the findings below.");
  } else {
    for (const c of input.changes) {
      lines.push(
        `### ${c.policyTitle}`,
        `Issue: ${c.issue}`,
        `Change: ${c.action}`,
        "",
      );
    }
  }

  lines.push("## Findings");

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
