import { getCurrentUser, type WorkspaceMode } from "./auth";
import { countRecords, readKind, readOne, replaceAll } from "./db";
import { riskForStatus } from "./frameworks";
import { SAMPLE_REGULATIONS } from "./sample-regulations";
import { mentionsClient, scrubJson } from "./scrub-names";
import { blankOrg, seedDocuments, seedOrg } from "./seed";
import { requireUserId } from "./session";
import { createId } from "./ids";
import { actionItemsForFinding, actionItemsForPolicyChange } from "./teams";
import {
  SCAN_AGENCIES,
  type ActivityEvent,
  type Chunk,
  type GapFinding,
  type OrgProfile,
  type PolicyChange,
  type Report,
  type ScanState,
  type StoredChat,
  type StoredDocument,
} from "./types";

type StoreShape = {
  org: OrgProfile;
  documents: StoredDocument[];
  chunks: Chunk[];
  reports: Report[];
  seenRegulationIds: string[];
  activity: ActivityEvent[];
  scan: ScanState;
  chats: StoredChat[];
};

const EMPTY_SCAN: ScanState = { lastScanAt: null, newIds: [] };

const AGENCY_ALIASES: Record<string, string> = {
  "department-of-health-and-human-services":
    "health-and-human-services-department",
  "office-of-the-comptroller-of-the-currency": "comptroller-of-the-currency",
};

function cleanAgencies(ids: string[] | undefined) {
  const valid = new Set<string>(SCAN_AGENCIES.map((agency) => agency.id));
  const next = [
    ...new Set(
      (ids ?? []).map((id) => AGENCY_ALIASES[id] ?? id).filter((id) => valid.has(id)),
    ),
  ];
  return next.length ? next : [...seedOrg.scanAgencies];
}

function normalizeOrg(
  org: Partial<OrgProfile> | null | undefined,
  mode: WorkspaceMode = "seeded",
): OrgProfile {
  const fallback = mode === "blank" ? blankOrg : seedOrg;
  const base = org ?? {};
  return {
    ...fallback,
    ...base,
    name: base.name ?? fallback.name,
    industry: base.industry ?? fallback.industry,
    size: base.size ?? fallback.size,
    notes: base.notes ?? fallback.notes,
    frameworks: base.frameworks?.length ? base.frameworks : fallback.frameworks,
    scanAgencies: cleanAgencies(base.scanAgencies ?? fallback.scanAgencies),
    scanKeywords: base.scanKeywords ?? fallback.scanKeywords,
    jurisdictions: base.jurisdictions ?? fallback.jurisdictions,
    updatedAt: base.updatedAt || fallback.updatedAt,
  };
}

async function workspaceMode(): Promise<WorkspaceMode> {
  const user = await getCurrentUser();
  return user?.workspace === "blank" ? "blank" : "seeded";
}

function normalizeReport(report: Report): Report {
  return {
    ...report,
    scope: report.scope || report.summary,
    policiesChecked: report.policiesChecked ?? [],
    findings: (report.findings ?? []).map(normalizeFinding),
    changes: (report.changes ?? []).map((change, index) =>
      normalizeChange(change, `${report.id}-chg-${index}`, report.createdAt, index),
    ),
    roadmap: (report.roadmap ?? []).map((item) => ({
      ...item,
      team: item.team,
      actionItems: item.actionItems,
    })),
  };
}

function normalizeFinding(finding: GapFinding): GapFinding {
  const staffing = actionItemsForFinding({
    title: finding.title,
    action: finding.updateText ?? finding.action,
    framework: finding.framework,
    status: finding.status,
  });
  return {
    ...finding,
    risk: finding.risk ?? riskForStatus(finding.status),
    team: finding.team || staffing.team,
    owner: finding.owner || staffing.owner,
    actionItems:
      finding.actionItems && finding.actionItems.length > 0
        ? finding.actionItems
        : staffing.actionItems,
  };
}

function dueOn(createdAt: string | undefined, index: number) {
  const date = new Date(createdAt || Date.now());
  if (Number.isNaN(date.getTime())) date.setTime(Date.now());
  date.setDate(date.getDate() + (index === 0 ? 30 : index === 1 ? 60 : 90));
  return date.toISOString().slice(0, 10);
}

function normalizeChange(
  change: Partial<PolicyChange>,
  id: string,
  createdAt?: string,
  index = 0,
): PolicyChange {
  const status = change.status ?? "open";
  const staffing = actionItemsForPolicyChange({
    policyTitle: change.policyTitle || "Policy",
    issue: change.issue || "",
    action: change.action || "",
    team: change.team,
  });
  return {
    id: change.id || id,
    policyTitle: change.policyTitle || "Policy",
    issue: change.issue || "",
    action: change.action || "",
    owner: change.owner || staffing.owner,
    team: change.team || staffing.team,
    actionItems:
      change.actionItems && change.actionItems.length > 0
        ? change.actionItems
        : staffing.actionItems,
    dueDate: change.dueDate || dueOn(createdAt, index),
    status:
      status === "in_progress" || status === "done" || status === "open"
        ? status
        : "open",
  };
}

