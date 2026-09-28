import type { FrameworkId, GapFinding, GapStatus } from "./types";

export type ControlDef = {
  id: string;
  framework: FrameworkId;
  title: string;
  requirement: string;
  keywords: string[];
  action: string;
};

export const FRAMEWORK_LABEL: Record<FrameworkId, string> = {
  soc2: "SOC 2",
  "pci-dss": "PCI DSS",
  gdpr: "GDPR",
  "nist-csf": "NIST CSF",
  "cms-ma-pd": "CMS MA / Part D (CY2027)",
};

export const CONTROLS: ControlDef[] = [
  {
    id: "soc2-cc6",
    framework: "soc2",
    title: "Logical access (CC6)",
    requirement:
      "Limit system access to authorized users; MFA, joiner-mover-leaver, and periodic access reviews.",
    keywords: [
      "mfa",
      "least privilege",
      "access review",
      "rbac",
      "joiner",
      "leaver",
    ],
    action: "Close contractor JIT access and record privileged sessions.",
  },
  {
    id: "soc2-cc7",
    framework: "soc2",
    title: "Monitoring and detection (CC7)",
    requirement:
      "Detect and respond to anomalies with centralized logging, alerting, and incident handling.",
    keywords: ["siem", "logging", "alert", "monitor", "detection", "soc"],
    action: "Stand up centralized log review with alerting on admin and CDE events.",
  },
  {
    id: "soc2-cc8",
    framework: "soc2",
    title: "Change management (CC8)",
    requirement:
      "Changes to infrastructure and application code are reviewed, tested, and approved before production.",
    keywords: [
      "change management",
      "pull request",
      "cab",
      "deployment approval",
      "code review",
    ],
    action: "Write a change policy tying production deploys to ticketed, reviewed PRs.",
  },
  {
    id: "soc2-cc9",
    framework: "soc2",
    title: "Vendor risk (CC9)",
    requirement:
      "Vendors that can affect the system are assessed, contracted, and reviewed.",
    keywords: ["vendor", "soc 2", "questionnaire", "third party", "processor"],
    action: "Add annual critical-vendor review and deletion attestations on offboarding.",
  },
  {
    id: "pci-mfa",
    framework: "pci-dss",
    title: "MFA for CDE access",
    requirement:
      "Phishing-resistant MFA for all access into the cardholder data environment, including vendors.",
    keywords: ["mfa", "cde", "phishing-resistant", "passkey", "hardware key"],
    action: "Move CDE and vendor access onto passkeys / hardware keys.",
  },
  {
    id: "pci-logs",
    framework: "pci-dss",
    title: "Automated log review",
    requirement:
      "Critical systems produce audit logs that are reviewed automatically, not by weekly spreadsheet.",
    keywords: ["log review", "siem", "audit log", "automated"],
    action: "Send CDE logs to a SIEM and define daily exception review.",
  },
  {
    id: "pci-vuln",
    framework: "pci-dss",
    title: "Authenticated vulnerability scanning",
    requirement:
      "Quarterly authenticated scans of the CDE, and after significant change.",
    keywords: ["vulnerability", "scan", "asv", "nessus", "qualys"],
    action: "Procure authenticated scanning and calendar quarterly + post-change scans.",
  },
  {
    id: "pci-crypto",
    framework: "pci-dss",
    title: "Cryptographic architecture",
    requirement:
      "Document algorithms, key custody, rotation, and where PAN is stored.",
    keywords: ["aes-256", "kms", "key rotation", "tls", "pan", "tokenization"],
    action: "Publish a crypto architecture one-pager and finish PAN tokenization.",
  },
  {
    id: "gdpr-ropa",
    framework: "gdpr",
    title: "Records of processing",
    requirement:
      "Know what personal data you process, why, and on what lawful basis.",
    keywords: ["ropa", "lawful basis", "processing register", "personal data"],
    action: "Build a lightweight RoPA for EU contractor and customer data.",
  },
  {
    id: "gdpr-dsr",
    framework: "gdpr",
    title: "Data subject rights",
    requirement:
      "Intake, identity check, and fulfill access/delete requests on a clock.",
    keywords: ["dsar", "data subject", "erasure", "access request"],
    action: "Add a DSR intake path and 30-day fulfillment checklist.",
  },
  {
    id: "gdpr-breach",
    framework: "gdpr",
    title: "72-hour breach notice",
    requirement:
      "Assess personal-data incidents and notify the authority within 72 hours when required.",
    keywords: ["72-hour", "breach notice", "supervisory", "gdpr"],
    action: "Add a 72-hour decision tree to the incident one-pager.",
  },
  {
    id: "cms-mdp",
    framework: "cms-ma-pd",
    title: "Manufacturer Discount Program (subpart AA)",
    requirement:
      "Maintain a Manufacturer Discount Program agreement; provide discounts on applicable drugs in initial and catastrophic phases; distinguish applicable drugs from selected drugs during a price applicability period.",
    keywords: [
      "manufacturer discount",
      "subpart aa",
      "applicable drug",
      "selected drug",
      "coverage gap discount",
    ],
    action:
      "Replace Coverage Gap Discount Program SOPs with MDP agreement ops, invoice/true-up, and selected-drug exclusion during MFP periods.",
  },
  {
    id: "cms-selected-drug",
    framework: "cms-ma-pd",
    title: "Selected drugs during MFP price-applicability periods",
    requirement:
      "Selected drugs dispensed during a price applicability period are not applicable drugs under the Manufacturer Discount Program. CMS pays a selected-drug subsidy instead. Manufacturer finance, hub, and pricing must flag those windows.",
    keywords: [
      "selected drug",
      "mfp",
      "price applicability",
      "negotiation",
      "selected-drug subsidy",
    ],
    action:
      "Put IRA negotiation / MFP windows in the claim-level engine, not a single analyst spreadsheet, and stop accruing MDP discounts on selected drugs in those periods.",
  },
  {
    id: "cms-troop",
    framework: "cms-ma-pd",
    title: "TrOOP and deductible exceptions (insulin / ACIP vaccines)",
    requirement:
      "Track True Out-Of-Pocket correctly after IRA redesign; insulin and ACIP adult vaccines skip the Part D deductible; manufacturer discount eligibility still keys off the statutory deductible being met in specified cases.",
    keywords: [
      "troop",
      "insulin",
      "acip",
      "vaccine",
      "deductible",
      "out-of-pocket",
    ],
    action:
      "Update patient-support and rebate logic so insulin/vaccine fills do not assume a deductible, and MDP eligibility uses the CMS TrOOP rules.",
  },
  {
    id: "cms-part-d-phases",
    framework: "cms-ma-pd",
    title: "Redesigned Part D phases (no coverage gap)",
    requirement:
      "Operate against deductible → initial coverage → catastrophic. Coverage gap is gone. Catastrophic has $0 enrollee cost sharing. Align specialty tier and reinsurance/selected-drug subsidy math.",
    keywords: [
      "coverage gap",
      "catastrophic",
      "initial coverage",
      "reinsurance",
      "selected drug subsidy",
    ],
    action:
      "Rewrite coverage-phase calculators, bid overlays, and manufacturer payment estimates for the three-phase benefit.",
  },
  {
    id: "cms-marketing",
    framework: "cms-ma-pd",
    title: "CY2027 marketing and communications",
    requirement:
      "CY2027 marketing and communications rules apply beginning October 1, 2026. Materials that mention MA/Part D benefits, Star Ratings, or supplemental value must follow the new CMS communications standards.",
    keywords: [
      "marketing",
      "communications",
      "october 1",
      "star ratings",
      "supplemental",
    ],
    action:
      "Refresh MLR calendars so CY2027 pieces are not in market before Oct 1, 2026 without the new rules applied.",
  },
  {
    id: "cms-insulin-cost",
    framework: "cms-ma-pd",
    title: "Covered insulin cost sharing cap",
    requirement:
      "For CY2026 onward, insulin cost sharing is the lesser of $35, 25% of MFP, or 25% of negotiated price; deductible does not apply.",
    keywords: ["insulin", "$35", "mfp", "negotiated price", "cost sharing"],
    action:
      "Point patient assistance and copay messaging at the three-way lesser-of test, not a flat $35 forever.",
  },
  {
    id: "cms-ssbci",
    framework: "cms-ma-pd",
    title: "SSBCI eligibility posted publicly (plan partners)",
    requirement:
      "MA plans must post objective SSBCI eligibility criteria on a public site. Manufacturer/plan collaborations that reference chronic-illness extras must not contradict posted criteria.",
    keywords: [
      "ssbci",
      "chronically ill",
      "eligibility",
      "public-facing",
      "supplemental benefits",
    ],
    action:
      "If J&J co-markets or funds SSBCI-like extras with MA partners, map copy to each partner’s posted criteria.",
  },
  {
    id: "nist-detect",
    framework: "nist-csf",
    title: "Detect (DE)",
    requirement:
      "Anomalies and events are discovered in time to contain impact.",
    keywords: ["detect", "siem", "alert", "anomaly"],
    action: "Define detection use cases for admin abuse and data exfil.",
  },
];

