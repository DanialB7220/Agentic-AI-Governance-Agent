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
        status: "partial",
        title: "Check for new rules on a timer",
        what: "Today the Federal Register is only fetched when you open Regulations or chat.",
        change: "Add a scheduled job (every few hours) that pulls new rules and stores them even if nobody is in the app.",
        where: "src/lib/regulations.ts + new API/cron route",
      },
      {
        id: "GOV-2",
        status: "partial",
        title: "Show what is actually new",
        what: "We remember seen IDs, but the UI does not clearly alert “3 new rules since yesterday.”",
        change: "Add a New badge, a count, and a simple list of “new since last visit.” Optional email later.",
        where: "src/app/regulations/page.tsx, store",
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
        status: "todo",
        title: "Scan the agencies this company cares about",
        what: "Agency list is hardcoded (CMS, FTC, etc.).",
        change: "Let Organization pick agencies / keywords so scan matches J&J (or any client), not a generic list.",
        where: "org profile in types.ts + regulations.ts",
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
        status: "partial",
        title: "Use AWS as the real search (not only laptop JSON)",
        what: "Search used to be mostly local word-match.",
        change:
          "Titan embeddings if AWS keys exist, else OpenAI/Azure embeddings, else keyword. Bedrock Knowledge Base still merges in when BEDROCK_KNOWLEDGE_BASE_ID is set. Seed chunks are embedded on first health/chat.",
        where: "src/lib/aws/*, src/lib/rag.ts, src/lib/embeddings.ts",
      },
      {
        id: "GOV-7b",
        status: "todo",
        title: "Last resort: Pinecone (keep commented)",
        what: "If AWS never happens, we still need a cloud vector store.",
        change: "Pinecone upsert/query is already written but fully commented out in src/lib/pinecone.ts and rag.ts. Do not uncomment unless Bedrock is a no.",
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
        status: "todo",
        title: "Each change has an owner and a due date",
        what: "Roadmap is only 0–30 / 30–60 / 60–90 buckets.",
        change: "Findings need owner, due date, and status (open / in progress / done).",
        where: "src/lib/types.ts, reports UI",
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
        status: "partial",
        title: "Richer audit report (not only a chat memo)",
        what: "Reports are markdown memos with a coverage %.",
        change: "Add sections: scope, which rule, which policies were checked, findings table, what to change, who signed. Export PDF.",
        where: "src/app/reports, agents.ts",
      },
      {
        id: "GOV-13",
        status: "todo",
        title: "Do not overwrite old reports",
        what: "New runs just append in a JSON file. No version, no “this report is for rule X on date Y.”",
        change: "Every run is a new record linked to a regulation + date. You can open any past report.",
        where: "store.ts, reports/[id]",
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
        status: "todo",
        title: "Activity log",
        what: "No log of “user uploaded SOP” or “scan found 2 new rules.”",
        change: "Write an activity list: time, action, document/report id. Show it on a Records page.",
        where: "new store file + src/app/records/page.tsx",
      },
      {
        id: "GOV-15",
        status: "todo",
        title: "Stop using only laptop JSON for records",
        what: "data/runtime JSON is wiped per machine and is not a real record system.",
        change: "Move org, documents, reports, and the log to a real database (or S3 + DB). JSON is fine only for local play.",
        where: "src/lib/store.ts",
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
        status: "todo",
        title: "Risk level on every gap",
        what: "Findings are only covered / partial / missing. No high / medium / low risk.",
        change: "Add risk (high/medium/low) based on the rule + gap. Show it on the report.",
        where: "types.ts, frameworks.ts, report UI",
      },
      {
        id: "GOV-17",
        status: "todo",
        title: "Risk dashboard",
        what: "There is no home that shows overall risk, open gaps, new rules this week.",
        change: "Add a Risk (or Dashboard) page: overall score, open high risks, new regulations, last audit date.",
        where: "new src/app/risk/page.tsx",
      },
    ],
  },
];

export function allTickets() {
  return EPICS.flatMap((e) => e.tickets);
}
