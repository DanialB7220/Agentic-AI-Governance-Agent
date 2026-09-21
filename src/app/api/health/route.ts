import { awsConfigured, knowledgeBaseId } from "@/lib/aws/config";
import { listChunks, listDocuments, listReports } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const [documents, chunks, reports] = await Promise.all([
    listDocuments(),
    listChunks(),
    listReports(),
  ]);
  return Response.json({
    aws: awsConfigured(),
    knowledgeBase: Boolean(knowledgeBaseId()),
    documents: documents.length,
    chunks: chunks.length,
    reports: reports.length,
    embeddings: chunks.filter((c) => c.embedding?.length).length,
  });
}
