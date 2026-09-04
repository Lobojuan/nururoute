/**
 * Pan-African mobile-money reference data for the public demo.
 * Simulation only: operator names belong to their owners, no integration or
 * partnership is claimed, and local-currency figures are illustrative
 * conversions of a wallet that is always held in GHS.
 */

export type Operator = { id: string; name: string; prefixes: string[] };

export type Country = {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  dial: string; // e.g. "+233"
  /** National number length (digits, including the leading 0 where used). */
  digits: number;
  /** Whether national numbers are written with a leading 0. */
  leadingZero: boolean;
  currency: string;
  /** Illustrative units of local currency per 1 GHS (for display only). */
  perGhs: number;
  region: "West" | "East" | "Central" | "Southern" | "North";
  /** Ghana is the launch market; every other country is illustrative / planned until locally validated. */
  status: "launch" | "planned";
  operators: Operator[];
  example: string;
};

export const COUNTRIES: Country[] = [
  { code: "GH", name: "Ghana", dial: "+233", digits: 10, leadingZero: true, currency: "GHS", perGhs: 1, status: "launch", region: "West", example: "024 123 4567", operators: [
    { id: "mtn", name: "MTN MoMo", prefixes: ["024", "025", "053", "054", "055", "059"] },
    { id: "telecel", name: "Telecel Cash", prefixes: ["020", "050"] },
    { id: "at", name: "AirtelTigo Money", prefixes: ["026", "027", "056", "057"] },
  ] },
  { code: "NG", name: "Nigeria", dial: "+234", digits: 11, leadingZero: true, currency: "NGN", perGhs: 105, status: "planned", region: "West", example: "0803 123 4567", operators: [
    { id: "mtn", name: "MTN MoMo PSB", prefixes: ["0803", "0806", "0703", "0706", "0813", "0816", "0810", "0814", "0903", "0906", "0913", "0916"] },
    { id: "airtel", name: "Airtel SmartCash", prefixes: ["0802", "0808", "0708", "0812", "0701", "0902", "0907", "0901", "0912"] },
    { id: "opay", name: "OPay", prefixes: [] },
    { id: "palmpay", name: "PalmPay", prefixes: [] },
  ] },
  { code: "KE", name: "Kenya", dial: "+254", digits: 10, leadingZero: true, currency: "KES", perGhs: 9, status: "planned", region: "East", example: "0712 345 678", operators: [
    { id: "mpesa", name: "M-Pesa", prefixes: ["070", "071", "072", "074", "0757", "0758", "0759", "079", "011"] },
    { id: "airtel", name: "Airtel Money", prefixes: ["073", "0750", "0751", "0752", "0753", "0754", "0755", "0756", "078", "010"] },
    { id: "tkash", name: "T-Kash", prefixes: ["077"] },
  ] },
  { code: "TZ", name: "Tanzania", dial: "+255", digits: 10, leadingZero: true, currency: "TZS", perGhs: 175, status: "planned", region: "East", example: "0754 123 456", operators: [
    { id: "mpesa", name: "M-Pesa", prefixes: ["074", "075", "076"] },
    { id: "tigo", name: "Mixx by Yas", prefixes: ["065", "067", "071"] },
    { id: "airtel", name: "Airtel Money", prefixes: ["068", "069", "078"] },
    { id: "halo", name: "HaloPesa", prefixes: ["062"] },
  ] },
  { code: "UG", name: "Uganda", dial: "+256", digits: 10, leadingZero: true, currency: "UGX", perGhs: 250, status: "planned", region: "East", example: "0772 123 456", operators: [
    { id: "mtn", name: "MTN MoMo", prefixes: ["077", "078", "076"] },
    { id: "airtel", name: "Airtel Money", prefixes: ["070", "074", "075"] },
  ] },
  { code: "RW", name: "Rwanda", dial: "+250", digits: 10, leadingZero: true, currency: "RWF", perGhs: 90, status: "planned", region: "East", example: "0788 123 456", operators: [
    { id: "mtn", name: "MTN MoMo", prefixes: ["078", "079"] },
    { id: "airtel", name: "Airtel Money", prefixes: ["072", "073"] },
  ] },
  { code: "ET", name: "Ethiopia", dial: "+251", digits: 10, leadingZero: true, currency: "ETB", perGhs: 8, status: "planned", region: "East", example: "0911 123 456", operators: [
    { id: "telebirr", name: "telebirr", prefixes: ["091", "092", "093", "094"] },
    { id: "mpesa", name: "M-Pesa (Safaricom)", prefixes: ["070"] },
  ] },
  { code: "CI", name: "Côte d'Ivoire", dial: "+225", digits: 10, leadingZero: false, currency: "XOF", perGhs: 40, status: "planned", region: "West", example: "07 12 34 56 78", operators: [
    { id: "orange", name: "Orange Money", prefixes: ["07"] },
    { id: "mtn", name: "MTN MoMo", prefixes: ["05"] },
    { id: "moov", name: "Moov Money", prefixes: ["01"] },
    { id: "wave", name: "Wave", prefixes: [] },
  ] },
  { code: "SN", name: "Senegal", dial: "+221", digits: 9, leadingZero: false, currency: "XOF", perGhs: 40, status: "planned", region: "West", example: "77 123 45 67", operators: [
    { id: "wave", name: "Wave", prefixes: [] },
    { id: "orange", name: "Orange Money", prefixes: ["77", "78"] },
    { id: "free", name: "Free Money", prefixes: ["76"] },
  ] },
  { code: "CM", name: "Cameroon", dial: "+237", digits: 9, leadingZero: false, currency: "XAF", perGhs: 40, status: "planned", region: "Central", example: "67 123 45 67", operators: [
    { id: "mtn", name: "MTN MoMo", prefixes: ["67", "650", "651", "652", "653", "654", "680", "681", "682", "683"] },
    { id: "orange", name: "Orange Money", prefixes: ["69", "655", "656", "657", "658", "659"] },
  ] },
  { code: "ZM", name: "Zambia", dial: "+260", digits: 10, leadingZero: true, currency: "ZMW", perGhs: 1.7, status: "planned", region: "Southern", example: "0977 123 456", operators: [
    { id: "mtn", name: "MTN MoMo", prefixes: ["096", "076"] },
    { id: "airtel", name: "Airtel Money", prefixes: ["097", "077"] },
    { id: "zamtel", name: "Zamtel Kwacha", prefixes: ["095", "075"] },
  ] },
  { code: "MW", name: "Malawi", dial: "+265", digits: 10, leadingZero: true, currency: "MWK", perGhs: 115, status: "planned", region: "Southern", example: "0999 123 456", operators: [
    { id: "airtel", name: "Airtel Money", prefixes: ["099", "098"] },
    { id: "tnm", name: "TNM Mpamba", prefixes: ["088"] },
  ] },
  { code: "MZ", name: "Mozambique", dial: "+258", digits: 9, leadingZero: false, currency: "MZN", perGhs: 4.2, status: "planned", region: "Southern", example: "84 123 4567", operators: [
    { id: "mpesa", name: "M-Pesa", prefixes: ["84", "85"] },
    { id: "emola", name: "e-Mola", prefixes: ["86", "87"] },
  ] },
  { code: "ZA", name: "South Africa", dial: "+27", digits: 10, leadingZero: true, currency: "ZAR", perGhs: 1.2, status: "planned", region: "Southern", example: "082 123 4567", operators: [
    { id: "mtn", name: "MTN MoMo", prefixes: ["083", "073", "078"] },
    { id: "vodapay", name: "VodaPay", prefixes: ["082", "072", "071"] },
  ] },
  { code: "BJ", name: "Benin", dial: "+229", digits: 10, leadingZero: true, currency: "XOF", perGhs: 40, status: "planned", region: "West", example: "01 97 12 34 56", operators: [
    { id: "mtn", name: "MTN MoMo", prefixes: [] },
    { id: "moov", name: "Moov Money", prefixes: [] },
    { id: "celtiis", name: "Celtiis Cash", prefixes: [] },
  ] },
];

