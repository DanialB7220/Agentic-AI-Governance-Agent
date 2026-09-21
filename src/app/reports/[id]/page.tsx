"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Markdown } from "@/components/markdown";
import { StatusBadge } from "@/components/status-badge";
import { FRAMEWORK_LABEL } from "@/lib/frameworks";
import type { Report } from "@/lib/types";

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [report, setReport] = useState<Report | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetch(`/api/reports/${id}`)
      .then(async (r) => {
        if (!r.ok) {
          setMissing(true);
          return;
        }
        const j = await r.json();
        setReport(j.report);
      })
      .catch(() => setMissing(true));
  }, [id]);

  if (missing) {
    return (
      <p className="p-8 text-sm text-slate-400">
        Report not found. <Link href="/reports">Back</Link>
      </p>
    );
  }
  if (!report) {
    return <p className="p-8 text-sm text-slate-400">Loading report…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/reports" className="text-xs text-amber-300 hover:text-amber-200">
        All reports
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{report.title}</h1>
      <p className="mt-2 font-mono text-sm text-amber-300">
        {report.coveragePct}% of scored controls have supporting language
      </p>
      <p className="mt-1 text-sm text-slate-400">{report.summary}</p>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-amber-200">Findings</h2>
        <ul className="mt-3 grid gap-2">
          {report.findings.map((f) => (
            <li key={f.controlId} className="glass rounded-xl px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">
                  {FRAMEWORK_LABEL[f.framework]} — {f.title}
                </p>
                <StatusBadge status={f.status} />
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-400">{f.action}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-amber-200">Roadmap</h2>
        <ul className="mt-3 grid gap-2">
          {report.roadmap.map((item, i) => (
            <li key={i} className="rounded-xl border border-white/10 px-4 py-3 text-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {item.window}
              </p>
              <p className="font-medium">{item.title}</p>
              <p className="text-slate-400">{item.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="glass mt-8 rounded-2xl p-5">
        <h2 className="mb-3 text-sm font-semibold text-amber-200">Memo</h2>
        <Markdown text={report.markdown} />
      </section>
    </div>
  );
}
