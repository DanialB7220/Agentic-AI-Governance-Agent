import { EPICS, allTickets } from "@/lib/workstream";

function badge(text: string, className: string) {
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${className}`}
    >
      {text}
    </span>
  );
}

const STATUS: Record<string, { label: string; className: string }> = {
  done: { label: "Done", className: "bg-emerald-500/15 text-emerald-300" },
  partial: {
    label: "Started — needs more",
    className: "bg-sky-500/15 text-sky-300",
  },
  todo: { label: "Add / change", className: "bg-amber-500/15 text-amber-300" },
};

export default function WorkstreamPage() {
  const tickets = allTickets();
  const todo = tickets.filter((t) => t.status !== "done").length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-amber-400">
        Product gaps
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">
        What to add or change
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        AI governance: scan or upload a rule, compare to internal policies with
        AWS RAG, list what to change, keep audit reports, records, and risk.{" "}
        {todo} items still open. Same list in{" "}
        <code className="text-slate-300">ACTION-ITEMS.md</code>.
      </p>

      <div className="mt-8 space-y-10">
        {EPICS.map((group) => (
          <section key={group.id}>
            <h2 className="text-lg font-semibold text-white">{group.title}</h2>
            <p className="mt-1 text-sm text-slate-400">{group.point}</p>
            <ul className="mt-4 space-y-3">
              {group.tickets.map((t) => {
                const st = STATUS[t.status];
                return (
                  <li key={t.id} className="glass rounded-2xl p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-amber-300">
                        {t.id}
                      </span>
                      {badge(st.label, st.className)}
                    </div>
                    <p className="mt-2 text-sm font-medium text-white">
                      {t.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      <span className="text-slate-500">Today: </span>
                      {t.what}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      <span className="text-slate-500">Add / change: </span>
                      {t.change}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Files: {t.where}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
