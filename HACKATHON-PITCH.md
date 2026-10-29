# Governance Agent — 10-Minute Hackathon Pitch

**Target runtime:** 10 minutes talk (+ optional 1–2 min live click if time allows)  
**Focus:** Business first → product → agents → architecture/tech → close  
**Login for demo:** `admin` / `admin` (seeded) · `admin1` / `admin1` (empty onboarding) · http://localhost:3000  
**Live deploy today:** Render · **Roadmap:** AWS (hosting + data) + Bedrock for models/RAG

**Timing guide (stick to this)**

| Minutes | Slides | Goal |
| --- | --- | --- |
| 0:00–0:45 | 1 | Hook |
| 0:45–2:30 | 2–3 | Business problem + who pays |
| 2:30–4:30 | 4–5 | Value prop + product overview |
| 4:30–6:00 | 6 | Agents + live process (RAG → OpenAI → Mongo) |
| 6:00–7:30 | 7–8 | Architecture + stack (Render now → AWS/Bedrock next) |
| 7:30–9:15 | 9 | Demo / proof (or screenshots) |
| 9:15–10:00 | 10 | Close |

**Honesty line (say once):** Internal readiness copilot. Not a CMS filing tool. Not legal advice. Sample rules and SOPs are demo stand-ins.

---

# SLIDE 1 — Title (0:00–0:45)

## Governance Agent
### Regulation in. Change list out.

**Subtitle**  
An agentic governance copilot for healthcare companies that need to turn CMS / Part D rules into owned work — fast.

**Say**  
“When a healthcare rule drops, the hard part is not reading it. The hard part is getting Market Access, Finance, MLR, Engineering, and Governance to agree what changes, who owns it, and by when. That is what we built.”

---

# SLIDE 2 — The business problem (0:45–1:45)

## The expensive gap: rule published → nobody owns the work

**What happens today**
1. A Federal Register / CMS rule lands (email, SharePoint, counsel forward)
2. Each team reads a different section
3. Someone pastes text into a generic chatbot — **without company SOPs**
4. A week of meetings produces a transcript, not a ticket list
5. Leadership still asks: “Are we exposed?”

**Business pain**
- Late discovery → rework across SOPs, claims logic, and marketing creative
- Policy vs regulation mismatch → partner and audit risk
- No clear owner / due date → work dies in chat
- No trail of who accepted the memo → weak internal review story

**Say**  
“We are not solving ‘find the PDF.’ We are solving time-to-action after the PDF arrives.”

---

# SLIDE 3 — Who this is for (1:45–2:30)

## Buyer · Users · Forcing-function regulation

**Ideal customer**  
Healthcare companies that are **plan partners / manufacturers**, not Medicare Advantage plans — but still get hit by Part D redesign, Manufacturer Discount Program, marketing gates, hub/privacy duties, and supply-chain rules.

**Who feels the pain**

| Role | What they need from us |
| --- | --- |
| Governance / Compliance | A memo they can track and sign off |
| Market Access & Finance | SOP + accrual changes for discount / TrOOP |
| MLR | What creative / claims language must change before the gate |
| Patient support / Hub | Script and workflow updates |
| Engineering | System changes that match the new SOP |
| Leadership | One risk view without a 40-page reread |

**Demo forcing function**  
CMS-4208-F3 / CMS-4212-F (CY2027 MA & Part D) — cross-team by design. Perfect for a pitch.

**Say**  
“One rule. Five teams. Today that becomes five separate analyses. We make it one memo with team-level action items.”

---

# SLIDE 4 — Business proposition (2:30–3:45)  ★ money slide

## What we sell

**One-liner**  
Governance Agent turns a new regulation into an **internal readiness memo** grounded in **your** policies — with gaps, **team action items**, owners, and due dates.

**Value proposition**
- **Faster first pass** from rule drop → draft remediation plan  
- **Less duplicate work** across Market Access / MLR / Finance  
- **Clear accountability** — team + level (Accountable / Responsible / Consulted / Informed) + task  
- **Meeting-ready output** — on-screen memo + exportable policy-suggestions PDF  
- **Leadership glance** — Risk dashboard (coverage, open highs, new rules)  
- **Defensible trail** — Records of uploads, scans, reports, sign-offs  

**Unlike**
| Alternative | Gap |
| --- | --- |
| Generic ChatGPT | No company SOPs, no owners, no trail |
| Policy vault / classic GRC | Stores docs; weak “new rule → change list” intelligence |
| Manual counsel memo | High trust, slow and expensive, not continuous |

