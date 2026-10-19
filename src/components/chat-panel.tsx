"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, FileUp, LoaderCircle, Sparkles } from "lucide-react";
import { Markdown } from "./markdown";
import type { ChatEvent, DocumentKind, Report, StoredDocument } from "@/lib/types";

const STARTERS = [
  {
    title: "CMS-4208-F3 vs J&J",
    prompt:
      "Analyze CMS-4208-F3 / CMS-4212-F (CY2027 MA and Part D final rule) against Johnson & Johnson’s current policies. Gap report and 30/60/90 plan. Focus Manufacturer Discount Program, TrOOP, insulin/vaccines, and marketing dates.",
  },
  {
    title: "Manufacturer Discount Program",
    prompt:
      "What does J&J still have to change to leave Coverage Gap Discount Program operations and run 42 CFR 423 subpart AA Manufacturer Discount Program, including selected drugs during MFP periods?",
  },
  {
    title: "Oct 1, 2026 marketing gate",
    prompt:
      "CY2027 marketing and communications apply beginning October 1, 2026. What is missing in our MLR SOP and what should we do before AEP creative locks?",
  },
  {
    title: "Keep us current",
    prompt:
      "Given J&J’s org snapshot and the ingested CMS final rule, what should market access, hub, and MLR do this quarter to stay compliant? Not a full TLC program.",
  },
];

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: string;
  citations?: { title: string; kind: DocumentKind }[];
  report?: Report;
};

type IngestReply = {
  duplicate?: boolean;
  message?: string;
  document?: StoredDocument;
  report?: Report;
  analyzeError?: string;
  error?: string;
};

function uploadReply(json: IngestReply) {
  if (json.duplicate) {
    return json.message || "You already uploaded this regulation.";
  }
  const title = json.document?.title ?? "that regulation";
  const changes = json.report?.changes ?? [];
  const lines = [
    `Saved **${title}**. It stays in your regulation library.`,
    json.report
      ? json.report.summary
      : json.analyzeError || "Saved. The policy comparison did not finish.",
  ];
  if (changes.length) {
    lines.push("", "Policy suggestions:");
    for (const change of changes) {
      lines.push(`- **${change.policyTitle}** — ${change.action}`);
    }
  }
  return lines.join("\n");
}

