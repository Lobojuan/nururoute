import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Lock, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminCard, KV } from "@/components/admin/admin-shell";
import { cn } from "@/lib/utils";
import { COUNTRIES, countryByCode, DEFAULT_COUNTRY } from "@/lib/momo";
import { computePrice, diffPricing, ghs, modelMeta, round, useAdminStore, type PricingInput } from "@/lib/admin-demo";
import { usePublishedPrices } from "@/lib/catalog";

export const Route = createFileRoute("/admin/pricing")({
  component: PricingControl,
});

const FIELDS: { key: keyof PricingInput; label: string; step: number; suffix?: string; min?: number; max?: number }[] = [
  { key: "providerCostUsd", label: "Provider cost basis (USD per unit)", step: 0.0001, min: 0 },
  { key: "fxRate", label: "FX assumption (GHS per USD, estimate)", step: 0.1, min: 0.1 },
  { key: "fxBufferPct", label: "FX buffer", step: 0.5, suffix: "%", min: 0, max: 100 },
  { key: "paymentBufferPct", label: "Payment / collection buffer", step: 0.5, suffix: "%", min: 0, max: 100 },
  { key: "opsBufferPct", label: "Operational buffer", step: 0.5, suffix: "%", min: 0, max: 100 },
  { key: "targetMarginPct", label: "Target gross margin", step: 1, suffix: "%", min: 0, max: 99 },
];

