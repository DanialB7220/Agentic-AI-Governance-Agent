import { z } from "zod";
import { signup } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { bindUser } from "@/lib/session";
import { logActivity } from "@/lib/store";

export const runtime = "nodejs";

const Body = z.object({
  name: z.string().min(1).max(80),
  email: z.string().min(3).max(200),
  password: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Enter your name, email, and password.");
  try {
    const user = await signup(parsed.data);
    await bindUser(user.id, () =>
      logActivity({ action: "account", detail: "Created an account." }),
    );
    return Response.json({ user });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create the account.";
    const status = message.includes("already exists") ? 409 : 400;
    return jsonError(message, status);
  }
}
