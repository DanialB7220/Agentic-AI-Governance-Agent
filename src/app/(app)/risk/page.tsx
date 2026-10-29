"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type RiskView = {
  coveragePct: number | null;
  lastAuditAt: string | null;
  lastAuditTitle: string | null;
  lastAuditId: string | null;
  openHigh: { title: string; action: string; reportId?: string }[];
  openChangeCount: number;
  newRulesThisWeek: { id: string; title: string; createdAt: string }[];
  scan: { lastScanAt: string | null; newIds: string[] };
};

export default function RiskPage() {
  const [view, setView] = useState<RiskView | null>(null);

  useEffect(() => {
    fetch("/api/risk")
      .then((r) => r.json())
      .then(setView)
      .catch(() => setView(null));
  }, []);

  if (!view) {
    return <p className="p-8 text-sm text-slate-400">Loading risk…</p>;
  }

  const coverageHint =
    view.coveragePct === null
      ? "Run a report to get a coverage score."
      : view.coveragePct >= 70
        ? "Higher is better — more controls look covered in your policies."
        : view.coveragePct >= 40
          ? "Mid range — some controls look covered; gaps remain."
          : "Lower is worse — most controls are missing from your policies.";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Compliance risk</h1>
      <p className="mt-2 text-sm text-slate-400">
        Two different numbers: how much looks covered overall, vs how bad each
        open gap is.
      </p>

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="glass rounded-2xl p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-300/90">
            Coverage % — overall score
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            <span className="font-medium text-white">Higher is better.</span>{" "}
            Share of checklist controls that already have matching language in
            your policies. Think “how much of the homework is done.”
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Example: 80% covered = most controls look OK on paper.
          </p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-rose-300/90">
            Risk level — per gap
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            <span className="font-medium text-white">Lower is better.</span> Each
            control gets high / medium / low from how complete it looks: missing
            → high, partial → medium, covered → low.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            “Open high risks” = gaps that are still missing (the urgent ones).
          </p>
        </div>
      </section>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Stat
          label="Coverage % (higher = better)"
          value={view.coveragePct === null ? "—" : `${view.coveragePct}%`}
          hint={coverageHint}
        />
        <Stat
          label="Open high risks (lower = better)"
          value={String(view.openHigh.length)}
          hint="Count of missing controls on the latest report — not the same as coverage %."
        />
        <Stat
          label="Open policy changes"
          value={String(view.openChangeCount)}
          hint="Suggested SOP edits still marked open across reports."
        />
      </div>

      <section className="glass mt-6 rounded-2xl p-4 text-sm leading-6 text-slate-400">
        <h2 className="text-sm font-semibold text-amber-200">Quick read</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>
            <span className="text-slate-200">High coverage % + few high risks</span>{" "}
            → policies look strong overall.
          </li>
          <li>
            <span className="text-slate-200">Low coverage % + many high risks</span>{" "}
            → lots of missing control language; start with those gaps.
          </li>
          <li>
            Numbers refresh when you run a{" "}
            <span className="text-slate-200">new</span> gap report (Copilot,
            Regulations ingest, or Reports). Uploading policies alone does not
            change Risk until you re-run.
          </li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          Internal readiness heuristic — not a HIPAA/CMS attestation or legal
          opinion.
        </p>
      </section>

      <section className="glass mt-6 rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-amber-200">Last audit</h2>
        {view.lastAuditId ? (
          <p className="mt-2 text-sm text-slate-300">
            <Link
              href={`/reports/${view.lastAuditId}`}
              className="text-amber-300 hover:text-amber-200"
            >
              {view.lastAuditTitle}
            </Link>
            <span className="text-slate-500">
              {" "}
              · {view.lastAuditAt?.slice(0, 10)}
            </span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-400">No report yet.</p>
        )}
        <p className="mt-2 text-xs text-slate-500">
          Last scan: {view.scan.lastScanAt?.slice(0, 16).replace("T", " ") || "not yet"}
          {view.scan.newIds.length
            ? ` · ${view.scan.newIds.length} unseen on the feed`
            : ""}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-rose-200">
          Open high risks (missing controls)
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          These are individual gaps rated high — separate from the overall
          coverage %.
        </p>
        <ul className="mt-3 grid gap-2">
          {view.openHigh.length === 0 ? (
            <li className="text-sm text-slate-400">No high gaps on the latest report.</li>
          ) : (
            view.openHigh.map((item) => (
              <li key={item.title} className="glass rounded-xl px-4 py-3">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-rose-300/80">
                  Risk level: high
                </p>
                <p className="mt-1 text-sm text-slate-400">{item.action}</p>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-amber-200">
          Rules saved this week
        </h2>
        <ul className="mt-3 grid gap-2">
          {view.newRulesThisWeek.length === 0 ? (
            <li className="text-sm text-slate-400">None in the last seven days.</li>
          ) : (
            view.newRulesThisWeek.map((doc) => (
              <li key={doc.id} className="rounded-xl border border-white/10 px-4 py-3 text-sm">
                {doc.title}
                <span className="text-slate-500"> · {doc.createdAt.slice(0, 10)}</span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="glass rounded-2xl px-4 py-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p>
    </div>
  );
}
