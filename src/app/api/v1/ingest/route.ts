import { requireApiKey } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  const { POST: ingest } = await import("../ingest/route");
  return ingest(req);
}
