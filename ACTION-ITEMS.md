# What to build

Plain list for the team. Same list in the app under **Tickets**.

This demo: fake Johnson & Johnson policies + the CMS Medicare rule → chatbot writes a gap memo.

- **This project:** OpenAI API (put `OPENAI_API_KEY` in `.env.local`)
- **A real client later:** Azure OpenAI (don’t build extra screens for that now)
- **Search:** our saved files, plus AWS later if we turn it on

---

## Already built — do not rebuild these

| Ticket | What it is | File |
|---|---|---|
| AEGIS-1 | App starts as fake J&J with old fake policies | `src/lib/seed.ts` |
| AEGIS-2 | Short CMS rule summary is already loaded | `src/lib/seed.ts` |
| AEGIS-6 | Chat talks to OpenAI if you have a key | `src/lib/llm/openai.ts` |
| AEGIS-9 | Finds matching policy text (even with no keys) | `src/lib/rag.ts` |
| AEGIS-13 | Chat page + Reports page + “CMS vs J&J” button | `chat-panel.tsx`, `/reports` |
| AEGIS-17 | Other apps can call `/api/v1/...` | `/integrate` |

---

## Must code (do these first)

### AEGIS-3 — Upload the real CMS PDF
**Add:** Read a `.pdf` and save the text. Today only `.txt` and `.md` work.

**Code in:** `src/app/api/ingest/route.ts` (add a PDF library)

**Done when:** You can upload `2026-06600.pdf` and it shows up as a document.

---

### AEGIS-5 — Reset button for the demo
**Add:** `npm run demo:reset` that wipes local saved data and loads fake J&J again.

**Code in:** `package.json` + a script under `scripts/`

**Done when:** One command makes the laptop clean. It must **not** delete `.env.local`.

---

### AEGIS-10 — Smart search on first start
**Add:** After fake policies load, if OpenAI or AWS keys exist, create search numbers for that text automatically.

**Code in:** `src/lib/store.ts` (after seed) using `embedNewChunks` in `src/lib/rag.ts`

**Done when:** `/api/health` shows embeddings > 0 when a key is set. If OpenAI is down, the app still starts.

---

### AEGIS-18 — Tiny “does the demo work?” script
**Add:** A script that checks: app is up, org name has “Johnson”, making a report returns gaps. No OpenAI needed.

**Code in:** `scripts/demo-smoke.sh` + `npm run demo:smoke`

**Done when:** `npm run dev` then `npm run demo:smoke` succeeds.

---

## Do next (nicer demo)

### AEGIS-4 — More fake paperwork
**Add:** 3–4 extra fake J&J docs in `src/lib/seed.ts` (keep them outdated on purpose).

**Done when:** They show on the Organization page after reset.

---

### AEGIS-7 — Show OpenAI errors in chat
**Add:** If the key is bad or the API times out, the chat says so.

**Code in:** `src/lib/llm/openai.ts`, `src/lib/agents.ts`

**Done when:** A bad key shows an error on screen, not a quiet weak memo.

---

### AEGIS-11 — Turn on AWS search
**Add:** Keys + optional Knowledge Base id in `.env.local`. Write 5 lines in the README how to set AWS. Code for AWS is already in `src/lib/aws/`.

**Done when:** Sidebar says Titan or Knowledge Base. No secrets in git.

---

### AEGIS-12 — Don’t mix OpenAI search with AWS search
**Add:** If someone switches from OpenAI to AWS, delete old search numbers and make new ones.

**Code in:** `src/lib/rag.ts` or `src/lib/store.ts`

**Done when:** Switching providers still finds the right policy text.

---

### AEGIS-14 — Gap list should match the fake policies
**Add:** The words we look for in `src/lib/frameworks.ts` should match (or clearly miss) text in `seed.ts`.

**Done when:** A report with no OpenAI still shows some gaps.

---

### AEGIS-15 — Delete a document
**Add:** A delete button on Organization for one file.

**Code in:** new DELETE API + `src/app/org/page.tsx`

**Done when:** Click delete → file gone from the list.

---

## Later (skip for the first demo)

| Ticket | What |
|---|---|
| AEGIS-8 | Make sure Azure still works if we empty the OpenAI key (no new UI) |
| AEGIS-16 | Hide old PCI reports so CMS is first |
| AEGIS-19 | File picker allows PDF (after AEGIS-3) |

---

## Who grabs what

1. Person A: **AEGIS-3** (PDF upload)  
2. Person B: **AEGIS-5** + **AEGIS-18** (reset + smoke test)  
3. Person C: **AEGIS-10** (search numbers on start)

Then AEGIS-4, 7, 11 if there is time.
