import { z } from "zod";
import { generateStandaloneReport } from "@/lib/agents";
import { jsonError } from "@/lib/http";
import { listReports } from "@/lib/store";
import { FRAMEWORKS } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const reports = await listReports();
  return Response.json({ reports });
}

const Body = z.object({
  frameworks: z.array(z.enum(FRAMEWORKS)).min(1).max(5).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Invalid report payload.");
  try {
    const report = await generateStandaloneReport(
      parsed.data.frameworks ?? ["cms-ma-pd"],
    );
    return Response.json({ report });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Report failed.", 500);
  }
}
