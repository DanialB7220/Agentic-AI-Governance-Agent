import { embedNewChunks } from "./rag";
import { addDocument } from "./store";
import type { DocumentKind, FrameworkId, StoredDocument } from "./types";

export async function ingestDocument(input: {
  title: string;
  kind: DocumentKind;
  text: string;
  source?: StoredDocument["source"];
  framework?: FrameworkId;
  externalUrl?: string;
  publishedAt?: string;
  id?: string;
}) {
  const text = input.text.trim();
  if (!text) throw new Error("Document text is empty.");
  const { doc, chunks } = await addDocument({
    title: input.title.trim() || "Untitled",
    kind: input.kind,
    text,
    source: input.source ?? "upload",
    framework: input.framework,
    externalUrl: input.externalUrl,
    publishedAt: input.publishedAt,
    id: input.id,
  });
  await embedNewChunks(chunks).catch(() => chunks);
  return doc;
}
