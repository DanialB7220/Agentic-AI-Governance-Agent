import { z } from "zod";
import { jsonError } from "@/lib/http";
import { ingestDocument } from "@/lib/ingest";
import { DOCUMENT_KINDS, FRAMEWORKS } from "@/lib/types";

export const runtime = "nodejs";

const JsonBody = z.object({
  title: z.string().min(1).max(300),
  kind: z.enum(DOCUMENT_KINDS),
  text: z.string().min(1).max(200_000),
  source: z.enum(["upload", "federal-register", "seed"]).optional(),
  framework: z.enum(FRAMEWORKS).optional(),
  externalUrl: z.string().url().optional(),
  publishedAt: z.string().optional(),
  id: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      const title =
        String(form.get("title") || "") ||
        (file instanceof File ? file.name : "Uploaded document");
      const kind = String(form.get("kind") || "policy");
      const framework = String(form.get("framework") || "") || undefined;
      let text = String(form.get("text") || "");
      if (file instanceof File) {
        text = (await file.text()).trim() || text;
      }
      const parsed = JsonBody.safeParse({
        title,
        kind,
        text,
        framework: framework || undefined,
        source: "upload",
      });
      if (!parsed.success) return jsonError("Could not read that upload. Use .txt or .md.");
      const doc = await ingestDocument(parsed.data);
      return Response.json({ document: doc });
    }

    const parsed = JsonBody.safeParse(await req.json());
    if (!parsed.success) return jsonError("Invalid ingest payload.");
    const doc = await ingestDocument(parsed.data);
    return Response.json({ document: doc });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Ingest failed.", 500);
  }
}
