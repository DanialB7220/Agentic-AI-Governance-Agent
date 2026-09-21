import { requireApiKey } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  const { GET: list } = await import("../../reports/route");
  return list();
}

export async function POST(req: Request) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  const { POST: create } = await import("../../reports/route");
  return create(req);
}
