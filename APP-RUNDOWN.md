# Governance Agent — Full App Rundown

One document for what this product is, every page and feature, how the agents and RAG work, what frameworks it scores, what is stored where, and the full technology stack.

---

## 1. What this product is

**Name in the UI:** Governance Agent  
**Repo:** Agentic-AI-Governance-Agent  
**One-line job:** Read a new healthcare / CMS-style regulation, compare it to the company’s own policies, and write an **internal readiness memo** with gaps, owners, and due dates.

**It is not:**

- A CMS filing tool
- A legal opinion
- A validated quality-management system
- An official source of regulation text

Sample regulations are **assumptions** for a healthcare company. Seed policies are **stand-ins**, not real SOPs.

**Demo org name on a new account:** Healthcare Manufacturer  
**Industry framing:** Healthcare company (Part D) — plan partner / manufacturer-style workflows, not an MA organization.

---

## 2. High-level architecture

```
Browser
  ├── /                 Marketing homepage (public)
  ├── /login, /signup   Auth (public)
  └── /copilot …        Signed-in workspace (AppShell)

Next.js App Router (Node runtime)
  ├── Scout + Auditor agents
  ├── Local RAG over MongoDB chunks
  ├── Federal Register feed + background scan
  └── Auth (cookie session) + per-user store

MongoDB Atlas (database: governance)
  ├── users
  ├── sessions
  └── records   (org, documents, chunks, reports, meta)
```

Everything a signed-in user does is stored **per account**. Two users do not share org data, reports, chats, or activity.

---

## 3. Pages and features

### Public

| Route | What it does |
| --- | --- |
| `/` | Homepage: product pitch, how it works, CTAs to sign up / log in |
| `/login` | Email + password login |
| `/signup` | Name + email + password (min 8 chars) |

### Signed-in workspace (requires session; otherwise redirect to `/login`)

| Route | What it does |
| --- | --- |
| `/copilot` | Chat UI, starters, regulation upload, chat history sidebar |
| `/regulations` | Federal Register feed, sample rules (View popup), upload / paste, mark reviewed |
| `/org` | Org snapshot + upload / paste policies and evidence |
| `/reports` | List of memos + button to generate a CMS MA/Part D report |
| `/reports/[id]` | Full memo: findings, policy changes, roadmap, sign-off, PDF export |
| `/risk` | Coverage %, open high gaps, open changes, new rules this week, last scan |
| `/records` | Activity log (uploads, scans, reports, sign-offs, account events, etc.) |

**Nav (sidebar):** Copilot · Regulations · Organization · Reports · Risk · Records  
Also shows the signed-in name/email, **Log out**, and a Retrieval status (provider + document / vector counts).

---

## 4. Feature inventory (everything it does)

### Accounts and security

- Sign up, log in, log out
- Passwords stored as **salted SHA-256** (`salt:password` → hex digest). Plaintext password is never stored
- Session cookie `ga_session` (httpOnly, SameSite=lax, 14 days). Server stores a **hash** of the token, not the raw token
- All workspace API routes require a valid session
- Duplicate email → 409; wrong password → 401

### Copilot

- Free-form chat about rules vs policies
- Four starter prompts (CMS-4208-F3, Manufacturer Discount Program, Oct 1 2026 marketing gate, keep-current)
- Streaming NDJSON responses (status → tokens / report → done)
- Upload regulation from the composer (PDF / txt / md)
- Duplicate upload → choose **Overwrite** or **Add as new**
- Chat history sidebar (new / open / delete), persisted on the account (cap 40 threads)
- Links into a saved report and into the PDF export when a report was produced

### Regulations

- Live **Federal Register** feed filtered by the org’s scan agencies and keywords
- Fallback demo feed if the FR API fails
- **New** badges for rules not yet marked seen; Mark reviewed clears them
- Five built-in sample regulations with a View popup:
  1. Manufacturer Discount Program duties (Part D redesign)
  2. MA and Part D promotional communications
  3. Open Payments transfers of value
  4. Patient hub privacy and Part D support
  5. Drug supply chain traceability
- Paste or upload a regulation; ingest + auto gap analysis
- Duplicate detection by document id and by **text SHA-256 fingerprint**

### Organization

