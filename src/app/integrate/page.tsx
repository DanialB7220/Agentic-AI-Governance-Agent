export default function IntegratePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Integrate later</h1>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Same agents, RAG, and reports over HTTP. This repo chats with the public
        OpenAI API; J&amp;J production should send the same requests after flipping
        to Azure OpenAI. Set <code>AEGIS_API_KEY</code> and send it as{" "}
        <code>x-api-key</code>.
      </p>

      <section className="mt-8 space-y-6 text-sm">
        <Endpoint
          method="POST"
          path="/api/v1/ingest"
          body={`{
  "title": "Access policy",
  "kind": "policy",
  "text": "…",
  "framework": "cms-ma-pd"
}`}
        />
        <Endpoint
          method="POST"
          path="/api/v1/chat"
          body={`{
  "mode": "report",
  "messages": [
    { "role": "user", "content": "CMS-4208-F3 gap report for J&J" }
  ]
}`}
          note="NDJSON stream: status, delta, report, done"
        />
        <Endpoint
          method="POST"
          path="/api/v1/reports"
          body={`{ "frameworks": ["cms-ma-pd"] }`}
        />
        <Endpoint method="GET" path="/api/v1/reports" body="" />
      </section>
    </div>
  );
}

function Endpoint({
  method,
  path,
  body,
  note,
}: {
  method: string;
  path: string;
  body: string;
  note?: string;
}) {
  const curl = body
    ? `curl -s ${path} \\
  -H "content-type: application/json" \\
  -H "x-api-key: $AEGIS_API_KEY" \\
  -d '${body.replaceAll("\n", " ")}'`
    : `curl -s ${path} -H "x-api-key: $AEGIS_API_KEY"`;
  return (
    <div className="glass rounded-2xl p-4">
      <p className="font-mono text-xs text-amber-300">
        {method} {path}
      </p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
      <pre className="mt-3 overflow-x-auto font-mono text-xs leading-5 text-slate-300">
        {curl}
      </pre>
    </div>
  );
}
