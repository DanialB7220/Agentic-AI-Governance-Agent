import { z } from "zod";
import { jsonError } from "@/lib/http";
import { authed } from "@/lib/session";
import { analyzeRegulationDocument } from "@/lib/agents";
import { alreadySavedPayload, findSavedRegulation } from "@/lib/duplicates";
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
  duplicateAction: z.enum(["overwrite", "add"]).optional(),
});

async function saveOrReject(body: z.infer<typeof JsonBody>) {
  const { analyze, duplicateAction, ...docInput } = body;
  if (docInput.kind === "regulation" && duplicateAction !== "add") {
    const existing = await findSavedRegulation({
      text: docInput.text,
      id: docInput.id,
    });
    if (existing && duplicateAction === "overwrite") {
      const doc = await ingestDocument({ ...docInput, id: existing.id });
      return maybeAnalyze(doc, analyze !== false);
    }
    if (existing) return alreadySavedPayload(existing);
  }
  const doc = await ingestDocument({
    ...docInput,
    id: duplicateAction === "add" ? undefined : docInput.id,
  });
  return maybeAnalyze(doc, analyze !== false);
}

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

export const POST = authed(async (req) => {
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
      const duplicateAction = String(form.get("duplicateAction") || "");
      const id = String(form.get("id") || "");
      const parsed = JsonBody.safeParse({
        title,
        kind,
        text,
        framework: framework || undefined,
        source: "upload",
        duplicateAction: duplicateAction || undefined,
        id: id || undefined,
      });
      if (!parsed.success) {
        return jsonError(
          "Could not read that upload. Use PDF, .txt, or .md.",
        );
      }
      return Response.json(await saveOrReject({ ...parsed.data, analyze }));
    }

    const parsed = JsonBody.safeParse(await req.json());
    if (!parsed.success) return jsonError("Invalid ingest payload.");
    return Response.json(await saveOrReject(parsed.data));
  } catch (err) {
    if (err instanceof Error && err.name === "AuthError") throw err;
    return jsonError(err instanceof Error ? err.message : "Ingest failed.", 500);
  }
});
