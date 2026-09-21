import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { seedDocuments, seedOrg } from "./seed";
import { createId } from "./ids";
import type { Chunk, OrgProfile, Report, StoredDocument } from "./types";

const DIR = path.join(process.cwd(), "data", "runtime");

type StoreShape = {
  org: OrgProfile;
  documents: StoredDocument[];
  chunks: Chunk[];
  reports: Report[];
  seenRegulationIds: string[];
};

let memory: StoreShape | null = null;
let chain: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
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

async function persist(state: StoreShape) {
  await mkdir(DIR, { recursive: true });
  await Promise.all([
    writeFile(path.join(DIR, "org.json"), JSON.stringify(state.org, null, 2)),
    writeFile(
      path.join(DIR, "documents.json"),
      JSON.stringify(state.documents, null, 2),
    ),
    writeFile(
      path.join(DIR, "chunks.json"),
      JSON.stringify(state.chunks, null, 2),
    ),
    writeFile(
      path.join(DIR, "reports.json"),
      JSON.stringify(state.reports, null, 2),
    ),
    writeFile(
      path.join(DIR, "seen-regulations.json"),
      JSON.stringify(state.seenRegulationIds, null, 2),
    ),
  ]);
}

export async function loadStore(): Promise<StoreShape> {
  if (memory) return memory;
  return withLock(async () => {
    if (memory) return memory;
    await mkdir(DIR, { recursive: true });
    const org = await readJson<OrgProfile>("org.json", seedOrg);
    let documents = await readJson<StoredDocument[]>("documents.json", []);
    let chunks = await readJson<Chunk[]>("chunks.json", []);
    const reports = await readJson<Report[]>("reports.json", []);
    const seenRegulationIds = await readJson<string[]>(
      "seen-regulations.json",
      [],
    );

    if (documents.length === 0) {
      documents = seedDocuments;
      chunks = seedDocuments.flatMap(chunkDocument);
      memory = { org, documents, chunks, reports, seenRegulationIds };
      await persist(memory);
      return memory;
    }

    memory = { org, documents, chunks, reports, seenRegulationIds };
    return memory;
  });
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
    await persist(state);
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
    await persist(state);
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
    await persist(state);
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
    await persist(state);
    return report;
  });
}

export async function markRegulationsSeen(ids: string[]) {
  return withLock(async () => {
    const state = await loadStore();
    const set = new Set(state.seenRegulationIds);
    for (const id of ids) set.add(id);
    state.seenRegulationIds = [...set];
    await persist(state);
    return state.seenRegulationIds;
  });
}

export async function getSeenRegulationIds() {
  return (await loadStore()).seenRegulationIds;
}