**Commercial story (conceptual)**  
Pilot one business unit on CMS MA/Part D → expand agencies/frameworks → enterprise cutover (Azure OpenAI / VPC).  
**SKU the buyer understands:** the owned change memo — not “AI tokens.”

**Say**  
“The AI is the engine. The memo with owners is the product.”

---

# SLIDE 5 — Product overview (3:45–4:30)

## What the business user opens

```
Homepage → Login → Workspace
                    ├── Copilot        ask, upload, chat history
                    ├── Regulations    watch / ingest rules
                    ├── Organization   company snapshot + SOPs
                    ├── Reports        memos, teams, sign-off, PDF
                    ├── Risk           exec scoreboard
                    └── Records        activity trail
```

**Three-beat workflow (memorize)**
1. **Bring the rule in** — Federal Register feed, upload/PDF, or samples → MongoDB docs + embeddings  
2. **Compare to us** — Scout RAG-retrieves this company’s SOP chunks, then gpt-4o analyzes  
3. **Leave with work** — Auditor writes memo → findings, team actions, PDF; trail in Records  

**Business artifact on every serious run**
- Coverage %  
- Covered / partial / missing controls  
- Policy edits with owner + due date + status  
- **Action items by team** (Governance, Market access, Engineering, MLR, …)  
- Sign-off + activity log  

**Say (bridge into agents)**  
“Under the hood: MongoDB memory, OpenAI embeddings for retrieval, and exactly two gpt-4o agents — Scout and Auditor — plus a Federal Register scanner. Next slide.”

---

# SLIDE 6 — Agents + how a run actually works (4:30–6:00)

## Agent count (say this exactly)

**2 LLM agents + 1 background watcher = 3 named pieces**

| # | Name | LLM? | What it is in code |
| --- | --- | --- | --- |
| 1 | **Scout** | Yes — **OpenAI gpt-4o** | `runScout` in `agents.ts` |
| 2 | **Auditor** | Yes — **OpenAI gpt-4o** | `runAuditor` (+ policy-change draft) |
| 3 | **Scanner** | No | `startRegulationScan` — Federal Register poll |

**Say up front**  
“We run two OpenAI agents — Scout and Auditor — and one non-LLM watcher that polls the Federal Register. Retrieval is local RAG over MongoDB, not a third agent.”

### What each one does

| Piece | Job | Uses |
| --- | --- | --- |
| **RAG retrieve** (not an agent) | Pull top POLICY + REGULATION chunks for this login | MongoDB chunks + **OpenAI text-embedding-3-small** (cosine + keyword) |
| **Scout** | Read those passages + org notes; write an analysis brief | **OpenAI gpt-4o** (1 chat call) |
| **Auditor** | Score controls, draft policy edits + team actions, rewrite memo | Code scoring + **gpt-4o** (policy-change JSON + memo rewrite) |
| **Scanner** | Mark new Federal Register items per account | **Federal Register API** (startup + every 4 hours) |

### End-to-end Copilot process (matches `runCopilot`)

```
1. User prompt
         │
         ▼
2. RETRIEVE (local RAG — Pinecone off)
   · Chunks + vectors in MongoDB
   · Query embedded with text-embedding-3-small
   · Score = cosine + keyword; merge policy + regulation hits
         │
         ▼
3. SCOUT (gpt-4o) — always on a Copilot turn
   · Org snapshot + retrieved POLICY/REGULATION passages
   · Brief: what the rule says vs what SOPs say
   · Streams status to the UI
         │
         ├── light Q&A → stop here (Scout answer only)
         │
         ▼
4. AUDITOR (when report / gap / CMS keywords, or analyze mode)
   · Deterministic control scoring against org corpus
   · gpt-4o drafts policy changes + RACI team action items
   · gpt-4o rewrites the readiness memo in clear English
         │
         ▼
5. PERSIST (MongoDB)
   · Save report; open in Reports; sign-off; pdf-lib export
```

**Why two LLM agents, not one mega-prompt**  
Scout = interpret retrieved company + rule evidence. Auditor = turn that into scored gaps and owned work. Split keeps prompts focused and the memo meeting-ready.

**Scanner in parallel**  
`instrumentation.ts` starts the job → agencies/keywords from org profile → marks “new” per user → Records activity. Human still chooses what to ingest.

