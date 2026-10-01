import { awsConfigured, knowledgeBaseId } from "@/lib/aws/config";
import { azureConfigured } from "@/lib/azure/config";
import { openaiConfigured } from "@/lib/llm/config";
import { listChunks, listDocuments, listReports } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const [documents, chunks, reports] = await Promise.all([
    listDocuments(),
    listChunks(),
    listReports(),
  ]);
  const openai = openaiConfigured();
  const azure = azureConfigured();
  return Response.json({
    openai,
    azure,
    chat: openai ? "openai" : azure ? "azure" : "offline",
    aws: awsConfigured(),
    knowledgeBase: Boolean(knowledgeBaseId()),
    // LAST RESORT Pinecone (off):
    // pinecone: Boolean(process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX),
    documents: documents.length,
    chunks: chunks.length,
    reports: reports.length,
    embeddings: chunks.filter((c) => c.embedding?.length).length,
  });
}
