import { retrieveFromKnowledgeBase } from "./aws/knowledge-base";
import { embedTexts, ragProvider } from "./embeddings";
import { listChunks, saveChunks } from "./store";
import type { Chunk, DocumentKind, RetrievedChunk } from "./types";

// LAST RESORT if AWS Bedrock is not available — uncomment + npm i @pinecone-database/pinecone
// import { retrieveFromPinecone, upsertChunksToPinecone } from "./pinecone";

const POLICY_KINDS: DocumentKind[] = ["policy", "evidence", "control"];

function cosine(a: number[], b: number[]) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

function tokens(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

function keywordScore(query: string, text: string) {
  const q = new Set(tokens(query));
  if (q.size === 0) return 0;
  const t = tokens(text);
  let hits = 0;
  for (const w of t) if (q.has(w)) hits++;
  return hits / q.size;
}

function isPolicyLike(kind: DocumentKind) {
  return POLICY_KINDS.includes(kind);
}

let indexLock: Promise<void> | null = null;
let cachedDim: number | null = null;

async function embeddingDim() {
  if (cachedDim) return cachedDim;
  const probe = await embedTexts(["aegis embedding probe"]);
  cachedDim = probe?.[0]?.length ?? null;
  return cachedDim;
}

/** Embed any chunks that have no vector, or a vector from a different model. */
export async function ensureIndexed() {
  if (indexLock) return indexLock;
  indexLock = (async () => {
    if (ragProvider() === "keyword") return;
    const chunks = await listChunks();
    if (chunks.length === 0) return;
    const dim = await embeddingDim();
    if (!dim) return;
    const stale = chunks.filter(
      (c) => !c.embedding?.length || c.embedding.length !== dim,
    );
    if (stale.length === 0) return;
    await embedNewChunks(
      stale.map((c) => {
        const next = { ...c };
        delete next.embedding;
        return next;
      }),
    );
  })().finally(() => {
    indexLock = null;
  });
  return indexLock;
}

export async function embedNewChunks(chunks: Chunk[]) {
  if (chunks.length === 0) return chunks;
  const vectors = await embedTexts(chunks.map((c) => c.text));
  if (!vectors || vectors.length !== chunks.length) return chunks;
  const updated = chunks.map((c, i) => ({ ...c, embedding: vectors[i] }));
  await saveChunks(updated);
  // LAST RESORT Pinecone (off). Uncomment if AWS never happens:
  // await upsertChunksToPinecone(updated).catch(() => undefined);
  return updated;
}

export async function retrieve(
  query: string,
  k = 8,
): Promise<RetrievedChunk[]> {
  await ensureIndexed().catch((err) => {
    console.error("RAG index skipped", err);
  });

  const policyK = Math.max(4, Math.ceil(k * 0.6));
  const regK = Math.max(2, k - policyK);

  const [localPolicies, localRegs, kb] = await Promise.all([
    retrieveLocal(query, policyK, "policy"),
    retrieveLocal(query, regK, "regulation"),
    retrieveFromKnowledgeBase(query, k).catch(() => null),
    // LAST RESORT Pinecone (off). Uncomment the import at the top too:
    // retrieveFromPinecone(query, k).catch(() => null),
  ]);

  const merged = [
    ...(kb ?? []),
    ...localPolicies,
    ...localRegs,
  ];
  // const merged = [...(kb ?? []), ...(pine ?? []), ...localPolicies, ...localRegs];
  const seen = new Set<string>();
  return merged
    .filter((item) => {
      const key = `${item.chunk.metadata.kind}:${item.chunk.text.slice(0, 80)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

async function retrieveLocal(
  query: string,
  k: number,
  bucket: "policy" | "regulation",
): Promise<RetrievedChunk[]> {
  const chunks = (await listChunks()).filter((chunk) =>
    bucket === "regulation"
      ? chunk.metadata.kind === "regulation"
      : isPolicyLike(chunk.metadata.kind),
  );
  const qVec = (await embedTexts([query]))?.[0];
  const scored = chunks.map((chunk) => {
    const kw = keywordScore(query, `${chunk.metadata.title} ${chunk.text}`);
    const sameSpace =
      Boolean(qVec) &&
      Boolean(chunk.embedding) &&
      chunk.embedding!.length === qVec!.length;
    const sem = sameSpace ? cosine(qVec!, chunk.embedding!) : 0;
    const score = sem > 0 ? 0.72 * sem + 0.28 * Math.min(1, kw) : kw;
    return { chunk, score };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, k);
}
