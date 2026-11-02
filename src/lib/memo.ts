import type { GapFinding, Report } from "./types";

export type PolicyCoverage = {
  policyTitle: string;
  /** Null when no scored control maps to this policy. */
  coveragePct: number | null;
  covered: number;
  partial: number;
  missing: number;
};

export function formatMemoDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const DATE_LINE_RE = /^\s*(\*\*)?(memo )?date(\*\*)?:(\*\*)?\s/i;
const DATE_PLACEHOLDER_RE =
  /\[(current date|today'?s date|date|insert date|date here)\]/gi;

/**
 * Put the date line right after the first heading, replacing any the model
 * wrote, and fill in placeholders like "[Current Date]".
 */
export function withDateLine(markdown: string, date: Date) {
  const pretty = formatMemoDate(date);
  const lines = markdown
    .split("\n")
    .filter((line) => !DATE_LINE_RE.test(line))
    .map((line) => line.replace(DATE_PLACEHOLDER_RE, pretty));
  const dateLine = `**Date:** ${pretty}`;
  const heading = lines.findIndex((line) => line.startsWith("# "));
  if (heading === -1) return [dateLine, "", ...lines].join("\n");
  lines.splice(heading + 1, 0, "", dateLine);
  return lines.join("\n");
}

/** Share of scored controls covered, per internal policy on file. */
export function policyCoverage(
  report: Pick<Report, "findings" | "policiesChecked">,
): PolicyCoverage[] {
  const titles = report.policiesChecked?.length
    ? report.policiesChecked
    : [
        ...new Set(
          report.findings.flatMap((f) => f.policyRefs ?? []),
        ),
      ].filter((t) => !/policy review$/i.test(t));
  return titles.map((policyTitle) => {
    const mapped = report.findings.filter((f) =>
      (f.policyRefs ?? []).includes(policyTitle),
    );
    const count = (status: GapFinding["status"]) =>
      mapped.filter((f) => f.status === status).length;
    const covered = count("covered");
    return {
      policyTitle,
      coveragePct: mapped.length
        ? Math.round((covered / mapped.length) * 100)
        : null,
      covered,
      partial: count("partial"),
      missing: count("missing"),
    };
  });
}

const SECTION_HEADING = "## Coverage by policy";

/** Pin a "Coverage by policy" section above the memo's first section. */
export function withPolicyCoverage(
  markdown: string,
  report: Pick<Report, "findings" | "policiesChecked">,
) {
  const rows = policyCoverage(report);
  const lines = stripSection(markdown.split("\n"), SECTION_HEADING);
  if (rows.length === 0) return lines.join("\n");
  const section = [
    SECTION_HEADING,
    ...rows.map((row) =>
      row.coveragePct === null
        ? `- **${row.policyTitle}:** no scored controls map to this policy`
        : `- **${row.policyTitle}:** ${row.coveragePct}% covered (${row.covered} covered, ${row.partial} partial, ${row.missing} missing)`,
    ),
    "",
  ];
  const firstSection = lines.findIndex((line) => line.startsWith("## "));
  if (firstSection === -1) return [...lines, "", ...section].join("\n");
  lines.splice(firstSection, 0, ...section);
  return lines.join("\n");
}

function stripSection(lines: string[], heading: string) {
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) return lines;
  let end = start + 1;
  while (end < lines.length && !/^#{1,2} /.test(lines[end])) end++;
  return [...lines.slice(0, start), ...lines.slice(end)];
}
