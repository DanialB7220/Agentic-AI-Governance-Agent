import type { OrgProfile, StoredDocument } from "./types";

export const seedOrg: OrgProfile = {
  name: "Johnson & Johnson",
  industry: "Innovative Medicine / MedTech (Part D manufacturer)",
  size: "Enterprise",
  jurisdictions: ["United States", "EU", "global affiliates"],
  frameworks: ["cms-ma-pd", "soc2"],
  notes:
    "Client engagement: map CMS-4208-F3 / CMS-4212-F (CY2027 MA/Part D final rule, 91 FR 17384) onto existing J&J manufacturer, patient-support, medical-legal-regulatory, and market-access workflows. J&J is not an MA organization; primary exposure is Manufacturer Discount Program, selected-drug / MFP interactions, insulin and vaccine cost-sharing rules, TrOOP, and any MA/Part D marketing or plan-partner programs. Seed policies below are demo stand-ins, not real J&J SOPs.",
  updatedAt: new Date().toISOString(),
};

export const seedDocuments: StoredDocument[] = [
  {
    id: "doc_cms_4208_f3",
    title:
      "CMS-4208-F3 / CMS-4212-F — CY2027 MA, Part D, and Cost Plan final rule (91 FR 17384)",
    kind: "regulation",
    source: "seed",
    framework: "cms-ma-pd",
    externalUrl:
      "https://www.govinfo.gov/content/pkg/FR-2026-04-06/pdf/2026-06600.pdf",
    publishedAt: "2026-04-06",
    createdAt: "2026-04-06T00:00:00.000Z",
    text: `CMS final rule. Federal Register Vol. 91, No. 65, Monday April 6, 2026, p. 17384. CMS-4208-F3 and CMS-4212-F. RIN 0938-AV40 and 0938-AV63. 42 CFR Parts 422 and 423.

Title: Medicare Program; Contract Year 2027 and Certain Contract Year 2026 Policy and Technical Changes to the Medicare Advantage Program, Medicare Prescription Drug Benefit Program, and Medicare Cost Plan Program.

Effective date: June 1, 2026.
Applicability: coverage beginning January 1, 2027.
Marketing and communications policies: applicable for all contract year 2027 marketing and communications, beginning October 1, 2026.

Key provisions for a manufacturer such as Johnson & Johnson:

1. Part D redesign (IRA § 11201) is codified: deductible, initial coverage, catastrophic. Coverage gap eliminated. Annual OOP threshold (e.g. $2,100 for CY2026, inflation-adjusted). Enrollee pays 25% coinsurance in initial coverage; $0 cost sharing in catastrophic.

2. Coverage Gap Discount Program sunsets; all CGDP agreements terminate as of January 1, 2025. Manufacturer Discount Program (MDP, Act § 1860D-14C, 42 CFR 423 subpart AA) replaces it. Manufacturers with an MDP agreement provide discounts on applicable drugs in BOTH initial coverage (typically 10%) and catastrophic (typically 20%). Selected drugs during a price applicability period are NOT applicable drugs under MDP; CMS pays a selected-drug subsidy instead (typically 10% initial / 40% catastrophic reinsurance pattern as described in CY2026 program instructions).

3. Applicable drug: Part D drug approved under NDA 505(c) or licensed under PHSA 351, excluding selected drugs dispensed during a price applicability period.

4. TrOOP: types of payments that count as True Out-Of-Pocket are updated. Policy for how enrollee costs on drugs NOT subject to the defined-standard deductible (insulin, ACIP adult vaccines, LIS, enhanced plans with $0 deductible) count toward becoming eligible for manufacturer discounts.

5. Insulin: deductible does not apply. Cost sharing for a one-month supply is the lesser of (i) $35, (ii) 25% of MFP if negotiated, (iii) 25% of negotiated price. Vaccines: ACIP-recommended adult vaccines that are Part D drugs — no deductible, no coinsurance.

6. Star Ratings: measure set simplified; Diabetes Care—Eye Exam remains. Health Equity Index / Excellent Health Outcomes for All reward will NOT be implemented; historical reward factor continues. Some measure removals apply 2027 measurement / 2029 Stars; interpreter/TTY and statin CVD measures later.

7. SSBCI: MA plans must post objective chronically-ill supplemental eligibility criteria on a public website. Debit-card administration of supplemental benefits: real-time verification, disclosures, customer support. Marketing the dollar value of supplemental benefits was NOT prohibited in the final rule.

8. Enrollment: CMS is NOT finalizing a special enrollment period for provider terminations. Certain SEPs require prior CMS eligibility determination (contract violation, CMS sanction, inadequate notice of loss of creditable coverage, other exceptional circumstances).

9. Creditable coverage / LEP: simplified determination methodology updates at § 423.56; non-RDS plans may attest using actuarial testing or the revised simplified method.

This extract is a planning aid from a U.S. government work. It is not legal advice and is not a substitute for the full PDF.`,
  },
  {
    id: "doc_jnj_mdp_sop",
    title: "Manufacturer Discount / Coverage Gap — finance SOP (stand-in)",
    kind: "policy",
    source: "seed",
    framework: "cms-ma-pd",
    createdAt: "2025-06-01T00:00:00.000Z",
    text: `J&J Innovative Medicine — U.S. Market Access finance SOP (demo stand-in, not a real SOP)

Purpose: pay Coverage Gap Discount Program invoices from Part D sponsors via the historical CGDP agreement workflow in SAP.

- Applicable drugs are branded NDA products. Specialty biologics follow the same invoice file.
- Coverage gap phase is still referenced in month-end close job aids.
- Selected drugs / MFP price-applicability windows are tracked on a spreadsheet owned by one pricing analyst, not in the claim-level MDP engine.
- True-out-of-pocket (TrOOP) is not independently calculated; we rely on the PDE flags from the plan.
- Insulin copay programs still assume a $35 cap and a deductible that may apply.
- No documented process for CMS prospective Manufacturer Discount Program payments appearing on Monthly Membership Detail Reports (those are plan-side, but our accrual model still assumes CGDP timing).

Known gap: this SOP has not been rewritten for 42 CFR 423 subpart AA or the three-phase Part D benefit.`,
  },
  {
    id: "doc_jnj_mlr",
    title: "U.S. medical-legal-regulatory review SOP (stand-in)",
    kind: "policy",
    source: "seed",
    framework: "cms-ma-pd",
    createdAt: "2025-09-15T00:00:00.000Z",
    text: `U.S. MLR promotional review SOP (demo stand-in)

- All HCP and DTC pieces go through MLR. MA/Part D audience pieces use the prior-year CMS communications memo.
- Calendar: AEP creative is locked in August. No explicit gate that CY2027 MA/Part D communications must follow rules applicable beginning October 1, 2026.
- Star Ratings claims in copromotion with MA-PD partners are allowed if the partner legal team signs off. No checklist for removed Star measures or the retained Diabetes Care—Eye Exam measure.
- Supplemental-benefit dollar-value claims in partner toolkits are not prohibited in this SOP (aligned with the final rule not banning that, but still needs partner-specific review).
- SSBCI eligibility language is not in the MLR taxonomy.`,
  },
  {
    id: "doc_jnj_pap",
    title: "Patient assistance and copay operations (stand-in)",
    kind: "policy",
    source: "seed",
    framework: "cms-ma-pd",
    createdAt: "2025-11-02T00:00:00.000Z",
    text: `U.S. Patient Assistance / Copay operations (demo stand-in)

- Hub determines Part D vs commercial. Part D patients are routed to foundation or PAP, not copay cards, per historical guidance.
- Insulin: hub scripts say "Medicare insulin is capped at $35 / month after deductible."
- Adult vaccines: no dedicated ACIP Part D $0 cost-sharing talking track.
- TrOOP: hub does not advise patients on what counts toward the OOP threshold after IRA redesign.
- Selected drugs: no flag in the hub CRM when a product enters a Medicare negotiation price-applicability period.

Access control: hub vendors are on SSO with MFA. Quarterly access reviews exist. Least privilege is documented.`,
  },
  {
    id: "doc_jnj_access",
    title: "Enterprise access control (stand-in)",
    kind: "policy",
    source: "seed",
    framework: "soc2",
    createdAt: "2026-01-12T00:00:00.000Z",
    text: `J&J enterprise access control (demo stand-in)

- Workforce access via SSO and MFA.
- Joiner-mover-leaver through identity governance. Quarterly access reviews for finance and hub systems that touch PDE and manufacturer discount files.
- Vendor access for rebate processors is standing, not just-in-time.
- Change management: SAP transport requests require dual approval.`,
  },
];
