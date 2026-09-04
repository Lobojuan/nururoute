import { pageMeta } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, Smartphone, Loader2, RotateCcw, Globe2, XCircle, Clock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, SectionHead, DemoNotice, DemoBadge, Stat } from "@/components/site/primitives";
import { DemoSafeguards } from "@/components/site/demo-safeguards";
import { BalanceDisc, CoinBurst } from "@/components/site/money-flow";
import { cn } from "@/lib/utils";
import { formatGhs, useDemo } from "@/lib/demo";
import { COUNTRIES, DEFAULT_COUNTRY, FX_NOTE, MOMO_DISCLAIMER, countryByCode, detectOperator, formatE164, formatLocal, localEquivalent, railSummary, validNational, type Operator } from "@/lib/momo";
import { playCoin } from "@/lib/sound";
import { SIM_TIMING, STATUS_LABEL, simulatedCollections, type CollectionIntent, type SimulatedOutcome } from "@/lib/payments";

const TITLE = "Wallet & mobile money demo — NuruRoute";
const DESC = "Pick your country from Ghana and Nigeria to Kenya and Tanzania, choose your mobile-money operator and run a simulated GHS top-up. See available, reserved and spent balances. Demo mode — no real money.";

export const Route = createFileRoute("/wallet")({
  head: () => pageMeta("/wallet", TITLE, DESC),
  component: WalletPage,
});

const PRESETS = [500, 1000, 2000, 5000, 10000];
const COUNTRY_KEY = "nururoute.demo.country";

