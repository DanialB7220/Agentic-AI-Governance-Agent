"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, FileUp, LoaderCircle, Plus, Sparkles, Trash2 } from "lucide-react";
import { DuplicateChoiceDialog } from "./regulation-dialogs";
import { Markdown } from "./markdown";
import { scrubJson } from "@/lib/scrub-names";
import type { ChatEvent, DocumentKind, Report, StoredChat, StoredDocument } from "@/lib/types";

const STARTERS = [
  {
    title: "CMS-4208-F3 vs our policies",
    prompt:
      "Analyze CMS-4208-F3 / CMS-4212-F (CY2027 MA and Part D final rule) against our current policies. Gap report and 30/60/90 plan. Focus Manufacturer Discount Program, TrOOP, insulin/vaccines, and marketing dates.",
  },
  {
    title: "Manufacturer Discount Program",
    prompt:
      "What do we still have to change to leave Coverage Gap Discount Program operations and run 42 CFR 423 subpart AA Manufacturer Discount Program, including selected drugs during MFP periods?",
  },
  {
    title: "Oct 1, 2026 marketing gate",
    prompt:
      "CY2027 marketing and communications apply beginning October 1, 2026. What is missing in our MLR SOP and what should we do before AEP creative locks?",
  },
  {
    title: "Keep us current",
    prompt:
      "Given our org snapshot and the ingested CMS final rule, what should market access, hub, and MLR do this quarter to stay compliant? Not a full TLC program.",
  },
  {
    title: "HIPAA vs our hub policies",
    prompt:
      "Run a HIPAA readiness gap report against our current policies. Focus Privacy Rule minimum necessary, Security Rule ePHI access and encryption, business associate agreements, breach notification, and workforce training.",
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

type ChatThread = StoredChat;

function threadTitle(messages: Message[]) {
  const first = messages.find((message) => message.role === "user")?.content ?? "New chat";
  const clean = first.replace(/\s+/g, " ").trim();
  return clean.length > 42 ? `${clean.slice(0, 42)}…` : clean || "New chat";
}

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
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [historyReady, setHistoryReady] = useState(false);
  const [input, setInput] = useState(preset ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<StoredDocument[]>([]);
  const [uploadChoice, setUploadChoice] = useState<{
    file: File;
    title: string;
    when: string;
    existingId: string;
  } | null>(null);
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
    let cancel = false;
    fetch("/api/chats")
      .then((res) => {
        if (res.status === 401) {
          window.location.assign("/login");
          return null;
        }
        return res.json();
      })
      .then((json) => {
        if (cancel || !json) return;
        setThreads(Array.isArray(json.chats) ? scrubJson(json.chats) : []);
        setHistoryReady(true);
      })
      .catch(() => {
        if (!cancel) setHistoryReady(true);
      });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!historyReady) return;
    const handle = window.setTimeout(() => {
      void fetch("/api/chats", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chats: threads }),
      });
    }, 500);
    return () => window.clearTimeout(handle);
  }, [threads, historyReady]);

  useEffect(() => {
    if (!historyReady || !activeId || messages.length === 0) return;
    const stored = messages.map(({ status: _status, ...message }) => message);
    const next: ChatThread = {
      id: activeId,
      title: threadTitle(stored),
      updatedAt: new Date().toISOString(),
      messages: stored,
    };
    setThreads((prev) => [next, ...prev.filter((thread) => thread.id !== activeId)].slice(0, 40));
  }, [messages, activeId, historyReady]);

  function openThread(thread: ChatThread) {
    if (busy) return;
    setActiveId(thread.id);
    setMessages(thread.messages);
    setInput("");
  }

  function newChat() {
    if (busy) return;
    setActiveId(null);
    setMessages([]);
    setInput("");
  }

  function removeThread(id: string) {
    setThreads((prev) => prev.filter((thread) => thread.id !== id));
    if (id === activeId) {
      setActiveId(null);
      setMessages([]);
    }
  }

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
    if (!activeId) setActiveId(`chat_${Date.now()}`);
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

  async function uploadRegulation(file: File, action?: "overwrite" | "add") {
    if (busy) return;
    if (!activeId) setActiveId(`chat_${Date.now()}`);
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
      if (action) form.set("duplicateAction", action);
      if (action === "overwrite" && uploadChoice?.existingId) {
        form.set("id", uploadChoice.existingId);
      }
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
      if (json.duplicate && json.document) {
        setUploadChoice({
          file,
          title: json.document.title,
          when: json.document.createdAt.slice(0, 10),
          existingId: json.document.id,
        });
      } else {
        setUploadChoice(null);
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
    <div className="flex min-h-full">
      <ChatHistory
        threads={threads}
        activeId={activeId}
        busy={busy}
        onNew={newChat}
        onOpen={openThread}
        onDelete={removeThread}
      />
      <div className="flex min-w-0 flex-1 flex-col">
      <ChatHistory
        mobile
        threads={threads}
        activeId={activeId}
        busy={busy}
        onNew={newChat}
        onOpen={openThread}
        onDelete={removeThread}
      />
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col px-4 py-6">
      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col justify-center pb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-amber-400">
            Copilot
          </p>
          <h1 className="max-w-xl text-3xl font-semibold tracking-tight text-white">
            See how a new rule lands on your org, then get a plan.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
            Drop your own regulation here (PDF, txt, or md). Governance Agent saves it,
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
                {m.role === "user" ? "You" : "Governance Agent"}
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
                      Open report · coverage {m.report.coveragePct}% (higher better)
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
          Message Governance Agent
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
        {uploadChoice ? (
          <DuplicateChoiceDialog
            title={uploadChoice.title}
            when={uploadChoice.when}
            busy={busy}
            onOverwrite={() => void uploadRegulation(uploadChoice.file, "overwrite")}
            onAdd={() => void uploadRegulation(uploadChoice.file, "add")}
            onClose={() => setUploadChoice(null)}
          />
        ) : null}
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
      </div>
    </div>
  );
}

