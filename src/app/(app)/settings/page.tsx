"use client";

import { FormEvent, useEffect, useState } from "react";
import { AgencyPicker, FrameworkPicker } from "@/components/scope-picker";
import type { OrgProfile } from "@/lib/types";

export default function SettingsPage() {
  const [org, setOrg] = useState<OrgProfile | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [keywords, setKeywords] = useState("");

  useEffect(() => {
    fetch("/api/org")
      .then((r) => r.json())
      .then((j) => {
        setOrg(j.org);
        setKeywords(j.org.scanKeywords.join(", "));
      });
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!org || busy) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/org", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        frameworks: org.frameworks,
        scanAgencies: org.scanAgencies,
        scanKeywords: keywords
          .split(",")
          .map((word) => word.trim())
          .filter(Boolean),
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "Save failed");
      return;
    }
    setOrg(json.org);
    setSaved(true);
    window.dispatchEvent(new Event("ga-workspace-refresh"));
    setTimeout(() => setSaved(false), 1600);
  }

  if (!org) {
    return <p className="p-8 text-sm text-slate-400">Loading settings…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-2 text-sm text-slate-400">
        Add or remove frameworks and agencies when your organization changes.
        Copilot answers, gap reports, and the regulation feed follow these.
      </p>

      <form onSubmit={onSubmit} className="glass mt-8 grid gap-6 rounded-2xl p-4">
        <FrameworkPicker
          value={org.frameworks}
          onChange={(frameworks) => setOrg({ ...org, frameworks })}
        />
        <AgencyPicker
          value={org.scanAgencies}
          onChange={(scanAgencies) => setOrg({ ...org, scanAgencies })}
        />
        <div>
          <label htmlFor="keywords" className="block text-sm text-slate-300">
            Scan keywords (comma separated)
          </label>
          <p className="mb-2 mt-0.5 text-xs text-slate-500">
            Narrows the regulation feed to rules that mention these terms.
          </p>
          <input
            id="keywords"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            className="input"
          />
        </div>
        {error && <p className="text-sm text-rose-300">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="h-11 w-fit cursor-pointer rounded-xl bg-amber-500 px-4 text-sm font-medium text-slate-950 hover:bg-amber-400 disabled:opacity-40"
        >
          {saved ? "Saved" : busy ? "Saving…" : "Save settings"}
        </button>
      </form>
    </div>
  );
}
