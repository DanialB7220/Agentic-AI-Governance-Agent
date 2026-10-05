import { fetchRegulationFeed } from "@/lib/regulations";
import { analyzeRegulationDocument } from "@/lib/agents";
import { fetchFederalRegisterFullText } from "@/lib/extract-upload";
import { ingestDocument } from "@/lib/ingest";
import { jsonError } from "@/lib/http";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET() {
  const items = await fetchRegulationFeed();
  return Response.json({ items });
}

const IngestBody = z.object({
  id: z.string(),
  title: z.string(),
  abstract: z.string(),
  url: z.string().optional(),
  publishedAt: z.string().optional(),
  agency: z.string().optional(),
});

export async function POST(req: Request) {
  const parsed = IngestBody.safeParse(await req.json());
  if (!parsed.success) return jsonError("Invalid regulation payload.");
  const { id, title, abstract, url, publishedAt, agency } = parsed.data;
  const fallback = `${title}\nAgency: ${agency ?? "n/a"}\nPublished: ${publishedAt ?? "n/a"}\n\n${abstract}`;
  const text = await fetchFederalRegisterFullText(id, fallback);
  const doc = await ingestDocument({
    id,
    title,
    kind: "regulation",
    source: "federal-register",
    externalUrl: url,
    publishedAt,
    text,
  });
  try {
    const report = await analyzeRegulationDocument(doc);
    return Response.json({ document: doc, report });
  } catch (err) {
    console.error("Auto-analysis failed", err);
    return Response.json({
      document: doc,
      analyzeError:
        err instanceof Error ? err.message : "Could not analyze this rule.",
    });
  }
}
