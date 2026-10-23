import { getCurrentUser, logout } from "@/lib/auth";
import { bindUser } from "@/lib/session";
import { logActivity } from "@/lib/store";

export const runtime = "nodejs";

export async function POST() {
  const user = await getCurrentUser();
  if (user) {
    await bindUser(user.id, () =>
      logActivity({ action: "account", detail: "Signed out." }),
    );
  }
  await logout();
  return Response.json({ ok: true });
}
