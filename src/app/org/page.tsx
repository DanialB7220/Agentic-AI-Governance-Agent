"use client";

import { FormEvent, useEffect, useState } from "react";
import { FRAMEWORK_LABEL } from "@/lib/frameworks";
import type { FrameworkId, OrgProfile, StoredDocument } from "@/lib/types";

const ALL_FRAMEWORKS: FrameworkId[] = ["soc2", "pci-dss", "gdpr", "nist-csf"];

export default function OrgPage() {
  const [org, setOrg] = useState<OrgProfile | null>(null);
  const [docs, setDocs] = useState<StoredDocument[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/org").then((r) => r.json()),
      fetch("/api/documents").then((r) => r.json()),
    ]).then(([o, d]) => {
      setOrg(o.org);
      setDocs(d.documents ?? []);
    });
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!org) return;
    setError("");
    const res = await fetch("/api/org", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(org),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Save failed");
      return;
    }
    setOrg(json.org);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  if (!org) {
    return <p className="p-8 text-sm text-slate-400">Loading organization…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Organization</h1>
      <p className="mt-2 text-sm text-slate-400">
        This is the snapshot Scout and Auditor compare new rules against. Keep it
        honest and short.
      </p>

      <form onSubmit={onSubmit} className="mt-8 grid gap-4">
        <Field label="Name" htmlFor="name">
          <input
            id="name"
            value={org.name}
            onChange={(e) => setOrg({ ...org, name: e.target.value })}
            className="input"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Industry" htmlFor="industry">
            <input
              id="industry"
              value={org.industry}
              onChange={(e) => setOrg({ ...org, industry: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Size" htmlFor="size">
            <input
              id="size"
              value={org.size}
              onChange={(e) => setOrg({ ...org, size: e.target.value })}
              className="input"
            />
          </Field>
        </div>
        <Field label="Jurisdictions (comma separated)" htmlFor="jur">
          <input
            id="jur"
            value={org.jurisdictions.join(", ")}
            onChange={(e) =>
              setOrg({
                ...org,
                jurisdictions: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            className="input"
          />
        </Field>
        <fieldset>
          <legend className="mb-2 text-sm text-slate-300">In-scope frameworks</legend>
          <div className="flex flex-wrap gap-2">
            {ALL_FRAMEWORKS.map((id) => {
              const on = org.frameworks.includes(id);
              return (
                <label
                  key={id}
                  className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${
                    on
                      ? "border-amber-400/50 bg-amber-400/10 text-amber-200"
                      : "border-white/10 text-slate-400"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={on}
                    onChange={() =>
                      setOrg({
                        ...org,
                        frameworks: on
                          ? org.frameworks.filter((f) => f !== id)
                          : [...org.frameworks, id],
                      })
                    }
                  />
                  {FRAMEWORK_LABEL[id]}
                </label>
              );
            })}
          </div>
        </fieldset>
        <Field label="How we actually operate" htmlFor="notes">
          <textarea
            id="notes"
            rows={5}
            value={org.notes}
            onChange={(e) => setOrg({ ...org, notes: e.target.value })}
            className="input"
          />
        </Field>
        {error && <p className="text-sm text-rose-300">{error}</p>}
        <button
          type="submit"
          className="h-11 w-fit cursor-pointer rounded-xl bg-amber-500 px-4 text-sm font-medium text-slate-950 hover:bg-amber-400"
        >
          {saved ? "Saved" : "Save snapshot"}
        </button>
      </form>

      <form
        className="glass mt-8 grid gap-3 rounded-2xl p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const data = new FormData(form);
          const title = String(data.get("title") || "Org document");
          const text = String(data.get("text") || "");
          const kind = String(data.get("kind") || "policy");
          if (!text.trim()) return;
          const res = await fetch("/api/ingest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, text, kind, source: "upload" }),
          });
          const json = await res.json();
          if (!res.ok) {
            setError(json.error || "Upload failed");
            return;
          }
          setDocs((prev) => [json.document, ...prev]);
          form.reset();
        }}
      >
        <p className="text-sm font-medium">Add a policy or evidence note</p>
        <label htmlFor="doc-title" className="sr-only">
          Document title
        </label>
        <input id="doc-title" name="title" placeholder="Title" className="input" />
        <label htmlFor="doc-kind" className="sr-only">
          Kind
        </label>
        <select id="doc-kind" name="kind" className="input">
          <option value="policy">Policy</option>
          <option value="evidence">Evidence</option>
          <option value="control">Control</option>
        </select>
        <label htmlFor="doc-text" className="sr-only">
          Document text
        </label>
        <textarea
          id="doc-text"
          name="text"
          rows={4}
          placeholder="Paste the policy or a control note…"
          className="input"
        />
        <button
          type="submit"
          className="h-10 w-fit cursor-pointer rounded-xl border border-white/10 px-4 text-sm text-slate-200 hover:bg-white/5"
        >
          Index document
        </button>
      </form>

      <h2 className="mt-12 text-lg font-semibold">Documents on file</h2>
      <ul className="mt-4 grid gap-2">
        {docs.map((d) => (
          <li key={d.id} className="glass rounded-xl px-4 py-3 text-sm">
            <p className="font-medium text-white">{d.title}</p>
            <p className="text-xs text-slate-400">
              {d.kind} · {d.source}
              {d.framework ? ` · ${FRAMEWORK_LABEL[d.framework]}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}
