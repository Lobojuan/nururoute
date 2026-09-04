// Pricing-edge simulator: model routing + outcome packs.
// Everything here is ILLUSTRATIVE. Cost tiers are demo assumptions, not live vendor rate cards.
// Verify current prices on official provider pages before any real launch.

export const PRICING_EDGE_DISCLAIMER =
  "Illustrative economics only. Provider cost tiers are demo assumptions (not vendor quotes); FX, fees and margins are adjustable for scenario planning.";

export type CostTier = "frontier" | "mid" | "budget";
export const COST_TIERS: Record<CostTier, { label: string; usdPer1kTokens: number; blurb: string }> = {
  frontier: { label: "Frontier", usdPer1kTokens: 0.012, blurb: "Hardest reasoning, long documents, code architecture" },
  mid: { label: "Mid", usdPer1kTokens: 0.004, blurb: "Everyday writing, Q&A, summaries" },
  budget: { label: "Budget", usdPer1kTokens: 0.0008, blurb: "Classification, extraction, short replies" },
};

export type TaskClass = { id: string; label: string; sharePct: number; tokens: number; tier: CostTier };

/** Typical Ghanaian SME / creator workload mix (illustrative). */
export const DEFAULT_MIX: TaskClass[] = [
  { id: "short", label: "Short replies & chats", sharePct: 45, tokens: 600, tier: "budget" },
  { id: "write", label: "Emails, posts, CV rewrites", sharePct: 30, tokens: 1_800, tier: "mid" },
  { id: "docs", label: "Long docs & summaries", sharePct: 15, tokens: 6_000, tier: "mid" },
  { id: "code", label: "Code & hard reasoning", sharePct: 10, tokens: 4_000, tier: "frontier" },
];

export type RoutingInput = {
  mix: TaskClass[];
  smartRouting: boolean; // false = everything on frontier
  flatPesewasPer1k: number; // what the customer pays per 1K tokens
  fxRate: number; // GHS per USD
  collectionFeePct: number; // MoMo collection fee
  opsBufferPct: number; // support, fraud, infra
};

export type RoutingResult = {
  blendedCostUsdPer1k: number;
  blendedCostPesewasPer1k: number;
  frontierOnlyCostPesewasPer1k: number;
  revenuePesewasPer1k: number;
  feesPesewasPer1k: number;
  marginPesewasPer1k: number;
  marginPct: number;
  markupX: number;
  savingsVsFrontierPct: number;
  perClass: { id: string; label: string; tier: CostTier; costPesewasPer1k: number; weight: number }[];
};

export function simulateRouting(i: RoutingInput): RoutingResult {
  const total = i.mix.reduce((s, t) => s + t.sharePct, 0) || 1;
  // Weight by share × tokens (token-weighted, since we bill tokens).
  const weights = i.mix.map((t) => (t.sharePct / total) * t.tokens);
  const wsum = weights.reduce((s, w) => s + w, 0) || 1;
  const perClass = i.mix.map((t, idx) => {
    const tier = i.smartRouting ? t.tier : ("frontier" as CostTier);
    const usd = COST_TIERS[tier].usdPer1kTokens;
    return { id: t.id, label: t.label, tier, costPesewasPer1k: usd * i.fxRate * 100, weight: weights[idx]! / wsum };
  });
  const blendedUsd = perClass.reduce((s, c) => s + (c.costPesewasPer1k / 100 / i.fxRate) * c.weight, 0);
  const blendedPesewas = blendedUsd * i.fxRate * 100;
  const frontierPesewas = COST_TIERS.frontier.usdPer1kTokens * i.fxRate * 100;
  const revenue = i.flatPesewasPer1k;
  const fees = revenue * ((i.collectionFeePct + i.opsBufferPct) / 100);
  const margin = revenue - fees - blendedPesewas;
  return {
    blendedCostUsdPer1k: blendedUsd,
    blendedCostPesewasPer1k: blendedPesewas,
    frontierOnlyCostPesewasPer1k: frontierPesewas,
    revenuePesewasPer1k: revenue,
    feesPesewasPer1k: fees,
    marginPesewasPer1k: margin,
    marginPct: revenue > 0 ? Math.round((margin / revenue) * 100) : 0,
    markupX: blendedPesewas > 0 ? Math.round((revenue / blendedPesewas) * 10) / 10 : 0,
    savingsVsFrontierPct: frontierPesewas > 0 ? Math.round((1 - blendedPesewas / frontierPesewas) * 100) : 0,
    perClass,
  };
}

