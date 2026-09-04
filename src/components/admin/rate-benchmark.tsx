import { useMemo, useState } from "react";
import { BarChart3, ExternalLink, Percent } from "lucide-react";
import { AdminCard } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatGhs } from "@/lib/demo";
import { COST_BASIS_USD, MODELS, PRICING_DEFAULTS, modelById } from "@/lib/catalog";
import { DEAL_LEVERS_GUIDE, MEDIA_CARDS, RATE_CARDS_CHECKED, RATE_CARDS_DISCLAIMER, TOKEN_CARDS, VENDOR_SOURCE, benchmarkCard, type Vendor } from "@/lib/rate-cards";

const VENDORS: Vendor[] = ["OpenAI", "Anthropic", "xAI", "Google"];
const TIER_TONE = { frontier: "bg-navy text-primary-foreground", mid: "bg-electric text-electric-foreground", budget: "bg-success text-success-foreground" } as const;

export function RateBenchmark() {
  const [inputShare, setInputShare] = useState(0.75);
  const [cacheHit, setCacheHit] = useState(0.3);
  const [useBatch, setUseBatch] = useState(false);
  const [volume, setVolume] = useState(0);
  const [vendor, setVendor] = useState<Vendor | "All">("All");
  const buffersPct = PRICING_DEFAULTS.fxBufferPct + PRICING_DEFAULTS.paymentBufferPct + PRICING_DEFAULTS.opsBufferPct;
  const fx = PRICING_DEFAULTS.fxRate;

  const rows = useMemo(
    () =>
      TOKEN_CARDS.filter((c) => vendor === "All" || c.vendor === vendor).map((c) => {
        const m = modelById(c.routeId) ?? MODELS[0]!;
        return { c, m, b: benchmarkCard(c, m.pesewas, { inputShare, cacheHitRate: cacheHit, useBatch, volumeDiscount: volume, fxRate: fx, buffersPct }) };
      }),
    [vendor, inputShare, cacheHit, useBatch, volume, fx, buffersPct],
  );

  const worst = rows.reduce((min, r) => Math.min(min, r.b.marginPct), 100);
  const avgPremium = rows.length ? Math.round(rows.reduce((s, r) => s + r.b.premiumPct, 0) / rows.length) : 0;

  return (
    <>
      <AdminCard className="mt-6" title="Rate-card benchmark · true-to-life list prices" hint={<>Public list prices checked {RATE_CARDS_CHECKED}. Blended per 1K tokens at your input:output mix, converted at GHS {fx}/USD, compared with the catalogue price of the route each one would sit behind.</>} action={<BarChart3 className="size-5 text-electric" aria-hidden />}>
        <p className="mb-4 rounded-md bg-gold/10 px-2 py-1 text-xs font-medium text-gold-foreground">{RATE_CARDS_DISCLAIMER}</p>

        <div className="grid gap-4">
          <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex flex-wrap gap-1.5 sm:col-span-2 xl:col-span-3">
              {(["All", ...VENDORS] as const).map((v) => (
                <Button key={v} size="sm" variant={vendor === v ? "default" : "outline"} onClick={() => setVendor(v)}>{v}</Button>
              ))}
            </div>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">Input share of tokens — {Math.round(inputShare * 100)}% in / {Math.round((1 - inputShare) * 100)}% out</span>
              <input type="range" min={0.3} max={0.95} step={0.05} value={inputShare} onChange={(e) => setInputShare(Number(e.target.value))} className="accent-[var(--electric)]" />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">Prompt-cache hit rate — {Math.round(cacheHit * 100)}%</span>
              <input type="range" min={0} max={0.9} step={0.05} value={cacheHit} onChange={(e) => setCacheHit(Number(e.target.value))} className="accent-[var(--electric)]" />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">Negotiated volume discount — {Math.round(volume * 100)}% <span className="font-normal">(illustrative, needs a signed commit)</span></span>
              <input type="range" min={0} max={0.3} step={0.05} value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="accent-[var(--electric)]" />
            </label>
            <label className="inline-flex items-center gap-2 self-end">
              <input type="checkbox" checked={useBatch} onChange={(e) => setUseBatch(e.target.checked)} className="accent-[var(--electric)]" />
              <span>Use published Batch API (50%) where offered — non-interactive jobs only</span>
            </label>
            <div className="grid grid-cols-2 gap-3 sm:col-span-2 xl:col-span-2">
              <Big label="Avg premium over list" value={`+${avgPremium}%`} sub="what we add on top of vendor list" />
              <Big label="Thinnest margin" value={`${worst}%`} sub="after buffers, worst row" tone={worst >= 60 ? "good" : worst >= 40 ? undefined : "warn"} />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[860px] text-xs">
              <thead className="bg-muted/60 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Vendor · model (list in / out per 1M)</th>
                  <th className="px-3 py-2 text-right">List /1K</th>
                  <th className="px-3 py-2 text-right">Effective /1K</th>
                  <th className="px-3 py-2">Our route · price /1K</th>
                  <th className="px-3 py-2 text-right">Markup</th>
                  <th className="px-3 py-2 text-right">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map(({ c, m, b }) => {
                  const assumed = COST_BASIS_USD[m.id] ?? 0;
                  const under = b.effectiveUsdPer1k > assumed * 1.15;
                  return (
                    <tr key={c.id} className="align-top">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5"><span className={cn("rounded px-1 py-px text-[9px] font-semibold", TIER_TONE[c.tier])}>{c.tier[0]!.toUpperCase()}</span><span className="font-medium">{c.vendor} · {c.model}</span></div>
                        <div className="text-muted-foreground">${c.inUsdPerM} / ${c.outUsdPerM}{c.cachedInUsdPerM !== undefined ? ` · cached $${c.cachedInUsdPerM}` : ""}{c.note ? ` · ${c.note}` : ""}</div>
                      </td>
                      <td className="px-3 py-2 text-right tabular">${b.listUsdPer1k.toFixed(4)}<div className="text-muted-foreground">{formatGhs(b.listUsdPer1k * fx * 100)}</div></td>
                      <td className="px-3 py-2 text-right tabular">${b.effectiveUsdPer1k.toFixed(4)}<div className={cn(b.savingsFromLeversPct > 0 ? "text-success" : "text-muted-foreground")}>−{b.savingsFromLeversPct}%</div></td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{m.name}</div>
                        <div className="tabular text-muted-foreground">{formatGhs(m.pesewas)} · basis ${assumed.toFixed(4)}{under && <span className="ml-1 rounded bg-destructive/10 px-1 text-[10px] font-semibold text-destructive">basis too low</span>}</div>
                      </td>
                      <td className="px-3 py-2 text-right tabular font-semibold">{b.markupX}×<div className="font-normal text-muted-foreground">+{b.premiumPct}% vs list</div></td>
                      <td className={cn("px-3 py-2 text-right tabular font-semibold", b.marginPct >= 60 ? "text-success" : b.marginPct >= 40 ? "text-gold-foreground" : "text-destructive")}>{b.marginPct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {MEDIA_CARDS.map((c) => {
            const m = modelById(c.routeId)!;
            const costPes = c.usdPerUnit * fx * 100;
            const margin = Math.round(((m.pesewas - costPes * (1 + buffersPct / 100)) / m.pesewas) * 100);
            return (
              <div key={c.id} className="rounded-xl border border-border bg-muted/40 p-3 text-xs">
                <p className="font-medium">{c.vendor} · {c.model}</p>
                <p className="text-muted-foreground">List ${c.usdPerUnit}/{c.unit} = {formatGhs(costPes)}{c.note ? ` · ${c.note}` : ""}</p>
                <p className="mt-1">vs <span className="font-medium">{m.name}</span> at {formatGhs(m.pesewas)} → <span className={cn("font-semibold", margin >= 60 ? "text-success" : margin >= 40 ? "text-gold-foreground" : "text-destructive")}>{margin}% margin</span></p>
              </div>
            );
          })}
        </div>

        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          {VENDORS.map((v) => <li key={v} className="inline-flex items-center gap-1"><ExternalLink className="size-3" aria-hidden /> {v}: {VENDOR_SOURCE[v]}</li>)}
        </ul>
      </AdminCard>

      <AdminCard className="mt-6" title="Where the deal comes from · what % we can add" hint="Published programmes you can use tomorrow, versus discounts that only exist with a signed contract." action={<Percent className="size-5 text-electric" aria-hidden />}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {DEAL_LEVERS_GUIDE.map((d) => (
            <div key={d.lever} className="rounded-xl border border-border bg-card p-3">
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", d.kind === "Published" ? "bg-success/15 text-success" : d.kind === "Negotiated" ? "bg-gold/15 text-gold-foreground" : "bg-electric/10 text-electric")}>{d.kind}</span>
              <p className="mt-2 font-semibold">{d.lever}</p>
              <p className="font-display text-lg tabular">{d.range}</p>
              <p className="mt-1 text-xs text-muted-foreground">{d.how}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4 text-sm">
          <p className="font-semibold">The honest read</p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-muted-foreground">
            <li>Base case: pay list. Every price in the catalogue must clear 60% margin at list — the table above shows where it does and where the cost basis is too optimistic.</li>
            <li>The biggest real discount is not negotiation; it is caching, batching and routing — levers you control and vendors publish.</li>
            <li>Volume discounts arrive only after months of real spend and a signed commit. Model them as upside; never price on them.</li>
            <li>Our premium over list is what the customer pays for MoMo access, cedi pricing, local languages and support — that is the product, and the table says how large it is.</li>
          </ul>
        </div>
      </AdminCard>
    </>
  );
}

function Big({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "warn" | undefined }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-display text-xl font-semibold tabular", tone === "good" && "text-success", tone === "warn" && "text-destructive")}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