function remember(
  state: StoreShape,
  event: Omit<ActivityEvent, "id" | "at">,
) {
  state.activity = [
    {
      ...event,
      id: createId("act"),
      at: new Date().toISOString(),
    },
    ...state.activity,
  ].slice(0, 200);
}

const memories = new Map<string, StoreShape>();
const chains = new Map<string, Promise<unknown>>();
const depths = new Map<string, number>();

function withLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  if ((depths.get(userId) ?? 0) > 0) return fn();
  const prev = chains.get(userId) ?? Promise.resolve();
  const run = prev.then(
    async () => {
      depths.set(userId, (depths.get(userId) ?? 0) + 1);
      try {
        return await fn();
      } finally {
        depths.set(userId, Math.max(0, (depths.get(userId) ?? 1) - 1));
      }
    },
    async () => {
      depths.set(userId, (depths.get(userId) ?? 0) + 1);
      try {
        return await fn();
      } finally {
        depths.set(userId, Math.max(0, (depths.get(userId) ?? 1) - 1));
      }
    },
  );
  chains.set(
    userId,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}

async function persist(userId: string, state: StoreShape) {
  await replaceAll(userId, [
    { kind: "org", id: "current", body: state.org },
    ...state.documents.map((doc) => ({
      kind: "document",
      id: doc.id,
      body: doc,
    })),
    ...state.chunks.map((chunk) => ({
      kind: "chunk",
      id: chunk.id,
      body: chunk,
    })),
    ...state.reports.map((report) => ({
      kind: "report",
      id: report.id,
      body: report,
    })),
    { kind: "meta", id: "seen", body: state.seenRegulationIds },
    { kind: "meta", id: "activity", body: state.activity },
    { kind: "meta", id: "scan", body: state.scan },
    { kind: "meta", id: "chats", body: state.chats },
  ]);
}

async function readState(
  userId: string,
  mode: WorkspaceMode,
): Promise<StoreShape> {
  const fallbackOrg = mode === "blank" ? blankOrg : seedOrg;
  return {
    org: normalizeOrg(
      await readOne<OrgProfile>(userId, "org", "current", fallbackOrg),
      mode,
    ),
    documents: await readKind<StoredDocument>(userId, "document"),
    chunks: await readKind<Chunk>(userId, "chunk"),
    reports: (await readKind<Report>(userId, "report")).map(normalizeReport),
    seenRegulationIds: await readOne<string[]>(userId, "meta", "seen", []),
    activity: await readOne<ActivityEvent[]>(userId, "meta", "activity", []),
    scan: await readOne<ScanState>(userId, "meta", "scan", EMPTY_SCAN),
    chats: await readOne<StoredChat[]>(userId, "meta", "chats", []),
  };
}

function freshState(mode: WorkspaceMode): StoreShape {
  if (mode === "blank") {
    return {
      org: normalizeOrg(blankOrg, "blank"),
      documents: [],
      chunks: [],
      reports: [],
      seenRegulationIds: [],
      activity: [],
      scan: EMPTY_SCAN,
      chats: [],
    };
  }
  const documents = seedDocuments.map((doc) => ({ ...doc }));
  const state: StoreShape = {
    org: normalizeOrg(seedOrg, "seeded"),
    documents,
    chunks: documents.flatMap(chunkDocument),
    reports: [],
    seenRegulationIds: [],
    activity: [],
    scan: EMPTY_SCAN,
    chats: [],
  };
  ensureBuiltInSamples(state);
  return state;
}

export async function loadStore(): Promise<StoreShape> {
  const userId = await requireUserId();
  const cached = memories.get(userId);
  if (cached) return cached;
  return withLock(userId, async () => {
    const again = memories.get(userId);
    if (again) return again;
    const mode = await workspaceMode();
    const count = await countRecords(userId);
    let state = count > 0 ? await readState(userId, mode) : freshState(mode);
    let dirty = count === 0;
    if (mode === "blank" && looksLikeAccidentalSeed(state)) {
      state = freshState("blank");
      dirty = true;
    } else if (mode === "seeded") {
      if (scrubMemory(state) || ensureBuiltInSamples(state)) dirty = true;
    } else if (scrubMemoryBlank(state)) {
      dirty = true;
    }
    if (dirty) await persist(userId, state);
    memories.set(userId, state);
    return state;
  });
}