// ---------- Outcome packs ----------
export type PackStep = { label: string; tier?: CostTier; tokens?: number; mediaUsd?: number };
export type OutcomePack = {
  id: string;
  name: string;
  audience: string;
  pricePesewas: number; // flat cedi price customer sees
  steps: PackStep[];
  why: string;
};

export const OUTCOME_PACKS: OutcomePack[] = [
  {
    id: "cv",
    name: "CV rewrite + cover letter",
    audience: "Job seekers, NSS graduates",
    pricePesewas: 1_500,
    steps: [
      { label: "Parse & critique CV", tier: "mid", tokens: 3_000 },
      { label: "Rewrite CV", tier: "frontier", tokens: 2_500 },
      { label: "Tailored cover letter", tier: "mid", tokens: 1_200 },
    ],
    why: "Sold as an outcome, not tokens. Customer never sees a token count.",
  },
  {
    id: "product-photos",
    name: "Product photo set (6 images)",
    audience: "Market traders, Instagram sellers",
    pricePesewas: 2_500,
    steps: [
      { label: "Brief → prompts", tier: "budget", tokens: 800 },
      { label: "6 studio-style renders", mediaUsd: 0.04 * 6 },
      { label: "Captions in English + Twi", tier: "mid", tokens: 900 },
    ],
    why: "Media cost is spiky; the pack price absorbs a retry allowance.",
  },
  {
    id: "radio-ad",
    name: "30-second radio ad script + voice",
    audience: "SMEs, churches, events",
    pricePesewas: 4_000,
    steps: [
      { label: "3 script variants", tier: "mid", tokens: 1_500 },
      { label: "Voice-over render", mediaUsd: 0.12 },
      { label: "Pidgin / Twi adaptation", tier: "mid", tokens: 700 },
    ],
    why: "Local-language adaptation is the moat; global providers don't sell this.",
  },
  {
    id: "business-plan",
    name: "1-page business plan",
    audience: "Founders applying for grants",
    pricePesewas: 3_000,
    steps: [
      { label: "Structured interview", tier: "budget", tokens: 2_000 },
      { label: "Draft plan", tier: "frontier", tokens: 4_000 },
      { label: "Financial sanity check", tier: "mid", tokens: 1_200 },
    ],
    why: "High perceived value, predictable cost, strong word of mouth.",
  },
];

export type PackEconomics = {
  costPesewas: number;
  feesPesewas: number;
  marginPesewas: number;
  marginPct: number;
  markupX: number;
  retryAllowancePesewas: number;
  lines: { label: string; pesewas: number }[];
};

export function packEconomics(p: OutcomePack, o: { fxRate: number; collectionFeePct: number; opsBufferPct: number; retryAllowancePct: number }): PackEconomics {
  const lines = p.steps.map((s) => {
    const usd = s.mediaUsd ?? (COST_TIERS[s.tier ?? "mid"].usdPer1kTokens * (s.tokens ?? 0)) / 1000;
    return { label: s.label, pesewas: usd * o.fxRate * 100 };
  });
  const base = lines.reduce((s, l) => s + l.pesewas, 0);
  const retry = base * (o.retryAllowancePct / 100);
  const cost = base + retry;
  const fees = p.pricePesewas * ((o.collectionFeePct + o.opsBufferPct) / 100);
  const margin = p.pricePesewas - fees - cost;
  return {
    costPesewas: cost,
    feesPesewas: fees,
    marginPesewas: margin,
    marginPct: p.pricePesewas > 0 ? Math.round((margin / p.pricePesewas) * 100) : 0,
    markupX: cost > 0 ? Math.round((p.pricePesewas / cost) * 10) / 10 : 0,
    retryAllowancePesewas: retry,
    lines,
  };
}

export const MARGIN_TARGETS = [
  { label: "Frontier chat tasks", target: "3–5× cost" },
  { label: "Routed everyday tasks", target: "8–15× cost" },
  { label: "Media (image / voice / video)", target: "2.5–4× cost" },
  { label: "Blended gross margin", target: "≥ 60%" },
] as const;
