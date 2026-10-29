import { jsonError } from "@/lib/http";
import { authed } from "@/lib/session";
import { installSampleRegulations } from "@/lib/store";

export const runtime = "nodejs";

export const POST = authed(async () => {
  try {
    const result = await installSampleRegulations();
    return Response.json(result);
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Could not add sample regulations.",
      500,
    );
  }
});
