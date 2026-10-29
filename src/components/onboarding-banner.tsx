"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";

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

export function OnboardingBanner() {
  const [status, setStatus] = useState<WorkspaceStatus | null>(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh() {
    const res = await fetch("/api/me");
    if (!res.ok) return;
    const json = await res.json();
    setStatus(json.workspace ?? null);
  }

  useEffect(() => {
    void refresh();
    const onRefresh = () => void refresh();
    window.addEventListener("ga-workspace-refresh", onRefresh);
    return () => window.removeEventListener("ga-workspace-refresh", onRefresh);
  }, []);

  if (!status || status.workspace !== "blank") return null;

  async function addSamples() {
    setBusy("samples");
    setNotice("");
    const res = await fetch("/api/onboarding/samples", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setNotice(json.error || "Could not add samples.");
      return;
    }
    setNotice(
      json.added
        ? "Sample regulations are in your library. Open Regulations to view them."
        : "Sample regulations were already in your library.",
    );
    await refresh();
    window.dispatchEvent(new Event("ga-workspace-refresh"));
  }

  async function addPolicies() {
    setBusy("policies");
    setNotice("");
    const res = await fetch("/api/onboarding/policies", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setNotice(json.error || "Could not add starter policies.");
      return;
    }
    setNotice(
      json.added
        ? `Added ${json.added} starter policies. Edit them on Organization.`
        : "Starter policies were already on file.",
    );
    await refresh();
    window.dispatchEvent(new Event("ga-workspace-refresh"));
  }

  async function reset() {
    if (!window.confirm("Reset this onboarding workspace to empty?")) return;
    setBusy("reset");
    setNotice("");
    const res = await fetch("/api/onboarding/reset", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setNotice(json.error || "Could not reset.");
      return;
    }
    setNotice("Workspace cleared. Start from step 1.");
    await refresh();
    window.location.assign("/org");
  }

  const steps = [
    {
      done: status.orgNamed,
      label: "Name your organization",
      href: "/org",
      detail: status.orgNamed ? status.orgName : "Tell the agents who you are",
    },
    {
      done: status.policyCount > 0,
      label: "Add at least one policy",
      href: "/org",
      detail:
        status.policyCount > 0
          ? `${status.policyCount} on file`
          : "Upload a SOP or add starter policies",
    },
    {
      done: status.regulationCount > 0,
      label: "Add regulations",
      href: "/regulations",
      detail:
        status.regulationCount > 0
          ? `${status.regulationCount} in the library`
          : "Upload a rule or add samples",
    },
  ];

  return (
    <section className="border-b border-amber-500/20 bg-amber-500/8 px-4 py-4">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-amber-300">
              Onboarding workspace
            </p>
            <h2 className="mt-1 text-base font-semibold text-white">
              {status.onboardingComplete
                ? "You are set up — run the copilot whenever you are ready"
                : "Build your org from scratch"}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
              This login starts empty on purpose. Set the company snapshot, add
              policies, then bring regulations in — or load samples in one click.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy !== ""}
              onClick={() => void addSamples()}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-amber-500 px-3 text-xs font-medium text-slate-950 hover:bg-amber-400 disabled:opacity-40"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {busy === "samples" ? "Adding…" : "Add sample regulations"}
            </button>
            <button
              type="button"
              disabled={busy !== ""}
              onClick={() => void addPolicies()}
              className="inline-flex h-9 cursor-pointer items-center rounded-full border border-white/15 px-3 text-xs text-slate-200 hover:bg-white/5 disabled:opacity-40"
            >
              {busy === "policies" ? "Adding…" : "Add starter policies"}
            </button>
            <button
              type="button"
              disabled={busy !== ""}
              onClick={() => void reset()}
              className="inline-flex h-9 cursor-pointer items-center rounded-full px-3 text-xs text-slate-500 hover:text-rose-300 disabled:opacity-40"
            >
              {busy === "reset" ? "Resetting…" : "Reset to empty"}
            </button>
          </div>
        </div>

        <ol className="grid gap-2 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.label}>
              <Link
                href={step.href}
                className="flex h-full gap-2 rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-3 hover:border-amber-400/30"
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
              </Link>
            </li>
          ))}
        </ol>

        {notice ? <p className="text-xs text-amber-200/90">{notice}</p> : null}
      </div>
    </section>
  );
}
