/**
 * Public list prices from provider pricing pages — a benchmark, not a deal.
 * Checked 2026-09-03 against the official pages linked per vendor. Prices change;
 * re-verify before any launch. Names are trademarks of their owners; no partnership implied.
 */
export const RATE_CARDS_CHECKED = "2026-09-03";
export const RATE_CARDS_DISCLAIMER =
  "Public list prices copied from vendor pricing pages on the date shown. Not quotes, not negotiated rates, not partnerships. Batch/cache discounts are the vendors' published programmes; volume discounts are illustrative negotiation ranges.";

export type Vendor = "OpenAI" | "Anthropic" | "xAI" | "Google";
export const VENDOR_SOURCE: Record<Vendor, string> = {
  OpenAI: "developers.openai.com/api/docs/pricing",
  Anthropic: "docs.anthropic.com/en/docs/about-claude/pricing",
  xAI: "docs.x.ai/docs/models",
  Google: "ai.google.dev/gemini-api/docs/pricing",
};

export type TokenCard = {
  id: string;
  vendor: Vendor;
  model: string;
  tier: "frontier" | "mid" | "budget";
  inUsdPerM: number;
  outUsdPerM: number;
  cachedInUsdPerM?: number;
  /** Published batch / async discount (fraction). OpenAI Batch & Anthropic Batch publish 50%. */
  batchDiscount?: number;
  /** Which NuruRoute catalogue model this benchmarks against. */
  routeId: string;
  note?: string;
};

export const TOKEN_CARDS: TokenCard[] = [
  { id: "oa-55", vendor: "OpenAI", model: "gpt-5.5", tier: "frontier", inUsdPerM: 5, outUsdPerM: 30, cachedInUsdPerM: 0.5, batchDiscount: 0.5, routeId: "route-openai", note: "<272K context" },
  { id: "oa-54", vendor: "OpenAI", model: "gpt-5.4", tier: "frontier", inUsdPerM: 2.5, outUsdPerM: 15, cachedInUsdPerM: 0.25, batchDiscount: 0.5, routeId: "route-chat-pro" },
  { id: "oa-54m", vendor: "OpenAI", model: "gpt-5.4-mini", tier: "mid", inUsdPerM: 0.75, outUsdPerM: 4.5, cachedInUsdPerM: 0.075, batchDiscount: 0.5, routeId: "route-code" },
  { id: "oa-54n", vendor: "OpenAI", model: "gpt-5.4-nano", tier: "budget", inUsdPerM: 0.2, outUsdPerM: 1.25, cachedInUsdPerM: 0.02, batchDiscount: 0.5, routeId: "route-chat-lite" },
  { id: "oa-56s", vendor: "OpenAI", model: "gpt-5.6-sol", tier: "frontier", inUsdPerM: 4, outUsdPerM: 20, cachedInUsdPerM: 0.4, batchDiscount: 0.5, routeId: "route-codex" },
  { id: "oa-56l", vendor: "OpenAI", model: "gpt-5.6-luna", tier: "budget", inUsdPerM: 0.2, outUsdPerM: 1.2, cachedInUsdPerM: 0.02, batchDiscount: 0.5, routeId: "route-chat-lite" },
  { id: "an-o5", vendor: "Anthropic", model: "Claude Opus 5", tier: "frontier", inUsdPerM: 5, outUsdPerM: 25, cachedInUsdPerM: 0.5, batchDiscount: 0.5, routeId: "route-claude-code" },
  { id: "an-s5", vendor: "Anthropic", model: "Claude Sonnet 5", tier: "mid", inUsdPerM: 2, outUsdPerM: 10, cachedInUsdPerM: 0.2, batchDiscount: 0.5, routeId: "route-code" },
  { id: "an-h45", vendor: "Anthropic", model: "Claude Haiku 4.5", tier: "budget", inUsdPerM: 1, outUsdPerM: 5, cachedInUsdPerM: 0.1, batchDiscount: 0.5, routeId: "route-vision" },
  { id: "x-46", vendor: "xAI", model: "grok-4.6", tier: "frontier", inUsdPerM: 2, outUsdPerM: 6, cachedInUsdPerM: 0.5, routeId: "route-grok", note: "Long-context (>200K) doubles" },
  { id: "x-43", vendor: "xAI", model: "grok-4.3", tier: "mid", inUsdPerM: 1.25, outUsdPerM: 2.5, routeId: "route-grok" },
  { id: "g-31p", vendor: "Google", model: "Gemini 3.1 Pro (preview)", tier: "frontier", inUsdPerM: 2, outUsdPerM: 12, cachedInUsdPerM: 0.2, routeId: "route-vision", note: ">200K prompts cost more" },
  { id: "g-36f", vendor: "Google", model: "Gemini 3.6 Flash", tier: "mid", inUsdPerM: 0.75, outUsdPerM: 3.75, cachedInUsdPerM: 0.075, routeId: "route-kimi", note: "Promo to 31 Dec 2026, then $1.50 / $7.50" },
];

