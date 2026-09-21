"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FRAMEWORK_LABEL } from "@/lib/frameworks";
import type { Report } from "@/lib/types";

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function load() {
    fetch("/api/reports")
      .then((r) => r.json())
      .then((j) => setReports(j.reports ?? []));
  }

  useEffect(() => {
    load();
  }, []);

  async function generate() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frameworks: ["soc2", "pci-dss"] }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "Could not generate report");
      return;
    }
    load();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="mt-2 text-sm text-slate-400">
            Internal readiness memos. Not a SOC attestation, PCI ROC, or legal
            opinion.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void generate()}
          disabled={busy}
          className="h-10 cursor-pointer rounded-xl bg-amber-500 px-4 text-sm font-medium text-slate-950 hover:bg-amber-400 disabled:opacity-40"
        >
          {busy ? "Scoring…" : "New SOC 2 + PCI memo"}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
      <ul className="mt-8 grid gap-3">
        {reports.length === 0 && (
          <li className="text-sm text-slate-400">
            No reports yet. Run one from here or ask the copilot.
          </li>
        )}
        {reports.map((r) => (
          <li key={r.id}>
            <Link
              href={`/reports/${r.id}`}
              className="glass block cursor-pointer rounded-2xl p-4 hover:border-amber-400/40"
            >
              <p className="text-sm font-semibold text-white">{r.title}</p>
              <p className="mt-1 text-xs text-slate-400">
                {r.createdAt.slice(0, 10)} · {r.coveragePct}% covered ·{" "}
                {r.frameworks.map((f) => FRAMEWORK_LABEL[f]).join(", ")}
              </p>
              <p className="mt-2 text-sm text-slate-400">{r.summary}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
