import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { countRecords, readKind, readOne, replaceAll } from "./db";
import { riskForStatus } from "./frameworks";
import { SAMPLE_REGULATIONS } from "./sample-regulations";
import { mentionsClient, scrubJson } from "./scrub-names";
import { seedDocuments, seedOrg } from "./seed";
import { createId } from "./ids";
import {
  SCAN_AGENCIES,
  type ActivityEvent,
  type Chunk,
  type OrgProfile,
  type PolicyChange,
  type Report,
  type ScanState,
  type StoredDocument,
} from "./types";

const DIR = path.join(process.cwd(), "data", "runtime");

const LEGACY_DEMO_IDS = new Set([
  "doc_access_policy",
  "doc_encryption",
  "doc_vendor",
  "doc_incident",
  "doc_new_pci",
]);

function isKeepDocument(doc: StoredDocument) {
  if (LEGACY_DEMO_IDS.has(doc.id) || doc.id.startsWith("fr_demo_")) return false;
  if (seedDocuments.some((s) => s.id === doc.id)) return true;
  if (doc.id.startsWith("sample_")) return true;
  return doc.source === "upload" || doc.source === "federal-register";
}

type StoreShape = {
  org: OrgProfile;
  documents: StoredDocument[];
  chunks: Chunk[];
  reports: Report[];
  seenRegulationIds: string[];
  activity: ActivityEvent[];
  scan: ScanState;
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

function normalizeOrg(org: Partial<OrgProfile> | null | undefined): OrgProfile {
  const base = org ?? {};
  return {
    ...seedOrg,
    ...base,
    frameworks: base.frameworks?.length ? base.frameworks : seedOrg.frameworks,
    scanAgencies: cleanAgencies(base.scanAgencies),
    scanKeywords: base.scanKeywords ?? seedOrg.scanKeywords,
    jurisdictions: base.jurisdictions ?? seedOrg.jurisdictions,
    updatedAt: base.updatedAt || seedOrg.updatedAt,
  };
}

function normalizeReport(report: Report): Report {
  return {
    ...report,
    scope: report.scope || report.summary,
    policiesChecked: report.policiesChecked ?? [],
    findings: (report.findings ?? []).map((finding) => ({
      ...finding,
      risk: finding.risk ?? riskForStatus(finding.status),
    })),
    changes: (report.changes ?? []).map((change, index) =>
      normalizeChange(change, `${report.id}-chg-${index}`, report.createdAt, index),
    ),
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
  return {
    id: change.id || id,
    policyTitle: change.policyTitle || "Policy",
    issue: change.issue || "",
    action: change.action || "",
    owner: change.owner || "Policy owner",
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

let memory: StoreShape | null = null;
let chain: Promise<unknown> = Promise.resolve();
let lockDepth = 0;

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  if (lockDepth > 0) return fn();
  const run = chain.then(
    async () => {
      lockDepth += 1;
      try {
        return await fn();
      } finally {
        lockDepth -= 1;
      }
    },
    async () => {
      lockDepth += 1;
      try {
        return await fn();
      } finally {
        lockDepth -= 1;
      }
    },
  );
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path.join(DIR, file), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function persist(state: StoreShape) {
  replaceAll([
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
  ]);
}

export async function loadStore(): Promise<StoreShape> {
  if (memory) return memory;
  return withLock(async () => {
    if (memory) return memory;
    await mkdir(DIR, { recursive: true });
    if (countRecords() > 0) {
      memory = {
        org: normalizeOrg(readOne<OrgProfile>("org", "current", seedOrg)),
        documents: readKind<StoredDocument>("document"),
        chunks: readKind<Chunk>("chunk"),
        reports: readKind<Report>("report").map(normalizeReport),
        seenRegulationIds: readOne<string[]>("meta", "seen", []),
        activity: readOne<ActivityEvent[]>("meta", "activity", []),
        scan: readOne<ScanState>("meta", "scan", EMPTY_SCAN),
      };
      if (scrubMemory(memory) || ensureBuiltInSamples(memory)) persist(memory);
      return memory;
    }
    const org = await readJson<OrgProfile>("org.json", seedOrg);
    const documents = await readJson<StoredDocument[]>("documents.json", []);
    const chunks = await readJson<Chunk[]>("chunks.json", []);
    const reports = await readJson<Report[]>("reports.json", []);
    const seenRegulationIds = await readJson<string[]>(
      "seen-regulations.json",
      [],
    );

    const orgIsLegacy = mentionsClient(org.name);
    const byId = new Map(
      documents.filter(isKeepDocument).map((d) => [d.id, d]),
    );
    for (const doc of seedDocuments) byId.set(doc.id, doc);
    const nextDocs = mentionsClient(JSON.stringify([...byId.values()]))
      ? scrubJson([...byId.values()])
      : [...byId.values()];
    const nextOrg = normalizeOrg(orgIsLegacy ? seedOrg : org);
    const idsChanged =
      nextDocs.length !== documents.length ||
      nextDocs.some((d) => !documents.find((x) => x.id === d.id));
    const missingSeed = seedDocuments.some(
      (s) => !documents.find((d) => d.id === s.id),
    );

    if (orgIsLegacy || idsChanged || missingSeed) {
      memory = {
        org: nextOrg,
        documents: nextDocs,
        chunks: nextDocs.flatMap(chunkDocument),
        reports: reports.map(normalizeReport),
        seenRegulationIds,
        activity: [],
        scan: EMPTY_SCAN,
      };
      if (ensureBuiltInSamples(memory)) persist(memory);
      else persist(memory);
      return memory;
    }

    memory = {
      org: normalizeOrg(org),
      documents,
      chunks,
      reports: reports.map(normalizeReport),
      seenRegulationIds,
      activity: [],
      scan: EMPTY_SCAN,
    };
    if (ensureBuiltInSamples(memory)) persist(memory);
    else persist(memory);
    return memory;
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
  return withLock(async () => {
    const state = await loadStore();
    state.org = {
      ...state.org,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    remember(state, {
      action: "org",
      detail: `Updated organization snapshot for ${state.org.name}.`,
    });
    persist(state);
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
  return withLock(async () => {
    const state = await loadStore();
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
    persist(state);
    return { doc, chunks: freshChunks };
  });
}

export async function listChunks() {
  return (await loadStore()).chunks;
}

export async function saveChunks(updated: Chunk[]) {
  return withLock(async () => {
    const state = await loadStore();
    const byId = new Map(updated.map((c) => [c.id, c]));
    state.chunks = state.chunks.map((c) => byId.get(c.id) ?? c);
    persist(state);
  });
}

export async function listReports() {
  return (await loadStore()).reports;
}

export async function getReport(id: string) {
  return (await loadStore()).reports.find((r) => r.id === id) ?? null;
}

export async function addReport(report: Report) {
  return withLock(async () => {
    const state = await loadStore();
    state.reports = [report, ...state.reports.filter((r) => r.id !== report.id)];
    remember(state, {
      action: "report",
      detail: `Saved a new report “${report.title}”.`,
      reportId: report.id,
      documentId: report.documentId,
    });
    persist(state);
    return report;
  });
}

export async function updateReport(
  id: string,
  patch: (report: Report) => Report,
  activity?: Omit<ActivityEvent, "id" | "at" | "reportId">,
) {
  return withLock(async () => {
    const state = await loadStore();
    const current = state.reports.find((report) => report.id === id);
    if (!current) return null;
    const next = normalizeReport(patch(current));
    state.reports = state.reports.map((report) =>
      report.id === id ? next : report,
    );
    if (activity) {
      remember(state, { ...activity, reportId: id });
    }
    persist(state);
    return next;
  });
}

export async function markRegulationsSeen(ids: string[]) {
  return withLock(async () => {
    const state = await loadStore();
    const set = new Set(state.seenRegulationIds);
    for (const id of ids) set.add(id);
    state.seenRegulationIds = [...set];
    state.scan = { ...state.scan, newIds: [] };
    persist(state);
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
  return withLock(async () => {
    const state = await loadStore();
    remember(state, event);
    persist(state);
    return state.activity[0];
  });
}

export async function getScan() {
  return (await loadStore()).scan;
}

export async function saveScan(scan: ScanState) {
  return withLock(async () => {
    const state = await loadStore();
    state.scan = scan;
    persist(state);
    return state.scan;
  });
}
