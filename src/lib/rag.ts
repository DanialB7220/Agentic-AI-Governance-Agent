import { embedTexts } from "./aws/bedrock";
import { retrieveFromKnowledgeBase } from "./aws/knowledge-base";
import { listChunks, saveChunks } from "./store";
import type { Chunk, RetrievedChunk } from "./types";

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

export async function embedNewChunks(chunks: Chunk[]) {
  const vectors = await embedTexts(chunks.map((c) => c.text));
  if (!vectors) return chunks;
  const updated = chunks.map((c, i) => ({ ...c, embedding: vectors[i] }));
  await saveChunks(updated);
  return updated;
}

export async function retrieve(
  query: string,
  k = 8,
): Promise<RetrievedChunk[]> {
  const [local, kb] = await Promise.all([
    retrieveLocal(query, k),
    retrieveFromKnowledgeBase(query, k).catch(() => null),
  ]);
  const merged = [...(kb ?? []), ...local];
  const seen = new Set<string>();
  return merged
    .filter((item) => {
      const key = item.chunk.text.slice(0, 80);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

async function retrieveLocal(query: string, k: number): Promise<RetrievedChunk[]> {
  const chunks = await listChunks();
  const qVec = (await embedTexts([query]))?.[0];
  const scored = chunks.map((chunk) => {
    const kw = keywordScore(query, `${chunk.metadata.title} ${chunk.text}`);
    const sem =
      qVec && chunk.embedding && chunk.embedding.length === qVec.length
        ? cosine(qVec, chunk.embedding)
        : 0;
    const score = sem > 0 ? 0.72 * sem + 0.28 * Math.min(1, kw) : kw;
    return { chunk, score };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, k);
}
