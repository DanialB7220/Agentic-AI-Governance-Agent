"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
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
  const [notice, setNotice] = useState("");
  const [savedReportId, setSavedReportId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/regulations")
      .then((r) => r.json())
      .then((j) => setItems(j.items ?? []))
      .catch(() => setError("Could not load the regulation feed."));
  }, []);

  async function ingestItem(item: RegulationFeedItem) {
    setBusyId(item.id);
    setError("");
    setNotice("");
    setSavedReportId(null);
    const res = await fetch("/api/regulations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    const json = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError("Ingest failed.");
      return;
    }
    setItems((prev) =>
      prev.map((x) => (x.id === item.id ? { ...x, ingested: true } : x)),
    );
    if (json.duplicate) {
      setNotice(json.message || "You already uploaded this regulation.");
      setSavedReportId(json.report?.id ?? null);
      return;
    }
    if (json.report?.id) {
      setNotice("Indexed full text and saved a “what to change” report.");
      router.push(`/reports/${json.report.id}`);
    } else if (json.analyzeError) {
      setError(json.analyzeError);
    }
  }

  async function addSamples() {
    setBusyId("samples");
    setError("");
    setNotice("");
    setSavedReportId(null);
    const res = await fetch("/api/regulations/samples", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setError(json.error || "Could not add sample regulations.");
      return;
    }
    const fresh = await fetch("/api/regulations").then((r) => r.json());
    setItems(fresh.items ?? []);
    setNotice(json.message || "Sample regulations saved.");
  }

  async function markReviewed() {
    const ids = items.filter((item) => item.isNew).map((item) => item.id);
    if (ids.length === 0) return;
    const res = await fetch("/api/regulations/seen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) {
      setError("Could not mark those rules as reviewed.");
      return;
    }
    setItems((prev) => prev.map((item) => ({ ...item, isNew: false })));
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
    setNotice("");
    setSavedReportId(null);
    setBusyId("paste");
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
    setBusyId(null);
    if (!res.ok) {
      setError(json.error || "Upload failed");
      return;
    }
    setTitle("");
    setText("");
    if (json.duplicate) {
      setNotice(json.message || "You already uploaded this regulation.");
      setSavedReportId(json.report?.id ?? null);
      return;
    }
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
        isNew: false,
      },
      ...prev,
    ]);
    if (json.report?.id) router.push(`/reports/${json.report.id}`);
    else if (json.analyzeError) setError(json.analyzeError);
  }

  async function onFile(file: File) {
    setError("");
    setNotice("");
    setSavedReportId(null);
    setBusyId("file");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("kind", "regulation");
      form.set("title", file.name);
      const res = await fetch("/api/ingest", { method: "POST", body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Use a PDF, .txt, or .md file.");
        return;
      }
      if (json.duplicate) {
        setNotice(json.message || "You already uploaded this regulation.");
        setSavedReportId(json.report?.id ?? null);
        return;
      }
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
          isNew: false,
        },
        ...prev,
      ]);
      if (json.report?.id) router.push(`/reports/${json.report.id}`);
      else if (json.analyzeError) setError(json.analyzeError);
    } catch {
      setError("Upload failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Regulations</h1>
      <p className="mt-2 text-sm text-slate-400">
        Scan the Federal Register, paste a rule, or add sample regulations
        written as assumptions for a manufacturer like Johnson &amp; Johnson.
        Indexing a real rule saves the full text and runs a “what to change”
        report against current internal policies. Samples are saved for search;
        use Analyze vs org when you want that report.
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
            disabled={!text.trim() || busyId !== null}
            className="h-10 cursor-pointer rounded-xl bg-amber-500 px-4 text-sm font-medium text-slate-950 hover:bg-amber-400 disabled:opacity-40"
          >
            Index text
            {busyId === "paste" ? "…" : ""}
          </button>
          <button
            type="button"
            disabled={busyId !== null}
            onClick={() => void addSamples()}
            className="h-10 cursor-pointer rounded-xl border border-white/10 px-4 text-sm text-slate-200 hover:bg-white/5 disabled:opacity-40"
          >
            {busyId === "samples" ? "Adding samples…" : "Add sample regulations"}
          </button>
          <label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-white/10 px-3 text-sm text-slate-300 hover:bg-white/5">
            <Upload className="h-4 w-4" aria-hidden />
            Upload file
            <input
              type="file"
              accept=".pdf,.txt,.md,.text,application/pdf,text/plain"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void onFile(file);
              }}
            />
          </label>
        </div>
      </form>

      {notice && (
        <p className="mt-4 text-sm text-emerald-300">
          {notice}{" "}
          {savedReportId ? (
            <Link
              href={`/reports/${savedReportId}`}
              className="font-medium text-amber-300 hover:text-amber-200"
            >
              Open the saved report
            </Link>
          ) : null}
        </p>
      )}
      {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}

      {items.some((item) => item.isNew) ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3">
          <p className="text-sm text-amber-100">
            {(() => {
              const count = items.filter((item) => item.isNew).length;
              return `${count} new rule${count === 1 ? "" : "s"} since you last reviewed this feed.`;
            })()}
          </p>
          <button
            type="button"
            onClick={() => void markReviewed()}
            className="h-9 cursor-pointer rounded-lg bg-amber-500 px-3 text-xs font-medium text-slate-950 hover:bg-amber-400"
          >
            Mark reviewed
          </button>
        </div>
      ) : null}

      <ul className="mt-8 grid gap-3">
        {items.map((item) => (
          <li key={item.id} className="glass rounded-2xl p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">
              {item.agency} · {item.publishedAt} · {item.type}
              {item.isNew ? " · new" : ""}
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
                {item.ingested
                  ? "Indexed"
                  : busyId === item.id
                    ? "Indexing + analyzing…"
                    : "Index into RAG"}
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