**Say**  
“Two gpt-4o agents. Local RAG in MongoDB. One Federal Register watcher. That is the whole agent story.”

---

# SLIDE 7 — Architecture: where each call goes (6:00–6:45)

## Request path (say this while pointing)

```
Browser (Next.js UI)
   │  HTTPS + session cookie
   ▼
Next.js App Router (API routes)
   │
   ├── Auth          → MongoDB users + sessions (salted SHA-256)
   ├── Ingest / Org  → chunk docs → OpenAI embeddings → MongoDB
   ├── Copilot       → RAG retrieve → Scout → Auditor → MongoDB report
   ├── Regulations   → Federal Register feed + manual upload/paste
   ├── Reports / PDF → MongoDB reports → pdf-lib export
   └── Cron scan     → Federal Register → per-user activity/meta
              │                              │
              ▼                              ▼
     ┌────────────────┐           ┌──────────────────────┐
     │  MongoDB Atlas │           │  External services   │
     │  users/sessions│           │  OpenAI Chat API     │
     │  org / docs    │           │    (gpt-4o)          │
     │  chunks+vectors│           │  OpenAI Embeddings   │
     │  reports/chats │           │    (text-embedding-  │
     │  activity/scan │           │     3-small)         │
     └────────────────┘           │  Federal Register API│
                                  └──────────────────────┘
```

**Data isolation (must say)**  
Every policy, chunk, report, chat, and activity row is keyed by `userId`. Two logins = two brains. Demo: `admin` is seeded; `admin1` starts empty onboarding.

**RAG design choice**  
No separate vector DB for this build. Embeddings sit **on the chunk documents in MongoDB**. Same store as the text — simpler ops story for a pilot.

### Deploy today → AWS next (say this)

| Layer | Today (shipped) | Where we want to go |
| --- | --- | --- |
| App host | **Render** (Next.js live) | **AWS** (e.g. ECS / App Runner / Amplify) |
| Database | **MongoDB Atlas** | Stay Mongo-compatible on AWS **or** move data plane into the AWS account (tighter VPC / compliance) |
| Models / RAG | **OpenAI** chat + embeddings | **Amazon Bedrock** — Titan embeddings + optional Knowledge Base (SDK already wired in the repo) |

**Say**  
“This is not a laptop demo — it is deployed on Render. The next step we want is AWS for hosting and data, and Bedrock for the model/RAG path so enterprise traffic stays in one cloud.”

---

# SLIDE 8 — Technologies: what each one is for (6:45–7:30)

## Stack mapped to the process (not a laundry list)

### 1) App shell + deploy
| Piece | Tech | Why it matters in the pitch |
| --- | --- | --- |
| Framework | **Next.js 16** App Router | UI + API + agents in one deployable app |
| UI | **React 19**, **Tailwind 4** | Working workspace (Copilot, Regs, Org, Reports…) |
| Language | **TypeScript** + **Zod** | Typed routes and validated payloads |
| Hosting **now** | **Render** | Live URL judges can hit — not “works on my machine” |
| Hosting **next** | **AWS** | Enterprise preference; same Next.js app, different host |

### 2) Intelligence path
| Step | Tech **today** | Roadmap |
| --- | --- | --- |
| Embed on ingest | **OpenAI** `text-embedding-3-small` → vectors on Mongo chunks | **Bedrock Titan** embeddings (+ optional Knowledge Base) |
| Retrieve | Local cosine + keyword over **MongoDB chunks** | Same product shape; Bedrock KB can merge in when configured |
| Scout + Auditor | **OpenAI Chat API** (`gpt-4o`) | Keep agents; swap provider behind the same routes (Bedrock / Azure) |
| Control packs | CMS MA/Part D, SOC 2, PCI, GDPR, NIST | Unchanged — scoring stays in our code |

### 3) Data, auth, feeds, files
| Piece | Tech | What happens |
| --- | --- | --- |
| Persistence **now** | **MongoDB Atlas** (`governance` DB) | users, sessions, per-user org/docs/chunks/reports/meta |
| Persistence **next** | AWS-aligned data plane | Same schemas; move closer to the AWS account for compliance |
| Auth | Username/password, **salted SHA-256**, httpOnly cookie | Real login isolation for demos (`admin` / `admin1`) |
| Rule feed | **Federal Register HTTP API** | Scanner + Regulations page filter by agencies/keywords |
| PDF in / out | **unpdf** / **pdf-lib** | Ingest PDFs · export policy-suggestion memo |

