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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Compliance risk</h1>
      <p className="mt-2 text-sm text-slate-400">
        Latest audit, open high gaps, and rules saved in the last seven days.
      </p>

      <section className="glass mt-6 rounded-2xl p-4 text-sm leading-6 text-slate-300">
        <h2 className="text-sm font-semibold text-amber-200">How risk is calculated</h2>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-slate-400">
          <li>
            Auditor scores each in-scope control (CMS MA/Part D, HIPAA, SOC 2, …)
            by searching your org notes and policies for that control’s keywords.
          </li>
          <li>
            Status: <span className="text-slate-200">covered</span> if enough
            keywords match (≥ ~45%), <span className="text-slate-200">partial</span>{" "}
            if some match, <span className="text-slate-200">missing</span> if none.
          </li>
          <li>
            Risk level from status: missing →{" "}
            <span className="text-rose-200">high</span>, partial →{" "}
            <span className="text-amber-200">medium</span>, covered →{" "}
            <span className="text-emerald-200">low</span>.
          </li>
          <li>
            <span className="text-slate-200">Coverage %</span> = share of scored
            controls that are covered on the latest report.
          </li>
          <li>
            This page shows that coverage, open high gaps from the latest report,
            open policy changes across reports, and regulations saved in the last
            7 days — plus the last Federal Register scan time.
          </li>
        </ol>
        <p className="mt-3 text-xs text-slate-500">
          Heuristic readiness signal for internal planning — not a HIPAA/CMS
          attestation or legal opinion.
        </p>
      </section>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Stat
          label="Latest coverage"
          value={view.coveragePct === null ? "—" : `${view.coveragePct}%`}
        />
        <Stat label="Open high risks" value={String(view.openHigh.length)} />
        <Stat
          label="Open policy changes"
          value={String(view.openChangeCount)}
        />
      </div>

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
        <h2 className="text-sm font-semibold text-rose-200">Open high risks</h2>
        <ul className="mt-3 grid gap-2">
          {view.openHigh.length === 0 ? (
            <li className="text-sm text-slate-400">No high gaps on the latest report.</li>
          ) : (
            view.openHigh.map((item) => (
              <li key={item.title} className="glass rounded-xl px-4 py-3">
                <p className="text-sm font-medium">{item.title}</p>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl px-4 py-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