export function ChatPanel({
  preset,
}: {
  preset?: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(preset ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<StoredDocument[]>([]);
  const box = useRef<HTMLTextAreaElement>(null);

  function loadSaved() {
    fetch("/api/documents")
      .then((r) => r.json())
      .then((j) =>
        setSaved(
          (j.documents ?? []).filter(
            (doc: StoredDocument) => doc.kind === "regulation",
          ),
        ),
      )
      .catch(() => setSaved([]));
  }

  useEffect(() => {
    loadSaved();
  }, []);

  useEffect(() => {
    const presetPrompt = sessionStorage.getItem("aegis:preset");
    if (!presetPrompt) return;
    sessionStorage.removeItem("aegis:preset");
    void send(presetPrompt, "report");
    // First mount only — send is recreated each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(text: string, mode?: "chat" | "report") {
    const content = text.trim();
    if (!content || busy) return;
    const user: Message = { id: `u_${Date.now()}`, role: "user", content };
    const assistant: Message = {
      id: `a_${Date.now()}`,
      role: "assistant",
      content: "",
      status: "Starting…",
    };
    const history = [...messages, user];
    setMessages([...history, assistant]);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let next = { ...assistant };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as ChatEvent;
          if (event.type === "status") next = { ...next, status: event.step };
          if (event.type === "delta")
            next = { ...next, content: next.content + event.text, status: undefined };
          if (event.type === "citations") next = { ...next, citations: event.citations };
          if (event.type === "report") next = { ...next, report: event.report };
          if (event.type === "error")
            next = { ...next, content: event.message, status: undefined };
          setMessages([...history, next]);
        }
      }
    } catch (err) {
      setMessages([
        ...history,
        {
          ...assistant,
          status: undefined,
          content: err instanceof Error ? err.message : "Chat failed.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function uploadRegulation(file: File) {
    if (busy) return;
    const user: Message = {
      id: `u_${Date.now()}`,
      role: "user",
      content: `Upload regulation: ${file.name}`,
    };
    const assistant: Message = {
      id: `a_${Date.now()}`,
      role: "assistant",
      content: "",
      status: "Saving the regulation and comparing it to your policies…",
    };
    const history = [...messages, user];
    setMessages([...history, assistant]);
    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("kind", "regulation");
      form.set(
        "title",
        file.name.replace(/\.(pdf|txt|md|text)$/i, "") || file.name,
      );
      const res = await fetch("/api/ingest", { method: "POST", body: form });
      const json = (await res.json().catch(() => ({}))) as IngestReply;
      if (!res.ok) {
        setMessages([
          ...history,
          {
            ...assistant,
            status: undefined,
            content: json.error || "Use a PDF, .txt, or .md file.",
          },
        ]);
        return;
      }
      setMessages([
        ...history,
        {
          ...assistant,
          status: undefined,
          content: uploadReply(json),
          report: json.report,
        },
      ]);
      loadSaved();
    } catch (err) {
      setMessages([
        ...history,
        {
          ...assistant,
          status: undefined,
          content: err instanceof Error ? err.message : "Upload failed.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-6">
      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col justify-center pb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-amber-400">
            Copilot
          </p>
          <h1 className="max-w-xl text-3xl font-semibold tracking-tight text-white">
            See how a new rule lands on your org, then get a plan.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
            Drop your own regulation here (PDF, txt, or md). Aegis saves it,
            compares it to the internal policies, and tells you if you already
            uploaded that same rule.
          </p>
          {saved.length > 0 ? (
            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Saved regulations
              </p>
              <ul className="mt-2 grid gap-2">
                {saved.map((doc) => (
                  <li key={doc.id} className="text-sm text-slate-300">
                    {doc.title}
                    <span className="text-slate-500">
                      {" "}
                      · saved {doc.createdAt.slice(0, 10)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {STARTERS.map((s) => (
              <button
                key={s.title}
                type="button"
                onClick={() => send(s.prompt, "report")}
                className="glass cursor-pointer rounded-2xl p-4 text-left transition-colors duration-200 hover:border-amber-400/40"
              >
                <Sparkles className="mb-2 h-4 w-4 text-amber-400" aria-hidden />
                <p className="text-sm font-medium text-white">{s.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">{s.prompt}</p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-5 pb-28">
          {messages.map((m) => (
            <article key={m.id} className={m.role === "user" ? "ml-8" : "mr-4"}>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                {m.role === "user" ? "You" : "Aegis"}
              </p>
              <div
                className={`rounded-2xl px-4 py-3 ${
                  m.role === "user"
                    ? "bg-violet-500/15 text-sm leading-6 text-slate-100"
                    : "glass"
                }`}
              >
                {m.status && !m.content ? (
                  <p className="flex items-center gap-2 text-sm text-slate-300">
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                    {m.status}
                  </p>
                ) : m.role === "assistant" ? (
                  <Markdown text={m.content} />
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}
                {m.citations && m.citations.length > 0 && (
                  <p className="mt-3 text-[11px] text-slate-500">
                    Retrieved:{" "}
                    {[...new Set(m.citations.map((c) => c.title))].join(" · ")}
                  </p>
                )}
                {m.report && (
                  <p className="mt-3 flex flex-wrap gap-3">
                    <Link
                      href={`/reports/${m.report.id}`}
                      className="cursor-pointer text-sm font-medium text-amber-300 hover:text-amber-200"
                    >
                      Open report · {m.report.coveragePct}% covered
                    </Link>
                    <a
                      href={`/api/reports/${m.report.id}/pdf`}
                      className="cursor-pointer text-sm font-medium text-amber-300 hover:text-amber-200"
                    >
                      Export policy suggestions (PDF)
                    </a>
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <form
        className="sticky bottom-4 glass flex items-end gap-2 rounded-2xl p-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <label className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-slate-300 hover:bg-white/5">
          <FileUp className="h-4 w-4" aria-hidden />
          <span className="sr-only">Upload a regulation</span>
          <input
            type="file"
            accept=".pdf,.txt,.md,.text,application/pdf,text/plain"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void uploadRegulation(file);
            }}
          />
        </label>
        <label htmlFor="copilot-input" className="sr-only">
          Message Aegis
        </label>
        <textarea
          id="copilot-input"
          ref={box}
          rows={1}
          value={input}
          disabled={busy}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          placeholder="Ask about a rule, or upload one with the file button…"
          className="min-h-11 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl bg-amber-500 text-slate-950 transition-colors duration-200 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Send"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
