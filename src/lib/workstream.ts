export type TicketPriority = "do-first" | "do-next" | "later";
export type TicketStatus = "todo" | "done";

export type Ticket = {
  id: string;
  priority: TicketPriority;
  status: TicketStatus;
  title: string;
  what: string;
  where: string;
  doneWhen: string[];
};

export type TicketGroup = {
  id: string;
  title: string;
  tickets: Ticket[];
};

/** Keep in sync with ACTION-ITEMS.md. */
export const EPICS: TicketGroup[] = [
  {
    id: "already",
    title: "Already built — do not rebuild",
    tickets: [
      {
        id: "AEGIS-1",
        priority: "do-first",
        status: "done",
        title: "Fake J&J company + fake internal policies",
        what: "When the app starts, it already pretends to be Johnson & Johnson and loads fake old policies (so the bot has something to compare).",
        where: "src/lib/seed.ts",
        doneWhen: ["App boots as J&J with several fake policies."],
      },
      {
        id: "AEGIS-2",
        priority: "do-first",
        status: "done",
        title: "Short write-up of the CMS rule is in the app",
        what: "A summary of the government PDF is already stored as a “regulation” document.",
        where: "src/lib/seed.ts",
        doneWhen: ["CMS-4208-F3 shows up in Organization documents."],
      },
      {
        id: "AEGIS-6",
        priority: "do-first",
        status: "done",
        title: "Chat uses OpenAI (this project)",
        what: "Scout and Auditor already call the public OpenAI API if you put a key in .env.local.",
        where: "src/lib/llm/openai.ts",
        doneWhen: ["With OPENAI_API_KEY, the chatbot writes real sentences."],
      },
      {
        id: "AEGIS-9",
        priority: "do-first",
        status: "done",
        title: "Search over our saved documents",
        what: "The app already finds relevant policy text (simple word match if there is no AWS/OpenAI).",
        where: "src/lib/rag.ts",
        doneWhen: ["Chat still works with no cloud keys."],
      },
      {
        id: "AEGIS-13",
        priority: "do-first",
        status: "done",
        title: "Chat page + saved memos",
        what: "Home chat and Reports page already exist. The yellow starter “CMS-4208-F3 vs J&J” already makes a memo.",
        where: "src/components/chat-panel.tsx, src/app/reports",
        doneWhen: ["Clicking the starter saves a report."],
      },
      {
        id: "AEGIS-17",
        priority: "do-next",
        status: "done",
        title: "HTTP API for other apps later",
        what: "Other tools can already call /api/v1/chat and /api/v1/ingest. Curl examples are on Integrate.",
        where: "src/app/api/v1, src/app/integrate",
        doneWhen: ["Integrate page shows working example commands."],
      },
    ],
  },
  {
    id: "must",
    title: "Must code for a good demo",
    tickets: [
      {
        id: "AEGIS-3",
        priority: "do-first",
        status: "todo",
        title: "Let people upload the real CMS PDF",
        what: "Right now you can only upload .txt or .md. Add code that reads a PDF and saves the text, so someone can drop in 2026-06600.pdf.",
        where: "src/app/api/ingest/route.ts (and a small PDF library)",
        doneWhen: [
          "Uploading the govinfo PDF creates a document",
          "A Word .docx file shows a clear “we don’t support that” message",
        ],
      },
      {
        id: "AEGIS-5",
        priority: "do-first",
        status: "todo",
        title: "One command to reset the demo",
        what: "Add npm run demo:reset that deletes the local saved data and loads the fake J&J files again. So a messy laptop is clean before a meeting.",
        where: "package.json + a small script in scripts/",
        doneWhen: [
          "Command exists",
          "After it runs, company is J&J again",
          "It does not delete .env.local (your keys)",
        ],
      },
      {
        id: "AEGIS-10",
        priority: "do-first",
        status: "todo",
        title: "Turn fake policies into search vectors when a key exists",
        what: "On first start we save policy text but often skip the “smart search” numbers. After seed, if OpenAI or AWS is set, generate those numbers automatically.",
        where: "src/lib/store.ts (after seed), src/lib/rag.ts embedNewChunks",
        doneWhen: [
          "With a key, /api/health shows embeddings greater than 0",
          "If the API fails, the app still starts",
        ],
      },
      {
        id: "AEGIS-18",
        priority: "do-first",
        status: "todo",
        title: "A tiny test that the demo path works",
        what: "A script that hits the running app: health is ok, org name has Johnson, making a report returns findings. No OpenAI needed.",
        where: "scripts/demo-smoke.sh and npm run demo:smoke",
        doneWhen: [
          "With npm run dev running, npm run demo:smoke succeeds",
          "It fails if J&J seed is missing",
        ],
      },
    ],
  },
  {
    id: "next",
    title: "Do next — makes the demo look better",
    tickets: [
      {
        id: "AEGIS-4",
        priority: "do-next",
        status: "todo",
        title: "Write 3–4 more fake internal docs",
        what: "Add more fake J&J paperwork (job aid, hub script, calendar) in seed.ts so the company looks fuller. Keep them outdated on purpose.",
        where: "src/lib/seed.ts",
        doneWhen: ["New fake docs show on the Organization page after reset."],
      },
      {
        id: "AEGIS-7",
        priority: "do-next",
        status: "todo",
        title: "If OpenAI fails, say so in the chat",
        what: "If the key is wrong or the API times out, show “OpenAI failed: …” instead of a quiet weak memo.",
        where: "src/lib/llm/openai.ts, src/lib/agents.ts, chat panel",
        doneWhen: ["A bad key shows an error in the chat, not silence."],
      },
      {
        id: "AEGIS-11",
        priority: "do-next",
        status: "todo",
        title: "Turn on AWS search (Bedrock) for the demo AWS account",
        what: "The AWS search code is already written. You still need: AWS keys, optional Knowledge Base id in .env.local, and a short note in the README how to set it up. No passwords in git.",
        where: "src/lib/aws/*, .env.example, README",
        doneWhen: [
          "With AWS set, the sidebar says Titan or Knowledge Base",
          "Setup steps are in the README",
        ],
      },
      {
        id: "AEGIS-12",
        priority: "do-next",
        status: "todo",
        title: "Don’t mix two kinds of search numbers",
        what: "OpenAI search numbers and AWS search numbers are different sizes. If someone switches, delete the old numbers and make new ones so search is not nonsense.",
        where: "src/lib/rag.ts or store.ts",
        doneWhen: ["Switching from OpenAI to AWS still returns sensible search results."],
      },
      {
        id: "AEGIS-14",
        priority: "do-next",
        status: "todo",
        title: "Make the gap checklist match the fake policies",
        what: "The app scores policies by matching words. Make sure those words actually appear (or clearly don’t) in the fake J&J docs, so the memo shows real gaps.",
        where: "src/lib/frameworks.ts and seed.ts",
        doneWhen: ["A report with no OpenAI still shows some gaps and some partial matches."],
      },
      {
        id: "AEGIS-15",
        priority: "do-next",
        status: "todo",
        title: "Delete button for a document",
        what: "On Organization, add a way to delete one uploaded file (and its search pieces) without wiping the whole folder.",
        where: "new DELETE API + Organization page",
        doneWhen: ["Click delete, the doc is gone from the list."],
      },
    ],
  },
  {
    id: "later",
    title: "Later — not needed to demo",
    tickets: [
      {
        id: "AEGIS-8",
        priority: "later",
        status: "todo",
        title: "Double-check Azure still works with no extra screens",
        what: "This demo uses OpenAI. For a real client later we use Azure. Just make sure if OpenAI key is empty and Azure keys are set, chat still works. No new button.",
        where: "src/lib/llm/openai.ts",
        doneWhen: ["Written down in README how to switch, or a small test."],
      },
      {
        id: "AEGIS-16",
        priority: "later",
        status: "todo",
        title: "Hide old PCI reports",
        what: "Some old payment-card memos may still show on Reports. Hide them or add delete so the first memo you see is CMS.",
        where: "src/app/reports/page.tsx",
        doneWhen: ["Reports page leads with the CMS memo."],
      },
      {
        id: "AEGIS-19",
        priority: "later",
        status: "todo",
        title: "File picker allows PDF",
        what: "After AEGIS-3, change the upload box so it lets you pick .pdf (and still .txt / .md).",
        where: "src/app/org/page.tsx, src/app/regulations/page.tsx",
        doneWhen: ["The file picker lists PDF as allowed."],
      },
    ],
  },
];

export function allTickets() {
  return EPICS.flatMap((e) => e.tickets);
}
