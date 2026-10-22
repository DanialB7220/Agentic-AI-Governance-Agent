import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Report } from "./types";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;

function ascii(value: string) {
  return value.replace(/[^\t\n\r\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim();
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = ascii(text).split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    if (font.widthOfTextAtSize(word, size) <= maxWidth) {
      line = word;
      continue;
    }
    let chunk = "";
    for (const char of word) {
      const trial = chunk + char;
      if (font.widthOfTextAtSize(trial, size) > maxWidth) {
        if (chunk) lines.push(chunk);
        chunk = char;
      } else {
        chunk = trial;
      }
    }
    line = chunk;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

export async function policySuggestionsPdf(report: Report) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const maxWidth = PAGE_WIDTH - MARGIN * 2;
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  function newPage() {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  }

  function ensure(height: number) {
    if (y - height < MARGIN) newPage();
  }

  function draw(
    text: string,
    size: number,
    face: PDFFont,
    color = rgb(0.1, 0.12, 0.16),
    gap = 4,
  ) {
    for (const line of wrap(text, face, size, maxWidth)) {
      ensure(size + gap);
      page.drawText(line, {
        x: MARGIN,
        y: y - size,
        size,
        font: face,
        color,
      });
      y -= size + gap;
    }
  }

  draw("Policy suggestions", 18, bold, rgb(0.45, 0.28, 0.05), 8);
  draw(report.title, 12, bold, rgb(0.1, 0.12, 0.16), 6);
  if (report.regulationTitle) {
    draw(`Regulation: ${report.regulationTitle}`, 10, font, rgb(0.25, 0.28, 0.33));
  }
  draw(`Saved ${report.createdAt.slice(0, 10)}`, 10, font, rgb(0.25, 0.28, 0.33));
  if (report.scope) {
    draw(report.scope, 10, font, rgb(0.25, 0.28, 0.33), 6);
  }
  draw(report.summary, 10, font, rgb(0.25, 0.28, 0.33), 6);
  if (report.policiesChecked?.length) {
    draw(
      `Policies checked: ${report.policiesChecked.join(", ")}`,
      10,
      font,
      rgb(0.25, 0.28, 0.33),
      6,
    );
  }
  if (report.signedOffBy) {
    draw(
      `Signed off by ${report.signedOffBy} on ${(report.signedOffAt || "").slice(0, 10)}`,
      10,
      font,
      rgb(0.1, 0.35, 0.2),
      8,
    );
  }
  draw(
    "Internal memo only. This is not a CMS filing, attestation, or legal opinion.",
    9,
    font,
    rgb(0.35, 0.38, 0.42),
    14,
  );

  const changes = report.changes ?? [];
  if (changes.length === 0) {
    draw("No named policy edits were extracted for this run.", 11, font);
  } else {
    changes.forEach((change, index) => {
      draw(`${index + 1}. ${change.policyTitle}`, 12, bold, rgb(0.1, 0.12, 0.16), 6);
      if (change.issue) {
        draw(`Issue: ${change.issue}`, 10, font, rgb(0.2, 0.22, 0.26), 4);
      }
      draw(`Change: ${change.action}`, 10, font, rgb(0.2, 0.22, 0.26), 4);
      draw(
        `Owner: ${change.owner || "Policy owner"} · Due: ${change.dueDate || "unset"} · ${change.status || "open"}`,
        10,
        font,
        rgb(0.2, 0.22, 0.26),
        12,
      );
    });
  }

  const pages = pdf.getPages();
  pages.forEach((sheet: PDFPage, index) => {
    sheet.drawText(`Governance Agent  ·  ${index + 1} / ${pages.length}`, {
      x: MARGIN,
      y: 28,
      size: 9,
      font,
      color: rgb(0.45, 0.48, 0.52),
    });
  });

  return pdf.save();
}
