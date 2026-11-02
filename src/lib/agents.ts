import { completeChat } from "./llm/openai";
import { CONTROLS, FRAMEWORK_LABEL, toFinding } from "./frameworks";
import { createId } from "./ids";
import { formatMemoDate, withDateLine, withPolicyCoverage } from "./memo";
import { retrieve } from "./rag";
import { fetchRegulationFeed } from "./regulations";
import { addReport, getOrg, listDocuments } from "./store";
import {
  actionItemsForFinding,
  actionItemsForPolicyChange,
  leadForTeam,
} from "./teams";
import { SCAN_AGENCIES } from "./types";
import type {
  ChatEvent,
  OrgProfile,
  FrameworkId,
  GapFinding,
  PolicyChange,
  Report,
  RetrievedChunk,
  RoadmapItem,
  StoredDocument,
  TeamActionItem,
} from "./types";

// Only an explicit request ("run a gap report", "generate an audit") builds a
// full memo; mentioning a framework in conversation should just get an answer.
const AUDIT_RE =
  /\b(run|generate|create|make|build|produce|draft|give me|do)\b[^.?!]{0,40}\b(report|audit|gap analysis|gap assessment|readiness memo|roadmap|30\/60\/90)\b/i;

// Greetings and small talk don't need retrieval or org context.
const SMALL_TALK_RE =
  /^(hi|hello|hey|yo|sup|thanks|thank you|ok|okay|cool|nice|great|bye|good (morning|afternoon|evening)|how are you|who are you|what can you do)\b[\s!.?]*$/i;

export async function* runCopilot(input: {
  messages: { role: "user" | "assistant"; content: string }[];
  mode?: "chat" | "analyze" | "report";
  regulationTitle?: string;
  documentId?: string;
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
  // Earlier turns, so follow-ups like "why?" or "shorter" make sense.
  const history = input.messages
    .slice(0, input.messages.lastIndexOf(last))
    .filter((m) => m.content.trim())
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

  if (!wantReport && SMALL_TALK_RE.test(query)) {
    const org = await getOrg();
    const reply = await completeChat({
      system: chatSystemPrompt(org),
      user: query,
      history,
      temperature: 0.7,
      maxTokens: 400,
    });
    yield {
      type: "delta",
      text:
        reply ||
        "Hi! Ask me anything — about your policies, a regulation, or something else. Say **run a gap report** when you want a full readiness memo.",
    };
    yield { type: "done" };
    return;
  }

  yield { type: "status", step: "Retrieving policies, evidence, and regs", agent: "scout" };
  const [org, docs, candidates, feed] = await Promise.all([
    getOrg(),
    listDocuments(),
    retrieve(query, 16),
    fetchRegulationFeed().catch(() => []),
  ]);
  // Frameworks the org removed from scope stay out of answers and reports
  // unless the user names one explicitly.
  const allowed = new Set([...org.frameworks, ...mentionedFrameworks(query)]);
  const retrieved = candidates
    .filter((r) => !r.chunk.metadata.framework || allowed.has(r.chunk.metadata.framework))
    .slice(0, 10);

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
    history,
    conversational: !wantReport,
    org,
    orgName: org.name,
    orgNotes: `${org.industry}. ${scopeLine(org)} ${org.notes}`,
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
    agencies: agencyLabels(org),
    frameworks,
    orgCorpus,
    scoutNotes,
    retrieved,
    policyDocuments,
    regulationTitle: input.regulationTitle,
    documentId: input.documentId,
    docTitles: docs
      .filter((d) => d.kind !== "regulation")
      .map((d) => d.title),
  });
  await addReport(report);

  yield { type: "delta", text: report.markdown };
  yield { type: "report", report };
  yield { type: "done" };
}

function agencyLabels(org: OrgProfile) {
  return SCAN_AGENCIES.filter((a) => org.scanAgencies.includes(a.id)).map(
    (a) => a.label,
  );
}

function scopeLine(org: OrgProfile) {
  const frameworks = org.frameworks.map((f) => FRAMEWORK_LABEL[f]).join(", ");
  const agencies = agencyLabels(org).join(", ");
  return `In-scope frameworks: ${frameworks || "(none)"}. Agencies watched: ${agencies || "(none)"}.`;
}

