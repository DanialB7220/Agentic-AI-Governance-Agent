import { createHash } from "node:crypto";
import { getDocument, listDocuments, listReports } from "./store";
import type { Report, StoredDocument } from "./types";

export function textFingerprint(text: string) {
  const norm = text.replace(/\s+/g, " ").trim().toLowerCase();
  return createHash("sha256").update(norm).digest("hex");
}

export async function findSavedRegulation(input: {
  text?: string;
  id?: string;
}): Promise<StoredDocument | null> {
  if (input.id) {
    const byId = await getDocument(input.id);
    if (byId?.kind === "regulation") return byId;
  }
  if (!input.text?.trim()) return null;
  const fp = textFingerprint(input.text);
  const docs = await listDocuments();
  return (
    docs.find(
      (doc) => doc.kind === "regulation" && textFingerprint(doc.text) === fp,
    ) ?? null
  );
}

export async function reportForRegulation(
  doc: StoredDocument,
): Promise<Report | null> {
  const reports = await listReports();
  return (
    reports.find((report) => report.documentId === doc.id) ??
    reports.find((report) => report.regulationTitle === doc.title) ??
    null
  );
}

export async function alreadySavedPayload(doc: StoredDocument) {
  const report = await reportForRegulation(doc);
  const when = doc.createdAt.slice(0, 10);
  return {
    duplicate: true as const,
    document: doc,
    report,
    message: `You already uploaded “${doc.title}” on ${when}. It is still saved, so I did not add it again.`,
  };
}
