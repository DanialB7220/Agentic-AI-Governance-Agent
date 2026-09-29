# What to add / change in this project

This product is an **AI governance** app.

It should:

1. **Find** the newest government rules (scan) **or** let you **upload** a new rule  
2. Read those against **internal policies** using **AWS RAG**  
3. Tell you **what to change**  
4. **Write audit reports**  
5. **Keep records**  
6. Show **compliance risk**

This repo is a thin first cut (chat + keyword gaps + local files). Below is what to **add or change** so it actually does the job.

Same list in the app: **Tickets**.

---

## What is already here (keep, then extend)

| Piece | Today |
|---|---|
| Chat (Scout / Auditor) | Explains a question; can draft a memo |
| Regulations page | Pulls a live Federal Register list when you open it; you can index one item |
| Organization | Fake J&J policies + you can paste more .txt/.md |
| Reports | Saves memos in a local JSON file |
| AWS | Code for Bedrock search exists, but it is not the main path yet |
| OpenAI | Chat for **this** project. Azure later for a client |

---

## 1. Scan for new regulations

| ID | Add / change | Why | Where |
|---|---|---|---|
| **GOV-1** | Check for new rules on a **timer**, even if nobody has the site open | Scan only happens when you load a page | `src/lib/regulations.ts` + a cron/API job |
| **GOV-2** | Clear **“this is new”** list (count + badges) | Seen-IDs exist but nobody gets an alert | `/regulations` |
| **GOV-3** | When you Index a rule, save the **full text**, not the short blurb | RAG cannot work off an abstract | `src/app/api/regulations/route.ts` |
| **GOV-4** | Scan **the agencies this company cares about** | Agency list is hardcoded | Organization settings + `regulations.ts` |

---

## 2. Upload a new regulation

| ID | Add / change | Why | Where |
|---|---|---|---|
| **GOV-5** | Allow **PDF** upload (Word later) | Today only .txt / .md | `src/app/api/ingest/route.ts`, Org + Regulations upload boxes |
| **GOV-6** | After upload, **auto-run** “what should we change?” and save a report | Upload does not start analysis | `src/lib/ingest.ts`, `src/lib/agents.ts` |

---

## 3. AWS RAG + internal policies

| ID | Add / change | Why | Where |
|---|---|---|---|
| **GOV-7** | Make **AWS** (Titan + Knowledge Base) the real search for policies and rules | Search is mostly local word-match | `src/lib/aws/*`, `src/lib/rag.ts`, `.env.local` |
| **GOV-8** | **Every** saved file goes into search right away | New docs often have no vectors | `src/lib/ingest.ts` |
| **GOV-9** | Search must know **policy vs regulation** | A rule must not count as “we already comply” | `rag.ts`, `agents.ts` |

---

## 4. Tell you what to change

| ID | Add / change | Why | Where |
|---|---|---|---|
| **GOV-10** | For **this** new rule, list which **internal policy** to edit and what to write | Auditor is a generic word checklist, not “this PDF vs these SOPs” | `src/lib/agents.ts` |
| **GOV-11** | Each change: **owner**, **due date**, **open / done** | Roadmap is only 30/60/90 buckets | `src/lib/types.ts`, Reports screens |

---

## 5. Audit reports

| ID | Add / change | Why | Where |
|---|---|---|---|
| **GOV-12** | Full audit report: scope, rule, policies checked, findings, sign-off. **Export PDF** | Today it is a chat memo + % | `/reports`, `agents.ts` |
| **GOV-13** | Every run is a **new saved report** tied to a rule + date (history) | Weak record of “which audit was this?” | `store.ts`, `/reports/[id]` |

---

## 6. Keep records

| ID | Add / change | Why | Where |
|---|---|---|---|
| **GOV-14** | **Activity log** (uploaded policy, scanned rule, ran report) + a Records page | No history of who did what | new `src/app/records/page.tsx` |
| **GOV-15** | Store records in a **real database** (not only `data/runtime` JSON on one laptop) | JSON is not an audit trail | `src/lib/store.ts` |

---

## 7. Compliance risk

| ID | Add / change | Why | Where |
|---|---|---|---|
| **GOV-16** | Each gap has **high / medium / low** risk | Today: covered / partial / missing only | `types.ts`, report UI |
| **GOV-17** | **Risk dashboard**: overall score, open high risks, new rules this week, last audit | No leadership view | new `src/app/risk/page.tsx` |

---

## Suggested order

1. **GOV-5** PDF upload + **GOV-6** auto analysis  
2. **GOV-3** full rule text + **GOV-7 / GOV-8** AWS search  
3. **GOV-10** real “what to change” vs the uploaded rule  
4. **GOV-16 + GOV-17** risk  
5. **GOV-12 + GOV-14 + GOV-15** proper reports and records  
6. **GOV-1 + GOV-2** background scan and “what’s new”

Chat can stay on **OpenAI** in this repo; a client can switch to **Azure**. Search should be **AWS**.
