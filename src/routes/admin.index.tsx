import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Coins, LifeBuoy, ScrollText } from "lucide-react";
import { AdminCard, KV } from "@/components/admin/admin-shell";
import { computePrice, ghs, modelMeta, useAdminStore } from "@/lib/admin-demo";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const { state } = useAdminStore();
  if (!state) return null;
  const current = state.versions[state.versions.length - 1]!;
  const breakdowns = current.prices.map(computePrice);
  const avgMargin = breakdowns.reduce((a, b) => a + b.grossMarginPct, 0) / breakdowns.length;
  const open = state.tickets.filter((t) => t.status !== "resolved").length;
  const pendingChanges = JSON.stringify(state.draft) !== JSON.stringify(current.prices);

  return (
    <>
      <h1 className="font-display text-2xl font-semibold sm:text-3xl">Overview</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Simulated administration for the NuruRoute demo. Every number is illustrative and stored only in this browser.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <AdminCard title="Pricing" hint={`Live version ${current.id} · effective ${current.effectiveDate}`} action={<Coins className="size-5 text-electric" aria-hidden />}>
          <KV label="Models priced" value={current.prices.length} />
          <KV label="Average target margin" value={`${avgMargin.toFixed(1)}%`} strong />
          <KV label="Unpublished draft changes" value={pendingChanges ? "Yes — review needed" : "None"} tone={pendingChanges ? "warn" : undefined} />
          <Link to="/admin/pricing" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-electric hover:underline">Open pricing control <ArrowRight className="size-4" aria-hidden /></Link>
        </AdminCard>
        <AdminCard title="Support" hint="Simulated tickets with example ledger issues" action={<LifeBuoy className="size-5 text-electric" aria-hidden />}>
          <KV label="Open or waiting" value={open} strong />
          <KV label="Resolved" value={state.tickets.length - open} />
          <KV label="Assistant" value="Simulated only" />
          <Link to="/admin/support" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-electric hover:underline">Open support centre <ArrowRight className="size-4" aria-hidden /></Link>
        </AdminCard>
        <AdminCard title="Audit log" hint="Append-only demo record" action={<ScrollText className="size-5 text-electric" aria-hidden />}>
          <KV label="Entries" value={state.audit.length} strong />
          <KV label="Price versions" value={state.versions.length} />
          <KV label="Last action" value={state.audit[state.audit.length - 1]?.action ?? "—"} />
        </AdminCard>
      </div>

      <AdminCard title="Current customer prices (from live version)" hint="Public pages show these estimates without any cost or margin detail." className="mt-4">
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="py-2 pr-3 font-semibold">Model</th><th className="py-2 pr-3 font-semibold">Unit</th><th className="py-2 pr-3 text-right font-semibold">Cost to serve</th><th className="py-2 pr-3 text-right font-semibold">Customer price</th><th className="py-2 text-right font-semibold">Margin</th></tr>
            </thead>
            <tbody>
              {current.prices.slice(0, 8).map((p, i) => {
                const b = breakdowns[i]!;
                const m = modelMeta(p.modelId);
                return (
                  <tr key={p.modelId} className="border-t border-border">
                    <td className="py-2 pr-3 font-medium">{m?.name ?? p.modelId}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{p.unit}</td>
                    <td className="py-2 pr-3 text-right tabular">{ghs(b.costToServeGhs, 4)}</td>
                    <td className="py-2 pr-3 text-right font-semibold tabular">{ghs(b.customerPriceGhs, 4)}</td>
                    <td className="py-2 text-right tabular">{b.grossMarginPct.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Showing 8 of {current.prices.length}. Full table and editing on the pricing screen.</p>
      </AdminCard>
    </>
  );
}