function ChatHistory({
  threads,
  activeId,
  busy,
  mobile,
  onNew,
  onOpen,
  onDelete,
}: {
  threads: ChatThread[];
  activeId: string | null;
  busy: boolean;
  mobile?: boolean;
  onNew: () => void;
  onOpen: (thread: ChatThread) => void;
  onDelete: (id: string) => void;
}) {
  const list = threads.length === 0 ? (
    <p className={mobile ? "px-1 text-xs text-slate-500" : "px-2 text-xs text-slate-500"}>
      No chats yet
    </p>
  ) : (
    threads.map((thread) => {
      const active = thread.id === activeId;
      return (
        <div key={thread.id} className={mobile ? "flex shrink-0" : "group flex"}>
          <button
            type="button"
            disabled={busy}
            onClick={() => onOpen(thread)}
            className={`cursor-pointer truncate text-left text-sm disabled:opacity-40 ${
              mobile
                ? `max-w-40 rounded-full px-3 py-1.5 ${active ? "bg-white/15 text-white" : "text-slate-300 hover:bg-white/8"}`
                : `min-w-0 flex-1 rounded-lg px-2 py-2 ${active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"}`
            }`}
          >
            {thread.title}
          </button>
          <button
            type="button"
            disabled={busy}
            aria-label={`Delete ${thread.title}`}
            onClick={() => onDelete(thread.id)}
            className={`cursor-pointer text-slate-500 hover:text-rose-300 disabled:opacity-40 ${
              mobile ? "px-1" : "rounded-lg px-1 opacity-0 group-hover:opacity-100"
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      );
    })
  );

  if (mobile) {
    return (
      <div className="flex items-center gap-2 overflow-x-auto border-b border-white/10 px-3 py-2 md:hidden">
        <button
          type="button"
          disabled={busy}
          onClick={onNew}
          className="flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-full bg-amber-500 px-3 text-xs font-medium text-slate-950 hover:bg-amber-400 disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          New chat
        </button>
        {list}
      </div>
    );
  }

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-white/10 bg-slate-950/50 p-3 md:flex">
      <button
        type="button"
        disabled={busy}
        onClick={onNew}
        className="mb-4 flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-500 text-sm font-medium text-slate-950 hover:bg-amber-400 disabled:opacity-40"
      >
        <Plus className="h-4 w-4" aria-hidden />
        New chat
      </button>
      <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
        Chats
      </p>
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">{list}</div>
    </aside>
  );
}
