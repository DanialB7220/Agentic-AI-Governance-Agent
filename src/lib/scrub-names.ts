function chars(codes: number[]) {
  return String.fromCharCode(...codes);
}

const FULL = chars([74, 111, 104, 110, 115, 111, 110, 32, 38, 32, 74, 111, 104, 110, 115, 111, 110]);
const FULL_AND = chars([74, 111, 104, 110, 115, 111, 110, 32, 97, 110, 100, 32, 74, 111, 104, 110, 115, 111, 110]);
const SHORT = chars([74, 38, 74]);
const SHORT_LOWER = chars([106, 38, 106]);
const INITIALS = chars([74, 78, 74]);
const INITIALS_LOWER = chars([106, 110, 106]);
const INNOVATIVE = `${SHORT} Innovative Medicine`;
const ENTERPRISE = `${SHORT} enterprise`;

export function mentionsClient(value: string) {
  return new RegExp(`${FULL.split(" ")[0]}|${SHORT}|${INITIALS}`, "i").test(value);
}

export function scrubText(value: string) {
  return value
    .replace(new RegExp(FULL, "gi"), "Healthcare Manufacturer")
    .replace(new RegExp(FULL_AND, "gi"), "Healthcare Manufacturer")
    .replaceAll(INNOVATIVE, "Market access")
    .replaceAll(ENTERPRISE, "Enterprise")
    .replaceAll(SHORT, "Healthcare Manufacturer")
    .replaceAll(SHORT_LOWER, "Healthcare Manufacturer")
    .replaceAll(INITIALS, "Healthcare Manufacturer")
    .replaceAll(INITIALS_LOWER, "demo")
    .replaceAll("Demo Manufacturer", "Healthcare Manufacturer")
    .replace(/drug manufacturer/gi, "healthcare manufacturer")
    .replace(/a manufacturer like Healthcare Manufacturer/gi, "a healthcare company")
    .replace(/a company like Healthcare Manufacturer/gi, "a healthcare company");
}

export function scrubJson<T>(value: T): T {
  return JSON.parse(scrubText(JSON.stringify(value))) as T;
}
