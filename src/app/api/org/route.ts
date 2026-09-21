import { z } from "zod";
import { jsonError } from "@/lib/http";
import { FRAMEWORKS } from "@/lib/types";
import { getOrg, saveOrg } from "@/lib/store";

export const runtime = "nodejs";

const Patch = z.object({
  name: z.string().min(1).max(120).optional(),
  industry: z.string().max(160).optional(),
  size: z.string().max(80).optional(),
  jurisdictions: z.array(z.string()).optional(),
  frameworks: z.array(z.enum(FRAMEWORKS)).optional(),
  notes: z.string().max(4000).optional(),
});

export async function GET() {
  return Response.json({ org: await getOrg() });
}

export async function PUT(req: Request) {
  const parsed = Patch.safeParse(await req.json());
  if (!parsed.success) return jsonError("Invalid org payload.");
  const org = await saveOrg(parsed.data);
  return Response.json({ org });
}
