"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Building2,
  FileBarChart,
  Gauge,
  MessageSquare,
  ScrollText,
  Shield,
  Sparkles,
} from "lucide-react";
import { OnboardingBanner } from "@/components/onboarding-banner";

const BASE_NAV = [
  { href: "/copilot", label: "Copilot", icon: MessageSquare },
  { href: "/regulations", label: "Regulations", icon: BookOpen },
  { href: "/org", label: "Organization", icon: Building2 },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/risk", label: "Risk", icon: Gauge },
  { href: "/records", label: "Records", icon: ScrollText },
];

type Health = {
  knowledgeBase: boolean;
  rag?: string;
  documents: number;
  embeddings?: number;
};

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string; username: string; workspace?: "seeded" | "blank" };
}) {
  const pathname = usePathname();
  const [health, setHealth] = useState<Health | null>(null);
  const NAV =
    user.workspace === "blank"
      ? [
          { href: "/onboarding", label: "Setup", icon: Sparkles },
          ...BASE_NAV,
        ]
      : BASE_NAV;

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/");
  }

  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-white/10 bg-slate-950/60 p-4 backdrop-blur-xl md:flex">
        <Link href="/copilot" className="mb-8 flex items-center gap-2 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
            <Shield className="h-5 w-5" aria-hidden />
          </span>
          <span>
            <span className="block text-sm font-semibold leading-tight tracking-tight">Governance Agent</span>
            <span className="block text-xs text-slate-400">Governance copilot</span>
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors duration-200 ${
                  active
                    ? "bg-white/8 text-white shadow-[inset_2px_0_0_0_#f59e0b]"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mb-3 rounded-xl border border-white/10 bg-white/4 px-3 py-3 text-xs text-slate-400">
          <p className="truncate font-medium text-slate-200">{user.name}</p>
          <p className="truncate">@{user.username}</p>
          <button
            type="button"
            onClick={() => void logout()}
            className="mt-3 cursor-pointer text-amber-300 hover:text-amber-200"
          >
            Log out
          </button>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/4 px-3 py-3 text-xs text-slate-400">
          <p className="mb-1 font-medium text-slate-200">Retrieval</p>
          <p>
            {health?.knowledgeBase
              ? "AWS Bedrock Knowledge Base"
              : health?.rag === "titan"
                ? "AWS Titan embeddings"
                : health?.rag === "openai"
                  ? "OpenAI embeddings"
                  : health?.rag === "azure"
                    ? "Azure OpenAI embeddings"
                    : "Local keyword RAG"}
          </p>
          <p className="mt-1">
            {health?.documents ?? "—"} documents
            {typeof health?.embeddings === "number"
              ? ` · ${health.embeddings} vectors`
              : ""}
          </p>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 md:hidden">
          <span className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-amber-400" aria-hidden />
            <span className="font-semibold">Governance Agent</span>
          </span>
          <button
            type="button"
            onClick={() => void logout()}
            className="cursor-pointer text-sm text-amber-300"
          >
            Log out
          </button>
        </header>
        <nav
          className="flex gap-1 overflow-x-auto border-b border-white/10 px-3 py-2 md:hidden"
          aria-label="Mobile"
        >
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`cursor-pointer whitespace-nowrap rounded-full px-3 py-2 text-sm ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-slate-300 hover:bg-white/8"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <main className="min-w-0 flex-1">
          <OnboardingBanner />
          {children}
        </main>
      </div>
    </div>
  );
}
