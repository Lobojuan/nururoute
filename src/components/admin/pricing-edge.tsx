import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Route as RouteIcon, Package, Scale, AlertTriangle, CheckCircle2 } from "lucide-react";
import { AdminCard, KV } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatGhs } from "@/lib/demo";
import { basePesewas } from "@/lib/catalog";
import {
  COST_TIERS, DEFAULT_MIX, MARGIN_TARGETS, OUTCOME_PACKS, PRICING_EDGE_DISCLAIMER,
  packEconomics, simulateRouting, type CostTier, type TaskClass,
} from "@/lib/pricing-edge";

const TIER_TONE: Record<CostTier, string> = {
  frontier: "bg-navy text-primary-foreground",
  mid: "bg-electric text-electric-foreground",
  budget: "bg-success text-success-foreground",
};

export function PricingEdge({ collectionFeePct, fxRate }: { collectionFeePct: number; fxRate: number }) {
  const reduce = useReducedMotion();
  const [mix, setMix] = useState<TaskClass[]>(DEFAULT_MIX);
  const [smart, setSmart] = useState(true);
  const [flat, setFlat] = useState(() => basePesewas("route-code")); // pesewas per 1K tokens — the mid-tier catalogue price
  const [opsBuffer, setOpsBuffer] = useState(8);
  const [retryPct, setRetryPct] = useState(20);

  const res = useMemo(
    () => simulateRouting({ mix, smartRouting: smart, flatPesewasPer1k: flat, fxRate, collectionFeePct, opsBufferPct: opsBuffer }),
    [mix, smart, flat, fxRate, collectionFeePct, opsBuffer],
  );

  const healthy = res.marginPct >= 60;

  return (
    <>
      {/* Routing simulator */}
      <AdminCard className="mt-6" title="Pricing edge · model-routing simulator" hint="Customers pay one flat cedi price per 1K tokens; we route each task to the cheapest model that does the job well. The gap is the margin." action={<RouteIcon className="size-5 text-electric" aria-hidden />}>
        <p className="mb-4 inline-flex items-start gap-1.5 rounded-md bg-gold/10 px-2 py-1 text-xs font-medium text-gold-foreground"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {PRICING_EDGE_DISCLAIMER}</p>

        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="grid gap-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={smart ? "default" : "outline"} onClick={() => setSmart(true)}>Smart routing</Button>
              <Button size="sm" variant={!smart ? "default" : "outline"} onClick={() => setSmart(false)}>Everything on frontier</Button>
            </div>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">Flat customer price — {formatGhs(flat)} per 1K tokens</span>
              <input type="range" min={1} max={120} step={1} value={flat} onChange={(e) => setFlat(Number(e.target.value))} className="accent-[var(--electric)]" />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">Ops buffer (support, fraud, infra) — {opsBuffer}%</span>
              <input type="range" min={0} max={25} value={opsBuffer} onChange={(e) => setOpsBuffer(Number(e.target.value))} className="accent-[var(--electric)]" />
            </label>

            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Workload mix (share of requests)</p>
              {mix.map((t, i) => (
                <label key={t.id} className="grid gap-0.5 py-1">
                  <span className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5"><span className={cn("rounded px-1.5 py-px text-[10px] font-semibold", TIER_TONE[smart ? t.tier : "frontier"])}>{COST_TIERS[smart ? t.tier : "frontier"].label}</span>{t.label}</span>
                    <span className="tabular text-muted-foreground">{t.sharePct}% · ~{t.tokens.toLocaleString()} tok</span>
                  </span>
                  <input type="range" min={0} max={100} value={t.sharePct} onChange={(e) => setMix((m) => m.map((x, j) => (j === i ? { ...x, sharePct: Number(e.target.value) } : x)))} className="accent-[var(--electric)]" aria-label={`${t.label} share`} />
                </label>
              ))}
              <p className="mt-1 text-[11px] text-muted-foreground">Shares are normalised; token-weighted for cost.</p>
            </div>
          </div>

          <div>
            <div className="grid grid-cols-2 gap-3">
              <Big label="Blended cost / 1K" value={formatGhs(res.blendedCostPesewasPer1k)} sub={`≈ $${res.blendedCostUsdPer1k.toFixed(4)}`} />
              <Big label="Customer pays / 1K" value={formatGhs(res.revenuePesewasPer1k)} sub={`${res.markupX}× cost`} />
              <Big label="Gross margin" value={`${res.marginPct}%`} sub={formatGhs(res.marginPesewasPer1k) + " / 1K"} tone={healthy ? "good" : "warn"} />
              <Big label="Saved vs frontier-only" value={`${Math.max(res.savingsVsFrontierPct, 0)}%`} sub={smart ? "routing at work" : "no routing"} />
            </div>

            <div className="mt-4 flex h-9 w-full overflow-hidden rounded-xl border border-border" role="img" aria-label={`Provider ${Math.round((res.blendedCostPesewasPer1k / Math.max(res.revenuePesewasPer1k, 0.01)) * 100)}%, fees ${Math.round((res.feesPesewasPer1k / Math.max(res.revenuePesewasPer1k, 0.01)) * 100)}%, margin ${res.marginPct}%`}>
              {[
                ["bg-navy", res.blendedCostPesewasPer1k],
                ["bg-gold", res.feesPesewasPer1k],
                [healthy ? "bg-success" : "bg-destructive", Math.max(res.marginPesewasPer1k, 0)],
              ].map(([cls, v], i) => (
                <motion.div key={i} className={cn("h-full", cls as string)} initial={false} animate={{ width: `${Math.min(100, ((v as number) / Math.max(res.revenuePesewasPer1k, 0.01)) * 100)}%` }} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 20 }} />
              ))}
            </div>
            <p className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <span><i className="mr-1 inline-block size-2 rounded-full bg-navy" /> Provider cost</span>
              <span><i className="mr-1 inline-block size-2 rounded-full bg-gold" /> MoMo fee {collectionFeePct}% + ops {opsBuffer}%</span>
              <span><i className={cn("mr-1 inline-block size-2 rounded-full", healthy ? "bg-success" : "bg-destructive")} /> NuruRoute margin</span>
            </p>

            <ul className="mt-4 divide-y divide-border text-xs">
              {res.perClass.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="inline-flex items-center gap-1.5"><span className={cn("rounded px-1.5 py-px text-[10px] font-semibold", TIER_TONE[c.tier])}>{COST_TIERS[c.tier].label}</span>{c.label}</span>
                  <span className="tabular text-muted-foreground">{formatGhs(c.costPesewasPer1k)} / 1K · {Math.round(c.weight * 100)}% of tokens</span>
                </li>
              ))}
            </ul>

            {res.marginPesewasPer1k < 0 && (
              <p className="mt-3 rounded-md bg-destructive/10 px-2 py-1.5 text-xs font-medium text-destructive" role="status">At {formatGhs(flat)} per 1K this price loses money on every request. Below roughly {formatGhs(Math.ceil(res.blendedCostPesewasPer1k / (1 - (collectionFeePct + opsBuffer) / 100)))} you are subsidising customers.</p>
            )}
            <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Margin targets we're planning against</p>
              {MARGIN_TARGETS.map((m) => <KV key={m.label} label={m.label} value={m.target} />)}
            </div>
          </div>
        </div>
      </AdminCard>

      {/* Outcome packs */}
      <AdminCard className="mt-6" title="Outcome packs · sell results, not tokens" hint="Flat cedi prices for a finished job. Costs below are illustrative provider assumptions plus a retry allowance." action={<Package className="size-5 text-electric" aria-hidden />}>
        <label className="mb-4 grid max-w-sm gap-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">Retry / regeneration allowance — {retryPct}% of base cost</span>
          <input type="range" min={0} max={60} step={5} value={retryPct} onChange={(e) => setRetryPct(Number(e.target.value))} className="accent-[var(--electric)]" />
        </label>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {OUTCOME_PACKS.map((p, i) => {
            const e = packEconomics(p, { fxRate, collectionFeePct, opsBufferPct: opsBuffer, retryAllowancePct: retryPct });
            const good = e.marginPct >= 60;
            return (
              <motion.article key={p.id} className="flex flex-col rounded-2xl border border-border bg-background p-4" initial={reduce ? false : { opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{p.audience}</p>
                <h3 className="mt-1 font-display text-lg font-semibold leading-tight">{p.name}</h3>
                <p className="mt-2 font-display text-2xl font-semibold tabular">{formatGhs(p.pricePesewas)}</p>
                <ul className="mt-3 space-y-1 text-xs">
                  {p.steps.map((s, j) => (
                    <li key={j} className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 truncate">{s.tier ? <span className={cn("rounded px-1 py-px text-[9px] font-semibold", TIER_TONE[s.tier])}>{COST_TIERS[s.tier].label[0]}</span> : <span className="rounded bg-gold/20 px-1 py-px text-[9px] font-semibold text-gold-foreground">M</span>}<span className="truncate">{s.label}</span></span>
                      <span className="tabular text-muted-foreground">{formatGhs(e.lines[j]!.pesewas)}</span>
                    </li>
                  ))}
                  <li className="flex items-center justify-between gap-2 text-muted-foreground"><span>Retry allowance</span><span className="tabular">{formatGhs(e.retryAllowancePesewas)}</span></li>
                </ul>
                <div className="mt-3 border-t border-border pt-2">
                  <KV label="All-in cost" value={formatGhs(e.costPesewas)} />
                  <KV label="Fees" value={formatGhs(e.feesPesewas)} />
                  <KV label="Margin" value={`${formatGhs(e.marginPesewas)} · ${e.marginPct}%`} strong tone={good ? "good" : "warn"} />
                  <KV label="Markup" value={`${e.markupX}×`} />
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">{p.why}</p>
              </motion.article>
            );
          })}
        </div>
      </AdminCard>

      {/* Honesty panel */}
      <AdminCard className="mt-6" title="Straight talk · what's assumed vs. what's proven" hint="So nobody mistakes a simulator for a business plan." action={<Scale className="size-5 text-electric" aria-hidden />}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gold-foreground"><AlertTriangle className="size-3.5" aria-hidden /> Assumed (not yet verified)</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
              <li>Provider cost tiers ($0.012 / $0.003 / $0.0006 per 1K tokens) — placeholder bands; real vendor rate cards differ by model and change often.</li>
              <li>FX at GHS {fxRate}/USD, MoMo collection fee {collectionFeePct}% — must be replaced by contracted numbers.</li>
              <li>The workload mix — a guess until real pilot usage exists.</li>
              <li>Routing quality: cheaper models must actually do the job well, or refunds and churn eat the margin.</li>
              <li>Media step costs and retry rates — spiky and vendor-specific.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-success"><CheckCircle2 className="size-3.5" aria-hidden /> Structural (true regardless of numbers)</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
              <li>Customers who can't pay by card can't buy from providers directly — the competitor is "nothing", not the provider's price list.</li>
              <li>Flat cedi pricing + routing means margin grows as cheaper models improve.</li>
              <li>Outcome packs hide token maths and price on value; local-language steps are hard for global vendors to copy.</li>
              <li>Reserve → settle → release keeps every pesewa accounted for, so margin is measurable per request, not estimated.</li>
              <li>None of this is proven until one real MoMo top-up funds one real provider call that settles at a profit.</li>
            </ul>
          </div>
        </div>
      </AdminCard>
    </>
  );
}

function Big({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "warn" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-1 break-words font-display text-xl font-semibold tabular", tone === "good" && "text-success", tone === "warn" && "text-destructive")}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
