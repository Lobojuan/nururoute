import { createFileRoute, Link } from "@tanstack/react-router";
import { Wallet, RotateCcw, ShieldCheck, Repeat, CheckCircle2, CircleDashed, ScrollText, Landmark } from "lucide-react";
import { AdminCard, KV } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatGhs } from "@/lib/demo";
import { COLLECTION_READINESS, STATUS_LABEL, summarise, usePayments, type CollectionStatus } from "@/lib/payments";

export const Route = createFileRoute("/admin/payments")({
  component: PaymentsAdmin,
});

const TONE: Record<CollectionStatus, string> = {
  PENDING: "bg-electric/10 text-electric",
  SUCCESSFUL: "bg-success/15 text-success",
  FAILED: "bg-destructive/10 text-destructive",
  REJECTED: "bg-destructive/10 text-destructive",
  TIMEOUT: "bg-gold/15 text-gold-foreground",
};

function time(ts: number) {
  return new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function PaymentsAdmin() {
  const { state, clear, replay } = usePayments();
  if (!state) return <p className="text-sm text-muted-foreground">Loading collections…</p>;
  const s = summarise(state.intents);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Collections & reconciliation</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Every top-up attempted on the public wallet demo appears here as a request-to-pay record with its lifecycle, callback and ledger-credit state. Simulated in this browser only — no operator connection, no money.</p>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-gold/10 px-2 py-1 text-xs font-medium text-gold-foreground"><ShieldCheck className="size-3.5" aria-hidden /> Live payments OFF · adapter boundary ready for a licensed collection partner</p>
        </div>
        <Button variant="outline" size="sm" onClick={clear}><RotateCcw /> Clear records</Button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Requests", String(s.total)],
          ["Collected (simulated)", formatGhs(s.collectedPesewas)],
          ["Success rate", `${s.successRate}%`],
          ["Pending", String(s.pending)],
          ["Unreconciled credits", String(s.unreconciled)],
        ].map(([l, v]) => (
          <div key={l} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{l}</p>
            <p className="mt-1 break-words font-display text-xl font-semibold tabular">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <AdminCard title="Request-to-pay records" hint="Newest first · reference, payer, status, callback, credit" action={<Wallet className="size-5 text-electric" aria-hidden />}>
          {state.intents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No records yet. Run a simulated top-up on the <Link to="/wallet" className="font-medium text-electric underline-offset-4 hover:underline">public wallet</Link> — try Approve, Decline and Time out to see each path land here.</p>
          ) : (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr><th className="px-2 py-2">Ref</th><th className="px-2 py-2">Payer</th><th className="px-2 py-2 text-right">Amount</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">Callback</th><th className="px-2 py-2">Credit</th><th className="px-2 py-2" /></tr>
                </thead>
                <tbody>
                  {state.intents.map((i) => (
                    <tr key={i.referenceId} className="border-t border-border/60 align-top">
                      <td className="px-2 py-2"><p className="font-mono text-xs">{i.externalId}</p><p className="font-mono text-[10px] text-muted-foreground">{i.referenceId.slice(0, 8)}…</p></td>
                      <td className="px-2 py-2"><p className="text-xs">{i.payerMsisdn}</p><p className="text-[10px] text-muted-foreground">{i.provider}</p></td>
                      <td className="px-2 py-2 text-right font-semibold tabular">{formatGhs(i.amountPesewas)}</td>
                      <td className="px-2 py-2"><span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", TONE[i.status])}>{STATUS_LABEL[i.status]}</span>{i.reason && <p className="mt-1 max-w-[180px] text-[10px] text-muted-foreground">{i.reason}</p>}</td>
                      <td className="px-2 py-2 text-xs">{i.callbackDelivered ? <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="size-3.5" aria-hidden /> received</span> : <span className="inline-flex items-center gap-1 text-muted-foreground"><CircleDashed className="size-3.5" aria-hidden /> waiting</span>}</td>
                      <td className="px-2 py-2 text-xs">{i.credited ? <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="size-3.5" aria-hidden /> posted once</span> : i.status === "SUCCESSFUL" ? <span className="text-destructive">not posted</span> : <span className="text-muted-foreground">none</span>}</td>
                      <td className="px-2 py-2 text-right">{i.status !== "PENDING" && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => replay(i.referenceId)} title="Replay the provider callback to prove idempotency"><Repeat /> Replay callback</Button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>

        <div className="grid gap-4">
          <AdminCard title="Go-live readiness · collections" hint="Inert checklist — nothing stored or called" action={<Landmark className="size-5 text-electric" aria-hidden />}>
            <ol className="space-y-2.5">
              {COLLECTION_READINESS.map((r) => (
                <li key={r.title} className="flex gap-2.5 text-sm">
                  <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div><p className="font-medium">{r.title}</p><p className="text-xs text-muted-foreground">{r.detail}</p></div>
                </li>
              ))}
            </ol>
            <dl className="mt-4 grid gap-2 border-t border-border pt-3 text-sm">
              <KV label="Adapter" value="Simulated (browser)" strong />
              <KV label="Currency" value="GHS · Ghana launch market" />
              <KV label="Credit rule" value="Exactly one ledger top-up per SUCCESSFUL reference" />
            </dl>
          </AdminCard>

          <AdminCard title="Event log" hint="Callbacks, credits and duplicate-callback rejections" action={<ScrollText className="size-5 text-electric" aria-hidden />}>
            {state.events.length === 0 ? <p className="text-sm text-muted-foreground">No events yet.</p> : (
              <ul className="max-h-72 space-y-1.5 overflow-y-auto text-xs">
                {state.events.map((e, i) => (
                  <li key={i} className="flex gap-2"><span className="shrink-0 font-mono text-muted-foreground">{time(e.at)}</span><span>{e.text}</span></li>
                ))}
              </ul>
            )}
          </AdminCard>
        </div>
      </div>
    </>
  );
}
