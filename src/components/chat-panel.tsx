"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, LoaderCircle, Sparkles } from "lucide-react";
import { Markdown } from "./markdown";
import type { ChatEvent, DocumentKind, Report } from "@/lib/types";

const STARTERS = [
  {
    title: "What’s new in the feed?",
    prompt:
      "What new government regulations or proposed rules should Northstar Payments care about, and why?",
  },
  {
    title: "PCI 4.0 gap report",
    prompt:
      "Run a PCI DSS gap report against our current org documents. Tell us what to implement in 30/60/90 days.",
  },
  {
    title: "SOC 2 readiness memo",
    prompt:
      "Draft a SOC 2 Type I readiness memo. What do we already cover, what’s missing, and what would an auditor ask for next?",
  },
  {
    title: "Keep us current",
    prompt:
      "Given our org and the latest ingested regulations, what should we do this quarter to keep up? Skip a full TLC-style program — prioritize SOC 2 and PCI.",
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

export function ChatPanel({
  preset,
}: {
  preset?: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(preset ?? "");
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);

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
            Scout reads regulations. Auditor maps them to SOC 2 / PCI (not a full
            TLC program) and writes an internal readiness memo.
          </p>
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
                  <Link
                    href={`/reports/${m.report.id}`}
                    className="mt-3 inline-flex cursor-pointer text-sm font-medium text-amber-300 hover:text-amber-200"
                  >
                    Open report · {m.report.coveragePct}% covered
                  </Link>
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
          placeholder="Ask about a new rule, or paste one…"
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