function chatSystemPrompt(org: OrgProfile) {
  return `You are Governance Agent, a friendly, knowledgeable assistant for ${org.name || "this organization"}. ${scopeLine(org)} When a governance question is ambiguous, answer for these frameworks and agencies. If the user asks about a framework that is not in scope, still answer, but mention it isn't in their scope and can be added in Settings. Talk like a normal chatbot: answer the user's actual question directly and conversationally, follow up on earlier turns, and match the length of your reply to the question (short questions get short answers). You can help with anything — general questions, writing, explanations — not only compliance. When the question is about governance, policies, or regulations, use the retrieved context provided and cite document titles; passages labeled REGULATION are government text and never prove the company already complies. Ignore retrieved context that isn't relevant to the question, and don't summarize it unprompted. Don't repeat a previous answer; if the user asks something new, answer that. Only mention gap reports if the user seems to want one (they can say "run a gap report"). Not legal advice.`;
}

async function runScout(input: {
  query: string;
  history?: { role: "user" | "assistant"; content: string }[];
  conversational?: boolean;
  org: OrgProfile;
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

  const background = `Org: ${input.orgName}\n${input.orgNotes}\n\nRecent federal items:\n${input.recentRegs.join("\n") || "(none)"}\n\nRetrieved context:\n${context || "(none)"}`;
  const llm = input.conversational
    ? await completeChat({
        system: `${chatSystemPrompt(input.org)}\n\nBackground (use only if relevant to the question):\n${background}`,
        user: input.query,
        history: input.history,
        temperature: 0.5,
      })
    : await completeChat({
        system:
          `You are Scout, a regulation analyst for a governance copilot. ${scopeLine(input.org)} Focus your analysis on those frameworks unless the question names another. Retrieved passages are labeled POLICY (company) or REGULATION (government). Never treat a REGULATION as proof the company already complies. Cite document titles. Not a legal opinion. If context is thin, say what is missing.`,
        user: `${background}\n\nUser question:\n${input.query}`,
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
    `Ask me to **run a gap report** (${input.org.frameworks.map((f) => FRAMEWORK_LABEL[f]).join(", ")}) and Auditor will score controls, list gaps, and give a 30/60/90-day plan. This is an internal readiness memo, not an attestation or regulatory filing.`,
  ].join("\n");
}

async function runAuditor(input: {
  query: string;
  orgName: string;
  orgNotes: string;
  agencies: string[];
  frameworks: FrameworkId[];
  orgCorpus: string[];
  scoutNotes: string;
  policyDocuments: { title: string; text: string }[];
  retrieved: RetrievedChunk[];
  docTitles: string[];
  regulationTitle?: string;
  documentId?: string;
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
    const updateText =
      base.status === "covered"
        ? `No change required for ${c.title}; keep evidence current.`
        : `${c.action} Update the relevant policy text in ${policyRefs.join(", ")}.`;
    const staffing = actionItemsForFinding({
      title: c.title,
      action: updateText,
      framework: c.framework,
      status: base.status,
    });
    return {
      ...base,
      policyRefs,
      updateText,
      owner: staffing.owner,
      team: staffing.team,
      actionItems: staffing.actionItems,
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
  const title = input.regulationTitle
    ? `What to change — ${input.regulationTitle}`
    : `${input.frameworks.map((f) => FRAMEWORK_LABEL[f]).join(" / ")} readiness memo`;

  const changes = stampChanges(
    await draftPolicyChanges({
      orgName: input.orgName,
      frameworks: input.frameworks,
      retrieved: input.retrieved,
      scoutNotes: input.scoutNotes,
      query: input.query,
      docTitles: input.docTitles,
    }),
  );

  const createdAt = new Date();
  const dateLine = `**Date:** ${formatMemoDate(createdAt)}`;
  const structured = renderReport({
    dateLine,
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
    agencies: input.agencies,
  });

  const narrative = await completeChat({
    system: `You are Auditor. Rewrite the readiness memo in clear English. This memo covers only: ${input.frameworks.map((f) => FRAMEWORK_LABEL[f]).join(", ")}; do not add findings for other frameworks. Keep every finding, every policy change, and every team action item (Governance, Market access, Engineering, MLR, Legal, Privacy, Security, Finance, Patient support). Name the accountable team and what each level should do. Do not invent evidence. Label this as an internal memo, not a regulatory filing, attestation, or legal opinion. Use markdown. Describe the organization as its org notes do.`,
    user: `${structured}\n\nScout notes (use for context, do not treat as org evidence):\n${input.scoutNotes}`,
    maxTokens: 1800,
  });
  // The rewrite can drop or misstate the date and per-policy coverage, so pin
  // both after it.
  const policiesChecked = input.docTitles;
  const markdown = withPolicyCoverage(
    withDateLine(narrative || structured, createdAt),
    { findings, policiesChecked },
  );

  return {
    id: createId("rpt"),
    title,
    frameworks: input.frameworks,
    documentId: input.documentId,
    regulationTitle: input.regulationTitle,
    scope: `Readiness review for ${input.orgName}${
      input.regulationTitle ? ` against ${input.regulationTitle}` : ""
    }. Internal policies were checked. This is not a CMS filing.`,
    policiesChecked,
    summary: summarize(findings, coveragePct, changes.length),
    coveragePct,
    findings,
    changes,
    roadmap,
    markdown,
    createdAt: createdAt.toISOString(),
  };
}

type DraftChange = {
  policyTitle: string;
  issue: string;
  action: string;
  team?: string;
  actionItems?: TeamActionItem[];
};

async function draftPolicyChanges(input: {
  orgName: string;
  frameworks: FrameworkId[];
  retrieved: RetrievedChunk[];
  scoutNotes: string;
  query: string;
  docTitles: string[];
}): Promise<DraftChange[]> {
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
      'Return ONLY a JSON array of objects with keys policyTitle, issue, action, team, actionItems. team must be one of: Governance, Market access, Finance, MLR, Patient support, Engineering, Legal, Privacy, Security. actionItems is an array of {team, level, task} where level is Accountable, Responsible, Consulted, or Informed. Each item is one concrete edit to a named internal policy already on file. Never treat regulation text as proof of compliance. If unsure, still propose the most likely SOP edits and name the teams that must act. No markdown.',
    user: `Org: ${input.orgName}\nIn-scope frameworks (only propose edits for these): ${input.frameworks.map((f) => FRAMEWORK_LABEL[f]).join(", ")}\nInternal policies on file: ${input.docTitles.join("; ") || "(none)"}\nQuestion: ${input.query}\n\n${regBlock || "(no regulation passages)"}\n\n${policyBlock || "(no retrieved policy passages)"}\n\nScout:\n${input.scoutNotes.slice(0, 1500)}`,
    maxTokens: 1400,
  });
  const fallback = () =>
    policies.length > 0
      ? fallbackChanges(policies)
      : input.docTitles.slice(0, 3).map((title) => ({
          policyTitle: title,
          issue:
            "This SOP is on file but may not match the new rule language we retrieved.",
          action: `Have the owner of “${title}” compare it to the new regulation and update any language that no longer matches it.`,
        }));
  if (!raw) return fallback();
  try {
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    const parsed = JSON.parse(
      start >= 0 && end > start ? raw.slice(start, end + 1) : raw,
    ) as Array<Partial<DraftChange>>;
    const rows = parsed
      .filter((row) => row.policyTitle && row.action)
      .slice(0, 8)
      .map((row) => ({
        policyTitle: String(row.policyTitle).slice(0, 200),
        issue: String(row.issue || "").slice(0, 400),
        action: String(row.action).slice(0, 400),
        team: row.team ? String(row.team).slice(0, 40) : undefined,
        actionItems: Array.isArray(row.actionItems)
          ? row.actionItems
              .filter((item) => item && item.team && item.task)
              .slice(0, 6)
              .map((item) => ({
                team: String(item.team).slice(0, 40),
                level: String(item.level || "Responsible").slice(0, 24),
                task: String(item.task).slice(0, 320),
              }))
          : undefined,
      }));
    return rows.length > 0 ? rows : fallback();
  } catch {
    return fallback();
  }
}

function dueIn(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function stampChanges(changes: DraftChange[]): PolicyChange[] {
  return changes.map((change, index) => {
    const staffing = actionItemsForPolicyChange({
      policyTitle: change.policyTitle,
      issue: change.issue,
      action: change.action,
      team: change.team,
    });
    const actionItems =
      change.actionItems && change.actionItems.length > 0
        ? change.actionItems
        : staffing.actionItems;
    return {
      policyTitle: change.policyTitle,
      issue: change.issue,
      action: change.action,
      id: createId("chg"),
      owner: staffing.owner,
      team: staffing.team,
      actionItems,
      dueDate: dueIn(index === 0 ? 30 : index === 1 ? 60 : 90),
      status: "open" as const,
    };
  });
}

function fallbackChanges(policies: RetrievedChunk[]): DraftChange[] {
  return policies.slice(0, 3).map((r) => ({
    policyTitle: r.chunk.metadata.title,
    issue: "This internal document may not match the new rule language we retrieved.",
    action: `Have the owner of “${r.chunk.metadata.title}” compare it to the new regulation and update any language that no longer matches it.`,
  }));
}

export async function generateStandaloneReport(
  frameworks: FrameworkId[],
  opts?: { regulationTitle?: string; query?: string; documentId?: string },
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
    documentId: opts?.documentId,
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
    documentId: doc.id,
    regulationTitle: doc.title,
    query: `New regulation on file: ${doc.title}\n\n${doc.text.slice(0, 6000)}\n\nCompare this to our internal policies (not the regulation itself as evidence). List what each named SOP still has wrong and what to change.`,
  });
}

/** Frameworks the user named outright in their message. */
function mentionedFrameworks(query: string): FrameworkId[] {
  const hit: FrameworkId[] = [];
  if (/\bcms|medicare|part d|manufacturer discount|ssbci|star ratings\b/i.test(query))
    hit.push("cms-ma-pd");
  if (/\bhipaa|ephi|\bphi\b|business associate|baa|ocr\b|breach notification\b/i.test(query))
    hit.push("hipaa");
  if (/\bsoc\b/i.test(query)) hit.push("soc2");
  if (/\bpci\b/i.test(query)) hit.push("pci-dss");
  if (/\bgdpr\b/i.test(query)) hit.push("gdpr");
  if (/\bnist\b/i.test(query)) hit.push("nist-csf");
  return [...new Set(hit)];
}

/** Named frameworks win; otherwise score the org's in-scope list. */
function inferFrameworks(query: string, org: FrameworkId[]): FrameworkId[] {
  const named = mentionedFrameworks(query);
  if (named.length) return named;
  return org.length ? org : ["cms-ma-pd", "hipaa"];
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
  const staffing = actionItemsForFinding({
    title: framework,
    action: "Close the open control.",
    framework,
    status: "missing",
  });
  return staffing.owner;
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
        team: f.team,
        actionItems: f.actionItems,
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
      owner: leadForTeam("Governance"),
      team: "Governance",
      actionItems: [
        {
          team: "Governance",
          level: "Accountable",
          task: "Re-upload policies after each material change and re-run this memo.",
        },
        {
          team: "Engineering",
          level: "Informed",
          task: "Confirm no system evidence is missing from the pack.",
        },
      ],
      dueDate: fmtDueDate(15),
      status: "open",
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
  agencies: string[];
  dateLine: string;
}) {
  const lines = [
    `# ${input.title}`,
    "",
    input.dateLine,
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
        `Team: ${c.team || "Governance"} · Owner: ${c.owner || "Policy owner"} · Due: ${c.dueDate || "unset"} · ${c.status || "open"}`,
        "Action items:",
        ...(c.actionItems ?? []).map(
          (item) => `- **${item.team}** (${item.level}): ${item.task}`,
        ),
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
      `Policy target: ${(f.policyRefs ?? ["Policy review"]).join(", ")}`,
      `Required change: ${f.updateText ?? f.action}`,
      `Team: ${f.team ?? "Governance"} · Owner: ${f.owner ?? pickOwner(f.framework)}`,
      `Due: ${f.dueDate ?? fmtDueDate(30)}`,
      `Status: ${f.remediationStatus ?? (f.status === "covered" ? "done" : "open")}`,
      "Action items:",
      ...(f.actionItems ?? []).map(
        (item) => `- **${item.team}** (${item.level}): ${item.task}`,
      ),
      "",
    );
  }

  lines.push("## Action items by team");
  const rolled = new Map<string, string[]>();
  for (const change of input.changes) {
    for (const item of change.actionItems ?? []) {
      const list = rolled.get(item.team) ?? [];
      list.push(`${item.level}: ${item.task} (policy: ${change.policyTitle})`);
      rolled.set(item.team, list);
    }
  }
  for (const finding of input.findings) {
    if (finding.status === "covered") continue;
    for (const item of finding.actionItems ?? []) {
      const list = rolled.get(item.team) ?? [];
      list.push(`${item.level}: ${item.task} (control: ${finding.title})`);
      rolled.set(item.team, list);
    }
  }
  if (rolled.size === 0) {
    lines.push("- No open team action items.");
  } else {
    for (const [team, tasks] of [...rolled.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      lines.push(`### ${team}`);
      for (const task of tasks.slice(0, 6)) lines.push(`- ${task}`);
      lines.push("");
    }
  }

  lines.push("## 30 / 60 / 90 days");
  for (const item of input.roadmap) {
    lines.push(
      `- **${item.window} — ${item.title}:** ${item.detail}`,
      item.team ? `  - Team: ${item.team} · Owner: ${item.owner ?? "Governance"}` : "",
    );
  }
  lines.push(
    "",
    "## How to keep up",
    `- Watch the Regulations feed weekly (${input.agencies.join(", ") || "add agencies in Settings"}).`,
    "- Ingest each new rule into Governance Agent and re-run this memo.",
    "- Treat missing controls as tickets, not a once-a-year project.",
  );
  return lines.join("\n");
}
