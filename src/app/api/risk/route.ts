import { authed } from "@/lib/session";
import { riskForStatus } from "@/lib/frameworks";
import { getScan, listDocuments, listReports } from "@/lib/store";

export const runtime = "nodejs";

export const GET = authed(async () => {
  const [reports, documents, scan] = await Promise.all([
    listReports(),
    listDocuments(),
    getScan(),
  ]);
  const latest = reports[0] ?? null;
  const findings = latest?.findings ?? [];
  const openHigh = findings.filter(
    (finding) =>
      (finding.risk ?? riskForStatus(finding.status)) === "high" &&
      finding.status !== "covered",
  );
  // Org-wide: the most recent result for every control any report has scored.
  const latestByControl = new Map<string, (typeof findings)[number]>();
  for (const report of reports) {
    for (const finding of report.findings ?? []) {
      if (!latestByControl.has(finding.controlId)) {
        latestByControl.set(finding.controlId, finding);
      }
    }
  }
  const orgFindings = [...latestByControl.values()];
  const orgCovered = orgFindings.filter((f) => f.status === "covered").length;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newRules = documents.filter(
    (doc) =>
      doc.kind === "regulation" &&
      Date.parse(doc.createdAt) >= weekAgo,
  );
  const openChanges = reports.flatMap((report) =>
    (report.changes ?? []).filter((change) => change.status !== "done"),
  );
  return Response.json({
    coveragePct: latest?.coveragePct ?? null,
    orgCoveragePct: orgFindings.length
      ? Math.round((orgCovered / orgFindings.length) * 100)
      : null,
    orgControlCount: orgFindings.length,
    orgCoveredCount: orgCovered,
    lastAuditAt: latest?.createdAt ?? null,
    lastAuditTitle: latest?.title ?? null,
    lastAuditId: latest?.id ?? null,
    openHigh: openHigh.map((finding) => ({
      title: finding.title,
      action: finding.action,
      reportId: latest?.id,
    })),
    openChangeCount: openChanges.length,
    newRulesThisWeek: newRules.map((doc) => ({
      id: doc.id,
      title: doc.title,
      createdAt: doc.createdAt,
    })),
    scan,
  });
});
