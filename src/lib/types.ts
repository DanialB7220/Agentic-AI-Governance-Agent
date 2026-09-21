export const FRAMEWORKS = ["soc2", "pci-dss", "gdpr", "nist-csf"] as const;
export type FrameworkId = (typeof FRAMEWORKS)[number];

export const DOCUMENT_KINDS = [
  "regulation",
  "policy",
  "evidence",
  "control",
] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export type OrgProfile = {
  name: string;
  industry: string;
  size: string;
  jurisdictions: string[];
  frameworks: FrameworkId[];
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

export type GapFinding = {
  controlId: string;
  framework: FrameworkId;
  title: string;
  status: GapStatus;
  requirement: string;
  evidence: string;
  action: string;
};

export type RoadmapItem = {
  window: "0-30 days" | "30-60 days" | "60-90 days";
  title: string;
  detail: string;
  controlIds: string[];
};

export type Report = {
  id: string;
  title: string;
  frameworks: FrameworkId[];
  regulationTitle?: string;
  summary: string;
  coveragePct: number;
  findings: GapFinding[];
  roadmap: RoadmapItem[];
  markdown: string;
  createdAt: string;
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

export type RegulationFeedItem = {
  id: string;
  title: string;
  abstract: string;
  url: string;
  publishedAt: string;
  agency: string;
  type: string;
  ingested: boolean;
};
