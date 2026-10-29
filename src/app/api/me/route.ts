import { getCurrentUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { authed } from "@/lib/session";
import { getWorkspaceStatus } from "@/lib/store";

export const runtime = "nodejs";

export const GET = authed(async () => {
  const user = await getCurrentUser();
  if (!user) return jsonError("Sign in required.", 401);
  const workspace = await getWorkspaceStatus();
  return Response.json({ user, workspace });
});