- Edit name, industry, size, jurisdictions, frameworks, scan agencies, keywords, notes
- Index policy / evidence / control text (paste or PDF / txt / md)
- New accounts get seeded org + stand-in SOPs + CMS-4208-F3 extract + sample regulations

### Reports and remediation

- Generate a standalone gap report (default frameworks: `cms-ma-pd`)
- Auto-analysis after regulation ingest
- Per-report:
  - Coverage %
  - Findings (covered / partial / missing + risk)
  - Policy change list (owner, due date, status: open / in_progress / done)
  - Roadmap windows: **0–30 / 30–60 / 60–90 days** (shown on the report page and in the markdown memo)
  - Sign-off (name + timestamp)
  - **Export policy suggestions (PDF)** — exports the policy change list (issue, change, owner, due). The day-window roadmap is on-screen / in markdown, not in that PDF

### Risk dashboard

- Latest coverage %
- Open high-risk findings from the latest report
- Count of open policy changes across reports
- Regulations saved in the last 7 days
- Last scan time + unseen feed count

### Records / activity

Logged actions include: `upload`, `scan`, `report`, `sign-off`, `change`, `org`, `account`  
Links back to a report when relevant.

### Background regulation scan

- Starts ~4 seconds after server boot, then every **4 hours**
- Runs **per signed-in user account** in MongoDB
- Writes scan state + activity when new feed items appear
- Also callable at `GET /api/cron/scan` (optional `CRON_SECRET` Bearer token)

