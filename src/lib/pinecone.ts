/**
 * LAST RESORT — Pinecone vector DB (only if AWS Bedrock RAG never happens).
 *
 * This whole module is commented out on purpose. AWS is the real search path.
 *
 * To turn Pinecone on:
 *   1. npm install @pinecone-database/pinecone
 *   2. Uncomment the block below (and delete `export {}`)
 *   3. Uncomment the Pinecone bits in src/lib/rag.ts and src/lib/ingest.ts
 *   4. Uncomment PINECONE_* in .env.local:
 *        # PINECONE_API_KEY=
 *        # PINECONE_INDEX=aegis-governance
 *        # PINECONE_NAMESPACE=aegis
 *   5. Create a serverless index. Vector size MUST match whatever you embed with:
 *        OpenAI text-embedding-3-small → 1536
 *        Titan v2 in this repo          → 256
 */

export {};

/*
import { Pinecone } from "@pinecone-database/pinecone";
import { embedTexts } from "./embeddings";
import type { Chunk, RetrievedChunk } from "./types";

const BATCH = 100;

export function pineconeConfigured() {
  return Boolean(
    process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX,
  );
}

function namespaceName() {
  return process.env.PINECONE_NAMESPACE || "aegis";
}

let client: Pinecone | null = null;

function index() {
  if (!client) {
    client = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || "" });
  }
  return client.index(process.env.PINECONE_INDEX || "").namespace(namespaceName());
}

export async function upsertChunksToPinecone(chunks: Chunk[]) {
  if (!pineconeConfigured() || chunks.length === 0) return;
  const withVectors = chunks.filter((c) => c.embedding?.length);
  const needEmbed = chunks.filter((c) => !c.embedding?.length);
  let ready = [...withVectors];
  if (needEmbed.length) {
    const vectors = await embedTexts(needEmbed.map((c) => c.text));
    if (vectors) {
      ready = ready.concat(
        needEmbed.map((c, i) => ({ ...c, embedding: vectors[i] })),
      );
    }
  }
  const rows = ready
    .filter((c) => c.embedding?.length)
    .map((c) => ({
      id: c.id,
      values: c.embedding as number[],
      metadata: {
        documentId: c.documentId,
        title: c.metadata.title,
        kind: c.metadata.kind,
        framework: c.metadata.framework || "",
        text: c.text.slice(0, 2000),
      },
    }));
  for (let i = 0; i < rows.length; i += BATCH) {
    await index().upsert(rows.slice(i, i + BATCH));
  }
}

export async function retrieveFromPinecone(
  query: string,
  k = 8,
): Promise<RetrievedChunk[] | null> {
  if (!pineconeConfigured()) return null;
  const qVec = (await embedTexts([query]))?.[0];
  if (!qVec) return null;
  const res = await index().query({
    vector: qVec,
    topK: k,
    includeMetadata: true,
  });
  return (res.matches ?? []).flatMap((match): RetrievedChunk[] => {
    const meta = (match.metadata || {}) as Record<string, string>;
    const text = meta.text?.trim();
    if (!text) return [];
    const chunk: Chunk = {
      id: match.id,
      documentId: meta.documentId || match.id,
      text,
      metadata: {
        title: meta.title || "Pinecone",
        kind: (meta.kind as Chunk["metadata"]["kind"]) || "policy",
        framework: (meta.framework as Chunk["metadata"]["framework"]) || undefined,
      },
    };
    return [{ chunk, score: match.score ?? 0 }];
  });
}
*/
