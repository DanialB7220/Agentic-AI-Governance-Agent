import { WORKSTREAMS } from "@/lib/workstream";

export default function WorkstreamPage() {
  const total = WORKSTREAMS.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-amber-400">
        Demo readiness
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">Workstream</h1>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        What we still need so this prototype can showcase the idea: mock J&amp;J
        policies, the CMS-4208-F3 briefing, OpenAI chat, optional AWS RAG.
        Corporate-looking, not a production build. {total} items. Same list in{" "}
        <code className="text-slate-300">ACTION-ITEMS.md</code>.
      </p>

      <div className="mt-8 space-y-10">
        {WORKSTREAMS.map((group, i) => (
          <section key={group.id}>
            <h2 className="text-lg font-semibold text-white">
              {i + 1}. {group.title}
            </h2>
            <p className="mt-1 text-sm text-slate-400">{group.blurb}</p>
            <ol className="mt-4 space-y-3">
              {group.items.map((item) => (
                <li
                  key={item.id}
                  className="glass rounded-2xl p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    <p className="text-xs text-amber-300/90">{item.window}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Owner: {item.owner}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {item.detail}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
