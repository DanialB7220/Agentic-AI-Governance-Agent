export type TicketStatus = "todo" | "partial" | "done";

export type Ticket = {
  id: string;
  status: TicketStatus;
  title: string;
  what: string;
  change: string;
  where: string;
};

export type TicketGroup = {
  id: string;
  title: string;
  point: string;
  tickets: Ticket[];
};

/** Keep in sync with ACTION-ITEMS.md. */
export const EPICS: TicketGroup[] = [
  {
    id: "scan",
    title: "1. Scan for new regulations",
    point: "The app should find new government rules by itself, not only when someone opens a page.",
    tickets: [
      {
        id: "GOV-1",
        status: "done",
        title: "Check for new rules on a timer",
        what: "The feed used to load only when someone opened a page.",
        change:
          "The server scans every 4 hours after startup, and GET /api/cron/scan can be called by an external scheduler.",
        where: "src/instrumentation.ts, src/lib/scan.ts, src/app/api/cron/scan/route.ts",
      },
      {
        id: "GOV-2",
        status: "done",
        title: "Show what is actually new",
        what: "Seen IDs existed, but the page never said which rules were new.",
        change:
          "Regulations shows a count and a New mark until you click Mark reviewed.",
        where: "src/app/regulations/page.tsx, src/app/api/regulations/seen/route.ts",
      },
      {
        id: "GOV-3",
        status: "done",
        title: "Save the full rule text, not just the short abstract",
        what: "Indexing used to store only the Federal Register abstract.",
        change:
          "Index now fetches documents/{number}.json and raw_text_url, then stores up to 800k characters for RAG.",
        where: "src/lib/extract-upload.ts, src/app/api/regulations/route.ts",
      },
      {
        id: "GOV-4",
        status: "done",
        title: "Scan the agencies this company cares about",
        what: "Agency list used to be hardcoded.",
        change:
          "Organization picks agencies and keywords. The feed and the timer use that list.",
        where: "src/app/org/page.tsx, src/lib/regulations.ts",
      },
    ],
  },
  {
    id: "upload",
    title: "2. Upload a new regulation",
    point: "Someone should drop in a PDF (or paste) and the rest of the product runs on it.",
    tickets: [
      {
        id: "GOV-5",
        status: "done",
        title: "Accept PDF (and later Word) uploads",
        what: "Upload only worked for pasted .txt and .md.",
        change:
          "Ingest extracts PDF text with unpdf. Regulations and Organization file pickers accept PDF, .txt, and .md. Word is still later.",
        where: "src/lib/extract-upload.ts, ingest API, org + regulations pages",
      },
      {
        id: "GOV-6",
        status: "done",
        title: "After upload, automatically say what to change",
        what: "Upload used to only store the file.",
        change:
          "Saving a regulation auto-runs Auditor, stores a report, and opens it. Policy/evidence uploads are indexed only.",
        where: "src/app/api/ingest/route.ts, src/lib/agents.ts",
      },
    ],
  },
  {
    id: "rag",
    title: "3. AWS RAG + internal policies",
    point: "Answers must come from the company’s policies and the new rule, using AWS search.",
    tickets: [
      {
        id: "GOV-7",
        status: "done",
        title: "Use AWS as the real search (not only laptop JSON)",
        what: "Search used to be mostly local word-match.",
        change:
          "Titan embeddings if AWS keys exist, else OpenAI/Azure embeddings, else keyword. Bedrock Knowledge Base still merges in when BEDROCK_KNOWLEDGE_BASE_ID is set. Seed chunks are embedded on first health/chat.",
        where: "src/lib/aws/*, src/lib/rag.ts, src/lib/embeddings.ts",
      },
      {
        id: "GOV-7b",
        status: "done",
        title: "Last resort: Pinecone (keep commented)",
        what: "Pinecone stays available only if AWS is refused later.",
        change:
          "Left fully commented. Search stays on AWS when keys exist, otherwise OpenAI, Azure, or keyword.",
        where: "src/lib/pinecone.ts, commented lines in rag.ts / ingest.ts",
      },
      {
        id: "GOV-8",
        status: "done",
        title: "Always index a file into search when it is saved",
        what: "New policies often had no search vectors.",
        change:
          "Ingest embeds immediately. ensureIndexed() backfills missing or wrong-size vectors so OpenAI and Titan are not mixed.",
        where: "src/lib/ingest.ts, src/lib/rag.ts",
      },
      {
        id: "GOV-9",
        status: "done",
        title: "Keep company policies vs government rules separate in search",
        what: "Chunks used to mix so a rule could look like company policy.",
        change:
          "Retrieve pulls policies and regulations in separate buckets. Scout labels POLICY vs REGULATION. Auditor still scores only org policies.",
        where: "src/lib/rag.ts, src/lib/agents.ts",
      },
    ],
  },
  {
    id: "changes",
    title: "4. Tell you what to change",
    point: "Output should be a concrete change list for this company, not a generic quiz.",
    tickets: [
      {
        id: "GOV-10",
        status: "done",
        title: "Change list for this specific new rule",
        what: "Auditor used to score a fixed keyword list, not this rule vs these SOPs.",
        change:
          "Reports now include a “What to change in our policies” list (named SOP, issue, action) from RAG of this regulation vs internal policies.",
        where: "src/lib/agents.ts, report detail",
      },
      {
        id: "GOV-11",
        status: "done",
        title: "Each change has an owner and a due date",
        what: "Roadmap used to be only 0–30 / 30–60 / 60–90 buckets.",
        change:
          "Each policy change has an owner, due date, and status (open / in progress / done). You can edit them on the report.",
        where: "src/lib/types.ts, src/app/reports/[id]/page.tsx",
      },
    ],
  },
  {
    id: "audit",
    title: "5. Audit reports",
    point: "The platform should produce a real audit-style report you can keep and share.",
    tickets: [
      {
        id: "GOV-12",
        status: "done",
        title: "Richer audit report (not only a chat memo)",
        what: "Reports used to be a memo and a coverage percent.",
        change:
          "Each report has scope, the rule, policies checked, findings with risk, policy changes, sign-off, and a PDF export.",
        where: "src/app/reports, src/lib/agents.ts, src/lib/policy-pdf.ts",
      },
      {
        id: "GOV-13",
        status: "done",
        title: "Do not overwrite old reports",
        what: "Runs needed a clear link to the rule and the date.",
        change:
          "Every run is a new report id tied to the regulation and date. History on the report lists earlier runs for that rule.",
        where: "src/lib/store.ts, src/app/reports/[id]/page.tsx",
      },
    ],
  },
  {
    id: "records",
    title: "6. Keep records",
    point: "Governance means a history: what was uploaded, scanned, reported, and when.",
    tickets: [
      {
        id: "GOV-14",
        status: "done",
        title: "Activity log",
        what: "There was no log of uploads, scans, or reports.",
        change:
          "Uploads, scans, reports, edits, and sign-offs are written to an activity list on Records.",
        where: "src/lib/store.ts, src/app/records/page.tsx",
      },
      {
        id: "GOV-15",
        status: "done",
        title: "Stop using only laptop JSON for records",
        what: "Records lived only in loose JSON files.",
        change:
          "Org, documents, chunks, reports, and the activity log now persist in data/runtime/aegis.db (SQLite). Existing JSON is imported once.",
        where: "src/lib/db.ts, src/lib/store.ts",
      },
    ],
  },
  {
    id: "risk",
    title: "7. Compliance risk",
    point: "Leaders need a risk view, not only a chat transcript.",
    tickets: [
      {
        id: "GOV-16",
        status: "done",
        title: "Risk level on every gap",
        what: "Findings were only covered / partial / missing.",
        change:
          "Missing is high, partial is medium, covered is low. The report shows the level.",
        where: "src/lib/frameworks.ts, src/app/reports/[id]/page.tsx",
      },
      {
        id: "GOV-17",
        status: "done",
        title: "Risk dashboard",
        what: "There was no leadership view of risk.",
        change:
          "Risk shows coverage, open high gaps, open policy changes, rules saved this week, and the last audit.",
        where: "src/app/risk/page.tsx, src/app/api/risk/route.ts",
      },
    ],
  },
];

export function allTickets() {
  return EPICS.flatMap((e) => e.tickets);
}