export function scoreControl(
  control: ControlDef,
  corpus: string,
): { status: GapStatus; hits: string[] } {
  const hay = corpus.toLowerCase();
  const hits = control.keywords.filter((k) => hay.includes(k.toLowerCase()));
  const ratio = hits.length / control.keywords.length;
  if (ratio >= 0.45) return { status: "covered", hits };
  if (ratio > 0) return { status: "partial", hits };
  return { status: "missing", hits };
}

export function evidenceBlurb(hits: string[], snippets: string[]) {
  if (hits.length === 0) return "No matching language in current org documents.";
  const snippet = snippets.find((s) =>
    hits.some((h) => s.toLowerCase().includes(h.toLowerCase())),
  );
  return snippet
    ? `Keywords matched: ${hits.join(", ")}. Example: “${snippet.slice(0, 180).trim()}…”`
    : `Keywords matched: ${hits.join(", ")}.`;
}

export function toFinding(
  control: ControlDef,
  corpus: string,
  snippets: string[],
): GapFinding {
  const { status, hits } = scoreControl(control, corpus);
  return {
    controlId: control.id,
    framework: control.framework,
    title: control.title,
    status,
    requirement: control.requirement,
    evidence: evidenceBlurb(hits, snippets),
    action: control.action,
  };
}
