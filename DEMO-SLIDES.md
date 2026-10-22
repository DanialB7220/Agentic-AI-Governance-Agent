# Aegis demo slides

Quick script for a live walkthrough. Open http://localhost:3000. The company on screen is Healthcare Manufacturer. Policies and sample rules are demo stand-ins, not real client SOPs and not official government text.

Say this once up front: Aegis is an internal governance copilot. It reads a new rule, compares it to the company’s own policies, and writes what to change. It does not file anything with CMS.

---

## Slide 1 — Why this exists

**Show:** the Copilot home, before you type.

**Business use case.** A healthcare company is not a Medicare plan, but CY2027 MA and Part D rules still hit market access, patient hubs, medical-legal review, and finance. Teams find out late, then hunt through PDFs and old SOPs.

**What it solves.** The gap between “a rule was published” and “which policy we have to rewrite, who owns it, and by when.”

**What it brings.** One place to ask, upload a rule, and leave with a memo instead of a pile of links.

**Business value.** Faster first pass for compliance, market access, and MLR. Less time reconstructing what the last bulletin already said.

---

## Slide 2 — Copilot

**Show:** left chat list, then one starter, **CMS-4208-F3 vs our policies**. After it answers, click **New chat**, then reopen the first thread.

**How to use.**
- Type a question, or click a starter.
- The paperclip uploads a PDF, txt, or md regulation into the same thread.
- **New chat** starts a blank thread. Old threads stay in the list and survive a refresh.
- The trash icon drops a thread you do not want.

**What it solves.** People re-ask the same CMS question in email. The answer and the report link stay in that chat.

**What it brings.** A running history of advice, plus a saved report when the question is a gap review.

**Business value.** The next person opens yesterday’s thread instead of starting the analysis over.

---

## Slide 3 — Regulations

**Show:** the **Sample regulations** block first. Click **View** on Manufacturer Discount Program. Close the popup. Then point at **Upload or paste a rule**, and at the Federal Register list under it.

**How to use.**
- The five samples are already in the library. **View** opens the full text.
- Paste or upload a new rule to save it and run a what-to-change report.
- If that text is already saved, choose **Overwrite** or **Add as new**.
- **Index into RAG** saves a Federal Register item and writes the report.
- **Analyze vs org** opens Copilot with that rule filled in.
- **Mark reviewed** clears the New badges on the scan.

**What it solves.** “Did we already load this rule?” and “what just came out of CMS, HHS, or FTC?”

**What it brings.** A watchlist plus a built-in set of manufacturer assumptions: Part D discounts, MA/Part D promotion, Open Payments, patient-hub privacy, and drug supply-chain traceability.

**Business value.** Demo the product with realistic rules before anyone uploads a confidential SOP.

---

## Slide 4 — Organization

**Show:** the Healthcare Manufacturer profile, the frameworks, **Agencies to scan**, **Scan keywords** (Medicare, Part D), then the stand-in policies (Manufacturer Discount SOP, MLR SOP, patient assistance, access control).

**How to use.** Change the name, frameworks, agencies, or keywords and save. Upload an internal policy here (PDF, txt, or md). Those policies are what every report is graded against.

**What it solves.** A generic chatbot that does not know whose SOPs it is looking at, or which agencies matter.

**What it brings.** A company snapshot the copilot and the scanner both use.

**Business value.** The same app can point at another manufacturer later by swapping the profile and the policies. This demo is aimed at the manufacturer's Part D manufacturer exposure, not at running a Medicare plan.

---

## Slide 5 — Reports

**Show:** the report list, then open one. Point at coverage, each gap, the policy it targets, owner, due date, and status. Sign off with a name. Click the PDF link.

**How to use.**
- Reports appear when you index a rule or ask the copilot for a gap review.
- Edit owner, due date, and status (open, in progress, done).
- Sign off records who accepted the memo.
- Export policy suggestions as a PDF.

**What it solves.** A chat answer that disappears, with no owner and no due date.

**What it brings.** An internal memo: what is covered, what is partial, what is missing, and the policy text to change.

**Business value.** Market access, MLR, and finance can leave the meeting with a list, not a transcript.

---

## Slide 6 — Risk

**Show:** coverage percent, open high gaps, open policy changes, and rules saved in the last seven days.

**How to use.** Read it after a report exists. Click through to the report behind a high gap.

**What it solves.** Leadership asking “are we exposed?” and getting a 40-page memo back.

**What it brings.** One scoreboard: latest audit, what is still high, and what arrived this week.

**Business value.** A status check before a governance meeting, without re-running the copilot.

---

## Slide 7 — Records

**Show:** the activity list. Call out a scan, an upload, a report, and a sign-off.

**How to use.** Nothing to fill in. The app writes a line when someone uploads, the scanner runs, a report is saved, a change is edited, or a memo is signed off.

**What it solves.** “Who looked at this, and when?” with no trail.

**What it brings.** A local audit log in SQLite, on this machine.

**Business value.** You can show that the memo was produced and signed, which is what an internal review asks for.

---

## Slide 8 — Integrate

**Show:** the three calls: ingest, chat, reports.

**How to use.** Later, another system sends the same requests with `x-api-key`. This repo uses the public OpenAI API. A the client deployment would point the same calls at Azure OpenAI.

**What it solves.** A demo that cannot be wired into the tools people already use.

**What it brings.** A stable HTTP shape for ingest, ask, and fetch memos.

**Business value.** The pilot can stay a website now and sit behind an internal portal later without a new product.

---

## Slide 9 — Close

**Say:** Aegis watches the rules that hit a Part D manufacturer, checks them against the policies you already have, and writes the change list with an owner and a date.

**Do not claim:**
- These sample rules are official CMS or FDA text.
- The loaded SOPs are real Healthcare Manufacturer procedures.
- The app files anything with CMS.
- The log is a validated quality system. It is a local record for the demo.

**If they ask what to click in 5 minutes:** Copilot starter → Regulations, View a sample → Reports, open the memo and the PDF → Risk.
