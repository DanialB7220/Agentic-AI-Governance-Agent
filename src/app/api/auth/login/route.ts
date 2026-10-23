import { z } from "zod";
import { login } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { bindUser } from "@/lib/session";
import { logActivity } from "@/lib/store";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().min(3).max(200),
  password: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Enter your email and password.");
  try {
    const user = await login(parsed.data);
    await bindUser(user.id, () =>
      logActivity({ action: "account", detail: "Signed in." }),
    );
    return Response.json({ user });
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Could not log in.",
      401,
    );
  }
}
