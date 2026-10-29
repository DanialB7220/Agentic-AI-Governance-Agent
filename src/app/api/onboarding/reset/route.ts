import { jsonError } from "@/lib/http";
import { authed } from "@/lib/session";
import { resetBlankWorkspace } from "@/lib/store";

export const runtime = "nodejs";

export const POST = authed(async () => {
  try {
    const org = await resetBlankWorkspace();
    return Response.json({ ok: true, org });
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Could not reset the workspace.",
      400,
    );
  }
});
