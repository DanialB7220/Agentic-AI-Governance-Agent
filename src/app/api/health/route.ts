import { azureConfigured } from "@/lib/azure/config";
import { listChunks, listDocuments, listReports } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const [documents, chunks, reports] = await Promise.all([
    listDocuments(),
    listChunks(),
    listReports(),
  ]);
  return Response.json({
    azure: azureConfigured(),
    documents: documents.length,
    chunks: chunks.length,
    reports: reports.length,
    embeddings: chunks.filter((c) => c.embedding?.length).length,
  });
}
