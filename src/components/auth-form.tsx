"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Shield } from "lucide-react";

function homeFor(workspace?: "seeded" | "blank") {
  return workspace === "blank" ? "/onboarding" : "/copilot";
}

export function AuthForm({
  mode,
  title,
  subtitle,
  alternate,
}: {
  mode: "login" | "signup";
  title: string;
  subtitle: string;
  alternate: { href: string; label: string };
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") || "");
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");
    if (mode === "signup" && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const payload = { username, password };
    try {
      const res = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        error?: string;
        user?: { workspace?: "seeded" | "blank" };
      };
      if (!res.ok) {
        setError(json.error || "Could not continue.");
        setBusy(false);
        return;
      }
      window.location.assign(homeFor(json.user?.workspace));
    } catch {
      setError("Could not reach the server.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-8 flex items-center gap-2 text-sm font-semibold">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
          <Shield className="h-5 w-5" aria-hidden />
        </span>
        Governance Agent
      </Link>
      <div className="glass rounded-3xl p-6">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">{subtitle}</p>
        <form onSubmit={onSubmit} className="mt-6 grid gap-4">
          <label className="grid gap-1 text-sm">
            <span className="text-slate-300">Username</span>
            <input
              name="username"
              type="text"
              required
              minLength={3}
              maxLength={40}
              pattern="[A-Za-z0-9._\-]+"
              title="3–40 letters, numbers, dots, underscores, or hyphens"
              autoComplete="username"
              className="input"
              placeholder={mode === "signup" ? "your.company" : undefined}
              defaultValue={mode === "login" ? "admin" : undefined}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-slate-300">Password</span>
            <input
              name="password"
              type="password"
              required
              minLength={1}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="input"
              defaultValue={mode === "login" ? "admin" : undefined}
            />
          </label>
          {mode === "signup" ? (
            <label className="grid gap-1 text-sm">
              <span className="text-slate-300">Confirm password</span>
              <input
                name="confirm"
                type="password"
                required
                minLength={1}
                autoComplete="new-password"
                className="input"
              />
            </label>
          ) : null}
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="mt-2 h-11 cursor-pointer rounded-xl bg-amber-500 text-sm font-medium text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Please wait…" : title}
          </button>
        </form>
        {mode === "signup" ? (
          <p className="mt-4 text-xs leading-5 text-slate-500">
            New accounts start empty. You can name the org, then click{" "}
            <span className="text-slate-300">Add sample regulations</span> on
            onboarding.
          </p>
        ) : null}
        <p className="mt-4 text-sm text-slate-400">
          <Link href={alternate.href} className="text-amber-300 hover:text-amber-200">
            {alternate.label}
          </Link>
        </p>
      </div>
    </div>
  );
}