### External HTTP API (for later integration)

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/v1/ingest` | Same as app ingest |
| POST | `/api/v1/chat` | Same as app chat |
| GET/POST | `/api/v1/reports` | List / create reports |

If `AEGIS_API_KEY` is set, callers must send `x-api-key`. Workspace data is still **session-scoped**, so these routes expect an authenticated user session in the current design.

### Health

`GET /api/health` (authed): which chat / RAG providers are live, document count, embedding counts.

---

## 5. Agents (how answers are produced)

Two roles in one Next.js process (no separate Python service):

1. **Scout** — regulation / policy analyst  
   - Retrieves POLICY and REGULATION passages via RAG  
   - Never treats a REGULATION as proof the company already complies  
   - Cites document titles  

2. **Auditor** — memo writer  
   - Rewrites into a clear internal readiness memo  
   - Keeps every finding and policy change  
   - Labels output as an internal memo, not a CMS filing or legal opinion  
   - Treats the org as a healthcare company / plan partner unless notes say otherwise  

**Report trigger:** explicit mode `report` / `analyze`, or a query matching audit-ish keywords (gap, roadmap, CMS, Part D, Manufacturer Discount, etc.).

**Gap scoring:** keyword / control matching against a built-in control catalog, plus retrieved evidence, then LLM narrative. Risk mapping:

| Gap status | Risk |
| --- | --- |
| missing | high |
| partial | medium |
| covered | low |

---

## 6. Compliance frameworks and controls

Supported framework ids:

| Id | Label |
| --- | --- |
| `cms-ma-pd` | CMS MA / Part D (CY2027) |
| `soc2` | SOC 2 |
| `pci-dss` | PCI DSS |
| `gdpr` | GDPR |
| `nist-csf` | NIST CSF |

### CMS MA / Part D controls (primary demo focus)

- Manufacturer Discount Program (`cms-mdp`)
- Selected drug / MFP handling (`cms-selected-drug`)
- TrOOP (`cms-troop`)
- Part D benefit phases (`cms-part-d-phases`)
- Marketing / communications (`cms-marketing`)
- Insulin / vaccine cost sharing (`cms-insulin-cost`)
- SSBCI-style co-marketing extras (`cms-ssbci`)

### Other controls (also in the catalog)

- SOC 2: access (CC6), monitoring (CC7), change (CC8), vendor / risk (CC9)
- PCI DSS: MFA, logging, vulnerability, cryptography
- GDPR: RoPA, data-subject requests, breach
- NIST CSF: detect

Default seed frameworks on a new org: `cms-ma-pd`, `soc2`.

---

## 7. Scan agencies (Federal Register)

| Slug | Label |
| --- | --- |
| `centers-for-medicare-medicaid-services` | CMS |
| `health-and-human-services-department` | HHS |
| `federal-trade-commission` | FTC |
| `consumer-financial-protection-bureau` | CFPB |
| `securities-and-exchange-commission` | SEC |
| `comptroller-of-the-currency` | OCC |

Default seed agencies: CMS, HHS, FTC. Default keywords: `Medicare`, `Part D`.

---

## 8. RAG (retrieval) — what we use instead of Pinecone

**Pinecone is off** (code commented; not used at runtime).

### Live path

1. Documents are chunked (~900 chars, ~140 overlap) and stored in MongoDB under that user.
2. Chunks get **embedding vectors** when a provider is available; vectors are saved **on the chunk documents** in MongoDB.
3. On ask / report, the query is embedded the same way.
4. Local retrieve scores each chunk with:
   - **Cosine similarity** of embeddings (when both sides have matching vector size)
   - Plus a **keyword** score
   - Blend: ~72% semantic + ~28% keyword when vectors exist; keyword only otherwise
5. Top policy-like chunks and regulation chunks are merged (optional AWS Knowledge Base hits too) and passed to Scout.

### Embedding / RAG provider order

| Priority | Provider | When |
| --- | --- | --- |
| 1 | AWS Bedrock Titan | AWS credentials configured |
| 2 | OpenAI embeddings | `OPENAI_API_KEY` set (this project’s default) |
| 3 | Azure OpenAI embeddings | Azure configured |
| 4 | Keyword only | Nothing above works |

Optional merge-in: **AWS Bedrock Knowledge Base** if `BEDROCK_KNOWLEDGE_BASE_ID` is set.

Sidebar “Retrieval” label reflects whatever is active (e.g. OpenAI embeddings).

---

## 9. Data model (MongoDB)

**Database name:** `governance`  
**URI env:** `MONGODB_URI`

### Collections

| Collection | Purpose |
| --- | --- |
| `users` | `_id`, email, name, `passwordHash`, `salt`, `createdAt` |
| `sessions` | token hash, userId, expiresAt |
| `records` | per-user workspace blob rows keyed by `(userId, kind, id)` |

### Record kinds inside `records`

| kind | id examples | Body |
| --- | --- | --- |
| `org` | `current` | OrgProfile |
| `document` | doc / sample / fr ids | StoredDocument |
| `chunk` | `{docId}_c{n}` | Chunk (+ optional `embedding`) |
| `report` | report ids | Report |
| `meta` | `seen`, `activity`, `scan`, `chats` | arrays / ScanState / chat threads |

New account → seeded org + seed documents + built-in sample regulations, then persisted.

---

## 10. Document kinds and sources

**Kinds:** `regulation` · `policy` · `evidence` · `control`  
**Sources:** `upload` · `federal-register` · `seed`

Uploads accepted: **PDF, .txt, .md** (Word / `.docx` is rejected).  
PDF text extraction: `unpdf`. PDF export of policy suggestions: `pdf-lib`.

---

## 11. API map (app)

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/auth/signup` | public | Creates user + session |
| POST | `/api/auth/login` | public | Session cookie |
| POST | `/api/auth/logout` | public | Clears session |
| GET | `/api/health` | session | Providers + counts |
| GET/PUT | `/api/org` | session | Org snapshot |
| GET | `/api/documents` | session | Library list |
| POST | `/api/ingest` | session | JSON or multipart upload |
| GET/POST | `/api/regulations` | session | Feed / ingest FR item |
| POST | `/api/regulations/seen` | session | Clear new badges |
| POST | `/api/chat` | session | NDJSON stream |
| GET/PUT | `/api/chats` | session | Chat history |
| GET/POST | `/api/reports` | session | List / generate |
| GET/PATCH | `/api/reports/[id]` | session | Read / sign-off / change edits |
| GET | `/api/reports/[id]/pdf` | session | Policy-suggestions PDF |
| GET | `/api/risk` | session | Risk dashboard payload |
| GET | `/api/activity` | session | Records |
| GET | `/api/cron/scan` | optional cron secret | Scan all users |

---

## 12. Technology stack

### Core

