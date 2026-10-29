import { jsonError } from "@/lib/http";
import { authed } from "@/lib/session";
import { installStarterPolicies } from "@/lib/store";

export const runtime = "nodejs";

export const POST = authed(async () => {
  try {
    const result = await installStarterPolicies();
    return Response.json(result);
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Could not add starter policies.",
      500,
    );
  }
});
