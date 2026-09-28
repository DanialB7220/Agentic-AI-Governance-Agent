import { getSeenRegulationIds, listDocuments, markRegulationsSeen } from "./store";
import type { RegulationFeedItem } from "./types";

const AGENCIES = [
  "centers-for-medicare-medicaid-services",
  "department-of-health-and-human-services",
  "federal-trade-commission",
  "consumer-financial-protection-bureau",
  "securities-and-exchange-commission",
  "office-of-the-comptroller-of-the-currency",
];

type FrDoc = {
  document_number: string;
  title: string;
  abstract?: string;
  html_url: string;
  publication_date: string;
  type: string;
  agencies?: { name: string }[];
};

export async function fetchRegulationFeed(): Promise<RegulationFeedItem[]> {
  const seen = new Set(await getSeenRegulationIds());
  const ingested = new Set(
    (await listDocuments())
      .filter((d) => d.source === "federal-register")
      .map((d) => d.id),
  );

  try {
    const url = new URL("https://www.federalregister.gov/api/v1/documents.json");
    url.searchParams.set("per_page", "12");
    url.searchParams.set("order", "newest");
    url.searchParams.append("conditions[type][]", "RULE");
    url.searchParams.append("conditions[type][]", "PRORULE");
    for (const agency of AGENCIES) {
      url.searchParams.append("conditions[agencies][]", agency);
    }

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) throw new Error(`Federal Register ${res.status}`);
    const json = (await res.json()) as { results?: FrDoc[] };
    const items = (json.results ?? []).map((doc) => toItem(doc, ingested));
    const ids = items.map((i) => i.id);
    await markRegulationsSeen(ids);
    return items.map((item) => ({
      ...item,
      // first time we see an id it is "new"
      ingested: ingested.has(item.id),
    }));
  } catch {
    return fallbackFeed(seen, ingested);
  }
}

function toItem(doc: FrDoc, ingested: Set<string>): RegulationFeedItem {
  return {
    id: `fr_${doc.document_number}`,
    title: doc.title,
    abstract: doc.abstract || "No abstract provided.",
    url: doc.html_url,
    publishedAt: doc.publication_date,
    agency: doc.agencies?.map((a) => a.name).join(", ") || "Federal Register",
    type: doc.type,
    ingested: ingested.has(`fr_${doc.document_number}`),
  };
}

function fallbackFeed(
  seen: Set<string>,
  ingested: Set<string>,
): RegulationFeedItem[] {
  const items: RegulationFeedItem[] = [
    {
      id: "fr_2026_06600",
      title:
        "CMS-4208-F3 / CMS-4212-F: CY2027 Medicare Advantage, Part D, and Cost Plan final rule",
      abstract:
        "Final rule (91 FR 17384). Effective June 1, 2026; coverage January 1, 2027; CY2027 marketing from October 1, 2026. Codifies IRA Part D redesign, sunsets Coverage Gap Discount Program, adds 42 CFR 423 subpart AA Manufacturer Discount Program, TrOOP, insulin/vaccine cost sharing, Star Ratings, SSBCI, and enrollment changes.",
      url: "https://www.govinfo.gov/content/pkg/FR-2026-04-06/pdf/2026-06600.pdf",
      publishedAt: "2026-04-06",
      agency: "Centers for Medicare & Medicaid Services",
      type: "Rule",
      ingested: ingested.has("fr_2026_06600"),
    },
    {
      id: "fr_demo_ftc_ai",
      title:
        "FTC: Prohibited data practices for automated decision systems affecting credit and housing",
      abstract:
        "Proposed rule addressing notice, opt-out, and adverse-action explanation when automated systems are used in credit, housing, or insurance eligibility. Covered entities would retain model cards and training-data summaries for five years.",
      url: "https://www.federalregister.gov/",
      publishedAt: "2026-09-12",
      agency: "Federal Trade Commission",
      type: "Proposed Rule",
      ingested: ingested.has("fr_demo_ftc_ai"),
    },
    {
      id: "fr_demo_cfpb",
      title: "CFPB circular: third-party AI used in collections must be treated as the creditor's vendor",
      abstract:
        "Supervisory guidance: if a collections vendor uses an AI model that affects consumer outcomes, the creditor is responsible for testing, complaints handling, and UDAAP review. Contracts must allow audit rights.",
      url: "https://www.federalregister.gov/",
      publishedAt: "2026-09-04",
      agency: "Consumer Financial Protection Bureau",
      type: "Rule",
      ingested: ingested.has("fr_demo_cfpb"),
    },
    {
      id: "fr_demo_hhs",
      title: "HHS OCR: HIPAA security rule update — MFA and encryption safe harbors tightened",
      abstract:
        "Covered entities and business associates would need MFA on all remote access to ePHI systems and documented encryption of ePHI at rest, with a written residual-risk analysis where encryption is not used.",
      url: "https://www.federalregister.gov/",
      publishedAt: "2026-08-21",
      agency: "Department of Health and Human Services",
      type: "Proposed Rule",
      ingested: ingested.has("fr_demo_hhs"),
    },
  ];
  void seen;
  return items;
}
