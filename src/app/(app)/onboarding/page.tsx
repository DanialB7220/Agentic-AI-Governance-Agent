"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import type { OrgProfile } from "@/lib/types";

type WorkspaceStatus = {
  workspace: "seeded" | "blank";
  orgNamed: boolean;
  orgName: string;
  policyCount: number;
  regulationCount: number;
  sampleCount: number;
  reportCount: number;
  onboardingComplete: boolean;
};

export default function OnboardingPage() {
  const [status, setStatus] = useState<WorkspaceStatus | null>(null);
  const [org, setOrg] = useState<OrgProfile | null>(null);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh() {
    const [meRes, orgRes] = await Promise.all([
      fetch("/api/me"),
      fetch("/api/org"),
    ]);
    if (meRes.ok) {
      const me = await meRes.json();
      setStatus(me.workspace ?? null);
    }
    if (orgRes.ok) {
      const json = await orgRes.json();
      const next = json.org as OrgProfile;
      setOrg(next);
      setName(next.name || "");
      setIndustry(next.industry || "");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function saveOrg(e: FormEvent) {
    e.preventDefault();
    if (!org || busy) return;
    setBusy("org");
    setError("");
    setNotice("");
    const res = await fetch("/api/org", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...org,
        name: name.trim(),
        industry: industry.trim(),
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setError(json.error || "Could not save organization.");
      return;
    }
    setOrg(json.org);
    setNotice("Organization saved.");
    window.dispatchEvent(new Event("ga-workspace-refresh"));
    await refresh();
  }

  async function addSamples() {
    setBusy("samples");
    setError("");
    setNotice("");
    const res = await fetch("/api/onboarding/samples", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setError(json.error || "Could not add samples.");
      return;
    }
    setNotice(
      json.added
        ? "Sample regulations added. Open Regulations anytime to view them."
        : "Sample regulations were already in your library.",
    );
    window.dispatchEvent(new Event("ga-workspace-refresh"));
    await refresh();
  }

  async function addPolicies() {
    setBusy("policies");
    setError("");
    setNotice("");
    const res = await fetch("/api/onboarding/policies", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setError(json.error || "Could not add starter policies.");
      return;
    }
    setNotice(
      json.added
        ? `Added ${json.added} starter policies. Edit them on Organization.`
        : "Starter policies were already on file.",
    );
    window.dispatchEvent(new Event("ga-workspace-refresh"));
    await refresh();
  }

  if (!status || !org) {
    return <p className="p-8 text-sm text-slate-400">Loading onboarding…</p>;
  }

  if (status.workspace === "seeded") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">You are on the seeded demo</h1>
        <p className="mt-2 text-sm text-slate-400">
          This login already has sample regulations and stand-in policies. Open the
          copilot when you are ready.
        </p>
        <Link
          href="/copilot"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-amber-500 px-4 text-sm font-medium text-slate-950 hover:bg-amber-400"
        >
          Go to Copilot
        </Link>
      </div>
    );
  }

  const steps = [
    {
      done: status.orgNamed,
      label: "Name your organization",
      detail: status.orgNamed ? status.orgName : "Who the agents are helping",
    },
    {
      done: status.policyCount > 0,
      label: "Add policies",
      detail:
        status.policyCount > 0
          ? `${status.policyCount} on file`
          : "Upload your own or add starters",
    },
    {
      done: status.regulationCount > 0,
      label: "Add regulations",
      detail:
        status.regulationCount > 0
          ? `${status.regulationCount} in the library`
          : "Upload a rule or add samples",
    },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-amber-300">
        New account setup
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        {status.onboardingComplete
          ? "You are set up"
          : "Build your workspace from scratch"}
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        New accounts start empty. Name the company, then add policies and
        regulations — or load samples and starters in one click.
      </p>

      <ol className="mt-6 grid gap-2 sm:grid-cols-3">
        {steps.map((step, index) => (
          <li
            key={step.label}
            className="flex gap-2 rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-3"
          >
            {step.done ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            )}
            <span>
              <span className="block text-[11px] uppercase tracking-wide text-slate-500">
                Step {index + 1}
              </span>
              <span className="block text-sm font-medium text-slate-100">
                {step.label}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {step.detail}
              </span>
            </span>
          </li>
        ))}
      </ol>

      <form onSubmit={saveOrg} className="glass mt-8 grid gap-3 rounded-2xl p-4">
        <p className="text-sm font-medium text-white">1. Organization snapshot</p>
        <label className="grid gap-1 text-sm">
          <span className="text-slate-300">Company name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="e.g. Northwind Health"
            required
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-slate-300">Industry</span>
          <input
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="input"
            placeholder="e.g. Healthcare manufacturer"
          />
        </label>
        <button
          type="submit"
          disabled={busy !== "" || !name.trim()}
          className="h-10 w-fit cursor-pointer rounded-xl bg-amber-500 px-4 text-sm font-medium text-slate-950 hover:bg-amber-400 disabled:opacity-40"
        >
          {busy === "org" ? "Saving…" : "Save organization"}
        </button>
        <Link href="/org" className="text-xs text-amber-300 hover:text-amber-200">
          Open full Organization settings
        </Link>
      </form>

      <div className="glass mt-4 grid gap-3 rounded-2xl p-4">
        <p className="text-sm font-medium text-white">2. Policies</p>
        <p className="text-sm text-slate-400">
          Upload real SOPs on Organization, or load stand-in starter policies for
          the demo.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy !== ""}
            onClick={() => void addPolicies()}
            className="h-10 cursor-pointer rounded-xl border border-white/15 px-4 text-sm text-slate-200 hover:bg-white/5 disabled:opacity-40"
          >
            {busy === "policies" ? "Adding…" : "Add starter policies"}
          </button>
          <Link
            href="/org"
            className="inline-flex h-10 items-center rounded-xl px-3 text-sm text-amber-300 hover:text-amber-200"
          >
            Upload your own
          </Link>
        </div>
      </div>

      <div className="glass mt-4 grid gap-3 rounded-2xl p-4">
        <p className="text-sm font-medium text-white">3. Regulations</p>
        <p className="text-sm text-slate-400">
          Paste or upload a rule, or load the built-in sample regulations in one
          click.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy !== ""}
            onClick={() => void addSamples()}
            className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-amber-500 px-4 text-sm font-medium text-slate-950 hover:bg-amber-400 disabled:opacity-40"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            {busy === "samples" ? "Adding…" : "Add sample regulations"}
          </button>
          <Link
            href="/regulations"
            className="inline-flex h-10 items-center rounded-xl px-3 text-sm text-amber-300 hover:text-amber-200"
          >
            Open Regulations
          </Link>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      {notice ? <p className="mt-4 text-sm text-emerald-300">{notice}</p> : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/copilot"
          className="inline-flex h-11 items-center rounded-xl bg-amber-500 px-4 text-sm font-medium text-slate-950 hover:bg-amber-400"
        >
          {status.onboardingComplete ? "Open Copilot" : "Skip to Copilot"}
        </Link>
        <Link
          href="/regulations"
          className="inline-flex h-11 items-center rounded-xl border border-white/15 px-4 text-sm text-slate-200 hover:bg-white/5"
        >
          Go to Regulations
        </Link>
      </div>
    </div>
  );
}