function looksLikeAccidentalSeed(state: StoreShape) {
  return (
    state.org.name === seedOrg.name &&
    state.documents.some(
      (doc) => doc.id === "doc_cms_4208_f3" || doc.id.startsWith("sample_"),
    )
  );
}

/** Install the five built-in sample regulations (onboarding / blank workspaces). */
export async function installSampleRegulations() {
  return edit((state) => {
    const changed = ensureBuiltInSamples(state);
    if (changed) {
      remember(state, {
        action: "upload",
        detail: "Added built-in sample regulations to the library.",
      });
    }
    return {
      added: changed,
      documents: state.documents.filter((doc) => doc.id.startsWith("sample_")),
    };
  });
}

/** Optional starter SOPs for a blank onboarding workspace (no CMS seed extract). */
export async function installStarterPolicies() {
  return edit((state) => {
    const starters = seedDocuments.filter((doc) => doc.kind === "policy");
    let added = 0;
    for (const starter of starters) {
      if (state.documents.some((doc) => doc.id === starter.id)) continue;
      const doc = { ...starter };
      state.documents = [doc, ...state.documents];
      state.chunks = [
        ...state.chunks.filter((chunk) => chunk.documentId !== doc.id),
        ...chunkDocument(doc),
      ];
      added += 1;
    }
    if (added > 0) {
      remember(state, {
        action: "upload",
        detail: `Added ${added} starter stand-in policies.`,
      });
    }
    return { added, documents: state.documents.filter((doc) => doc.kind === "policy") };
  });
}

/** Wipe a blank workspace back to empty onboarding (admin1). */
export async function resetBlankWorkspace() {
  const mode = await workspaceMode();
  if (mode !== "blank") {
    throw new Error("Only blank onboarding workspaces can be reset.");
  }
  const userId = await requireUserId();
  return withLock(userId, async () => {
    const state = freshState("blank");
    await persist(userId, state);
    memories.set(userId, state);
    return state.org;
  });
}

export async function getWorkspaceStatus() {
  const mode = await workspaceMode();
  const state = await loadStore();
  const policies = state.documents.filter((doc) => doc.kind !== "regulation");
  const regulations = state.documents.filter((doc) => doc.kind === "regulation");
  const samples = regulations.filter((doc) => doc.id.startsWith("sample_"));
  return {
    workspace: mode,
    orgNamed: Boolean(state.org.name.trim()),
    orgName: state.org.name,
    policyCount: policies.length,
    regulationCount: regulations.length,
    sampleCount: samples.length,
    reportCount: state.reports.length,
    onboardingComplete:
      mode === "seeded" ||
      (Boolean(state.org.name.trim()) &&
        policies.length > 0 &&
        regulations.length > 0),
  };
}

async function edit<T>(fn: (state: StoreShape) => T | Promise<T>) {
  const userId = await requireUserId();
  return withLock(userId, async () => {
    const state = await loadStore();
    const result = await fn(state);
    await persist(userId, state);
    return result;
  });
}

function scrubMemory(state: StoreShape) {
  const before = JSON.stringify(state);
  const staleName =
    mentionsClient(before) ||
    before.includes("Demo Manufacturer") ||
    /drug manufacturer/i.test(before);
  if (!staleName) return false;
  state.org = scrubJson(state.org);
  state.org.name = seedOrg.name;
  state.org.industry = seedOrg.industry;
  if (state.org.notes.startsWith("Demo tenant:")) state.org.notes = seedOrg.notes;
  state.documents = scrubJson(state.documents);
  state.chunks = scrubJson(state.chunks);
  state.reports = scrubJson(state.reports);
  state.activity = scrubJson(state.activity);
  state.chats = scrubJson(state.chats);
  return true;
}

/** Blank workspaces: scrub forbidden names but never force the demo tenant. */
function scrubMemoryBlank(state: StoreShape) {
  const before = JSON.stringify(state);
  if (
    !mentionsClient(before) &&
    !before.includes("Demo Manufacturer") &&
    !/drug manufacturer/i.test(before)
  ) {
    return false;
  }
  state.org = scrubJson(state.org);
  state.documents = scrubJson(state.documents);
  state.chunks = scrubJson(state.chunks);
  state.reports = scrubJson(state.reports);
  state.activity = scrubJson(state.activity);
  state.chats = scrubJson(state.chats);
  return true;
}

function ensureBuiltInSamples(state: StoreShape) {
  let changed = false;
  for (const sample of SAMPLE_REGULATIONS) {
    const existing = state.documents.find((doc) => doc.id === sample.id);
    if (existing?.text === sample.text && existing.title === sample.title) continue;
    const doc: StoredDocument = {
      id: sample.id,
      title: sample.title,
      kind: "regulation",
      source: "seed",
      framework: "cms-ma-pd",
      publishedAt: sample.publishedAt,
      createdAt: existing?.createdAt ?? `${sample.publishedAt}T00:00:00.000Z`,
      text: sample.text,
    };
    state.documents = [doc, ...state.documents.filter((item) => item.id !== sample.id)];
    state.chunks = [
      ...state.chunks.filter((chunk) => chunk.documentId !== sample.id),
      ...chunkDocument(doc),
    ];
    changed = true;
  }
  return changed;
}

