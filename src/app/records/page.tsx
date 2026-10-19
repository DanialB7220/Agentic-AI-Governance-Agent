"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ActivityEvent } from "@/lib/types";

export default function RecordsPage() {
  const [activity, setActivity] = useState<ActivityEvent[] | null>(null);

  useEffect(() => {
    fetch("/api/activity")
      .then((r) => r.json())
      .then((j) => setActivity(j.activity ?? []))
      .catch(() => setActivity([]));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Records</h1>
      <p className="mt-2 text-sm text-slate-400">
        Uploads, scans, reports, and sign-offs. Stored in the local SQLite
        database, not only loose JSON files.
      </p>
      {activity === null ? (
        <p className="mt-8 text-sm text-slate-400">Loading records…</p>
      ) : activity.length === 0 ? (
        <p className="mt-8 text-sm text-slate-400">
          No activity yet. Upload a regulation or run a report.
        </p>
      ) : (
        <ul className="mt-8 grid gap-2">
          {activity.map((event) => (
            <li key={event.id} className="glass rounded-xl px-4 py-3 text-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {event.at.slice(0, 16).replace("T", " ")} · {event.action}
              </p>
              <p className="mt-1 text-slate-200">{event.detail}</p>
              {event.reportId ? (
                <Link
                  href={`/reports/${event.reportId}`}
                  className="mt-1 inline-block text-xs text-amber-300 hover:text-amber-200"
                >
                  Open report
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