| Layer | Choice |
| --- | --- |
| Framework | **Next.js 16.3.5** (App Router) |
| UI library | **React 19** |
| Language | **TypeScript** |
| Styling | **Tailwind CSS 4** |
| Icons | **lucide-react** |
| Validation | **Zod** |
| Runtime notes | Node.js; scripts still pass `--experimental-sqlite` historically (workspace data is MongoDB now) |

### AI / LLM

| Role | Default in this repo | Alternate |
| --- | --- | --- |
| Chat / agents | OpenAI **gpt-4o** (`openai` SDK) | Azure OpenAI deployment |
| Embeddings | OpenAI **text-embedding-3-small** | Azure embeddings, or AWS Titan |
| Optional KB | — | AWS Bedrock Knowledge Base |

### Data / infra libraries

| Piece | Library / service |
| --- | --- |
| Database | **MongoDB** (`mongodb` Node driver, Atlas) |
| Auth hashing | Node **`crypto`** (SHA-256 + random salt) |
| PDF ingest | **unpdf** |
| PDF export | **pdf-lib** |
| AWS SDK (optional) | `@aws-sdk/client-bedrock-runtime`, `@aws-sdk/client-bedrock-agent-runtime` |
| Regulation feed | Federal Register HTTP API |

### Not active in the live path

| Item | Status |
| --- | --- |
| Pinecone | Code present but commented / off |
| Word (.docx) ingest | Rejected |
| Tickets / workstream page | Removed |
| Integrate page | Removed |

---

## 13. Environment variables (names only)

Do not commit real secrets. Typical keys:

| Variable | Role |
| --- | --- |
| `MONGODB_URI` | MongoDB connection (required for auth + persistence) |
| `OPENAI_API_KEY` | Public OpenAI chat + embeddings (this project) |
| `OPENAI_MODEL` | Chat model (default gpt-4o) |
| `OPENAI_EMBEDDING_MODEL` | Embedding model |
| `AZURE_OPENAI_*` | Client cutover to Azure OpenAI |
| `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, … | Bedrock RAG |
| `BEDROCK_EMBEDDING_MODEL_ID` | Titan model id |
| `BEDROCK_KNOWLEDGE_BASE_ID` | Optional KB |
| `AEGIS_API_KEY` | Optional gate for `/api/v1/*` |
| `CRON_SECRET` | Optional gate for `/api/cron/scan` |
| `PINECONE_*` | Unused while Pinecone is off |

---

## 14. Seed content on first login

**Org:** Healthcare Manufacturer, Part D healthcare company notes, CMS/HHS/FTC scan focus.

**Seed regulation extract:** CMS-4208-F3 / CMS-4212-F (CY2027 MA, Part D, Cost Plan final rule).

**Stand-in policies (examples):**

- Manufacturer Discount / Coverage Gap finance SOP
- U.S. medical-legal-regulatory review SOP
- Patient assistance and copay operations
- Enterprise access control (SOC 2)

**Built-in sample regulations:** five healthcare-company assumption texts (MDP, promo, Open Payments, hub privacy, DSCSA-style supply chain).

---

## 15. Important product limits (be honest in demos)

- Does **not** file with CMS
- Sample rules are **not** official government text
- Seed SOPs are **not** a real company’s procedures
- Activity log is an app audit trail, **not** a validated QMS
- PDF export = **policy suggestions**, not a full dump of the day-window roadmap
- Pinecone is **not** the vector store; vectors live on MongoDB chunks
- Records UI may still mention SQLite in older copy; runtime persistence is **MongoDB**

---

## 16. How to run locally

```bash
npm install
# set MONGODB_URI and OPENAI_API_KEY in .env
npm run dev
```

Open `http://localhost:3000` → Create account → work in `/copilot`.

---

## 17. Related repo docs

| File | Purpose |
| --- | --- |
| `APP-RUNDOWN.md` | This full rundown |
| `DEMO-SLIDES.md` | Short demo talking points per page |
| `ACTION-ITEMS.md` | Earlier ticket / presenter checklist |
| `README.md` | Developer / teammate onboarding (may lag a bit behind auth + Mongo) |
| `AGENTS.md` | Cursor / Next.js agent rules for this repo |

---

*Generated as a living product map of Governance Agent. Update this file when pages, providers, or persistence change.*
