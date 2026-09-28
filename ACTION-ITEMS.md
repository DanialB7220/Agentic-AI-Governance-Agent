# Action items — get the demo running

This is a **corporate-looking prototype**, not a production GRC system and not a real J&J build. The idea to showcase: new CMS rule in, mock internal policies already on file, copilot diffs them, memo + 30/60/90 out. Same loop could later sit next to a policy system over HTTP.

**Story:** Johnson & Johnson × [CMS-4208-F3 / CMS-4212-F](https://www.govinfo.gov/content/pkg/FR-2026-04-06/pdf/2026-06600.pdf).  
**This laptop:** public OpenAI API. **Client later:** Azure OpenAI. **RAG:** AWS Bedrock if we turn it on.  
**Mocks:** stand-in SOPs in `src/lib/seed.ts`. Intentionally stale so Auditor has gaps.

Same list in the app: `/workstream`.

---

## 1. What this demo is

| ID | When | Who | Do this |
|---|---|---|---|
| intent-1 | Before the room | Presenter | Pitch: new rule → already-on-file (mock) policies → Scout explains → Auditor memos 30/60/90. Later `/api/v1` could plug into PolicyTech/Veeva. |
| intent-2 | Before the room | Presenter | Not a CMS filing, not legal advice, not live J&J data, not SSO/SAP. Coverage % is keyword overlap. This is the idea, with fake SOPs. |
| intent-3 | Now | Engineering | Tenant looks like J&J, not a payments processor. Wipe `data/runtime/` if Northstar docs come back. |

---

## 2. Laptop boot (no clouds)

| ID | When | Who | Do this |
|---|---|---|---|
| local-1 | Now | Engineering | Node 22. `npm install && cp .env.example .env.local && npm run dev` → http://localhost:3000. Hit Copilot, Workstream, Org, Reports, Integrate. |
| local-2 | Now | Engineering | Org = Johnson & Johnson. Docs = CMS-4208-F3 briefing + four stand-in SOPs. If not, delete `data/runtime/` and restart. |
| local-3 | Now | Engineering | Empty keys still produce a memo from the control catalog. That is the room backup. |

---

## 3. OpenAI API (this demo’s chat)

| ID | When | Who | Do this |
|---|---|---|---|
| oa-1 | Before demo | Engineering | `OPENAI_API_KEY` in `.env.local`, restart. Sidebar Chat = “OpenAI API (this project)”. |
| oa-2 | Before demo | Engineering | Run the CMS vs J&J starter. Want prose that cites mock SOP titles. Catalog fallback if the API dies. |
| oa-3 | Before demo | Engineering | Demo laptops = OpenAI only. Do not paste Azure/J&J keys here. Azure is the later client story (`AZURE_OPENAI_*`, empty OpenAI key). |

---

## 4. Mock internal regulations and workflows

The copilot only looks real if the org corpus has **visible gaps**.

| ID | When | Who | Do this |
|---|---|---|---|
| mock-1 | Now | Engineering | CMS briefing (`doc_cms_4208_f3`) is the “new rule.” Full PDF ingest is not blocking. |
| mock-2 | Now | Engineering | Leave the four SOPs stale on purpose: Coverage Gap language, no Oct 1 2026 MLR gate, hub “$35 after deductible,” selected drugs on a spreadsheet. |
| mock-3 | If you need live ingest | Engineering | On `/org`, paste one extra fake SOP (kind = policy) so they see indexing happen. |
| mock-4 | If asked live | Engineering | `/regulations` or `/org` paste. `.txt` / `.md` only. Keep a snippet in Notes. |
| mock-5 | Always | Engineering | No real J&J SOPs in git. `data/runtime` is gitignored. |

---

## 5. AWS Bedrock (enterprise RAG slide)

Optional. Laptop keyword RAG is enough. Turn AWS on if you want retrieval to look corporate.

| ID | When | Who | Do this |
|---|---|---|---|
| aws-1 | If we have AWS | Engineering | Titan Embeddings V2 + keys (or `AWS_BEARER_TOKEN_BEDROCK`). Sidebar → “AWS Titan embeddings”. Wipe chunks if you previously used OpenAI vectors. |
| aws-2 | If we have time | Engineering | Bedrock Knowledge Base on S3 (mocks + CMS extract). `BEDROCK_KNOWLEDGE_BASE_ID`. |
| aws-3 | In the room | Presenter | Chat = OpenAI here / Azure at a client. Retrieval = Bedrock. Not two chat models. |
| aws-4 | If AWS is blocked | Engineering | Skip it. Say it is wired, not turned on. |

---

## 6. Demo script (5–7 minutes)

| ID | When | Who | Do this |
|---|---|---|---|
| script-1 | In the room | Presenter | `/org` — “how the company says it operates today.” Point at Coverage Gap in the finance SOP. |
| script-2 | In the room | Presenter | CMS doc + govinfo PDF. Dates: Jun 1 2026 effective, Oct 1 2026 marketing, Jan 1 2027 coverage. |
| script-3 | In the room | Presenter | Copilot → **CMS-4208-F3 vs J&J**. Call out 2–3 gaps (CGDP vs MDP, insulin language, Oct 1 MLR). |
| script-4 | In the room | Presenter | `/reports` — saved memo + 30/60/90. Internal memo, not an attestation. |
| script-5 | If they ask integrate | Presenter | `/integrate` — same agents over HTTP. Policy publish → `POST /api/v1/ingest`. Not built for this demo. |

---

## 7. Polish so it feels like a product

| ID | When | Who | Do this |
|---|---|---|---|
| polish-1 | Before demo | Engineering | Use the CMS starters. Do not wander into PCI in this showcase. |
| polish-2 | Before demo | Engineering | No Northstar, no PCI-first button, no Claude. CMS MA/Part D checked on `/org`. |
| polish-3 | Before demo | Engineering | Optional: drop old SOC/PCI rows from `data/runtime/reports.json` so the CMS memo is first. |
| polish-4 | Before demo | Presenter | Hotspot if the office blocks OpenAI. Catalog path if that fails too. |

---

## 8. Not this demo (say it, don’t build it)

| ID | When | Who | Do this |
|---|---|---|---|
| later-1 | After | Engineering | Azure OpenAI for a real client tenant. |
| later-2 | After | Engineering | PDF ingest, Postgres, SSO. |
| later-3 | After | Engineering | Swap mocks for redacted real SOPs — only if they ask. |

---

## Minimum path (today)

```bash
npm install
cp .env.example .env.local   # add OPENAI_API_KEY for real Scout/Auditor prose
npm run dev
```

1. http://localhost:3000 → **CMS-4208-F3 vs J&J**  
2. `/org` if they want to see the mock SOPs  
3. `/reports` for the saved memo  
4. AWS keys only if you want the Titan/KB badge in the sidebar
