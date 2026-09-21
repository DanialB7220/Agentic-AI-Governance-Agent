# Aegis — Governance copilot

Barebones Next.js app for a **copilot-style compliance assistant**. You (or a feed) drop in a new government regulation. The app looks at how the org actually runs today, then drafts an **internal readiness memo**: gaps, what you already cover, and a 30/60/90-day plan.

This is **not** a SOC 2 attestation, PCI ROC, legal opinion, or a full GRC / TLC program. Scope for now is **SOC 2 + PCI DSS**, with light GDPR / NIST CSF hooks.

Product name in the UI: **Aegis**. Repo: `Agentic-AI-Governance-Agent`.

---

## Why this exists

A teammate should be able to:

1. See new rules (Federal Register, or paste/upload one)
2. Keep a short snapshot of the org + current policies
3. Ask a chatbot “what does this mean for us?”
4. Get a saved audit-style memo they can open later
5. Call the same pipeline from another app over HTTP

The first cut is local-file storage + optional AWS Bedrock RAG so we can work together without standing up Postgres or a Knowledge Base on day one.

---

## The whole architecture (how the project is structured)

Think of Aegis as **four layers**, all inside one Next.js process. There is no separate Python service, no queue, no database server.

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React client pages)                               │
│  Copilot / Regulations / Org / Reports / Integrate          │
│  fetch() → JSON or NDJSON stream                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Next.js App Router                                         │
│  src/app/*/page.tsx     UI routes                           │
│  src/app/api/**/route.ts HTTP (app + /api/v1 aliases)       │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Domain (src/lib)  ← most of the product lives here         │
│  agents.ts     Scout + Auditor orchestration                │
│  rag.ts        retrieve chunks (keyword / Titan / KB)       │
│  frameworks.ts control catalog + gap scoring                │
│  ingest.ts     chunk text + persist                         │
│  store.ts      JSON files on disk                           │
│  aws/*         Bedrock Converse + embeddings + KB           │
│  regulations.ts Federal Register client                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   data/runtime/*.json   Bedrock        Federal Register
   (gitignored)          (optional)     (optional live API)
```

**Rule of thumb:** pages and API routes are thin. If you are changing *behavior* (how a report is scored, how RAG works, what an org looks like), you almost always want `src/lib/`, not a `page.tsx`.

### Request path, end to end

1. User types in the copilot (`src/components/chat-panel.tsx`) or clicks “New SOC 2 + PCI memo”.
2. Browser `POST`s JSON to `/api/chat` or `/api/reports`.
3. The route handler validates with **Zod**, then calls `runCopilot()` in `src/lib/agents.ts`.
4. `runCopilot` loads org + docs from the JSON store, **retrieves** similar chunks, and asks **Scout** to interpret the question against that context.
5. If the ask looks like a gap/audit/report, **Auditor** scores controls in `frameworks.ts` against *org policies only* (not the regulation text, so a rule cannot “prove” itself covered). It writes findings + a 30/60/90 roadmap, optionally asks Claude to rewrite the memo, and saves a `Report`.
6. Chat streams **NDJSON** events (`status`, `delta`, `report`, `done`) so the UI can show “Scout is retrieving…” then the memo. The reports page just waits for a JSON `{ report }`.

Same functions are re-exported at `/api/v1/*` so another product can skip the UI.

### Why the folders look like this

| Path | Job |
|---|---|
| `src/app/` | Next.js App Router. A folder = a URL. `page.tsx` is the screen. `layout.tsx` wraps every page with the sidebar. |
| `src/app/api/` | Server-only route handlers. No React. These are the HTTP API. |
| `src/app/api/v1/` | Thin wrappers around the same handlers, plus optional `x-api-key`. Integration surface. |
| `src/components/` | Shared UI: shell, chat, markdown renderer, status badges. Client components (`"use client"`). |
| `src/lib/` | The product: agents, RAG, store, types, seed. Importable from API routes (Node runtime). |
| `src/lib/aws/` | Only AWS SDK calls. Easy to stub or swap. |
| `src/lib/types.ts` | Shared TypeScript types. UI, API, and store all import this. Change it first. |
| `data/runtime/` | Live JSON store created on first boot. Gitignored. Each teammate has their own. |
| `src/lib/seed.ts` | Demo org (Northstar Payments) copied into `data/runtime/` when that folder is empty. |
| `.env.example` | Documented env vars. Copy to `.env.local` (also gitignored). |
| `next.config.ts` | Marks AWS SDK as server-external so Turbopack does not bundle it wrong. Pins Turbopack root to this repo. |

Full tree:

```
Agentic-AI-Governance-Agent/
├── README.md
├── package.json              Next + React + AWS SDK + zod + lucide
├── next.config.ts
├── tsconfig.json             @/* → ./src/*
├── .env.example
├── data/runtime/             created at runtime; do not commit
└── src/
    ├── app/
    │   ├── layout.tsx        fonts + AppShell
    │   ├── globals.css       dark theme, .glass, .input
    │   ├── page.tsx          Copilot (/)
    │   ├── org/page.tsx
    │   ├── regulations/page.tsx
    │   ├── reports/page.tsx
    │   ├── reports/[id]/page.tsx
    │   ├── integrate/page.tsx
    │   └── api/
    │       ├── chat/route.ts
    │       ├── ingest/route.ts
    │       ├── org/route.ts
    │       ├── documents/route.ts
    │       ├── regulations/route.ts
    │       ├── reports/route.ts
    │       ├── reports/[id]/route.ts
    │       ├── health/route.ts
    │       └── v1/{chat,ingest,reports}/route.ts
    ├── components/
    │   ├── app-shell.tsx     nav + AWS/local RAG badge
    │   ├── chat-panel.tsx    streaming chat
    │   ├── markdown.tsx      tiny markdown (headings, lists, bold)
    │   └── status-badge.tsx
    └── lib/
        ├── types.ts
        ├── agents.ts
        ├── rag.ts
        ├── ingest.ts
        ├── store.ts
        ├── seed.ts
        ├── frameworks.ts
        ├── regulations.ts
        ├── http.ts           API key helper
        ├── ids.ts
        └── aws/
            ├── config.ts
            ├── bedrock.ts    Converse + Titan embeddings
            └── knowledge-base.ts
```

---

## Technologies: what / why / how

### Next.js 16 (App Router)

**What:** React meta-framework. File-based routing, React Server Components by default, `src/app/api/*/route.ts` for HTTP.

**Why:** One repo for UI and API. Teammates run `npm run dev` and get pages + `/api/*` on the same origin (no CORS fight). App Router matches how we want URLs: `/reports/[id]`, `/api/v1/chat`. We also want a copilot that streams; Route Handlers can return a `ReadableStream`.

**How:** `src/app/**/page.tsx` are screens. Most are `"use client"` because they fetch and hold form/chat state. API routes set `export const runtime = "nodejs"` because they use `fs` and the AWS SDK (not Edge). `@/*` path alias → `src/*`.

### React 19

**What:** UI library. Client components for chat, forms, lists.

**Why:** Next 16 ships with it. We need hooks (`useState`, `useEffect`) for streaming chat and org forms.

**How:** Interactive pieces are client components. `layout.tsx` is a server component that wraps everything in `AppShell`. Chat reads an NDJSON stream with `ReadableStream.getReader()` rather than a chat SDK.

### TypeScript

**What:** Typed JavaScript.

**Why:** Org snapshots, documents, chunks, findings, and chat events are shared across UI and API. If `Report` changes, we want the compiler to yell in both places.

**How:** Strict mode in `tsconfig.json`. Canonical types in `src/lib/types.ts`. Zod schemas on the API boundary (runtime check); TypeScript for the rest.

### Tailwind CSS v4

**What:** Utility CSS. v4 uses `@import "tailwindcss"` and `@theme inline` in `globals.css` (no `tailwind.config.js`).

**Why:** Fast to iterate on a dark “compliance tool” UI without a component library. Tokens (gold, violet, glass) live in one file.

**How:** `src/app/globals.css`. Shared classes: `.glass` (frosted panels), `.input` (dark fields). Layout in `app-shell.tsx`. Fonts from `next/font` (Plus Jakarta Sans, IBM Plex Mono).

### Lucide React

**What:** SVG icon set as React components.

**Why:** Nav and buttons need icons; we are not using emoji as icons.

**How:** `lucide-react` in `app-shell.tsx` and `chat-panel.tsx` (Shield, MessageSquare, Upload, etc.).

### Zod

**What:** Runtime schema validation.

**Why:** TypeScript is compile-time only. A bad JSON body from another app should 400, not crash Auditor.

**How:** Each `route.ts` parses `req.json()` (or form data) with a Zod schema before calling `src/lib`. See `src/app/api/chat/route.ts` and `ingest/route.ts`.

### Node.js `fs` JSON store (`src/lib/store.ts`)

**What:** Org, documents, chunks, and reports written as JSON under `data/runtime/`.

**Why:** Zero ops for a team prototype. No Docker, no Postgres URL, no Prisma migrations. Each developer’s uploads stay on their machine (folder is gitignored). Swap later for Postgres without changing types much.

**How:** `store.ts` keeps an in-memory copy plus a promise chain (`withLock`) so two writes do not clobber the files. First boot: if `documents.json` is empty, copy `seed.ts`. Paths are `process.cwd()/data/runtime/*.json`.

This is **not** safe for multiple server instances. Fine for `next dev`.

### Amazon Bedrock (LLM)

**What:** AWS API that hosts models. We use **Converse** so we are not tied to a Claude-only request shape.

**Why:** The original ask was “Next.js + AWS RAG.” Bedrock keeps the model and the embeddings in one AWS account (IAM, region, no extra OpenAI key). Claude is the narrative layer on top of deterministic scoring.

**How:** `@aws-sdk/client-bedrock-runtime` in `src/lib/aws/bedrock.ts`. `converse()` sends a system + user prompt. If AWS creds are missing, it returns `null` and agents use a template fallback so the demo still runs. Default model: `BEDROCK_MODEL_ID` (Claude 3.5 Sonnet). Enable the model in the Bedrock console for your region.

### Amazon Titan embeddings

**What:** Bedrock embedding model. We request 256-dimension normalized vectors.

**Why:** RAG needs a vector per chunk. Titan lives on the same Bedrock endpoint as Claude. 256-d keeps `chunks.json` smaller than 1024-d.

**How:** `InvokeModel` in `bedrock.ts`. `rag.ts` embeds new chunks on ingest and, at query time, embeds the question then **cosine-similarity** vs stored vectors. Mixed with a keyword score (`0.72` semantic + `0.28` keyword) when vectors exist.

### Amazon Bedrock Knowledge Bases (optional)

**What:** Managed RAG: AWS chunks, embeds, and retrieves from S3 (or other) for you.

**Why:** Later we will not want to store embeddings in JSON. If `BEDROCK_KNOWLEDGE_BASE_ID` is set, we can retrieve from a real KB *and* still search local files.

**How:** `@aws-sdk/client-bedrock-agent-runtime` `RetrieveCommand` in `knowledge-base.ts`. `rag.ts` merges KB hits with local hits, de-dupes, takes top k.

### RAG (our code, not a library)

**What:** Retrieval-Augmented Generation: find relevant passages, then generate with that context in the prompt.

**Why:** A raw LLM will invent controls. Grounding on uploaded policies + ingested rules is the point of the product.

**How:** Ingest splits text (~900 chars, 140 overlap) in `store.chunkDocument`. Retrieve in `rag.ts`:

1. Knowledge Base, if configured
2. Else / also local cosine search if Titan ran
3. Else keyword overlap (works with no AWS)

Scout gets retrieved chunks. Auditor scores against the **full org corpus** (policies/evidence/controls), not regulation chunks.

### Two agents (Scout + Auditor)

**What:** Not a multi-agent framework (no LangGraph/CrewAI). Two functions with fixed roles, orchestrated in `agents.ts`.

**Why:** One brain that both “explains the rule” and “writes the audit” mixes jobs. Scout = what’s in the docs / feed. Auditor = gap table + memo. Easy to test and to swap one prompt without touching the other.

**How:**

- **Scout** (`runScout`): prompt + retrieved chunks + recent Federal Register titles. Claude if AWS; else a markdown summary of those chunks.
- **Auditor** (`runAuditor`): `frameworks.ts` keyword scoring → findings + roadmap → optional Claude rewrite. Saved via `addReport`.
- Orchestrator is an async generator so the chat UI can stream `status` events.

### Control catalog (`frameworks.ts`)

**What:** A small, hand-written list of SOC 2 / PCI / GDPR / NIST control themes, each with keywords and a default “do next” action.

**Why:** We refused to paste copyrighted TSC/PCI standard text. We also need scoring that works **without** an LLM so teammates can demo offline. Keywords are a known-good baseline; Claude only rewrites prose.

**How:** `toFinding(control, corpus, snippets)` → `covered` / `partial` / `missing`. Coverage % = covered / scored. Roadmap buckets missing → 0–30, partial → 30–60, covered follow-ups → 60–90.

### Federal Register API

**What:** Public JSON API for US government rules and proposed rules.

**Why:** “Detect new gov regulations” without building a crawler. No key.

**How:** `src/lib/regulations.ts` queries RULE + PRORULE for FTC, CFPB, SEC, OCC, HHS. The UI lists them; “Index into RAG” POSTs the abstract into our store as `kind: "regulation"`. If the live call fails, three demo items are returned so the page is never empty.

### NDJSON streaming

**What:** Newline-delimited JSON. One event per line, not one big JSON blob.

**Why:** Copilot should show progress (“Scout: mapping obligations…”) before the full memo. SSE/Vercel AI SDK would also work; NDJSON is a few dozen lines and easy to consume from another app.

**How:** `POST /api/chat` sets `Content-Type: application/x-ndjson`. `chat-panel.tsx` splits on `\n` and `JSON.parse`s each line.

### next/font (Google fonts)

**What:** Next downloads Plus Jakarta Sans and IBM Plex Mono at build time (no runtime Google request in the browser).

**Why:** Design: readable SaaS sans + mono for coverage %. Self-hosted by Next, so less layout shift.

**How:** `src/app/layout.tsx` CSS variables `--font-plus-jakarta` and `--font-ibm-plex`.

### ESLint (`eslint-config-next`)

**What:** Lint for Next + TypeScript.

**Why:** Shared rules so PRs do not argue about hooks and `<img>`.

**How:** `npm run lint`. Config: `eslint.config.mjs`.

---

## What you can do in the UI

| Route | Function |
|---|---|
| `/` Copilot | Chat. Scout then (if needed) Auditor. Starter prompts on the empty state. |
| `/regulations` | Federal Register feed. Index a rule into RAG, or paste / upload `.txt` / `.md`. |
| `/org` | Org snapshot + policy/evidence ingest. |
| `/reports` | Saved memos. Button to generate SOC 2 + PCI without chat. |
| `/integrate` | Curl examples for `/api/v1/*`. |

Seed tenant: **Northstar Payments** in `src/lib/seed.ts`.

---

## How a request actually runs

```
User message or “generate report”
        │
        ▼
   retrieve()   ← local chunks (keyword, or Titan embeddings)
                ← optional Bedrock Knowledge Base
        │
        ▼
   Scout        ← obligations + citations (Claude if AWS is set,
                  otherwise a structured fallback from retrieved text)
        │
        ▼
   Auditor      ← only scores against org policies/evidence, not the
                  regulation text itself. Writes findings + roadmap.
        │
        ▼
   Saved Report in data/runtime/reports.json
   Streamed back to the chat as NDJSON
```

Auditor runs when `mode` is `analyze` / `report`, or when the message matches gap/audit/roadmap/SOC/PCI language.

---

## Data model

Types live in `src/lib/types.ts`. Runtime copies are JSON:

| File | Shape |
|---|---|
| `org.json` | `{ name, industry, size, jurisdictions[], frameworks[], notes, updatedAt }` |
| `documents.json` | `{ id, title, kind, source, framework?, text, ... }[]` |
| `chunks.json` | `{ id, documentId, text, embedding?, metadata }[]` |
| `reports.json` | `{ id, title, frameworks[], coveragePct, findings[], roadmap[], markdown, ... }[]` |

**frameworks:** `"soc2" | "pci-dss" | "gdpr" | "nist-csf"`

**document kinds:** `"regulation" | "policy" | "evidence" | "control"`

**finding status:** `"covered" | "partial" | "missing"`

First boot with an empty `data/runtime/` copies the seed. After that, local files win.

---

## Chat stream format

`POST /api/chat` and `POST /api/v1/chat` return `application/x-ndjson`.

Request:

```json
{
  "mode": "chat | analyze | report",
  "messages": [
    { "role": "user", "content": "PCI DSS gap report for our org" }
  ]
}
```

`mode` is optional. `report` / `analyze` always run Auditor.

Events:

```json
{"type":"status","step":"Retrieving policies, evidence, and regs","agent":"scout"}
{"type":"citations","citations":[{"title":"Access Control Policy","kind":"policy"}]}
{"type":"status","step":"Auditor: scoring gaps and drafting the memo","agent":"auditor"}
{"type":"delta","text":"# SOC 2 / PCI DSS readiness memo\n..."}
{"type":"report","report":{ "...full Report object..." }}
{"type":"error","message":"..."}
{"type":"done"}
```

---

## HTTP API

App routes (UI) and `/api/v1/*` (other apps) share handlers.

If `AEGIS_API_KEY` is set, v1 routes require header `x-api-key`. App routes do not (no auth yet).

| Method | Path | Body / notes |
|---|---|---|
| GET | `/api/health` | `{ aws, knowledgeBase, documents, chunks, reports, embeddings }` |
| GET / PUT | `/api/org` | PUT partial org snapshot |
| GET | `/api/documents` | all indexed docs |
| POST | `/api/ingest` | JSON or `multipart/form-data` (`file`, `title`, `kind`, `text`) |
| GET | `/api/regulations` | feed items |
| POST | `/api/regulations` | index a feed item (`id`, `title`, `abstract`, `url`, …) |
| GET | `/api/reports` | list memos |
| POST | `/api/reports` | `{ "frameworks": ["soc2","pci-dss"] }` |
| GET | `/api/reports/:id` | one memo |
| POST | `/api/v1/ingest` | same as `/api/ingest` |
| POST | `/api/v1/chat` | same as `/api/chat` (NDJSON) |
| GET / POST | `/api/v1/reports` | same as `/api/reports` |

Ingest JSON:

```json
{
  "title": "Access Control Policy",
  "kind": "policy",
  "text": "…",
  "source": "upload",
  "framework": "soc2"
}
```

Uploads: `.txt` / `.md` only. PDF is not wired yet.

---

## Local setup

```bash
git clone <this-repo>
cd Agentic-AI-Governance-Agent
npm install
cp .env.example .env.local   # optional; app runs without AWS
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Click **PCI 4.0 gap report** on the copilot home.

```bash
npm run lint
npm run build
```

Node 22 is what we used. Scripts: `dev`, `build`, `start`, `lint`.

### AWS (optional)

Without keys, retrieval is keyword search over local chunks, and Scout/Auditor use the control catalog fallback. That is enough to demo.

With keys:

1. Copy `.env.example` → `.env.local`
2. Set region + `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (or `AWS_BEARER_TOKEN_BEDROCK`)
3. In the Bedrock console for that region, enable the Claude model and Titan embeddings
4. Optional: set `BEDROCK_KNOWLEDGE_BASE_ID` to also retrieve from a managed KB

| Variable | Purpose |
|---|---|
| `AWS_REGION` | default `us-east-1` |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_SESSION_TOKEN` | SigV4 |
| `AWS_BEARER_TOKEN_BEDROCK` | Bedrock API key, if you use that instead |
| `BEDROCK_MODEL_ID` | chat model |
| `BEDROCK_EMBEDDING_MODEL_ID` | Titan embeddings |
| `BEDROCK_KNOWLEDGE_BASE_ID` | managed RAG |
| `AEGIS_API_KEY` | lock `/api/v1/*` |

Do not commit `.env.local`.

---

## Working together

- **Behavior lives in `src/lib/`.** Pages are thin.
- **Do not commit** `data/runtime/`, `.env*`, or `node_modules`. Seed is code (`seed.ts`).
- Change **`src/lib/types.ts` first** if you add a field.
- Control list / scoring: `src/lib/frameworks.ts`.
- Demo org: `src/lib/seed.ts`. Delete `data/runtime/` locally to re-seed.
- UI: `src/components/` + `src/app/*/page.tsx`. Theme: `src/app/globals.css`.
- No auth, no multi-tenant, no shared DB. Two `next dev` processes do not share org files.

Suggested split:

| Area | Files |
|---|---|
| Chat / agents | `src/lib/agents.ts`, `src/components/chat-panel.tsx`, `src/app/api/chat` |
| RAG / AWS | `src/lib/rag.ts`, `src/lib/aws/*`, `src/lib/ingest.ts` |
| Frameworks / scoring | `src/lib/frameworks.ts` |
| Org + ingest UI | `src/app/org`, `src/app/regulations` |
| Reports UI | `src/app/reports` |
| External API | `src/app/api/v1/*`, `/integrate` |

---

## What is still thin on purpose

- No login
- No PDF / Word ingest
- No Postgres (JSON files)
- Coverage is keyword overlap, not a QSA
- Federal Register falls back to three demo items if the live API fails
- Reports are internal memos only

Reasonable next steps: PDF ingest, Postgres, auth, evidence binders, and plugging `/api/v1` into another product.
