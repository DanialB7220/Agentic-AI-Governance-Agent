import { requireApiKey } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  const { POST: chat } = await import("../../chat/route");
  return chat(req);
}
