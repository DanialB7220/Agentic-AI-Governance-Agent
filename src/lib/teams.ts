import type { FrameworkId, TeamActionItem } from "./types";

export const TEAM_OPTIONS = [
  "Governance",
  "Market access",
  "Finance",
  "MLR",
  "Patient support",
  "Engineering",
  "Legal",
  "Privacy",
  "Security",
] as const;

export type TeamName = (typeof TEAM_OPTIONS)[number];

function item(team: TeamName, level: string, task: string): TeamActionItem {
  return { team, level, task };
}

/** Pick the primary accountable team from policy / control wording. */
export function inferTeam(text: string, framework?: FrameworkId): TeamName {
  const hay = text.toLowerCase();
  if (/mlr|medical.?legal|promot|market(ing)?|comms|advertis/.test(hay)) return "MLR";
  if (/hub|patient.?assist|copay|pap\b|patient support/.test(hay)) return "Patient support";
  if (/discount|mdp|coverage gap|troop|part d|claim|invoice|mfp|selected.?drug|insulin|vaccine/.test(hay)) {
    return "Market access";
  }
  if (/financ|accrual|sap|close checklist/.test(hay)) return "Finance";
  if (/privacy|gdpr|hipaa|pii|dsr|breach/.test(hay) || framework === "gdpr") return "Privacy";
  if (/access control|mfa|soc|pci|encrypt|vulnerab|nist|security|log(ging)?/.test(hay) ||
    framework === "soc2" ||
    framework === "pci-dss" ||
    framework === "nist-csf") {
    return "Security";
  }
  if (/legal|contract|agreement/.test(hay)) return "Legal";
  if (/api|engineer|system|code|build|deploy|software|platform/.test(hay)) return "Engineering";
  if (framework === "cms-ma-pd") return "Market access";
  return "Governance";
}

export function leadForTeam(team: TeamName) {
  const leads: Record<TeamName, string> = {
    Governance: "Governance Lead",
    "Market access": "Market Access Lead",
    Finance: "Finance Lead",
    MLR: "MLR Lead",
    "Patient support": "Patient Support Lead",
    Engineering: "Engineering Lead",
    Legal: "Legal Counsel",
    Privacy: "Privacy Program Manager",
    Security: "Security Governance Lead",
  };
  return leads[team];
}

/** Concrete multi-team action list for a policy change. */
export function actionItemsForPolicyChange(input: {
  policyTitle: string;
  issue: string;
  action: string;
  team?: string;
}): { team: TeamName; owner: string; actionItems: TeamActionItem[] } {
  const team = (TEAM_OPTIONS.find((name) => name === input.team) ??
    inferTeam(`${input.policyTitle} ${input.issue} ${input.action}`)) as TeamName;
  const owner = leadForTeam(team);
  const title = input.policyTitle;
  const change = input.action;

  const byTeam: Record<TeamName, TeamActionItem[]> = {
    Governance: [
      item("Governance", "Accountable", `Track this SOP edit for “${title}” to close, and confirm sign-off before the due date.`),
      item("Legal", "Consulted", `Confirm the rewrite for “${title}” does not overstate CMS or plan duties.`),
      item("Engineering", "Informed", `Flag any workflow or data-field changes that systems must pick up after “${title}” is updated.`),
    ],
    "Market access": [
      item("Market access", "Accountable", change),
      item("Finance", "Responsible", `Update accruals / claim-level jobs that still assume the old language in “${title}”.`),
      item("Engineering", "Responsible", `Ship any claim, eligibility, or reporting code changes called out by the “${title}” rewrite.`),
      item("Governance", "Consulted", `Record the policy version and evidence that Market Access closed this item.`),
    ],
    Finance: [
      item("Finance", "Accountable", change),
      item("Market access", "Consulted", `Validate Part D / discount inputs that feed the finance close for “${title}”.`),
      item("Engineering", "Responsible", `Wire report or ERP fields so Finance can run the updated “${title}” process.`),
      item("Governance", "Informed", `File the revised SOP and close checklist for “${title}”.`),
    ],
    MLR: [
      item("MLR", "Accountable", change),
      item("Legal", "Consulted", `Review promotional claims before CY creative locks for “${title}”.`),
      item("Market access", "Consulted", `Confirm plan-partner or benefit language matches the MLR rewrite.`),
      item("Governance", "Informed", `Archive the approved copy and review log for “${title}”.`),
    ],
    "Patient support": [
      item("Patient support", "Accountable", change),
      item("Privacy", "Consulted", `Confirm hub / PAP scripts in “${title}” stay within allowed data uses.`),
      item("Engineering", "Responsible", `Update hub workflows or CRM fields that still follow the old “${title}” steps.`),
      item("Governance", "Informed", `Keep the patient-facing SOP version current in the library.`),
    ],
    Engineering: [
      item("Engineering", "Accountable", change),
      item("Security", "Consulted", `Review access, logging, and change control for the system change behind “${title}”.`),
      item("Governance", "Responsible", `Update the written control / SOP so it matches what Engineering shipped.`),
      item("Legal", "Informed", `Note any customer-facing or regulatory wording that depends on the build.`),
    ],
    Legal: [
      item("Legal", "Accountable", change),
      item("Governance", "Responsible", `Publish the approved text into the policy library for “${title}”.`),
      item("MLR", "Consulted", `Align promotional review with Legal’s position on “${title}”.`),
      item("Engineering", "Informed", `No code change unless Legal flags a system dependency.`),
    ],
    Privacy: [
      item("Privacy", "Accountable", change),
      item("Engineering", "Responsible", `Implement retention, access, or DSR handling called for by “${title}”.`),
      item("Legal", "Consulted", `Confirm notice / consent language still holds.`),
      item("Governance", "Informed", `Attach Privacy sign-off to the policy record.`),
    ],
    Security: [
      item("Security", "Accountable", change),
      item("Engineering", "Responsible", `Implement MFA, logging, or access changes required by “${title}”.`),
      item("Governance", "Responsible", `Refresh the control narrative and evidence pack.`),
      item("Privacy", "Consulted", `Confirm security changes do not break privacy commitments.`),
    ],
  };

  return { team, owner, actionItems: byTeam[team] };
}

/** Multi-team actions for a scored control finding. */
export function actionItemsForFinding(input: {
  title: string;
  action: string;
  framework: FrameworkId;
  status: string;
}): { team: TeamName; owner: string; actionItems: TeamActionItem[] } {
  const team = inferTeam(input.title, input.framework);
  const owner = leadForTeam(team);
  if (input.status === "covered") {
    return {
      team,
      owner,
      actionItems: [
        item(team, "Accountable", `Keep evidence current for “${input.title}”; no material rewrite required.`),
        item("Governance", "Informed", `Spot-check this control on the next readiness pass.`),
      ],
    };
  }
  return {
    team,
    owner,
    actionItems: [
      item(team, "Accountable", input.action),
      item("Governance", "Responsible", `Open a tracked remediation for “${input.title}” and chase the owner to the due date.`),
      item("Engineering", "Consulted", `Say whether a system or data change is required to close “${input.title}”.`),
      item("Legal", "Informed", `Flag if the gap creates filing, notice, or partner-contract risk.`),
    ],
  };
}
