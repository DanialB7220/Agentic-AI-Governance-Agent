export type SampleRegulation = {
  id: string;
  title: string;
  abstract: string;
  publishedAt: string;
  text: string;
};

const NOTICE =
  "Sample assumption for a healthcare company. This is not an official government rule, not legal advice, and not a real company SOP.";

export const SAMPLE_REGULATIONS: SampleRegulation[] = [
  {
    id: "sample_mdp_part_d",
    title: "Sample: Manufacturer Discount Program duties (Part D redesign)",
    abstract:
      "Assumed duties for a healthcare company after the Coverage Gap Discount Program ends: discounts in initial coverage and catastrophic, selected-drug handling, and insulin or vaccine cost sharing.",
    publishedAt: "2026-04-06",
    text: `${NOTICE}

A healthcare company with a Manufacturer Discount Program agreement must stop running Coverage Gap Discount Program invoicing as the operating model. Applicable drugs (branded products approved under an NDA or licensed under the Public Health Service Act, other than selected drugs during a price-applicability period) need a discount in both the initial coverage phase and the catastrophic phase.

The finance process has to:
- Accrue manufacturer discounts from claim-level data, not from a coverage-gap phase that no longer exists.
- Flag selected drugs during a Medicare price-applicability period and stop treating them as discount-eligible applicable drugs.
- Track how insulin and ACIP-recommended adult vaccine claims treat the deductible and the enrollee's out-of-pocket costs.
- Keep a written owner, a monthly close checklist, and evidence that True Out-of-Pocket inputs from plan data were reviewed rather than assumed.

Patient-facing teams must not tell Medicare patients that a deductible still applies to insulin, or that the old coverage-gap card is the path for Part D cost sharing.`,
  },
  {
    id: "sample_ma_pd_promo",
    title: "Sample: MA and Part D promotional communications",
    abstract:
      "Assumed marketing rules for a healthcare company that co-promotes with Medicare Advantage or Part D plans, including Star Ratings claims and supplemental-benefit language.",
    publishedAt: "2026-10-01",
    text: `${NOTICE}

When a healthcare company co-promotes a product to Medicare Advantage or Part D audiences, communications that will be used for contract year 2027 must be reviewed against the marketing rules that apply beginning October 1, 2026. A prior-year CMS communications memo is not enough.

Medical-legal-regulatory review must:
- Block Star Ratings claims that cite measures CMS has removed, and require a current citation for any measure that remains (including Diabetes Care—Eye Exam).
- Treat plan-partner toolkits as in-scope pieces, not as something the partner's legal team can approve alone.
- Keep a record of whether a piece states a dollar value for a supplemental benefit, and who approved that statement.
- Include special supplemental benefits for the chronically ill only when the piece states the objective eligibility criteria, or points to the plan page that posts them.

Annual election period creative cannot be locked before that review is finished.`,
  },
  {
    id: "sample_open_payments",
    title: "Sample: Open Payments transfers of value",
    abstract:
      "Assumed Sunshine Act reporting for meals, speaking fees, research, and ownership interests paid to physicians and teaching hospitals.",
    publishedAt: "2026-01-15",
    text: `${NOTICE}

A healthcare company must collect and report transfers of value to covered recipients (physicians, teaching hospitals, and other covered clinicians) and any ownership or investment interests. Meals, consulting, speaking, education, and research payments each need a nature-of-payment category, the amount, the date, and the related product.

The assumed control standard is:
- Every HCP program expense is captured in one system before it is paid. Spreadsheet-only tracking is not sufficient.
- Research payments are separated from general payments.
- Disputes from covered recipients are resolved or documented before the CMS submission window.
- A named owner certifies the annual report, and the workpapers are retained.

Co-promote and medical-affairs speaker programs are in scope even when a third-party vendor books the payment.`,
  },
  {
    id: "sample_hub_privacy",
    title: "Sample: Patient hub privacy and Part D support",
    abstract:
      "Assumed privacy and benefit-accuracy duties for a patient support hub that handles Medicare Part D, copay, and patient-assistance cases.",
    publishedAt: "2026-03-01",
    text: `${NOTICE}

A patient support hub that receives health information to check coverage, route copay support, or enroll a patient in assistance is expected to treat that information as protected health information when it is acting for a covered entity or as a business associate.

The assumed operating rules are:
- Part D patients are not offered a commercial copay card.
- Hub scripts for insulin state the current Medicare cost-sharing rule and do not tell patients a deductible applies when it does not.
- Adult vaccines that are Part D drugs have a $0 cost-sharing talking track when they are ACIP-recommended.
- The hub can tell whether a product is in a Medicare price-applicability period before it quotes support.
- Vendor staff who can see these cases use single sign-on and multi-factor authentication, and access is reviewed on a set schedule.
- A written notice explains what the hub collects, why, and which vendors receive it.`,
  },
  {
    id: "sample_dscsa",
    title: "Sample: Drug supply chain traceability",
    abstract:
      "Assumed Drug Supply Chain Security Act duties for a healthcare company that ships finished doses: package identifiers, transaction data, and suspect-product quarantine.",
    publishedAt: "2025-11-27",
    text: `${NOTICE}

A healthcare company that ships finished prescription drugs must put a product identifier on each package and homogeneous case, and must exchange transaction information and transaction statements with the next trading partner in an electronic, interoperable way.

The assumed control standard is:
- Each saleable unit can be traced back to the batch and the transaction that shipped it.
- Suspect or illegitimate product is quarantined, investigated, and reported. It is not reshipped while the investigation is open.
- Trading partners are checked before they are authorized to buy.
- Records are kept so a trading partner or regulator can request them without reconstructing the history from email.
- Exceptions (damaged barcodes, missing data from a 3PL) have an owner and a deadline.

This sample does not apply to a pure device business unit unless that unit also ships finished prescription drugs.`,
  },
];
