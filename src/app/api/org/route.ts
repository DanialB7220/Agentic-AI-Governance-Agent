import { z } from "zod";
import { jsonError } from "@/lib/http";
import { authed } from "@/lib/session";
import { FRAMEWORKS } from "@/lib/types";
import { getOrg, saveOrg } from "@/lib/store";

export const runtime = "nodejs";

const Patch = z.object({
  name: z.string().min(1).max(120).optional(),
  industry: z.string().max(160).optional(),
  size: z.string().max(80).optional(),
  jurisdictions: z.array(z.string()).optional(),
  frameworks: z.array(z.enum(FRAMEWORKS)).optional(),
  scanAgencies: z.array(z.string().min(1).max(120)).max(12).optional(),
  scanKeywords: z.array(z.string().min(1).max(80)).max(12).optional(),
  notes: z.string().max(4000).optional(),
});

export const GET = authed(async () => {
  return Response.json({ org: await getOrg() });
});

export const PUT = authed(async (req) => {
  const parsed = Patch.safeParse(await req.json());
  if (!parsed.success) return jsonError("Invalid org payload.");
  const org = await saveOrg(parsed.data);
  return Response.json({ org });
});
