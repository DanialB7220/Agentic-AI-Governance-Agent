export type WorkstreamItem = {
  id: string;
  owner: string;
  window: string;
  title: string;
  detail: string;
};

export type WorkstreamGroup = {
  id: string;
  title: string;
  blurb: string;
  items: WorkstreamItem[];
};

/** Demo-readiness backlog. Keep in sync with ACTION-ITEMS.md. */
export const WORKSTREAMS: WorkstreamGroup[] = [
  {
    id: "intent",
    title: "What this demo is",
    blurb:
      "Corporate-looking showcase for J&J × CMS-4208-F3. Not a production GRC platform and not a real J&J implementation.",
    items: [
      {
        id: "intent-1",
        owner: "Presenter",
        window: "Before the room",
        title: "Say the pitch in one breath",
        detail:
          "New CMS rule drops. We already have the company’s mock policies. Scout explains the rule. Auditor diffs it against those policies and writes a 30/60/90 memo. Later the same HTTP API could sit next to PolicyTech / Veeva. This build is the idea, with fake SOPs.",
      },
      {
        id: "intent-2",
        owner: "Presenter",
        window: "Before the room",
        title: "Say what it is not",
        detail:
          "Not a CMS filing, not legal advice, not live J&J data, not SSO, not SAP. Coverage % is keyword overlap so the demo works offline. If someone asks “is this production?” — no, this is the prototype that proves the loop.",
      },
      {
        id: "intent-3",
        owner: "Engineering",
        window: "Now",
        title: "Keep the tenant looking like J&J",
        detail:
          "Org name, industry, notes, and seed SOPs should read as Innovative Medicine / market access — not a payments processor leftover. Wipe data/runtime if old Northstar docs come back.",
      },
    ],
  },
  {
    id: "local",
    title: "Get the app running on a laptop",
    blurb: "No clouds required for a keyword-only walkthrough.",
    items: [
      {
        id: "local-1",
        owner: "Engineering",
        window: "Now",
        title: "Install and boot",
        detail:
          "Node 22. npm install && cp .env.example .env.local && npm run dev. Open http://localhost:3000. Confirm Copilot, Workstream, Org, Reports, Integrate all load.",
      },
      {
        id: "local-2",
        owner: "Engineering",
        window: "Now",
        title: "Confirm seed landed",
        detail:
          "Org is Johnson & Johnson. Documents include the CMS-4208-F3 briefing plus the four stand-in SOPs (MDP finance, MLR, hub/PAP, access). Sidebar shows documents indexed. If not, delete data/runtime/ and restart.",
      },
      {
        id: "local-3",
        owner: "Engineering",
        window: "Now",
        title: "Offline path still works",
        detail:
          "With empty keys, click “CMS-4208-F3 vs J&J”. You should still get a memo from the control catalog. That is the safety net if OpenAI or AWS is down in the room.",
      },
    ],
  },
  {
    id: "openai",
    title: "OpenAI API (this demo’s chat)",
    blurb: "Public OpenAI is what teammates use. Azure is the client story, not required to demo.",
    items: [
      {
        id: "oa-1",
        owner: "Engineering",
        window: "Before demo",
        title: "Put OPENAI_API_KEY in .env.local",
        detail:
          "OPENAI_MODEL=gpt-4o (or whatever you have). Restart next dev. Sidebar Chat should read “OpenAI API (this project)” instead of Template fallback.",
      },
      {
        id: "oa-2",
        owner: "Engineering",
        window: "Before demo",
        title: "Smoke Scout + Auditor prose",
        detail:
          "Ask the copilot the CMS vs J&J starter. You want real sentences citing the mock SOP titles, not only the keyword template. If it fails, the catalog fallback still saves the demo.",
      },
      {
        id: "oa-3",
        owner: "Engineering",
        window: "Before demo",
        title: "Do not mix keys in the room",
        detail:
          "Demo laptops: OpenAI only. Do not paste J&J Azure keys into this repo. completeChat already falls through to Azure when OPENAI_API_KEY is empty — that is for a later client cutover, not this showcase.",
      },
    ],
  },
  {
    id: "mocks",
    title: "Mock internal regulations and workflows",
    blurb:
      "The product only looks real if the org corpus has gaps you can point at on screen.",
    items: [
      {
        id: "mock-1",
        owner: "Engineering",
        window: "Now",
        title: "Keep the CMS briefing as the “new rule”",
        detail:
          "Seed doc_cms_4208_f3 is a public-domain FR extract (govinfo PDF). For the demo, that is the uploaded regulation. Full PDF ingest is a later nice-to-have, not blocking.",
      },
      {
        id: "mock-2",
        owner: "Engineering",
        window: "Now",
        title: "Keep the four stand-in SOPs intentionally stale",
        detail:
          "Finance SOP still talks Coverage Gap. MLR has no Oct 1 2026 gate. Hub says “$35 after deductible.” Selected drugs live on a spreadsheet. Those gaps are the demo. Do not “fix” the mocks until after the room.",
      },
      {
        id: "mock-3",
        owner: "Engineering",
        window: "If the story needs more meat",
        title: "Paste one extra mock policy on /org",
        detail:
          "Example: a fake “Part D manufacturer discount close job aid” that still says coverage gap. Title it like an internal SOP. Kind = policy. That shows ingest live without touching seed.ts.",
      },
      {
        id: "mock-4",
        owner: "Engineering",
        window: "If asked live",
        title: "Know how to ingest a paste",
        detail:
          "/regulations paste box or /org “Index document”. .txt / .md only. Have a short markdown snippet in Notes so you are not typing from scratch.",
      },
      {
        id: "mock-5",
        owner: "Engineering",
        window: "Now",
        title: "Never put real J&J SOPs in git",
        detail:
          "data/runtime is gitignored. seed.ts is fake on purpose. If someone sends a real SOP for a private dry-run, ingest it locally only.",
      },
    ],
  },
  {
    id: "aws",
    title: "AWS Bedrock RAG (the “enterprise retrieval” slide)",
    blurb:
      "Optional for a laptop demo. Worth turning on if you want to show corporate RAG, not just keyword search.",
    items: [
      {
        id: "aws-1",
        owner: "Engineering",
        window: "If we have an AWS account",
        title: "Enable Titan Embeddings V2",
        detail:
          "AWS_REGION + AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (or AWS_BEARER_TOKEN_BEDROCK). BEDROCK_EMBEDDING_MODEL_ID=amazon.titan-embed-text-v2:0. IAM: bedrock:InvokeModel. Restart. Sidebar Retrieval should say AWS Titan embeddings. Delete data/runtime chunks if you previously used OpenAI vectors — do not mix spaces.",
      },
      {
        id: "aws-2",
        owner: "Engineering",
        window: "If we have time",
        title: "Optional Knowledge Base",
        detail:
          "S3 with the mock SOPs + CMS extract. Create a Bedrock Knowledge Base. Set BEDROCK_KNOWLEDGE_BASE_ID. rag.ts will retrieve from the KB and merge with local chunks. Sidebar: AWS Bedrock Knowledge Base.",
      },
      {
        id: "aws-3",
        owner: "Presenter",
        window: "In the room",
        title: "How to talk about AWS vs OpenAI",
        detail:
          "Chat = OpenAI in this demo, Azure when a client like J&J hosts it. Retrieval = AWS Bedrock (Titan / KB) so the corpus can live in their cloud. Two clouds on purpose, not two chat models.",
      },
      {
        id: "aws-4",
        owner: "Engineering",
        window: "If AWS is blocked",
        title: "Skip AWS without killing the demo",
        detail:
          "Keyword RAG + OpenAI chat is enough. Say “Bedrock is wired; we did not turn it on for this pass.”",
      },
    ],
  },
  {
    id: "script",
    title: "Demo script (5–7 minutes)",
    blurb: "Same path every time so the idea is obvious.",
    items: [
      {
        id: "script-1",
        owner: "Presenter",
        window: "In the room",
        title: "Org snapshot first",
        detail:
          "/org: “This is how the company says it operates today” — J&J, cms-ma-pd checked, stand-in SOPs listed. Point at the finance SOP still saying Coverage Gap.",
      },
      {
        id: "script-2",
        owner: "Presenter",
        window: "In the room",
        title: "Show the new rule",
        detail:
          "/regulations or the CMS doc on file. Link the govinfo PDF. Dates: effective June 1 2026, marketing Oct 1 2026, coverage Jan 1 2027.",
      },
      {
        id: "script-3",
        owner: "Presenter",
        window: "In the room",
        title: "Run the copilot starter",
        detail:
          "/ → “CMS-4208-F3 vs J&J”. Scout then Auditor. Wait for the memo. Call out 2–3 gaps: CGDP vs MDP, insulin “after deductible”, missing Oct 1 MLR gate.",
      },
      {
        id: "script-4",
        owner: "Presenter",
        window: "In the room",
        title: "Open the saved report",
        detail:
          "/reports → the CMS MA/Part D memo. 30/60/90 is the “what would the company do next” slide. Repeat: internal memo, not an attestation.",
      },
      {
        id: "script-5",
        owner: "Presenter",
        window: "If they ask “how does this plug in?”",
        detail:
          "/integrate. Same agents over HTTP. Story: policy system publishes a SOP → POST /api/v1/ingest → copilot already has it. Not built for this demo.",
      },
    ],
  },
  {
    id: "polish",
    title: "Make it look like a product, not a homework folder",
    blurb: "Intention is corporate-level. Execution is still a demo.",
    items: [
      {
        id: "polish-1",
        owner: "Engineering",
        window: "Before demo",
        title: "Golden questions in the copilot",
        detail:
          "Starters already cover CMS vs J&J, MDP, Oct 1 gate, keep-us-current. Do not ad-lib a PCI question in this showcase.",
      },
      {
        id: "polish-2",
        owner: "Engineering",
        window: "Before demo",
        title: "Wipe leftover payment-processor artifacts",
        detail:
          "No Northstar name, no PCI-first report button, no Claude. Chat badge OpenAI or template. Framework checkbox CMS MA/Part D on.",
      },
      {
        id: "polish-3",
        owner: "Engineering",
        window: "Before demo",
        title: "One clean reports list",
        detail:
          "Optional: delete old SOC/PCI memos from data/runtime/reports.json so the first thing they see is the CMS memo.",
      },
      {
        id: "polish-4",
        owner: "Presenter",
        window: "Before demo",
        title: "Network backup",
        detail:
          "Hotspot if the office blocks api.openai.com. Offline catalog path if the hotspot fails.",
      },
    ],
  },
  {
    id: "later",
    title: "On purpose later (not this demo)",
    blurb: "Say these if asked. Do not build them to “finish” the showcase.",
    items: [
      {
        id: "later-1",
        owner: "Engineering",
        window: "After the demo",
        title: "Azure OpenAI for a real client",
        detail:
          "Empty OPENAI_API_KEY. Set AZURE_OPENAI_*. Same agents. Re-embed if you leave Titan/OpenAI vectors behind.",
      },
      {
        id: "later-2",
        owner: "Engineering",
        window: "After the demo",
        title: "PDF ingest, Postgres, SSO",
        detail:
          "Today: .txt/.md, JSON files, no login. Fine for a showcase. Not fine for a shared J&J tenant.",
      },
      {
        id: "later-3",
        owner: "Engineering",
        window: "After the demo",
        title: "Swap mocks for real (redacted) SOPs",
        detail:
          "That is when the product stops being a story and starts being their corpus. Out of scope until they ask.",
      },
    ],
  },
];
