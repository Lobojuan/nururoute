import { createFileRoute } from "@tanstack/react-router";
import { Lock, LockOpen, Power, ShieldCheck, Ticket, Gauge, Gift, ScrollText, CircleDashed, CheckCircle2, OctagonX, RotateCcw } from "lucide-react";
import { AdminCard, KV } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ghs } from "@/lib/admin-demo";
import { formatGhs } from "@/lib/demo";
import { INVITES, LIVE_PREREQS, PILOT_LABEL, PILOT_STATUS, PREREQ_IDS, PROMO_CREDITS, SPEND_CAPS, gateOpen, usePilotStore, type ProviderConfig } from "@/lib/pilot-demo";

export const Route = createFileRoute("/admin/pilot")({
  component: PilotControls,
});

const OFF = "rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground";
const ON = "rounded bg-destructive px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive-foreground";

function PilotControls() {
  const { state, toggleCheck, setProvider, setEnabled, setKillSwitch, setProgrammeCap, clearRuns, resetPilot } = usePilotStore();
  if (!state) return <p className="text-sm text-muted-foreground">Loading pilot controls…</p>;

  const done = PREREQ_IDS.filter((p) => state.checklist[p.id]).length;
  const open = gateOpen(state);
  const killed = state.killSwitch;
  const settledGhs = state.runs.reduce((a, r) => a + r.settledPesewas, 0) / 100;
  const reservedGhs = state.runs.reduce((a, r) => a + (r.outcome === "released" || r.outcome === "settled" ? r.reservedPesewas : 0), 0) / 100;
  const effectiveCap = killed ? 0 : state.programmeCapGhs;
  const capPct = effectiveCap > 0 ? Math.min(100, Math.round((settledGhs / effectiveCap) * 100)) : 100;
  const enabledCount = state.providers.filter((p) => p.enabled).length;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Closed-pilot controls</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Provider-ready foundation. Everything here is local to this browser: no signup, no live AI, no payment rail, no secrets. "Enabled" placeholders never make a network call.</p>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-gold/10 px-2 py-1 text-xs font-medium text-gold-foreground"><ShieldCheck className="size-3.5" aria-hidden /> {PILOT_LABEL}</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetPilot}><RotateCcw /> Reset pilot demo</Button>
      </div>

      {killed && (
        <p role="alert" className="mt-4 flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm font-medium text-destructive"><OctagonX className="size-4 shrink-0" aria-hidden /> Kill-switch is ON. The spend cap reads zero, every simulated run on the public demo is blocked and all provider placeholders are disabled.</p>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AdminCard title="Pilot status" hint="Only the kill-switch is interactive" action={<Power className="size-5 text-electric" aria-hidden />}>
          <dl className="grid gap-2 text-sm">
            <KV label="Phase" value={PILOT_STATUS.phase} strong />
            <KV label="Public signup" value={<span className={OFF}>{PILOT_STATUS.publicSignup}</span>} />
            <KV label="Public AI access" value={<span className={OFF}>{PILOT_STATUS.publicAiAccess}</span>} />
            <KV label="Live providers" value={<span className={OFF}>OFF · {enabledCount} placeholder{enabledCount === 1 ? "" : "s"} marked ready</span>} />
            <KV label="Live payments" value={<span className={OFF}>{PILOT_STATUS.livePayments}</span>} />
            <KV label="Kill-switch" value={<span className={killed ? ON : OFF}>{killed ? "ON" : "OFF"}</span>} />
          </dl>
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border p-3">
            <div>
              <p className="text-sm font-semibold">Kill-switch</p>
              <p className="text-xs text-muted-foreground">Zeroes the spend cap and blocks simulated runs instantly.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={killed}
              aria-label="Kill-switch"
              onClick={() => setKillSwitch(!killed)}
              className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", killed ? "bg-destructive" : "bg-muted")}
            >
              <span className={cn("absolute top-0.5 size-6 rounded-full bg-background shadow transition-transform", killed ? "translate-x-5.5 left-0" : "left-0.5")} />
            </button>
          </div>
        </AdminCard>

        <AdminCard title="Invite-only concept" hint="Illustrative cohorts — no accounts exist" action={<Ticket className="size-5 text-electric" aria-hidden />}>
          <ul className="divide-y divide-border text-sm">
            {INVITES.map((i) => (
              <li key={i.code} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{i.label}</p>
                  <p className="text-xs text-muted-foreground tabular">{i.code} · {i.used}/{i.seats} seats</p>
                </div>
                <span className="shrink-0 rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">{i.status}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">Invite codes are placeholders for a future gated onboarding step. They do not authenticate anyone.</p>
        </AdminCard>

        <AdminCard title="Promotional-credit preview" hint="Rules only — no credit is granted" action={<Gift className="size-5 text-electric" aria-hidden />}>
          <ul className="space-y-2 text-sm">
            {PROMO_CREDITS.map((p) => (
              <li key={p.name} className="rounded-xl bg-muted px-3 py-2">
                <div className="flex items-center justify-between gap-2"><span className="font-medium">{p.name}</span><span className="tabular font-semibold">GHS {p.amountGhs}</span></div>
                <p className="mt-0.5 text-xs text-muted-foreground">{p.rule} · expires after {p.expiresDays} days · <span className="uppercase">{p.status}</span></p>
              </li>
            ))}
          </ul>
        </AdminCard>

        <AdminCard title="Spend-cap preview" hint="Programme cap is live against the demo usage log; other rows are illustrative" action={<Gauge className="size-5 text-electric" aria-hidden />} className="md:col-span-2 xl:col-span-3">
          <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="font-medium">Pilot programme · monthly budget</p>
                  <p className="text-xs text-muted-foreground">Settled demo spend across every simulated run in this browser.</p>
                </div>
                <label className="text-xs text-muted-foreground">Cap (GHS)
                  <input type="number" min={0} step={100} value={state.programmeCapGhs} disabled={killed} onChange={(e) => setProgrammeCap(Number(e.target.value))} className="ml-2 h-9 w-28 rounded-lg border border-input bg-background px-2 text-sm tabular text-foreground disabled:opacity-50" />
                </label>
              </div>
              <div className="mt-3 flex items-baseline justify-between text-sm">
                <span className="font-display text-2xl font-bold tabular">{ghs(settledGhs)}</span>
                <span className={cn("tabular text-xs", killed ? "font-semibold text-destructive" : "text-muted-foreground")}>of {ghs(effectiveCap)} {killed ? "· ZEROED BY KILL-SWITCH" : `· ${ghs(reservedGhs)} reserved in total`}</span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={capPct} aria-valuemin={0} aria-valuemax={100} aria-label="Pilot programme budget usage">
                <div className={cn("h-full rounded-full transition-[width] duration-700", killed || capPct > 80 ? "bg-destructive" : "bg-electric")} style={{ width: `${capPct}%` }} />
              </div>
            </div>
            <ul className="space-y-3 text-sm">
              {SPEND_CAPS.filter((c) => !c.scope.startsWith("Pilot programme")).map((c) => {
                const cap = killed ? 0 : c.capGhs;
                const pct = cap > 0 ? Math.min(100, Math.round((c.usedGhs / cap) * 100)) : 100;
                return (
                  <li key={c.scope}>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <span className="font-medium">{c.scope}</span>
                      <span className="tabular text-xs text-muted-foreground">{ghs(killed ? 0 : c.usedGhs)} of {ghs(cap)} · {c.note}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${c.scope} usage`}>
                      <div className={cn("h-full rounded-full transition-[width] duration-700", killed || pct > 80 ? "bg-destructive" : "bg-electric")} style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </AdminCard>

        <AdminCard title="Provider-usage log" hint={`${state.runs.length} simulated run${state.runs.length === 1 ? "" : "s"} recorded from the public demo in this browser — no provider was called`} action={<ScrollText className="size-5 text-electric" aria-hidden />} className="md:col-span-2 xl:col-span-3">
          {state.runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No runs yet. Use the developer console or a studio on the public demo and every reserve → settle → release will appear here.</p>
          ) : (
            <div className="-mx-4 overflow-x-auto px-4">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                  <tr><th className="py-1.5 pr-3 font-medium">Time</th><th className="py-1.5 pr-3 font-medium">Model run</th><th className="py-1.5 pr-3 text-right font-medium">Reserved</th><th className="py-1.5 pr-3 text-right font-medium">Credits used</th><th className="py-1.5 pr-3 text-right font-medium">Released</th><th className="py-1.5 font-medium">Outcome</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {state.runs.map((u) => (
                    <tr key={u.id}>
                      <td className="py-1.5 pr-3 tabular text-muted-foreground">{new Date(u.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="max-w-[18rem] truncate py-1.5 pr-3">{u.label}</td>
                      <td className="py-1.5 pr-3 text-right tabular">{formatGhs(u.reservedPesewas)}</td>
                      <td className="py-1.5 pr-3 text-right tabular font-semibold">{formatGhs(u.settledPesewas)}</td>
                      <td className="py-1.5 pr-3 text-right tabular text-muted-foreground">{formatGhs(Math.max(0, u.reservedPesewas - u.settledPesewas))}</td>
                      <td className="py-1.5"><span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider", u.outcome === "settled" ? "bg-success/10 text-success" : u.outcome === "released" ? "bg-gold/15 text-gold-foreground" : "bg-destructive/10 text-destructive")}>{u.outcome}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {state.runs.length > 0 && <Button variant="ghost" size="sm" className="mt-3" onClick={clearRuns}>Clear log</Button>}
        </AdminCard>

        <AdminCard title="Live-provider configuration" hint={open ? `Gate open (${done}/${LIVE_PREREQS.length} prerequisites) — placeholders can be marked ready; no call is ever made` : `Locked until terms, budget cap and payment partner are ticked (${done}/${LIVE_PREREQS.length})`} action={open ? <LockOpen className="size-5 text-success" aria-hidden /> : <Lock className="size-5 text-muted-foreground" aria-hidden />} className="md:col-span-2 xl:col-span-3">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prerequisite checklist</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {PREREQ_IDS.map((p) => {
                  const meta = LIVE_PREREQS[p.index]!;
                  const checked = state.checklist[p.id];
                  return (
                    <li key={p.id}>
                      <label className="flex cursor-pointer gap-2">
                        <input type="checkbox" checked={checked} onChange={() => toggleCheck(p.id)} className="peer sr-only" />
                        {checked ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> : <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />}
                        <span className="peer-focus-visible:underline"><span className="font-medium">{meta.title}</span>{p.gate && <span className="ml-1.5 rounded bg-gold/15 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-foreground">gate</span>} <span className="text-muted-foreground">— {meta.detail}</span></span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">Ticking a box records intent in this demo only. Real go-live still requires the signed documents, server-side secret storage and a licensed payment partner.</p>
            </div>
            <fieldset disabled={!open || killed} aria-describedby="prov-note" className={cn("grid gap-3", (!open || killed) && "opacity-60")}>
              <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Provider placeholders {open && !killed ? "(editable)" : "(locked)"}</legend>
              <p id="prov-note" className="text-xs text-muted-foreground">References only — type a vault path or ticket number, never an endpoint URL or key. A monthly cap above zero is required before a placeholder can be marked ready.</p>
              {state.providers.map((p) => (
                <ProviderRow key={p.id} p={p} canEnable={open && !killed} onChange={(patch) => setProvider(p.id, patch)} onEnable={(v) => setEnabled(p.id, v)} />
              ))}
            </fieldset>
          </div>
        </AdminCard>

        {state.events.length > 0 && (
          <AdminCard title="Pilot event log" hint="Local audit of switches and checklist changes" className="md:col-span-2 xl:col-span-3">
            <ul className="divide-y divide-border text-sm">
              {state.events.slice(0, 12).map((e) => (
                <li key={e.at} className="flex gap-3 py-1.5"><span className="shrink-0 tabular text-xs text-muted-foreground">{new Date(e.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span><span>{e.text}</span></li>
              ))}
            </ul>
          </AdminCard>
        )}
      </div>
    </>
  );
}

function ProviderRow({ p, canEnable, onChange, onEnable }: { p: ProviderConfig; canEnable: boolean; onChange: (patch: Partial<ProviderConfig>) => void; onEnable: (v: boolean) => void }) {
  const ready = canEnable && p.monthlyCapGhs > 0;
  return (
    <div className={cn("rounded-xl border p-3", p.enabled ? "border-success/50 bg-success/5" : "border-dashed border-border")}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium">{p.enabled ? <CheckCircle2 className="size-3.5 text-success" aria-hidden /> : <Lock className="size-3.5" aria-hidden />} {p.label}</p>
        <label className="flex items-center gap-2 text-xs">
          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", p.enabled ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>{p.enabled ? "Ready (simulated)" : "Off"}</span>
          <input type="checkbox" checked={p.enabled} disabled={!ready && !p.enabled} onChange={(e) => onEnable(e.target.checked)} aria-label={`Mark ${p.label} ready`} className="size-4 accent-[var(--electric)]" />
        </label>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <label className="block text-xs text-muted-foreground">Endpoint reference<input value={p.endpointRef} onChange={(e) => onChange({ endpointRef: e.target.value.slice(0, 60) })} placeholder="e.g. change-request #12" className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground" /></label>
        <label className="block text-xs text-muted-foreground">Secret reference<input value={p.secretRef} onChange={(e) => onChange({ secretRef: e.target.value.slice(0, 60) })} placeholder="e.g. vault path name" className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground" /></label>
        <label className="block text-xs text-muted-foreground">Monthly budget cap (GHS)<input type="number" min={0} step={50} value={p.monthlyCapGhs} onChange={(e) => onChange({ monthlyCapGhs: Math.max(0, Number(e.target.value)) })} className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-2 text-sm tabular text-foreground" /></label>
      </div>
    </div>
  );
}
