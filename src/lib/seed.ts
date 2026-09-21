import type { OrgProfile, StoredDocument } from "./types";

export const seedOrg: OrgProfile = {
  name: "Northstar Payments",
  industry: "Payment processor / fintech",
  size: "120 employees",
  jurisdictions: ["United States", "EU (limited)"],
  frameworks: ["soc2", "pci-dss"],
  notes:
    "We store cardholder data for a subset of merchants. SOC 2 Type I is in progress. PCI DSS 4.0 is in scope for the CDE. GDPR is not formally in scope yet but we have EU contractors.",
  updatedAt: new Date().toISOString(),
};

export const seedDocuments: StoredDocument[] = [
  {
    id: "doc_access_policy",
    title: "Access Control Policy",
    kind: "policy",
    source: "seed",
    framework: "soc2",
    createdAt: "2026-01-12T00:00:00.000Z",
    text: `Northstar Payments Access Control Policy (internal)

Scope: production systems, admin consoles, and the cardholder data environment.

1. Access is granted on least privilege and role. Engineers receive environment-specific roles (read, deploy, admin). Admin is time-bound.
2. Workforce joiners are provisioned by People Ops tickets. Movers lose prior role access within 24 hours. Leavers are revoked the same business day.
3. MFA is required for SSO, VPN, cloud consoles, and production SSH jump hosts.
4. Shared root and service accounts are prohibited except break-glass, stored in the vault, and logged.
5. Quarterly access reviews are run by Engineering and Compliance. Exceptions are tracked in the risk register.
6. This policy does not yet cover privileged session recording or just-in-time standing access for contractors.`,
  },
  {
    id: "doc_encryption",
    title: "Encryption and Data Handling Standard",
    kind: "policy",
    source: "seed",
    framework: "pci-dss",
    createdAt: "2026-02-03T00:00:00.000Z",
    text: `Encryption and Data Handling Standard

- Data in transit: TLS 1.2 or higher. TLS 1.0/1.1 disabled on public endpoints.
- Cardholder data at rest: AES-256. Keys in AWS KMS with yearly rotation.
- PAN is truncated in logs and support tools. Full PAN is limited to the CDE.
- Backups are encrypted. Test environments use synthetic data only.
- We do not tokenize PAN for all merchants yet. A subset of older flows still store encrypted PAN in RDS.
- Disk-level encryption is enabled on application hosts. Workstation disk encryption is required via MDM.`,
  },
  {
    id: "doc_vendor",
    title: "Vendor Risk Procedure",
    kind: "policy",
    source: "seed",
    framework: "soc2",
    createdAt: "2026-03-18T00:00:00.000Z",
    text: `Vendor Risk Procedure

New vendors that receive customer data complete a security questionnaire and provide a SOC 2 or equivalent.
Legal reviews the MSA. Security reviews data flows.
We do not yet require signed DPAs for every EU-related processor.
Critical vendors are reviewed annually. There is no continuous monitoring product in place.
Offboarding of vendors (key revocation, data deletion attestations) is informal.`,
  },
  {
    id: "doc_incident",
    title: "Incident Response One-Pager",
    kind: "policy",
    source: "seed",
    createdAt: "2025-11-02T00:00:00.000Z",
    text: `Incident Response One-Pager

Severity 1 (customer data or payments down): page on-call, notify VP Eng, open a war room.
We aim to notify affected customers "as soon as practical."
No tabletop exercise has been run in the last 12 months.
No written 72-hour GDPR breach notice runbook.
Forensic retention of logs is not specified.`,
  },
  {
    id: "doc_new_pci",
    title: "PCI DSS 4.0.1 targeted update (internal briefing)",
    kind: "regulation",
    source: "seed",
    framework: "pci-dss",
    createdAt: "2026-04-01T00:00:00.000Z",
    text: `Internal briefing: PCI DSS 4.0 remaining future-dated requirements now expected to be in place.

Highlighted obligations for Northstar:
- Authenticated vulnerability scans for the CDE, at least quarterly, plus after significant change.
- Automated log review for critical systems; not a weekly spreadsheet.
- Phishing-resistant MFA for all CDE access, including vendors.
- Documented cryptographic architecture, including key custody and algorithm inventory.
- Targeted risk analysis for custom controls where 4.0 allows a defined approach.
- Proof that PAN is not stored after authorization unless there is a documented business need.

This briefing is a planning aid, not a QSA opinion.`,
  },
];
