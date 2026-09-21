import { listDocuments } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const documents = await listDocuments();
  return Response.json({ documents });
}
