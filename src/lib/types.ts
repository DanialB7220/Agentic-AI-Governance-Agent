export const FRAMEWORKS = [
  "soc2",
  "pci-dss",
  "gdpr",
  "nist-csf",
  "cms-ma-pd",
  "hipaa",
] as const;
export type FrameworkId = (typeof FRAMEWORKS)[number];

export const DOCUMENT_KINDS = [
  "regulation",
  "policy",
  "evidence",
  "control",
] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const SCAN_AGENCIES = [
  { id: "centers-for-medicare-medicaid-services", label: "CMS" },
  { id: "health-and-human-services-department", label: "HHS" },
  { id: "federal-trade-commission", label: "FTC" },
  { id: "consumer-financial-protection-bureau", label: "CFPB" },
  { id: "securities-and-exchange-commission", label: "SEC" },
  { id: "comptroller-of-the-currency", label: "OCC" },
] as const;

export type OrgProfile = {
  name: string;
  industry: string;
  size: string;
  jurisdictions: string[];
  frameworks: FrameworkId[];
  scanAgencies: string[];
  scanKeywords: string[];
  notes: string;
  updatedAt: string;
};

export type StoredDocument = {
  id: string;
  title: string;
  kind: DocumentKind;
  source: "upload" | "federal-register" | "seed";
  framework?: FrameworkId;
  externalUrl?: string;
  publishedAt?: string;
  text: string;
  createdAt: string;
};

export type Chunk = {
  id: string;
  documentId: string;
  text: string;
  embedding?: number[];
  metadata: {
    title: string;
    kind: DocumentKind;
    framework?: FrameworkId;
  };
};

export type GapStatus = "covered" | "partial" | "missing";
export type RiskLevel = "high" | "medium" | "low";
export type ChangeStatus = "open" | "in_progress" | "done";
export type RemediationStatus = "open" | "done";

/** Who does what on a gap or policy edit. */
export type TeamActionItem = {
  team: string;
  level: string;
  task: string;
};

export type GapFinding = {
  controlId: string;
  framework: FrameworkId;
  title: string;
  status: GapStatus;
  risk: RiskLevel;
  requirement: string;
  evidence: string;
  action: string;
  policyRefs?: string[];
  updateText?: string;
  owner?: string;
  team?: string;
  actionItems?: TeamActionItem[];
  dueDate?: string;
  remediationStatus?: RemediationStatus;
};

export type RoadmapItem = {
  window: "0-30 days" | "30-60 days" | "60-90 days";
  title: string;
  detail: string;
  controlIds: string[];
  policyRefs?: string[];
  owner?: string;
  team?: string;
  actionItems?: TeamActionItem[];
  dueDate?: string;
  status?: RemediationStatus;
};

export type PolicyChange = {
  id: string;
  policyTitle: string;
  issue: string;
  action: string;
  owner: string;
  team: string;
  actionItems: TeamActionItem[];
  dueDate: string;
  status: ChangeStatus;
};

export type Report = {
  id: string;
  title: string;
  frameworks: FrameworkId[];
  documentId?: string;
  regulationTitle?: string;
  scope: string;
  policiesChecked: string[];
  summary: string;
  coveragePct: number;
  findings: GapFinding[];
  changes?: PolicyChange[];
  roadmap: RoadmapItem[];
  markdown: string;
  signedOffBy?: string;
  signedOffAt?: string;
  createdAt: string;
};

export type ActivityEvent = {
  id: string;
  at: string;
  action: "upload" | "scan" | "report" | "sign-off" | "change" | "org" | "account";
  detail: string;
  documentId?: string;
  reportId?: string;
};

export type ScanState = {
  lastScanAt: string | null;
  newIds: string[];
};

export type RetrievedChunk = {
  chunk: Chunk;
  score: number;
};

export type ChatEvent =
  | { type: "status"; step: string; agent?: "scout" | "auditor" }
  | { type: "delta"; text: string }
  | { type: "report"; report: Report }
  | { type: "citations"; citations: { title: string; kind: DocumentKind }[] }
  | { type: "error"; message: string }
  | { type: "done" };

export type StoredChat = {
  id: string;
  title: string;
  updatedAt: string;
  messages: {
    id: string;
    role: "user" | "assistant";
    content: string;
    citations?: { title: string; kind: DocumentKind }[];
    report?: Report;
  }[];
};

export type RegulationFeedItem = {
  id: string;
  title: string;
  abstract: string;
  url: string;
  publishedAt: string;
  agency: string;
  type: string;
  ingested: boolean;
  isNew: boolean;
};
