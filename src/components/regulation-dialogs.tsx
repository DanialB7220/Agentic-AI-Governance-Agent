"use client";

import { useEffect } from "react";

export function SampleRegulationDialog({
  title,
  text,
  onClose,
}: {
  title: string;
  text: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sample-regulation-title"
        className="glass max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="sample-regulation-title" className="text-lg font-semibold text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg px-2 py-1 text-sm text-slate-300 hover:bg-white/10"
          >
            Close
          </button>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-300">{text}</p>
      </div>
    </div>
  );
}

export function DuplicateChoiceDialog({
  title,
  when,
  busy,
  onOverwrite,
  onAdd,
  onClose,
}: {
  title: string;
  when?: string;
  busy: boolean;
  onOverwrite: () => void;
  onAdd: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="duplicate-regulation-title"
        className="glass w-full max-w-lg rounded-2xl p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="duplicate-regulation-title" className="text-lg font-semibold text-white">
          This regulation is already saved
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          “{title}”{when ? ` was saved on ${when}` : ""}. Overwrite that copy
          with this upload, or add this as a separate regulation.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onOverwrite}
            className="h-10 cursor-pointer rounded-xl bg-amber-500 px-4 text-sm font-medium text-slate-950 hover:bg-amber-400 disabled:opacity-40"
          >
            Overwrite
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onAdd}
            className="h-10 cursor-pointer rounded-xl border border-white/10 px-4 text-sm text-slate-200 hover:bg-white/5 disabled:opacity-40"
          >
            Add as new
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="h-10 cursor-pointer rounded-xl px-4 text-sm text-slate-400 hover:text-white disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
