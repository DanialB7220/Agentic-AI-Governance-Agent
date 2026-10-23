import { authed } from "@/lib/session";
import { listActivity } from "@/lib/store";

export const runtime = "nodejs";

export const GET = authed(async () => {
  return Response.json({ activity: await listActivity() });
});
