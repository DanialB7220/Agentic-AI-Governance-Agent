"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import type { RegulationFeedItem } from "@/lib/types";

export default function RegulationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<RegulationFeedItem[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");

  useEffect(() => {
    fetch("/api/regulations")
      .then((r) => r.json())
      .then((j) => setItems(j.items ?? []))
      .catch(() => setError("Could not load the regulation feed."));
  }, []);

  async function ingestItem(item: RegulationFeedItem) {
    setBusyId(item.id);
    setError("");
    const res = await fetch("/api/regulations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    setBusyId(null);
    if (!res.ok) {
      setError("Ingest failed.");
      return;
    }
    setItems((prev) =>
      prev.map((x) => (x.id === item.id ? { ...x, ingested: true } : x)),
    );
  }

  async function analyze(item: RegulationFeedItem) {
    if (!item.ingested) await ingestItem(item);
    const prompt = `Analyze this regulation against our current organization and produce a gap report with a 30/60/90 implementation plan:\n\n${item.title}\n${item.agency} · ${item.publishedAt}\n${item.abstract}`;
    sessionStorage.setItem("aegis:preset", prompt);
    router.push("/?analyze=1");
  }

  async function onUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title || "Uploaded regulation",
        kind: "regulation",
        text,
        source: "upload",
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Upload failed");
      return;
    }
    setTitle("");
    setText("");
    setItems((prev) => [
      {
        id: json.document.id,
        title: json.document.title,
        abstract: "Uploaded and indexed.",
        url: "",
        publishedAt: new Date().toISOString().slice(0, 10),
        agency: "Upload",
        type: "Upload",
        ingested: true,
      },
      ...prev,
    ]);
  }

  async function onFile(file: File) {
    const form = new FormData();
    form.set("file", file);
    form.set("kind", "regulation");
    form.set("title", file.name);
    const res = await fetch("/api/ingest", { method: "POST", body: form });
    if (!res.ok) setError("File must be readable text (.txt or .md).");
    else {
      const json = await res.json();
      setItems((prev) => [
        {
          id: json.document.id,
          title: json.document.title,
          abstract: "Uploaded and indexed.",
          url: "",
          publishedAt: new Date().toISOString().slice(0, 10),
          agency: "Upload",
          type: "Upload",
          ingested: true,
        },
        ...prev,
      ]);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Regulations</h1>
      <p className="mt-2 text-sm text-slate-400">
        Live-ish Federal Register feed (FTC, CFPB, SEC, OCC, HHS). Upload a rule
        if the feed misses it. PDF comes later — paste or drop .txt / .md for now.
      </p>

      <form onSubmit={onUpload} className="glass mt-8 grid gap-3 rounded-2xl p-4">
        <p className="text-sm font-medium">Upload or paste a rule</p>
        <label htmlFor="reg-title" className="sr-only">
          Title
        </label>
        <input
          id="reg-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="input"
        />
        <label htmlFor="reg-text" className="sr-only">
          Regulation text
        </label>
        <textarea
          id="reg-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="Paste the rule, bulletin, or internal briefing…"
          className="input"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!text.trim()}
            className="h-10 cursor-pointer rounded-xl bg-amber-500 px-4 text-sm font-medium text-slate-950 hover:bg-amber-400 disabled:opacity-40"
          >
            Index text
          </button>
          <label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-white/10 px-3 text-sm text-slate-300 hover:bg-white/5">
            <Upload className="h-4 w-4" aria-hidden />
            Upload file
            <input
              type="file"
              accept=".txt,.md,.text"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onFile(file);
              }}
            />
          </label>
        </div>
      </form>

      {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}

      <ul className="mt-8 grid gap-3">
        {items.map((item) => (
          <li key={item.id} className="glass rounded-2xl p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">
              {item.agency} · {item.publishedAt} · {item.type}
              {item.ingested ? " · indexed" : ""}
            </p>
            <h2 className="mt-1 text-sm font-semibold text-white">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{item.abstract}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busyId === item.id || item.ingested}
                onClick={() => void ingestItem(item)}
                className="h-9 cursor-pointer rounded-lg border border-white/10 px-3 text-xs text-slate-200 hover:bg-white/5 disabled:opacity-40"
              >
                {item.ingested ? "Indexed" : "Index into RAG"}
              </button>
              <button
                type="button"
                onClick={() => void analyze(item)}
                className="h-9 cursor-pointer rounded-lg bg-violet-500/20 px-3 text-xs font-medium text-violet-200 hover:bg-violet-500/30"
              >
                Analyze vs org
              </button>
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 cursor-pointer items-center rounded-lg px-3 text-xs text-amber-300 hover:text-amber-200"
                >
                  Source
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
