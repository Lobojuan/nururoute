import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { FileSignature, Handshake, Landmark, Cpu, Users, RotateCcw, ArrowRight, BadgeDollarSign, ShieldCheck } from "lucide-react";
import { AdminCard, KV } from "@/components/admin/admin-shell";
import { PricingEdge } from "@/components/admin/pricing-edge";
import { RateBenchmark } from "@/components/admin/rate-benchmark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatGhs } from "@/lib/demo";
import { MODELS, usePublishedPrices } from "@/lib/catalog";
import { CONTRACTS_DISCLAIMER, STATUS_LABEL, STATUS_ORDER, splitRevenue, tierDiscount, useContracts, type Contract, type ContractKind } from "@/lib/contracts";

export const Route = createFileRoute("/admin/contracts")({
  component: ContractsAdmin,
});

const KIND: Record<ContractKind, { label: string; icon: typeof Landmark; tone: string }> = {
  collection: { label: "Collections", icon: Landmark, tone: "bg-gold/15 text-gold-foreground" },
  provider: { label: "AI provider", icon: Cpu, tone: "bg-electric/10 text-electric" },
  revshare: { label: "Revenue share", icon: Users, tone: "bg-success/15 text-success" },
};

const STATUS_TONE = { draft: "bg-muted text-muted-foreground", negotiating: "bg-gold/15 text-gold-foreground", signed: "bg-success/15 text-success" } as const;
const PART_TONE = { provider: "bg-navy", collection: "bg-gold", revshare: "bg-success", nururoute: "bg-electric" } as const;

