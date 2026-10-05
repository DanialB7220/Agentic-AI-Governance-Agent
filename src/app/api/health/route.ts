import { awsConfigured, knowledgeBaseId } from "@/lib/aws/config";
import { azureConfigured } from "@/lib/azure/config";
import { openaiConfigured } from "@/lib/llm/config";
import { ragProvider } from "@/lib/embeddings";
import { ensureIndexed } from "@/lib/rag";
import { listChunks, listDocuments, listReports } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  await ensureIndexed().catch((err) => {
    console.error("RAG index on health", err);
  });
  const [documents, chunks, reports] = await Promise.all([
    listDocuments(),
    listChunks(),
    listReports(),
  ]);
  const openai = openaiConfigured();
  const azure = azureConfigured();
  const embedded = chunks.filter((c) => c.embedding?.length).length;
  return Response.json({
    openai,
    azure,
    chat: openai ? "openai" : azure ? "azure" : "offline",
    aws: awsConfigured(),
    knowledgeBase: Boolean(knowledgeBaseId()),
    rag: ragProvider(),
    // LAST RESORT Pinecone (off):
    // pinecone: Boolean(process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX),
    documents: documents.length,
    chunks: chunks.length,
    reports: reports.length,
    embeddings: embedded,
    pendingEmbeddings: chunks.length - embedded,
  });
}
