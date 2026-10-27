import Link from "next/link";
import {
  BookOpen,
  FileBarChart,
  Gauge,
  MessageSquare,
  ScrollText,
  Shield,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

const STEPS = [
  {
    n: "01",
    title: "Bring the rule in",
    body: "Watch the regulation feed or drop in a PDF. The library keeps the text you already saved.",
  },
  {
    n: "02",
    title: "Compare it to your policies",
    body: "The copilot checks the rule against the policies in your organization snapshot.",
  },
  {
    n: "03",
    title: "Leave with a change list",
    body: "A memo names the gap, the owner, and the date. Export it when the review needs a file.",
  },
];

const FEATURES = [
  {
    href: "/copilot",
    icon: MessageSquare,
    title: "Copilot",
    body: "Ask what a rule changes, or start from a saved prompt. Past chats stay on the account.",
  },
  {
    href: "/regulations",
    icon: BookOpen,
    title: "Regulations",
    body: "Read the built-in samples, upload your own, and choose overwrite or add when one matches.",
  },
  {
    href: "/reports",
    icon: FileBarChart,
    title: "Reports",
    body: "Open the readiness memo, update the owner and due date, and sign it off.",
  },
  {
    href: "/risk",
    icon: Gauge,
    title: "Risk",
    body: "See what is still high, what arrived this week, and when the last scan ran.",
  },
  {
    href: "/records",
    icon: ScrollText,
    title: "Records",
    body: "A local trail of uploads, scans, edits, sign-offs, and sign-ins for this account.",
  },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
            <Shield className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-sm font-semibold tracking-tight">Governance Agent</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          {user ? (
            <Link
              href="/copilot"
              className="rounded-full bg-amber-500 px-4 py-2 font-medium text-slate-950 hover:bg-amber-400"
            >
              Open workspace
            </Link>
          ) : (
            <>
              <Link href="/login" className="rounded-full px-4 py-2 text-slate-300 hover:text-white">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-amber-500 px-4 py-2 font-medium text-slate-950 hover:bg-amber-400"
              >
                Create account
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="flex-1 pb-16">
        <section className="grid items-end gap-10 py-16 md:grid-cols-[1.4fr_0.8fr]">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-400">
              Healthcare governance
            </p>
            <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              A new rule comes in. The change list goes out.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-400">
              Governance Agent reads CMS and other rules, compares them with the
              policies you keep for a healthcare company, and writes an internal
              readiness memo. It does not file anything with CMS.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={user ? "/copilot" : "/signup"}
                className="rounded-full bg-amber-500 px-5 py-3 text-sm font-medium text-slate-950 hover:bg-amber-400"
              >
                {user ? "Continue in the copilot" : "Start with an account"}
              </Link>
              <Link
                href={user ? "/regulations" : "/login"}
                className="rounded-full border border-white/15 px-5 py-3 text-sm text-slate-200 hover:bg-white/5"
              >
                {user ? "Review regulations" : "I already have an account"}
              </Link>
            </div>
          </div>
          <div className="glass rounded-3xl p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              What a memo holds
            </p>
            <ul className="mt-4 grid gap-3 text-sm text-slate-300">
              <li className="rounded-2xl bg-white/5 px-4 py-3">Which policy is covered, partial, or missing</li>
              <li className="rounded-2xl bg-white/5 px-4 py-3">The exact change, with an owner and a due date</li>
            </ul>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step) => (
            <article key={step.n} className="glass rounded-3xl p-5">
              <p className="font-mono text-xs text-amber-300">{step.n}</p>
              <h2 className="mt-3 text-lg font-semibold">{step.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{step.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-semibold tracking-tight">Inside the workspace</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Sign in once. Uploads, organization edits, reports, chat history, and the activity log are stored for that account.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              const href = user ? feature.href : "/signup";
              return (
                <Link
                  key={feature.title}
                  href={href}
                  className="glass rounded-3xl p-5 transition-colors duration-200 hover:border-amber-400/40"
                >
                  <Icon className="h-4 w-4 text-amber-400" aria-hidden />
                  <h3 className="mt-3 font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{feature.body}</p>
                </Link>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-6 text-xs leading-5 text-slate-500">
        Internal readiness memos for a healthcare company. Sample rules are assumptions, not official government text, and the loaded policies are stand-ins until you replace them.
      </footer>
    </div>
  );
}