### 4) How a document becomes usable (10-second process)
Upload/paste → API ingest → text chunked (~900 / ~140 overlap) → embedding written onto each chunk in MongoDB → available to the next Scout run.

**Say**  
“Next.js on Render today. OpenAI + MongoDB power the brain. The path we want next is AWS hosting and data, with Bedrock for embeddings and RAG — the agent product stays the same.”

---

# SLIDE 9 — Proof / demo beat (7:30–9:00)

## Show the business artifact (2 options)

### Option A — Live (preferred if stable)
1. Login `admin` / `admin` (seeded Mongo workspace)  
2. Copilot → starter **CMS-4208-F3 vs our policies**  
   *(while it streams: “Scout is retrieving SOP chunks from Mongo; Auditor is writing with gpt-4o”)*  
3. Open report → coverage, gap, **Action items by team**, owner/due  
4. Flash Risk + Records *(“activity log is the audit trail in Mongo”)*  
5. Optional 15s: mention `admin1` empty onboarding if judges ask “how do you start?”  
6. Back to close  

### Option B — Narrated screenshots (if time/API risk)
Show: homepage → report with team actions → Risk scoreboard  
Still sell the outcome: owned change list in minutes. Name the stack verbally (OpenAI + MongoDB + FR scan).

**What to emphasize while clicking**
- “This is Market Access’s job… this is Engineering’s job…”  
- “Leadership sees exposure here on Risk”  
- “Sign-off and activity are for internal review — not a QMS claim”  
- “Retrieval is grounded in our uploaded policies — not a generic model hallucination”

---

# SLIDE 10 — Close (9:15–10:00)

## Closing line (memorize)

> Governance Agent does not replace counsel.  
> It replaces the week of confusion after a rule is published —  
> with a memo your teams can execute.

**Call to action**  
Pilot with one Market Access + Governance pair on CMS MA/Part D. Measure time from rule ingested → first signed internal memo with owners.

**Optional one-liner on platform**  
“Live on Render today; next we want AWS + Bedrock so the same agents run in the customer’s preferred cloud.”

**Thank you — questions**

---

# Speaker cheat sheet (print)

**Must say**
- Business problem = time-to-action, not document storage  
- Buyer = Governance / Market Access leadership  
- Product SKU = owned readiness memo  
- Agents = **2 LLM** (Scout + Auditor on **gpt-4o**) + **1 non-LLM** Federal Register Scanner  
- Process = ingest → embed → RAG retrieve → Scout → (optional) Auditor → Mongo report  
- Stack **now** = Next.js on **Render**, **MongoDB Atlas**, **OpenAI**, Federal Register  
- Stack **next** = **AWS** hosting/data + **Bedrock** for embeddings / RAG  
- Honest limits = no CMS filing, no legal opinion  

**Must not say**
- “We file with CMS”  
- “This is legal advice”  
- “Samples are official government text”  
- “This is a validated QMS”  
- “We use Pinecone” (we don’t — vectors are on MongoDB chunks)  
- “Three LLM agents” (Scanner is not an LLM)  
- “We’re already on Bedrock in production” (OpenAI + Mongo on Render today; Bedrock is the roadmap — SDK is ready)

**60-second emergency version**  
“Healthcare manufacturers get hit by Part D and CMS changes that force Market Access, Finance, MLR, and Engineering to move together. Governance Agent is live on Render: Next.js, MongoDB Atlas, OpenAI embeddings and gpt-4o for Scout and Auditor. Local RAG retrieves company SOP chunks; Auditor writes the readiness memo with team owners and due dates. A non-LLM scanner polls the Federal Register. Next we want AWS for hosting and data, and Bedrock for the model/RAG path. We don’t file with CMS — we kill the week of confusion after the rule drops.”

---

# Slide title list (for building actual slides)

1. Governance Agent — Regulation in. Change list out.  
2. The expensive gap: published → unowned  
3. Who pays and who uses  
4. Business proposition  
5. Product overview  
6. Agents: 2 LLM (Scout, Auditor) + Scanner  
7. Architecture: where each API call goes (+ Render → AWS)  
8. Technologies mapped to the process (+ Bedrock roadmap)  
9. Proof / demo  
10. Close  

---

*10 minutes. Lead with money and pain. Prove with the real process. Close on owned work — and Render today → AWS/Bedrock next.*
