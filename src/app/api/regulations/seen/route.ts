import { z } from "zod";
import { jsonError } from "@/lib/http";
import { logActivity, markRegulationsSeen } from "@/lib/store";

export const runtime = "nodejs";

const Body = z.object({
  ids: z.array(z.string().min(1)).max(100),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return jsonError("Invalid seen payload.");
  await markRegulationsSeen(parsed.data.ids);
  await logActivity({
    action: "scan",
    detail: `Marked ${parsed.data.ids.length} regulation alert${parsed.data.ids.length === 1 ? "" : "s"} as reviewed.`,
  });
  return Response.json({ ok: true });
}
