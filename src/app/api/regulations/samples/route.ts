import { findSavedRegulation } from "@/lib/duplicates";
import { ingestDocument } from "@/lib/ingest";
import { jsonError } from "@/lib/http";
import { SAMPLE_REGULATIONS } from "@/lib/sample-regulations";

export const runtime = "nodejs";

export async function POST() {
  try {
    const added: { id: string; title: string }[] = [];
    const skipped: { id: string; title: string }[] = [];

    for (const sample of SAMPLE_REGULATIONS) {
      const existing = await findSavedRegulation({
        id: sample.id,
        text: sample.text,
      });
      if (existing) {
        skipped.push({ id: existing.id, title: existing.title });
        continue;
      }
      const doc = await ingestDocument({
        id: sample.id,
        title: sample.title,
        kind: "regulation",
        text: sample.text,
        source: "seed",
        framework: "cms-ma-pd",
        publishedAt: sample.publishedAt,
      });
      added.push({ id: doc.id, title: doc.title });
    }

    const count = added.length;
    return Response.json({
      added,
      skipped,
      message:
        count === 0
          ? "Those sample regulations are already saved."
          : `Added ${count} sample regulation${count === 1 ? "" : "s"} for a manufacturer like Johnson & Johnson. They are saved in search. Use Analyze vs org when you want a what-to-change report.`,
    });
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Could not add sample regulations.",
      500,
    );
  }
}