function ContractsAdmin() {
  const { state, advance, setRate, accruePayout, payAccrued, reset } = useContracts();
  usePublishedPrices();
  const reduce = useReducedMotion();

  const [modelId, setModelId] = useState("route-chat-pro");
  const [units, setUnits] = useState(10);
  const [monthlyUsd, setMonthlyUsd] = useState(12_000);
  const [referred, setReferred] = useState(true);

  const model = MODELS.find((m) => m.id === modelId) ?? MODELS[0]!;
  const provider = state?.contracts.find((c) => c.kind === "provider" && c.id === (model.category === "Chat & Coding" ? "c-provider-chat" : "c-provider-media"));
  const collection = state?.contracts.find((c) => c.kind === "collection");
  const revshare = state?.contracts.find((c) => c.kind === "revshare");

  const split = useMemo(() => {
    if (!state) return null;
    const customer = model.pesewas * units;
    // Illustrative provider cost: ~45% of customer price before discount when no contract rate maps cleanly to the unit.
    const providerUsd = provider ? (model.category === "Chat & Coding" ? provider.rate * units : provider.rate * units) : (customer / 100 / 15.5) * 0.45;
    return splitRevenue({
      customerPesewas: customer,
      providerCostUsd: providerUsd,
      fxRate: 15.5,
      collectionFeePct: collection?.rate ?? 0,
      revSharePct: referred ? revshare?.rate ?? 0 : 0,
      providerDiscountPct: tierDiscount(provider, monthlyUsd),
    });
  }, [state, model, units, monthlyUsd, referred, provider, collection, revshare]);

  if (!state || !split) return <p className="text-sm text-muted-foreground">Loading contracts…</p>;

  const signed = state.contracts.filter((c) => c.status === "signed").length;
  const accrued = state.payouts.filter((p) => p.status === "accrued").reduce((s, p) => s + p.pesewas, 0);
  const paid = state.payouts.filter((p) => p.status !== "accrued").reduce((s, p) => s + p.pesewas, 0);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Contracts hub & revenue split</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Deals that work for everyone: the collection partner gets volume, providers get distribution, creators get a share, Ghana gets AI priced in cedis. Every number here is illustrative and lives only in this browser.</p>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-gold/10 px-2 py-1 text-xs font-medium text-gold-foreground"><ShieldCheck className="size-3.5" aria-hidden /> {CONTRACTS_DISCLAIMER}</p>
        </div>
        <Button variant="outline" size="sm" onClick={reset}><RotateCcw /> Reset hub</Button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Contracts", String(state.contracts.length)],
          ["Signed (simulated)", String(signed)],
          ["Payouts accrued", formatGhs(accrued)],
          ["Payouts paid (simulated)", formatGhs(paid)],
        ].map(([l, v]) => (
          <div key={l} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{l}</p>
            <p className="mt-1 break-words font-display text-xl font-semibold tabular">{v}</p>
          </div>
        ))}
      </div>

      {/* Revenue split engine */}
      <AdminCard className="mt-6" title="Revenue-split engine" hint="One customer payment → provider, collection partner, referrer, NuruRoute. Driven by the contracts below and the published catalogue price." action={<BadgeDollarSign className="size-5 text-electric" aria-hidden />}>
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-3 text-sm">
            <label className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">Model</span>
              <select value={modelId} onChange={(e) => setModelId(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3">
                {MODELS.map((m) => <option key={m.id} value={m.id}>{m.name} · {formatGhs(m.pesewas)}/{m.unit}</option>)}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">Units ({model.unit}) — {units}</span>
              <input type="range" min={1} max={100} value={units} onChange={(e) => setUnits(Number(e.target.value))} className="accent-[var(--electric)]" />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">Committed monthly provider spend — USD {monthlyUsd.toLocaleString()} (tier discount {tierDiscount(provider, monthlyUsd)}%)</span>
              <input type="range" min={0} max={300_000} step={5_000} value={monthlyUsd} onChange={(e) => setMonthlyUsd(Number(e.target.value))} className="accent-[var(--electric)]" />
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={referred} onChange={(e) => setReferred(e.target.checked)} className="accent-[var(--electric)]" />
              <span>Organisation was referred (rev-share applies)</span>
            </label>
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <KV label="Customer pays" value={formatGhs(model.pesewas * units)} strong />
              <KV label="Gross margin" value={`${formatGhs(split.grossMarginPesewas)} · ${split.marginPct}%`} tone={split.marginPct < 25 ? "warn" : "good"} />
              <KV label="NuruRoute keeps" value={formatGhs(split.nururoutePesewas)} strong />
            </div>
          </div>

          <div>
            <div className="flex h-10 w-full overflow-hidden rounded-xl border border-border" role="img" aria-label={split.parts.map((p) => `${p.label} ${p.pct}%`).join(", ")}>
              {split.parts.map((p) => (
                <motion.div key={p.key} className={cn("h-full", PART_TONE[p.key])} initial={false} animate={{ width: `${Math.max(p.pct, p.pesewas > 0 ? 1 : 0)}%` }} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 20 }} />
              ))}
            </div>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {split.parts.map((p) => (
                <li key={p.key} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2 text-sm">
                  <span className="inline-flex items-center gap-2"><span className={cn("size-2.5 rounded-full", PART_TONE[p.key])} aria-hidden /> {p.label}</span>
                  <span className="tabular font-medium">{formatGhs(p.pesewas)} <span className="text-xs text-muted-foreground">({p.pct}%)</span></span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" disabled={!referred || split.revSharePesewas <= 0} onClick={() => accruePayout({ recipient: "Osu Creative Collective (fictional)", role: "reseller", contractId: "c-revshare-creators", pesewas: split.revSharePesewas })}>
                <Handshake /> Accrue referrer share ({formatGhs(split.revSharePesewas)})
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">FX assumed at GHS 15.5 / USD for display only. Provider cost uses the contract rate below; media rates are per output, chat rates per 1K tokens.</p>
          </div>
        </div>
      </AdminCard>

      <RateBenchmark />
      <PricingEdge collectionFeePct={collection?.rate ?? 0} fxRate={15.5} />

      {/* Contracts */}
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {state.contracts.map((c) => <ContractCard key={c.id} c={c} onAdvance={() => advance(c.id)} onRate={(r) => setRate(c.id, r)} />)}
      </div>

      {/* Payout ledger + events */}
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <AdminCard title="Creator & reseller payout ledger" hint="Accrued shares roll up monthly; a simulated payout run marks them paid." action={<Button size="sm" variant="outline" disabled={accrued === 0} onClick={payAccrued}>Run payout (simulated)</Button>}>
          <ul className="divide-y divide-border text-sm">
            {state.payouts.map((p) => (
              <li key={p.id} className="grid gap-1 py-2.5 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-4">
                <div className="min-w-0"><p className="font-medium">{p.recipient}</p><p className="text-xs text-muted-foreground">{p.role} · {new Date(p.at).toLocaleDateString("en-GB")}</p></div>
                <span className={cn("w-fit rounded-full px-2 py-0.5 text-xs font-semibold", p.status === "accrued" ? "bg-gold/15 text-gold-foreground" : "bg-success/15 text-success")}>{p.status}</span>
                <span className="tabular font-semibold">{formatGhs(p.pesewas)}</span>
              </li>
            ))}
          </ul>
        </AdminCard>
        <AdminCard title="Contract events" hint="Browser-local audit trail">
          <ul className="space-y-2 text-xs">
            {state.events.map((e, i) => (
              <li key={i} className="flex gap-2"><span className="shrink-0 tabular text-muted-foreground">{new Date(e.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span><span>{e.text}</span></li>
            ))}
          </ul>
        </AdminCard>
      </div>
    </>
  );
}

function ContractCard({ c, onAdvance, onRate }: { c: Contract; onAdvance: () => void; onRate: (r: number) => void }) {
  const k = KIND[c.kind];
  const idx = STATUS_ORDER.indexOf(c.status);
  return (
    <AdminCard title={c.title} hint={c.counterparty} action={<span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", k.tone)}><k.icon className="size-3.5" aria-hidden /> {k.label}</span>}>
      <p className="text-sm text-muted-foreground">{c.summary}</p>

      <ol className="mt-4 flex items-center gap-2 text-xs" aria-label="Contract status">
        {STATUS_ORDER.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span className={cn("rounded-full px-2 py-0.5 font-semibold", i <= idx ? STATUS_TONE[s] : "bg-muted/60 text-muted-foreground/60")}>{STATUS_LABEL[s]}</span>
            {i < STATUS_ORDER.length - 1 && <ArrowRight className="size-3 text-muted-foreground" aria-hidden />}
          </li>
        ))}
      </ol>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">Rate · {c.unit}</span>
          <input type="number" step={c.kind === "provider" ? 0.001 : 0.1} min={0} value={c.rate} onChange={(e) => onRate(Number(e.target.value))} className="h-10 rounded-lg border border-input bg-background px-3 tabular" aria-label={`${c.title} rate`} />
        </label>
        <div className="text-sm">
          <KV label="Term" value={`${c.termMonths} months`} />
          {c.sla && <KV label="SLA" value={`${c.sla.uptimePct}% uptime${c.sla.p95Ms ? ` · p95 ${c.sla.p95Ms} ms` : ""}`} />}
          {c.tiers && <KV label="Volume tiers" value={c.tiers.filter((t) => t.discountPct > 0).map((t) => `≥$${(t.fromUsd / 1000).toFixed(0)}k −${t.discountPct}%`).join(" · ") || "—"} />}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {([["Partner wins", c.wins.partner], ["NuruRoute wins", c.wins.nururoute], ["Customer wins", c.wins.customer]] as const).map(([t, b]) => (
          <div key={t} className="rounded-xl border border-border bg-muted/40 p-3"><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t}</p><p className="mt-1 text-xs">{b}</p></div>
        ))}
      </div>

      <ul className="mt-4 flex flex-wrap gap-1.5">
        {c.clauses.map((cl) => <li key={cl} className="rounded-md bg-muted px-2 py-0.5 text-[11px]">{cl}</li>)}
      </ul>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">Updated {new Date(c.updatedAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</span>
        <Button size="sm" variant={c.status === "signed" ? "outline" : "default"} disabled={c.status === "signed"} onClick={onAdvance}>
          <FileSignature /> {c.status === "draft" ? "Send to negotiation" : c.status === "negotiating" ? "Mark signed (simulated)" : "Signed"}
        </Button>
      </div>
    </AdminCard>
  );
}