export const DEFAULT_COUNTRY = "GH";

export function countryByCode(code: string) {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0]!;
}

/** Digits only, converted to national form (strip dial code, restore leading 0 where the country uses one). */
export function nationalDigits(country: Country, raw: string) {
  let d = raw.replace(/\D/g, "");
  const dial = country.dial.replace("+", "");
  if (d.startsWith(dial) && d.length > country.digits - (country.leadingZero ? 1 : 0)) {
    d = d.slice(dial.length);
    if (country.leadingZero && !d.startsWith("0")) d = `0${d}`;
  }
  return d;
}

export function validNational(country: Country, raw: string) {
  const d = nationalDigits(country, raw);
  if (d.length !== country.digits) return false;
  return country.leadingZero ? d.startsWith("0") : !d.startsWith("0");
}

export function detectOperator(country: Country, raw: string): Operator | null {
  const d = nationalDigits(country, raw);
  if (d.length < 2) return null;
  // Longest matching prefix wins; operators with no prefixes (app wallets) are never auto-detected.
  let best: { op: Operator; len: number } | null = null;
  for (const op of country.operators) {
    for (const p of op.prefixes) {
      if (d.startsWith(p) && (!best || p.length > best.len)) best = { op, len: p.length };
    }
  }
  return best?.op ?? null;
}

export function formatE164(country: Country, raw: string) {
  const d = nationalDigits(country, raw);
  return `${country.dial} ${country.leadingZero ? d.slice(1) : d}`;
}

const ZERO_DECIMAL = ["XOF", "XAF", "UGX", "RWF", "TZS", "MWK", "NGN"];

/** Local-currency figure for a GHS amount in pesewas, or null when the wallet currency is GHS. */
export function formatLocal(country: Country, pesewas: number) {
  if (country.currency === "GHS") return null;
  const v = (pesewas / 100) * country.perGhs;
  const zero = ZERO_DECIMAL.includes(country.currency);
  return `${country.currency} ${v.toLocaleString("en-GH", { minimumFractionDigits: zero ? 0 : 2, maximumFractionDigits: zero ? 0 : 2 })}`;
}

/** Illustrative local-currency equivalent of a GHS amount in pesewas. */
export function localEquivalent(country: Country, pesewas: number) {
  const v = formatLocal(country, pesewas);
  return v ? `≈ ${v}` : null;
}

/** Distinct rails across the continent, with the countries where the demo offers them. */
export function railSummary() {
  const map = new Map<string, Set<string>>();
  for (const c of COUNTRIES) for (const op of c.operators) {
    const key = op.name.replace(/ \(.*\)$/, "");
    if (!map.has(key)) map.set(key, new Set());
    map.get(key)!.add(c.name);
  }
  return [...map.entries()].map(([name, set]) => ({ name, countries: [...set] })).sort((a, b) => b.countries.length - a.countries.length);
}

export const FX_NOTE = "Local-currency figures are display estimates only — not a live exchange rate, a local wallet or a live collection.";

export const MOMO_DISCLAIMER =
  "Operator names belong to their owners and appear only to illustrate the intended onboarding flow. No mobile-money integration, partnership or licence is claimed on this site; the wallet is always held in GHS and local-currency figures are illustrative.";
