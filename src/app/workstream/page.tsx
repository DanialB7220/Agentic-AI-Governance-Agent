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

const PRIORITY_LABEL = {
  "do-first": "Do first",
  "do-next": "Do next",
  later: "Later",
};

export default function WorkstreamPage() {
  const tickets = allTickets();
  const todo = tickets.filter((t) => t.status === "todo").length;
  const done = tickets.filter((t) => t.status === "done").length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-amber-400">
        Team list
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">What to code</h1>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        {todo} still to build, {done} already in the app. Same list in{" "}
        <code className="text-slate-300">ACTION-ITEMS.md</code>.
      </p>

      <div className="mt-8 space-y-10">
        {EPICS.map((group) => (
          <section key={group.id}>
            <h2 className="text-lg font-semibold text-white">{group.title}</h2>
            <ul className="mt-4 space-y-3">
              {group.tickets.map((t) => (
                <li key={t.id} className="glass rounded-2xl p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-amber-300">
                      {t.id}
                    </span>
                    {badge(
                      t.status === "done" ? "Already built" : "To code",
                      t.status === "done"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-amber-500/15 text-amber-300",
                    )}
                    {t.status === "todo" &&
                      badge(
                        PRIORITY_LABEL[t.priority],
                        "bg-white/8 text-slate-300",
                      )}
                  </div>
                  <p className="mt-2 text-sm font-medium text-white">
                    {t.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {t.what}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Where: {t.where}
                  </p>
                  <p className="mt-3 text-xs font-medium text-slate-400">
                    Done when
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-400">
                    {t.doneWhen.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
