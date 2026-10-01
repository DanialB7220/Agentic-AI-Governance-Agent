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
        status: "todo",
        title: "Save the full rule text, not just the short abstract",
        what: "Indexing a feed item only saves the abstract, so RAG barely knows the rule.",
        change: "When you click Index, fetch the full Federal Register text (or HTML) and store that.",
        where: "src/app/api/regulations/route.ts",
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
        status: "todo",
        title: "Accept PDF (and later Word) uploads",
        what: "Upload only works for .txt and .md.",
        change: "Read PDF text on ingest. File picker on Regulations and Organization should allow .pdf.",
        where: "src/app/api/ingest/route.ts, org + regulations pages",
      },
      {
        id: "GOV-6",
        status: "todo",
        title: "After upload, automatically say what to change",
        what: "Upload just stores the file. You still have to go to chat and ask.",
        change: "After a regulation is saved, auto-run Auditor and open/save a report tied to that file.",
        where: "ingest.ts, agents.ts",
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
        what: "Bedrock code exists, but demo search is mostly local files + word match.",
        change: "Turn on Titan embeddings and (ideally) a Bedrock Knowledge Base of policies + rules. Sidebar should show AWS when it is on.",
        where: "src/lib/aws/*, src/lib/rag.ts, .env.local",
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
        status: "todo",
        title: "Always index a file into search when it is saved",
        what: "New policies often have no search vectors until someone re-ingests.",
        change: "Every ingest (policy or regulation) must embed into AWS/local search. Failures should show in the UI.",
        where: "src/lib/ingest.ts, store.ts",
      },
      {
        id: "GOV-9",
        status: "todo",
        title: "Keep company policies vs government rules separate in search",
        what: "Chunks mix together. The bot can treat a rule as if it were already company policy.",
        change: "Search should label “this is a policy” vs “this is a regulation.” Auditor only uses policies as proof of coverage.",
        where: "rag.ts, agents.ts (already partly true — make it strict and visible in citations)",
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
        status: "partial",
        title: "Change list for this specific new rule",
        what: "Auditor mostly checks a fixed keyword list (CMS/SOC/PCI). It is not “this PDF vs these SOPs.”",
        change: "For the selected/uploaded rule, list: which internal policy to edit, what is wrong, what to write instead.",
        where: "src/lib/agents.ts, src/lib/frameworks.ts",
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
