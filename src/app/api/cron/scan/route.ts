import { jsonError } from "@/lib/http";
import { runRegulationScan } from "@/lib/scan";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = req.headers.get("authorization");
    if (header !== `Bearer ${secret}`) return jsonError("Unauthorized", 401);
  }
  try {
    return Response.json(await runRegulationScan());
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Scan failed.", 500);
  }
}