function WalletPage() {
  const demo = useDemo();
  const [countryCode, setCountryCode] = useState<string>(() => (typeof window === "undefined" ? DEFAULT_COUNTRY : window.localStorage.getItem(COUNTRY_KEY) ?? DEFAULT_COUNTRY));
  const country = countryByCode(countryCode);
  const [phone, setPhone] = useState("");
  const [operator, setOperator] = useState<Operator | null>(null);
  const [amount, setAmount] = useState(2000);
  const [custom, setCustom] = useState("");
  const [stage, setStage] = useState<"idle" | "requested" | "prompt" | "done" | "failed">("idle");
  const [outcome, setOutcome] = useState<SimulatedOutcome>("approve");
  const [intent, setIntent] = useState<CollectionIntent | null>(null);
  const [burst, setBurst] = useState(0);
  const discRef = useRef<HTMLDivElement>(null);
  const payBtnRef = useRef<HTMLButtonElement>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const step = demo.phone ? 2 : 1;
  const detected = detectOperator(country, phone);
  const op = operator ?? detected;
  const phoneOk = validNational(country, phone);
  const pesewas = custom ? Math.round(Number(custom) * 100) : amount;
  const amountOk = Number.isFinite(pesewas) && pesewas >= 100 && pesewas <= 500000;
  const local = localEquivalent(country, amountOk ? pesewas : 0);
  const rails = useMemo(railSummary, []);

  function pickCountry(code: string) {
    setCountryCode(code);
    setOperator(null);
    setPhone("");
    window.localStorage.setItem(COUNTRY_KEY, code);
  }

  function link(e: FormEvent) {
    e.preventDefault();
    if (!phoneOk || !op) return;
    demo.link(formatE164(country, phone), `${op.name} · ${country.name}`);
  }

  function later(ms: number, fn: () => void) {
    timers.current.push(window.setTimeout(fn, ms));
  }

  function topUp(e: FormEvent) {
    e.preventDefault();
    if (!amountOk || !demo.phone) return;
    // 1. Create a PENDING request-to-pay with an idempotency reference.
    const created = simulatedCollections.requestToPay({ provider: `${demo.network?.split(" · ")[0] ?? "Mobile money"} (simulated)`, countryCode: country.code, amountPesewas: pesewas, payerMsisdn: demo.phone });
    setIntent(created);
    setStage("requested");
    // 2. The payer sees a prompt on their handset.
    later(SIM_TIMING.prompt, () => setStage("prompt"));
    // 3. The provider callback resolves the reference; only SUCCESSFUL posts exactly one ledger credit.
    later(outcome === "timeout" ? SIM_TIMING.timeout : SIM_TIMING.decision, () => {
      const resolved = simulatedCollections.resolve(created.referenceId, outcome);
      setIntent(resolved);
      if (resolved?.status === "SUCCESSFUL") {
        if (simulatedCollections.markCredited(resolved.referenceId)) {
          setBurst((b) => b + 1);
          playCoin("topup");
          demo.topUp(pesewas);
        }
        setStage("done");
        later(4500, () => setStage("idle"));
      } else {
        setStage("failed");
      }
    });
  }

  function resetAll() {
    demo.reset();
    setPhone("");
    setOperator(null);
  }

  return (
    <>
      <Section className="pb-8">
        <SectionHead as="h1" eyebrow="Wallet & mobile money" title="Fund your AI wallet the way Africa pays" body="From Accra to Lagos, Nairobi to Dar es Salaam: pick your country, choose your operator and add credit. Every top-up, hold and charge is shown separately so you always know where your money is." />
        <DemoNotice className="mt-6 max-w-3xl">This is a simulated flow. No mobile-money prompt is sent and no live integration is used on this site. {MOMO_DISCLAIMER}</DemoNotice>
        <DemoSafeguards compact className="mt-4 max-w-3xl" />
      </Section>

      <Section tone="muted" className="adinkra-lattice pt-0 sm:pt-0 lg:pt-0">
        <CoinBurst fireKey={burst} from={payBtnRef} to={discRef} />
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          {/* Balance panel */}
          <div className="surface-abyss relative overflow-hidden rounded-3xl border border-gold/25 p-6 shadow-depth sm:p-8">
            <div className="kente-strip-thin absolute inset-x-0 top-0" aria-hidden />
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-navy-foreground/60">Wallet balance</p>
              <DemoBadge />
            </div>
            {(() => {
              const heldInGhs = country.currency !== "GHS";
              const primary = demo.hydrated ? (formatLocal(country, demo.available) ?? formatGhs(demo.available)) : `${country.currency} —`;
              return (
                <>
                  <div ref={discRef} className="mt-6">
                    <BalanceDisc
                      available={demo.available}
                      reserved={demo.reserved}
                      spent={demo.spent}
                      label={`Available · ${country.name}`}
                      primary={heldInGhs || !demo.hydrated ? primary : undefined}
                      secondary={demo.hydrated && heldInGhs ? <>wallet held in {formatGhs(demo.available)} · {country.currency} is a display estimate</> : "shared across every model"}
                      pulse={demo.hydrated && demo.available === 0}
                    />
                  </div>
                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[["Reserved", demo.reserved], ["Spent", demo.spent], ["Topped up", demo.topups]].map(([l, v]) => (
                      <div key={l as string} className="card-gold-glass rounded-xl p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-navy-foreground/60">{l as string}</p>
                        <p className="mt-1 break-words text-sm font-semibold text-navy-foreground tabular sm:text-base">{formatLocal(country, v as number) ?? formatGhs(v as number)}</p>
                        {heldInGhs && <p className="mt-0.5 break-words text-[10px] text-navy-foreground/40 tabular">{formatGhs(v as number)}</p>}
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
            {demo.phone && (
              <p className="mt-6 inline-flex max-w-full items-center gap-2 rounded-full bg-navy-foreground/10 px-3 py-1.5 text-xs text-navy-foreground">
                <Smartphone className="size-3.5 shrink-0 text-cyan" aria-hidden /> <span className="truncate">{demo.network} · {demo.phone}</span>
              </p>
            )}
            {demo.hydrated && demo.available === 0 && (
              <div className="mt-6 rounded-2xl border border-gold/40 bg-gold/10 p-4">
                <p className="font-semibold text-navy-foreground">Your balance is {formatLocal(country, 0) ?? "GHS 0.00"}</p>
                <p className="mt-1 text-sm text-navy-foreground/70">Requests are blocked at zero balance. Add funds below to unlock every model.</p>
              </div>
            )}
            <div className="mt-6 flex flex-wrap gap-2">
              <Button asChild size="sm" className="bg-gold text-gold-foreground hover:bg-gold-bright"><Link to="/developers">Spend in developer studio <ArrowRight /></Link></Button>
              <Button size="sm" variant="outline" className="border-navy-foreground/25 bg-transparent text-navy-foreground hover:bg-navy-foreground/10 hover:text-navy-foreground" onClick={resetAll}>
                <RotateCcw /> Reset demo
              </Button>
            </div>
          </div>

          {/* Flow */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <ol className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider">
              {["Link number", "Top up"].map((l, i) => (
                <li key={l} className={cn("flex items-center gap-2", step === i + 1 ? "text-foreground" : "text-muted-foreground")}>
                  <span className={cn("grid size-6 place-items-center rounded-full text-[11px]", step > i + 1 ? "bg-success text-success-foreground" : step === i + 1 ? "bg-navy text-navy-foreground" : "bg-muted")}>{step > i + 1 ? <CheckCircle2 className="size-4" /> : i + 1}</span>
                  {l}
                  {i === 0 && <span className="mx-1 h-px w-6 bg-border" aria-hidden />}
                </li>
              ))}
            </ol>

            {step === 1 ? (
              <form onSubmit={link} className="mt-6 space-y-5">
                <div>
                  <label htmlFor="country" className="text-sm font-medium">Country</label>
                  <div className="relative mt-1.5">
                    <Globe2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <select
                      id="country"
                      value={country.code}
                      onChange={(e) => pickCountry(e.target.value)}
                      className="h-11 w-full appearance-none rounded-lg border border-input bg-background pl-9 pr-8 text-base outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.name} ({c.dial}){c.status === "planned" ? " · planned" : " · launch market"}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">▾</span>
                  </div>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className={cn("rounded-full px-2 py-0.5 font-semibold", country.status === "launch" ? "bg-electric/10 text-electric" : "bg-gold/15 text-gold-foreground")}>{country.status === "launch" ? "Launch market" : "Illustrative · planned"}</span>
                    <span>{country.region} Africa · wallet held in GHS{country.currency !== "GHS" ? ` · ${country.currency} est.` : ""}</span>
                  </p>
                  {country.status === "planned" && <p className="mt-1.5 text-xs text-muted-foreground">{country.name} is shown for illustration and planned for a later phase, subject to local validation. {FX_NOTE}</p>}
                </div>
                <div>
                  <label htmlFor="phone" className="text-sm font-medium">{country.name} mobile number</label>
                  <div className="mt-1.5 flex rounded-lg border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
                    <span className="inline-flex items-center border-r border-input px-3 text-sm text-muted-foreground tabular">{country.dial}</span>
                    <input id="phone" inputMode="tel" autoComplete="tel-national" placeholder={country.example} value={phone} onChange={(e) => { setPhone(e.target.value); setOperator(null); }} className="h-11 min-w-0 flex-1 bg-transparent px-3 text-base outline-none" />
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {country.digits}-digit number{country.leadingZero ? " starting with 0" : ""}. {detected && !operator && <>Detected <strong>{detected.name}</strong>.</>}
                  </p>
                </div>
                <fieldset>
                  <legend className="text-sm font-medium">Operator</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {country.operators.map((n) => (
                      <button key={n.id} type="button" onClick={() => setOperator(n)} aria-pressed={op?.id === n.id} className={cn("rounded-xl border px-2 py-3 text-center transition-colors", op?.id === n.id ? "border-electric bg-accent" : "border-border hover:border-electric/40")}>
                        <span className="block text-sm font-semibold leading-tight">{n.name}</span>
                        <span className="block text-[11px] text-muted-foreground">{n.prefixes.length ? "Auto-detected" : "App wallet"}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <Button type="submit" size="lg" disabled={!phoneOk || !op} className="w-full bg-navy text-navy-foreground hover:bg-navy/90">Link number (demo)</Button>
              </form>
            ) : (
              <form onSubmit={topUp} className="mt-6 space-y-5">
                <div>
                  <p className="text-sm font-medium">Amount</p>
                  <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Quick amounts">
                    {PRESETS.map((p) => (
                      <button key={p} type="button" onClick={() => { setAmount(p); setCustom(""); }} aria-pressed={!custom && amount === p} className={cn("rounded-full border px-4 py-2 text-sm font-medium tabular", !custom && amount === p ? "border-navy bg-navy text-navy-foreground" : "border-border hover:border-electric/40")}>{formatGhs(p).replace(".00", "")}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="custom" className="text-sm font-medium">Or enter an amount (GHS)</label>
                  <input id="custom" type="number" inputMode="decimal" min={1} max={5000} step="0.01" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="e.g. 35" className="mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                  <p className="mt-1.5 text-xs text-muted-foreground">Minimum GHS 1.00 · maximum GHS 5,000.00 per top-up (demo limits).</p>
                </div>
                <div className="rounded-xl bg-muted p-4 text-sm">
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Paying from</span><span className="truncate text-right font-medium">{demo.network} · {demo.phone}</span></div>
                  <div className="mt-1 flex justify-between gap-3"><span className="text-muted-foreground">Wallet credit</span><span className="font-semibold tabular">{amountOk ? formatGhs(pesewas) : "—"}</span></div>
                  {local && <div className="mt-1 flex justify-between gap-3"><span className="text-muted-foreground">You would pay (est., not a live rate)</span><span className="tabular">{local}</span></div>}
                  <div className="mt-1 flex justify-between gap-3"><span className="text-muted-foreground">Fees</span><span className="text-right">Shown at checkout in production · none in demo</span></div>
                </div>
                <fieldset className="rounded-xl border border-dashed border-gold/50 p-3">
                  <legend className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Demo control · simulate the payer&apos;s response</legend>
                  <div className="grid grid-cols-3 gap-2" role="group" aria-label="Simulated outcome">
                    {([["approve", "Approve", CheckCircle2], ["decline", "Decline", XCircle], ["timeout", "Time out", Clock]] as const).map(([k, l, Icon]) => (
                      <button key={k} type="button" onClick={() => setOutcome(k)} aria-pressed={outcome === k} disabled={stage !== "idle" && stage !== "failed"} className={cn("inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-colors disabled:opacity-50", outcome === k ? "border-navy bg-navy text-navy-foreground" : "border-border hover:border-electric/40")}>
                        <Icon className="size-3.5" aria-hidden /> {l}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">Shows how the wallet behaves when a real prompt is approved, declined or expires. Only an approved payment ever credits the ledger.</p>
                </fieldset>
                <Button ref={payBtnRef} type="submit" size="lg" disabled={!amountOk || (stage !== "idle" && stage !== "failed")} className="w-full bg-gold text-gold-foreground shadow-gold-glow hover:bg-gold-bright">
                  {stage === "requested" ? <><Loader2 className="animate-spin" /> Creating payment request…</> : stage === "prompt" ? <><Smartphone className="animate-pulse" /> Waiting for approval on your phone…</> : stage === "done" ? <><CheckCircle2 /> Credited</> : stage === "failed" ? <><RotateCcw /> Try again</> : `Top up ${amountOk ? formatGhs(pesewas) : ""} (demo)`}
                </Button>

                {intent && stage !== "idle" && (
                  <div role="status" aria-live="polite" className={cn("animate-fade-in rounded-2xl border p-4 text-sm", stage === "done" ? "border-success/40 bg-success/10" : stage === "failed" ? "border-destructive/40 bg-destructive/10" : "border-electric/30 bg-accent")}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {stage === "requested" && "Payment request created"}
                          {stage === "prompt" && `Approve on your ${demo.network?.split(" · ")[0]} handset`}
                          {stage === "done" && `Top-up credited · available ${formatGhs(demo.available)}`}
                          {stage === "failed" && `${STATUS_LABEL[intent.status]} · wallet not charged`}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{stage === "failed" ? intent.reason : stage === "done" ? `Provider ref ${intent.financialTransactionId} · one ledger credit posted` : "In production a PIN prompt would appear on the handset. Nothing is sent in demo mode."}</p>
                      </div>
                      <span className="shrink-0 rounded-md bg-background/70 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">{intent.externalId}</span>
                    </div>
                    <ol className="mt-3 grid grid-cols-3 gap-1 text-[10px] font-semibold uppercase tracking-wider">
                      {[["Requested", true], ["Payer prompt", stage !== "requested"], [stage === "failed" ? STATUS_LABEL[intent.status] : "Credited", stage === "done" || stage === "failed"]].map(([l, on], i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span className={cn("h-1 flex-1 rounded-full transition-colors duration-500", on ? (stage === "failed" && i === 2 ? "bg-destructive" : "bg-success") : "bg-border")} aria-hidden />
                          <span className={cn("truncate", on ? "text-foreground" : "text-muted-foreground")}>{l as string}</span>
                        </li>
                      ))}
                    </ol>
                    {stage === "done" && <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"><ShieldCheck className="size-3.5 text-success" aria-hidden /> Duplicate callbacks for this reference are ignored — the wallet can never be credited twice.</p>}
                  </div>
                )}
                <button type="button" onClick={resetAll} className="text-xs text-muted-foreground underline-offset-4 hover:underline">Reset demo and use a different number or country</button>
              </form>
            )}
          </div>
        </div>
      </Section>

      <Section>
        <SectionHead eyebrow="Coverage" title="One wallet, the rails Africa already uses" body="The demo onboarding covers 15 countries and the operators people actually pay with. Coverage shown is design intent for the simulation, not a live integration list." />
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rails.map((r) => (
            <div key={r.name} className="rounded-xl border border-border bg-card px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold">{r.name}</p>
                <span className="shrink-0 rounded-md bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-foreground">Demo</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{r.countries.join(" · ")}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{MOMO_DISCLAIMER}</p>
      </Section>

      <Section tone="muted">
        <SectionHead eyebrow="Activity" title="Every movement, on the record" body="Top-ups, reservations, settlements and releases are separate entries — nothing is ever silently subtracted." />
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Stat label="Available" value={formatGhs(demo.available)} hint="Spendable now" />
          <Stat label="Reserved" value={formatGhs(demo.reserved)} hint="Held for in-flight jobs" />
          <Stat label="Spent" value={formatGhs(demo.spent)} hint="Actual cost settled" />
        </div>
        {demo.tx.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="font-medium">No activity yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Complete a simulated top-up above, then run a request in the developer or creative studio.</p>
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {demo.tx.slice(0, 12).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium capitalize">{t.kind === "topup" ? `Top-up · ${t.network}` : `${t.kind} · ${t.label}`}</p>
                  <p className="text-xs text-muted-foreground">{new Date(t.at).toLocaleString("en-GH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <span className={cn("shrink-0 font-semibold tabular", t.kind === "topup" || t.kind === "release" ? "text-success" : t.kind === "reserve" ? "text-muted-foreground" : "text-foreground")}>
                  {t.kind === "topup" || t.kind === "release" ? "+" : "−"}{formatGhs(t.pesewas)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
