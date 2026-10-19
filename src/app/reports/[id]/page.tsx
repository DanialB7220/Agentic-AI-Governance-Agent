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
  const [signer, setSigner] = useState("");
  const [history, setHistory] = useState<Report[]>([]);

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
    fetch("/api/reports")
      .then((r) => r.json())
      .then((j) => setHistory(j.reports ?? []))
      .catch(() => setHistory([]));
  }, [id]);

  async function patch(body: unknown) {
    const res = await fetch(`/api/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.report) setReport(json.report);
  }

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
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{report.title}</h1>
        <a
          href={`/api/reports/${report.id}/pdf`}
          className="inline-flex h-10 cursor-pointer items-center rounded-xl bg-amber-500 px-4 text-sm font-medium text-slate-950 hover:bg-amber-400"
        >
          Export policy suggestions (PDF)
        </a>
      </div>
      <p className="mt-2 font-mono text-sm text-amber-300">
        {report.coveragePct}% of scored controls have supporting language
      </p>
      <p className="mt-1 text-sm text-slate-400">{report.summary}</p>
      {report.regulationTitle ? (
        <p className="mt-1 text-sm text-slate-500">
          Regulation: {report.regulationTitle} · {report.createdAt.slice(0, 10)}
        </p>
      ) : (
        <p className="mt-1 text-sm text-slate-500">{report.createdAt.slice(0, 10)}</p>
      )}
      {report.scope ? (
        <p className="mt-3 text-sm leading-6 text-slate-300">{report.scope}</p>
      ) : null}
      {report.policiesChecked?.length ? (
        <p className="mt-2 text-xs text-slate-500">
          Policies checked: {report.policiesChecked.join(" · ")}
        </p>
      ) : null}
      <form
        className="mt-4 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!signer.trim()) return;
          void patch({ signedOffBy: signer.trim() });
        }}
      >
        {report.signedOffBy ? (
          <p className="text-sm text-emerald-300">
            Signed off by {report.signedOffBy} on{" "}
            {report.signedOffAt?.slice(0, 10)}
          </p>
        ) : (
          <>
            <label htmlFor="sign-off" className="sr-only">
              Sign-off name
            </label>
            <input
              id="sign-off"
              value={signer}
              onChange={(e) => setSigner(e.target.value)}
              placeholder="Your name"
              className="input h-10 max-w-xs"
            />
            <button
              type="submit"
              className="h-10 cursor-pointer rounded-xl border border-white/10 px-3 text-sm text-slate-200 hover:bg-white/5"
            >
              Sign off
            </button>
          </>
        )}
      </form>

      {report.changes && report.changes.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-amber-200">
            What to change in our policies
          </h2>
          <ul className="mt-3 grid gap-2">
            {report.changes.map((c) => (
              <li key={c.id} className="glass rounded-xl px-4 py-3">
                <p className="text-sm font-medium">{c.policyTitle}</p>
                {c.issue ? (
                  <p className="mt-1 text-xs text-slate-400">{c.issue}</p>
                ) : null}
                <p className="mt-1 text-sm text-slate-300">{c.action}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <label className="text-xs text-slate-500">
                    Owner
                    <input
                      value={c.owner}
                      onChange={(e) =>
                        setReport({
                          ...report,
                          changes: report.changes?.map((row) =>
                            row.id === c.id ? { ...row, owner: e.target.value } : row,
                          ),
                        })
                      }
                      onBlur={() =>
                        void patch({ change: { id: c.id, owner: c.owner } })
                      }
                      className="input mt-1"
                    />
                  </label>
                  <label className="text-xs text-slate-500">
                    Due
                    <input
                      type="date"
                      value={c.dueDate}
                      onChange={(e) => {
                        const dueDate = e.target.value;
                        setReport({
                          ...report,
                          changes: report.changes?.map((row) =>
                            row.id === c.id ? { ...row, dueDate } : row,
                          ),
                        });
                        void patch({ change: { id: c.id, dueDate } });
                      }}
                      className="input mt-1"
                    />
                  </label>
                  <label className="text-xs text-slate-500">
                    Status
                    <select
                      value={c.status}
                      onChange={(e) => {
                        const status = e.target.value as typeof c.status;
                        setReport({
                          ...report,
                          changes: report.changes?.map((row) =>
                            row.id === c.id ? { ...row, status } : row,
                          ),
                        });
                        void patch({ change: { id: c.id, status } });
                      }}
                      className="input mt-1"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In progress</option>
                      <option value="done">Done</option>
                    </select>
                  </label>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-amber-200">Findings</h2>
        <ul className="mt-3 grid gap-2">
          {report.findings.map((f) => (
            <li key={f.controlId} className="glass rounded-xl px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">
                  {FRAMEWORK_LABEL[f.framework]} — {f.title}
                </p>
                <span className="flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wide text-slate-400">
                    {f.risk} risk
                  </span>
                  <StatusBadge status={f.status} />
                </span>
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

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-amber-200">Report history</h2>
        <ul className="mt-3 grid gap-2">
          {history
            .filter(
              (item) =>
                item.id !== report.id &&
                item.regulationTitle &&
                item.regulationTitle === report.regulationTitle,
            )
            .map((item) => (
              <li key={item.id}>
                <Link href={`/reports/${item.id}`} className="text-sm text-amber-300 hover:text-amber-200">
                  {item.createdAt.slice(0, 10)} · {item.title}
                </Link>
              </li>
            ))}
          {history.filter(
            (item) =>
              item.id !== report.id &&
              item.regulationTitle &&
              item.regulationTitle === report.regulationTitle,
          ).length === 0 ? (
            <li className="text-sm text-slate-500">
              This run is its own record. Later runs for the same rule stay in the list.
            </li>
          ) : null}
        </ul>
      </section>

      <section className="glass mt-8 rounded-2xl p-5">
        <h2 className="mb-3 text-sm font-semibold text-amber-200">Memo</h2>
        <Markdown text={report.markdown} />
      </section>
    </div>
  );
}