export type MediaCard = { id: string; vendor: Vendor; model: string; unit: "image"; usdPerUnit: number; routeId: string; note?: string };
export const MEDIA_CARDS: MediaCard[] = [
  { id: "x-img-1k", vendor: "xAI", model: "grok-imagine-image-2.0 · 1K low", unit: "image", usdPerUnit: 0.04, routeId: "image-sketch" },
  { id: "x-img-2k", vendor: "xAI", model: "grok-imagine-image-2.0 · 2K medium", unit: "image", usdPerUnit: 0.08, routeId: "image-studio" },
  { id: "g-img", vendor: "Google", model: "Gemini 3 Pro Image · 1K/2K", unit: "image", usdPerUnit: 0.134, routeId: "image-studio", note: "$0.24 at 4K" },
];

export type DealLevers = {
  /** Share of tokens that are input (0..1). 0.75 = 3 input : 1 output. */
  inputShare: number;
  /** Share of input tokens served from cache (0..1). */
  cacheHitRate: number;
  /** Route eligible traffic through the vendor's batch/async programme. */
  useBatch: boolean;
  /** Negotiated volume discount on top (fraction). Illustrative. */
  volumeDiscount: number;
  fxRate: number;
  buffersPct: number; // FX + payment + ops
};

export type Benchmark = {
  listUsdPer1k: number;
  effectiveUsdPer1k: number;
  effectivePesewasPer1k: number;
  costToServePesewas: number;
  ourPricePesewas: number;
  markupX: number;
  premiumPct: number; // (our price − list cost) / list cost
  marginPct: number; // after buffers
  savingsFromLeversPct: number;
};

export function blendedListUsdPer1k(c: TokenCard, inputShare: number) {
  return (c.inUsdPerM * inputShare + c.outUsdPerM * (1 - inputShare)) / 1000;
}

export function benchmarkCard(c: TokenCard, ourPricePesewas: number, l: DealLevers): Benchmark {
  const list = blendedListUsdPer1k(c, l.inputShare);
  const cachedIn = c.cachedInUsdPerM ?? c.inUsdPerM;
  const inEff = c.inUsdPerM * (1 - l.cacheHitRate) + cachedIn * l.cacheHitRate;
  let eff = (inEff * l.inputShare + c.outUsdPerM * (1 - l.inputShare)) / 1000;
  if (l.useBatch && c.batchDiscount) eff *= 1 - c.batchDiscount;
  eff *= 1 - l.volumeDiscount;
  const effPes = eff * l.fxRate * 100;
  const toServe = effPes * (1 + l.buffersPct / 100);
  const listPes = list * l.fxRate * 100;
  return {
    listUsdPer1k: list,
    effectiveUsdPer1k: eff,
    effectivePesewasPer1k: effPes,
    costToServePesewas: toServe,
    ourPricePesewas,
    markupX: effPes > 0 ? Math.round((ourPricePesewas / effPes) * 10) / 10 : 0,
    premiumPct: listPes > 0 ? Math.round(((ourPricePesewas - listPes) / listPes) * 100) : 0,
    marginPct: ourPricePesewas > 0 ? Math.round(((ourPricePesewas - toServe) / ourPricePesewas) * 100) : 0,
    savingsFromLeversPct: list > 0 ? Math.round((1 - eff / list) * 100) : 0,
  };
}

/** Where deals actually come from — published programmes vs negotiation. */
export const DEAL_LEVERS_GUIDE = [
  { lever: "Prompt caching", range: "Up to 90% off cached input", kind: "Published", how: "Reuse system prompts, KB context and few-shot examples; OpenAI/Anthropic/xAI/Google all publish cached-input rates." },
  { lever: "Batch / async API", range: "50% off", kind: "Published", how: "OpenAI Batch and Anthropic Batch publish 50%. Route non-interactive jobs (dubbing scripts, audiobook prep, bulk captions) there." },
  { lever: "Model routing", range: "40–75% blended", kind: "Yours", how: "Send easy tasks to nano/Haiku/Flash-class models. Customers pay the flat cedi price either way." },
  { lever: "Volume / committed spend", range: "~5–20% (illustrative)", kind: "Negotiated", how: "Only with a sales contract and a monthly commit. Not available self-serve; treat as upside, never in the base case." },
  { lever: "Prepaid credits & FX", range: "0–3%", kind: "Ops", how: "Buy USD credits in larger tranches when the cedi is strong; the FX buffer already absorbs volatility." },
] as const;
