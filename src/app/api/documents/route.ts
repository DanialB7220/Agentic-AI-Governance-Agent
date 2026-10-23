import { authed } from "@/lib/session";
import { listDocuments } from "@/lib/store";

export const runtime = "nodejs";

export const GET = authed(async () => {
  const documents = await listDocuments();
  return Response.json({ documents });
});
