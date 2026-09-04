/**
 * Simulated "Africa heartbeat" — illustrative activity for the public demo.
 * Every event is generated in the browser from this static list. No real users,
 * money or AI calls are represented.
 */

export type Pin = { code: string; city: string; country: string; lat: number; lon: number; launch?: boolean };

export const PINS: Pin[] = [
  { code: "GH", city: "Accra", country: "Ghana", lat: 5.6, lon: -0.19, launch: true },
  { code: "NG", city: "Lagos", country: "Nigeria", lat: 6.45, lon: 3.4 },
  { code: "KE", city: "Nairobi", country: "Kenya", lat: -1.29, lon: 36.82 },
  { code: "TZ", city: "Dar es Salaam", country: "Tanzania", lat: -6.79, lon: 39.28 },
  { code: "UG", city: "Kampala", country: "Uganda", lat: 0.35, lon: 32.58 },
  { code: "RW", city: "Kigali", country: "Rwanda", lat: -1.94, lon: 30.06 },
  { code: "ET", city: "Addis Ababa", country: "Ethiopia", lat: 9.03, lon: 38.74 },
  { code: "CI", city: "Abidjan", country: "Côte d’Ivoire", lat: 5.35, lon: -4.0 },
  { code: "SN", city: "Dakar", country: "Senegal", lat: 14.72, lon: -17.47 },
  { code: "CM", city: "Douala", country: "Cameroon", lat: 4.05, lon: 9.7 },
  { code: "ZM", city: "Lusaka", country: "Zambia", lat: -15.39, lon: 28.32 },
  { code: "MW", city: "Lilongwe", country: "Malawi", lat: -13.96, lon: 33.77 },
  { code: "MZ", city: "Maputo", country: "Mozambique", lat: -25.97, lon: 32.57 },
  { code: "ZA", city: "Johannesburg", country: "South Africa", lat: -26.2, lon: 28.05 },
  { code: "BJ", city: "Cotonou", country: "Benin", lat: 6.37, lon: 2.39 },
];

export type Beat = { id: number; pin: Pin; kind: "topup" | "reserve" | "settle" | "release"; who: string; text: string; pesewas: number; at: number };

const ACTIONS: { kind: Beat["kind"]; who: string; text: string; min: number; max: number }[] = [
  { kind: "topup", who: "student", text: "topped up by mobile money", min: 500, max: 3000 },
  { kind: "topup", who: "agency", text: "topped up the campaign wallet", min: 10000, max: 30000 },
  { kind: "settle", who: "agency", text: "generated product visuals", min: 240, max: 480 },
  { kind: "reserve", who: "developer", text: "reserved credits for a coding agent", min: 40, max: 320 },
  { kind: "settle", who: "creator", text: "rendered a 1080p video", min: 3000, max: 6500 },
  { kind: "settle", who: "studio", text: "settled a Twi dub, 30 s", min: 300, max: 900 },
  { kind: "release", who: "developer", text: "released an unused hold", min: 60, max: 900 },
  { kind: "settle", who: "publisher", text: "settled an audiobook chapter", min: 180, max: 700 },
  { kind: "reserve", who: "SME", text: "reserved for a customer-reply session", min: 30, max: 120 },
];

let seed = 7;
function rnd() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

export function nextBeat(id: number, weightGhana = 0.4): Beat {
  const pin = rnd() < weightGhana ? PINS[0]! : PINS[1 + Math.floor(rnd() * (PINS.length - 1))]!;
  const a = ACTIONS[Math.floor(rnd() * ACTIONS.length)]!;
  const pesewas = Math.round(a.min + rnd() * (a.max - a.min));
  return { id, pin, kind: a.kind, who: a.who, text: a.text, pesewas, at: Date.now() };
}