function PricingControl() {
  const { state, setDraft, publishVersion, discardDraft } = useAdminStore();
  const live = usePublishedPrices();
  const [selected, setSelected] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [effective, setEffective] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY);
  const [done, setDone] = useState<string | null>(null);

  const current = state?.versions[state.versions.length - 1];
  const diff = useMemo(() => (state && current ? diffPricing(current.prices, state.draft) : []), [state, current]);
  if (!state || !current) return null;

  const modelId = selected ?? state.draft[0]!.modelId;
  const input = state.draft.find((p) => p.modelId === modelId) ?? state.draft[0]!;
  const meta = modelMeta(modelId);
  const b = computePrice(input);
  const country = countryByCode(countryCode);

  function patch(key: keyof PricingInput, value: number) {
    setDraft(state!.draft.map((p) => (p.modelId === modelId ? { ...p, [key]: value } : p)));
    setDone(null);
  }

  function confirm() {
    if (!reason.trim()) return;
    publishVersion(effective, reason.trim());
    setReviewing(false);
    setReason("");
    setDone(`Published v${state!.versions.length + 1}`);
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Pricing control centre</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Edit the demo cost basis and buffers per model. Changes become a new version only after review and confirmation.</p>
        </div>
        <div className="flex items-center gap-2">
          {diff.length > 0 && <Button variant="outline" size="sm" onClick={() => { discardDraft(); setDone(null); }}><Undo2 /> Discard draft</Button>}
          <Button size="sm" disabled={diff.length === 0} onClick={() => setReviewing(true)} className="bg-electric text-electric-foreground hover:bg-electric/90">Review {diff.length > 0 ? `${diff.length} change${diff.length === 1 ? "" : "s"}` : "changes"}</Button>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Public site reads <strong className="text-foreground">{live.version ? `${live.version} (effective ${live.effectiveDate})` : "catalogue defaults"}</strong> — /models, studios, developer console and the support workbench all use this table. Cost basis and margins stay private.</p>
      {done && <p role="status" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success"><CheckCircle2 className="size-4" aria-hidden /> {done} — now the live demo version.</p>}

      <div className="mt-6 grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* Model list */}
        <AdminCard title="Models" hint="Draft values; amber dot = unpublished change" className="lg:max-h-[720px] lg:overflow-y-auto">
          <ul className="space-y-1">
            {state.draft.map((p) => {
              const m = modelMeta(p.modelId);
              const changed = diff.some((d) => d.modelId === p.modelId);
              const active = p.modelId === modelId;
              return (
                <li key={p.modelId}>
                  <button type="button" onClick={() => setSelected(p.modelId)} aria-pressed={active} className={cn("flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors", active ? "bg-accent text-foreground" : "hover:bg-muted")}>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{m?.name ?? p.modelId}</span>
                      <span className="block truncate text-xs text-muted-foreground">{m?.category} · {p.unit}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-xs tabular text-muted-foreground">{ghs(computePrice(p).customerPriceGhs, 3)}</span>
                      {changed && <span className="size-2 rounded-full bg-gold" aria-label="Unpublished change" />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </AdminCard>

        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <AdminCard title={meta?.name ?? modelId} hint={`${meta?.provider ?? ""} · ${meta?.category ?? ""} · billed per ${input.unit}`}>
              <div className="grid gap-3">
                {FIELDS.map((f) => (
                  <label key={f.key} className="block text-sm">
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className="mt-1 flex items-center rounded-lg border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
                      <input type="number" inputMode="decimal" step={f.step} min={f.min} max={f.max} value={input[f.key] as number} onChange={(e) => patch(f.key, Number(e.target.value))} className="h-10 min-w-0 flex-1 bg-transparent px-3 tabular outline-none" aria-label={f.label} />
                      {f.suffix && <span className="px-3 text-xs text-muted-foreground">{f.suffix}</span>}
                    </span>
                  </label>
                ))}
              </div>
            </AdminCard>

            <AdminCard title="Price preview" hint="Internal figures — never shown on public pages">
              {!b.valid && <p role="alert" className="mb-3 inline-flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive"><AlertTriangle className="size-4" aria-hidden /> Target margin must be below 100%.</p>}
              <KV label="Provider cost" value={ghs(b.providerCostGhs, 4)} />
              <KV label="FX buffer" value={`+ ${ghs(b.fxBufferGhs, 4)}`} />
              <KV label="Payment buffer" value={`+ ${ghs(b.paymentBufferGhs, 4)}`} />
              <KV label="Operational buffer" value={`+ ${ghs(b.opsBufferGhs, 4)}`} />
              <div className="my-2 border-t border-border" />
              <KV label="Total cost to serve" value={ghs(b.costToServeGhs, 4)} strong />
              <KV label="Customer price (GHS)" value={ghs(b.customerPriceGhs, 4)} strong tone="good" />
              <KV label="Gross profit" value={ghs(b.grossProfitGhs, 4)} />
              <KV label="Gross margin" value={`${b.grossMarginPct.toFixed(1)}%`} />
              <KV label="Markup on cost" value={`${b.markupPct.toFixed(1)}%`} />
              <div className="my-2 border-t border-border" />
              <label className="block text-xs text-muted-foreground">
                Local-currency preview (display estimate)
                <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground">
                  {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name} · {c.currency}{c.status === "planned" ? " (planned)" : ""}</option>)}
                </select>
              </label>
              <KV label={`Customer price (${country.currency}, est.)`} value={`${country.currency} ${(b.customerPriceGhs * country.perGhs).toLocaleString("en-GH", { maximumFractionDigits: 4 })}`} strong />
              <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                customer price = (provider cost + FX + payment + operational buffers) ÷ (1 − target gross margin)
              </p>
            </AdminCard>
          </div>

          <AdminCard title="Price versions" hint="Each confirmed review appends a version. Versions cannot be edited or deleted.">
            <ol className="space-y-2">
              {[...state.versions].reverse().map((v, i) => (
                <li key={v.id} className="rounded-xl border border-border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 font-semibold"><Lock className="size-3.5 text-muted-foreground" aria-hidden /> {v.id} {i === 0 && <span className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-success">Live</span>}</span>
                    <span className="text-xs text-muted-foreground tabular">effective {v.effectiveDate} · {new Date(v.createdAt).toLocaleString("en-GB")} · {v.actor}</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{v.reason}</p>
                  {v.diff.length > 0 && (
                    <ul className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
                      {v.diff.map((d, j) => <li key={j} className="tabular text-muted-foreground"><span className="font-medium text-foreground">{modelMeta(d.modelId)?.name ?? d.modelId}</span> · {d.field}: {String(d.from)} → {String(d.to)}</li>)}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          </AdminCard>

          <AdminCard title="Audit log" hint="Append-only demo record. No edit or delete controls exist by design.">
            <ul className="divide-y divide-border text-sm">
              {[...state.audit].reverse().map((a) => (
                <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2">
                  <span><Lock className="mr-1.5 inline size-3 text-muted-foreground" aria-hidden /><span className="font-medium">{a.action}</span> <span className="text-muted-foreground">— {a.detail}</span></span>
                  <span className="text-xs text-muted-foreground tabular">{new Date(a.at).toLocaleString("en-GB")} · {a.actor}</span>
                </li>
              ))}
            </ul>
          </AdminCard>
        </div>
      </div>

      {/* Review / confirm step */}
      {reviewing && (
        <div role="dialog" aria-modal="true" aria-labelledby="review-title" className="fixed inset-0 z-50 flex items-end justify-center bg-navy/60 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h2 id="review-title" className="font-display text-xl font-semibold">Review price changes</h2>
            <p className="mt-1 text-sm text-muted-foreground">Confirming creates version v{state.versions.length + 1} and writes an audit entry. This is a demo table; no customer is billed.</p>
            <ul className="mt-4 divide-y divide-border rounded-xl border border-border text-sm">
              {diff.map((d, i) => {
                const before = computePrice(current.prices.find((p) => p.modelId === d.modelId)!);
                const after = computePrice(state.draft.find((p) => p.modelId === d.modelId)!);
                return (
                  <li key={i} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <span><span className="font-medium">{modelMeta(d.modelId)?.name}</span> <span className="text-muted-foreground">· {d.field}</span></span>
                    <span className="tabular text-muted-foreground">{String(d.from)} → <span className="font-semibold text-foreground">{String(d.to)}</span> <span className="ml-2 text-xs">price {ghs(before.customerPriceGhs, 3)} → {ghs(round(after.customerPriceGhs, 4), 3)}</span></span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 grid gap-3 sm:grid-cols-[180px_1fr]">
              <label className="block text-sm"><span className="text-muted-foreground">Effective date</span><input type="date" value={effective} onChange={(e) => setEffective(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3" /></label>
              <label className="block text-sm"><span className="text-muted-foreground">Change reason (required)</span><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Provider list price update; FX buffer widened" className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3" /></label>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => setReviewing(false)}>Back to editing</Button>
              <Button disabled={!reason.trim() || diff.some((d) => !computePrice(state.draft.find((p) => p.modelId === d.modelId)!).valid)} onClick={confirm} className="bg-navy text-navy-foreground hover:bg-navy/90">Confirm and publish demo version</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
