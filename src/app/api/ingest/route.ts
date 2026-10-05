import { z } from "zod";
import { jsonError } from "@/lib/http";
import { analyzeRegulationDocument } from "@/lib/agents";
import { textFromUpload } from "@/lib/extract-upload";
import { ingestDocument } from "@/lib/ingest";
import { DOCUMENT_KINDS, FRAMEWORKS } from "@/lib/types";

export const runtime = "nodejs";

const JsonBody = z.object({
  title: z.string().min(1).max(300),
  kind: z.enum(DOCUMENT_KINDS),
  text: z.string().min(1).max(800_000),
  source: z.enum(["upload", "federal-register", "seed"]).optional(),
  framework: z.enum(FRAMEWORKS).optional(),
  externalUrl: z.string().url().optional(),
  publishedAt: z.string().optional(),
  id: z.string().optional(),
  analyze: z.boolean().optional(),
});

async function maybeAnalyze(
  doc: Awaited<ReturnType<typeof ingestDocument>>,
  analyze: boolean,
) {
  if (!analyze && doc.kind !== "regulation") return { document: doc };
  if (doc.kind !== "regulation") return { document: doc };
  try {
    const report = await analyzeRegulationDocument(doc);
    return { document: doc, report };
  } catch (err) {
    console.error("Auto-analysis failed", err);
    return {
      document: doc,
      analyzeError:
        err instanceof Error ? err.message : "Could not analyze this rule.",
    };
  }
}

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
      const analyze = String(form.get("analyze") || "") !== "false";
      let text = String(form.get("text") || "");
      if (file instanceof File) {
        text = (await textFromUpload(file)) || text;
      }
      const parsed = JsonBody.safeParse({
        title,
        kind,
        text,
        framework: framework || undefined,
        source: "upload",
      });
      if (!parsed.success) {
        return jsonError(
          "Could not read that upload. Use PDF, .txt, or .md.",
        );
      }
      const doc = await ingestDocument(parsed.data);
      return Response.json(await maybeAnalyze(doc, analyze));
    }

    const parsed = JsonBody.safeParse(await req.json());
    if (!parsed.success) return jsonError("Invalid ingest payload.");
    const { analyze, ...body } = parsed.data;
    const doc = await ingestDocument(body);
    return Response.json(await maybeAnalyze(doc, analyze !== false));
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Ingest failed.", 500);
  }
}
