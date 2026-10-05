import { extractText } from "unpdf";

const MAX_CHARS = 800_000;

export async function textFromUpload(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const type = file.type || "";

  if (name.endsWith(".docx") || type.includes("wordprocessingml")) {
    throw new Error("Word .docx is not supported yet. Use PDF, .txt, or .md.");
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const isPdf =
    name.endsWith(".pdf") ||
    type === "application/pdf" ||
    (buffer.length >= 4 &&
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46);

  if (isPdf) {
    const extracted = await extractText(buffer, { mergePages: true });
    const pages = extracted.text;
    const joined = (
      Array.isArray(pages) ? pages.join("\n\n") : String(pages ?? "")
    )
      .replace(/\u0000/g, "")
      .trim();
    if (!joined) throw new Error("Could not read text from that PDF.");
    return joined.slice(0, MAX_CHARS);
  }

  if (
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    type.startsWith("text/") ||
    type === "application/json"
  ) {
    return new TextDecoder().decode(buffer).trim().slice(0, MAX_CHARS);
  }

  throw new Error("Use a PDF, .txt, or .md file.");
}

export async function fetchFederalRegisterFullText(
  feedId: string,
  fallback: string,
): Promise<string> {
  const documentNumber = feedId.replace(/^fr_/, "").replace(/_/g, "-");
  if (!documentNumber || documentNumber.startsWith("demo")) return fallback;
  try {
    const metaRes = await fetch(
      `https://www.federalregister.gov/api/v1/documents/${encodeURIComponent(documentNumber)}.json`,
      { cache: "no-store" },
    );
    if (!metaRes.ok) return fallback;
    const meta = (await metaRes.json()) as {
      title?: string;
      abstract?: string;
      raw_text_url?: string;
    };
    if (meta.raw_text_url) {
      const rawRes = await fetch(meta.raw_text_url, { cache: "no-store" });
      if (rawRes.ok) {
        const body = (await rawRes.text()).replace(/\s+\n/g, "\n").trim();
        if (body.length > 400) return body.slice(0, MAX_CHARS);
      }
    }
    const combined = [meta.title, meta.abstract, fallback]
      .filter(Boolean)
      .join("\n\n")
      .trim();
    return combined.slice(0, MAX_CHARS) || fallback;
  } catch {
    return fallback;
  }
}