export function chunkDocument(doc: StoredDocument): Chunk[] {
  const parts = splitText(doc.text, 900, 140);
  return parts.map((text, i) => ({
    id: `${doc.id}_c${i}`,
    documentId: doc.id,
    text,
    metadata: {
      title: doc.title,
      kind: doc.kind,
      framework: doc.framework,
    },
  }));
}

export function splitText(text: string, size: number, overlap: number) {
  const clean = text.replace(/\r/g, "").trim();
  if (clean.length <= size) return [clean];
  const out: string[] = [];
  let i = 0;
  while (i < clean.length) {
    out.push(clean.slice(i, i + size));
    i += size - overlap;
  }
  return out;
}

export async function getOrg() {
  return (await loadStore()).org;
}

export async function saveOrg(patch: Partial<OrgProfile>) {
  return edit((state) => {
    state.org = {
      ...state.org,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    remember(state, {
      action: "org",
      detail: `Updated organization snapshot for ${state.org.name}.`,
    });
    return state.org;
  });
}

export async function listDocuments() {
  return (await loadStore()).documents;
}

export async function getDocument(id: string) {
  return (await loadStore()).documents.find((d) => d.id === id) ?? null;
}

export async function addDocument(
  input: Omit<StoredDocument, "id" | "createdAt"> & { id?: string },
) {
  return edit((state) => {
    const doc: StoredDocument = {
      ...input,
      id: input.id ?? createId("doc"),
      createdAt: new Date().toISOString(),
    };
    state.documents = [
      doc,
      ...state.documents.filter((d) => d.id !== doc.id),
    ];
    const freshChunks = chunkDocument(doc);
    state.chunks = [
      ...state.chunks.filter((c) => c.documentId !== doc.id),
      ...freshChunks,
    ];
    remember(state, {
      action: "upload",
      detail:
        doc.kind === "regulation"
          ? `Saved regulation “${doc.title}”.`
          : `Saved ${doc.kind} “${doc.title}”.`,
      documentId: doc.id,
    });
    return { doc, chunks: freshChunks };
  });
}

export async function listChunks() {
  return (await loadStore()).chunks;
}

export async function saveChunks(updated: Chunk[]) {
  return edit((state) => {
    const byId = new Map(updated.map((c) => [c.id, c]));
    state.chunks = state.chunks.map((c) => byId.get(c.id) ?? c);
  });
}

export async function listReports() {
  return (await loadStore()).reports;
}

export async function getReport(id: string) {
  return (await loadStore()).reports.find((r) => r.id === id) ?? null;
}

export async function addReport(report: Report) {
  return edit((state) => {
    state.reports = [report, ...state.reports.filter((r) => r.id !== report.id)];
    remember(state, {
      action: "report",
      detail: `Saved a new report “${report.title}”.`,
      reportId: report.id,
      documentId: report.documentId,
    });
    return report;
  });
}

export async function updateReport(
  id: string,
  patch: (report: Report) => Report,
  activity?: Omit<ActivityEvent, "id" | "at" | "reportId">,
) {
  return edit((state) => {
    const current = state.reports.find((report) => report.id === id);
    if (!current) return null;
    const next = normalizeReport(patch(current));
    state.reports = state.reports.map((report) =>
      report.id === id ? next : report,
    );
    if (activity) {
      remember(state, { ...activity, reportId: id });
    }
    return next;
  });
}

export async function markRegulationsSeen(ids: string[]) {
  return edit((state) => {
    const set = new Set(state.seenRegulationIds);
    for (const id of ids) set.add(id);
    state.seenRegulationIds = [...set];
    state.scan = { ...state.scan, newIds: [] };
    return state.seenRegulationIds;
  });
}

export async function getSeenRegulationIds() {
  return (await loadStore()).seenRegulationIds;
}

export async function listActivity() {
  return (await loadStore()).activity;
}

export async function logActivity(event: Omit<ActivityEvent, "id" | "at">) {
  return edit((state) => {
    remember(state, event);
    return state.activity[0];
  });
}

export async function listChats() {
  return (await loadStore()).chats;
}

export async function replaceChats(chats: StoredChat[]) {
  return edit((state) => {
    state.chats = chats.slice(0, 40);
    return state.chats;
  });
}

export async function getScan() {
  return (await loadStore()).scan;
}

export async function saveScan(scan: ScanState) {
  return edit((state) => {
    state.scan = scan;
    return state.scan;
  });
}
