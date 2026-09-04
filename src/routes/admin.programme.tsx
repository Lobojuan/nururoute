import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { ArrowRight, BadgeCheck, Building2, Code2, FlaskConical, Store, ShieldCheck, Wallet, Gauge, Sparkles, Send, Users, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KenteDivider, Adinkra } from "@/components/site/kente";
import { Reveal, Item, Tilt, CountUp, Float, motion, TickingMoney } from "@/components/site/motion";
import { LedgerFlow } from "@/components/site/money-flow";
import { INVITES, PILOT_LABEL, PROMO_CREDITS, usePilotStore, type PilotApplication } from "@/lib/pilot-demo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/programme")({
  component: ProgrammePage,
});

const TRACKS: { id: PilotApplication["track"]; label: string; icon: typeof Code2; who: string; fit: string; cap: string }[] = [
  { id: "agency", label: "Creative agencies", icon: Building2, who: "Ghana-registered agencies producing campaign copy, visuals and voice work.", fit: "3–10 seats · Image, video & voice studios", cap: "GHS 500 org / day" },
  { id: "developer", label: "Independent developers", icon: Code2, who: "Builders shipping local products who need metered access without a foreign card.", fit: "1–2 seats · Developer console & text models", cap: "GHS 60 user / day" },
  { id: "research", label: "University research", icon: FlaskConical, who: "Departments and labs running language, health or agri research with local data.", fit: "5–15 seats · Text & speech models", cap: "GHS 400 user / month" },
  { id: "sme", label: "SMEs & traders", icon: Store, who: "Small businesses using AI for customer replies, pricing sheets and translations.", fit: "1–6 seats · Chat lite & translation", cap: "GHS 25 per request" },
];

const ELIGIBILITY = [
  { ok: true, text: "Based in Ghana (launch market); other African markets join in later cohorts." },
  { ok: true, text: "Able to fund a wallet through mobile money once a licensed partner is live." },
  { ok: true, text: "A named owner who accepts the pilot terms and the spend caps." },
  { ok: true, text: "Willing to share honest feedback every fortnight." },
  { ok: false, text: "Not eligible: regulated financial advice, surveillance, or content for minors." },
  { ok: false, text: "Not eligible: resale of raw model access to third parties." },
];

const STEPS = [
  { n: "01", title: "Apply", body: "Tell us who you are, what you want to build and the monthly budget you expect.", icon: Send },
  { n: "02", title: "Review", body: "We check eligibility, pick a cohort and set your caps. Typical turnaround: five working days.", icon: ShieldCheck },
  { n: "03", title: "Invite code", body: "Approved teams receive an invite code and a welcome credit. Nothing is charged until you top up.", icon: BadgeCheck },
  { n: "04", title: "Build with caps on", body: "Every request reserves, settles and releases against your wallet — visible line by line.", icon: Wallet },
];

const COUNTRIES = ["Ghana", "Nigeria", "Kenya", "Tanzania", "Côte d'Ivoire", "Senegal", "Rwanda", "Uganda"];

function ProgrammePage() {
  const { state, applyToPilot, setApplicationStatus } = usePilotStore();
  const seats = useMemo(() => INVITES.reduce((a, i) => ({ total: a.total + i.seats, used: a.used + i.used }), { total: 0, used: 0 }), []);

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">
      {/* Hero */}
      <section className="surface-abyss relative isolate overflow-hidden px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:px-8" aria-labelledby="prog-h1">
        <div className="kente-weave absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(70%_60%_at_70%_40%,black,transparent)]" aria-hidden />
        <div className="grain absolute inset-0 -z-10 opacity-30" aria-hidden />
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
              <CircleDot className="size-3 animate-pulse" aria-hidden /> Closed pilot · cohort 1 · simulated
            </p>
            <h1 id="prog-h1" className="mt-5 font-display text-4xl font-semibold leading-[1.02] text-navy-foreground sm:text-5xl lg:text-6xl">
              The NuruRoute <span className="text-gold-sheen">pilot programme</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-navy-foreground/75 sm:text-lg">
              Twenty-nine seats. Four cohorts. Local-currency wallets with hard spend caps, and a ledger you can read line by line. Built in Accra for teams who want AI that bills like a tro-tro fare, not a foreign subscription.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#apply"><Button size="lg" className="bg-gold text-gold-foreground hover:bg-gold-bright">Apply for a seat <ArrowRight className="size-4" aria-hidden /></Button></a>
              <a href="#eligibility"><Button size="lg" variant="outline" className="border-navy-foreground/25 bg-transparent text-navy-foreground hover:bg-navy-foreground/10 hover:text-navy-foreground">Check eligibility</Button></a>
            </div>
            <p className="mt-4 text-xs text-navy-foreground/55">{PILOT_LABEL} Applications on this screen are stored in this browser only.</p>
          </Reveal>

          <div className="relative">
            <Float amplitude={8}>
              <Tilt className="card-gold-glass rounded-3xl p-6 text-navy-foreground" max={6}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-widest text-navy-foreground/60">Seats this cohort</span>
                  <Adinkra name="ring" className="size-5 text-gold" />
                </div>
                <p className="mt-2 font-display text-5xl font-semibold tabular"><CountUp to={seats.used} /> <span className="text-2xl text-navy-foreground/50">/ {seats.total}</span></p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-navy-foreground/10">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-gold via-ember to-cyan" initial={{ width: 0 }} animate={{ width: `${(seats.used / seats.total) * 100}%` }} transition={{ duration: 1.4, ease: "easeOut" }} />
                </div>
                <ul className="mt-5 space-y-2 text-sm">
                  {INVITES.map((i) => (
                    <li key={i.code} className="flex items-center justify-between gap-3">
                      <span className="truncate text-navy-foreground/80">{i.label}</span>
                      <span className="shrink-0 tabular text-navy-foreground/60">{i.used}/{i.seats}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 border-t border-navy-foreground/10 pt-4">
                  <p className="text-xs uppercase tracking-widest text-navy-foreground/60">Welcome credit on approval</p>
                  <TickingMoney pesewas={2000} className="font-display text-2xl text-gold" />
                </div>
              </Tilt>
            </Float>
            <LedgerFlow className="mt-6" invert />
          </div>
        </div>
      </section>
      <KenteDivider />

      {/* Stats strip */}
      <section className="bg-navy px-4 py-8 text-navy-foreground sm:px-6 lg:px-8" aria-label="Programme at a glance">
        <Reveal className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {[
            { v: seats.total, s: "", l: "Pilot seats" },
            { v: 4, s: "", l: "Cohorts" },
            { v: 5, s: " days", l: "Review turnaround" },
            { v: 100, s: "%", l: "Requests ledgered" },
          ].map((k) => (
            <Item key={k.l}>
              <p className="font-display text-3xl font-semibold text-gold sm:text-4xl"><CountUp to={k.v} suffix={k.s} /></p>
              <p className="mt-1 text-sm text-navy-foreground/65">{k.l}</p>
            </Item>
          ))}
        </Reveal>
      </section>

      {/* Tracks */}
      <section className="adinkra-lattice px-4 py-16 sm:px-6 lg:px-8" aria-labelledby="tracks-h">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-electric">Who it is for</p>
          <h2 id="tracks-h" className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Four tracks, one wallet</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">Each track gets its own caps and studio access. Pick the one that fits — you can move tracks after the first fortnight.</p>
        </Reveal>
        <Reveal className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {TRACKS.map((t) => (
            <Item key={t.id}>
              <Tilt className="group h-full rounded-3xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-depth" max={7}>
                <div className="kente-strip-thin -mx-6 -mt-6 mb-5 rounded-t-3xl" aria-hidden />
                <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-navy text-gold"><t.icon className="size-5" aria-hidden /></span>
                <h3 className="mt-4 font-display text-lg font-semibold">{t.label}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t.who}</p>
                <dl className="mt-4 space-y-1.5 text-xs">
                  <div className="flex items-start gap-2"><Users className="mt-0.5 size-3.5 text-electric" aria-hidden /><dd>{t.fit}</dd></div>
                  <div className="flex items-start gap-2"><Gauge className="mt-0.5 size-3.5 text-electric" aria-hidden /><dd>Cap: {t.cap}</dd></div>
                </dl>
              </Tilt>
            </Item>
          ))}
        </Reveal>
      </section>

      {/* Eligibility */}
      <section id="eligibility" className="scroll-mt-24 bg-muted/40 px-4 py-16 sm:px-6 lg:px-8" aria-labelledby="elig-h">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-electric">Eligibility</p>
            <h2 id="elig-h" className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Who can join cohort 1</h2>
            <p className="mt-3 text-muted-foreground">Ghana is the launch market. We keep the pilot small on purpose so every team gets a named contact and a wallet cap that fits its work.</p>
            <div className="mt-6 rounded-3xl border border-gold/40 bg-gold/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-gold-foreground">Promotional credit preview</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {PROMO_CREDITS.map((c) => (
                  <li key={c.name} className="flex items-center justify-between gap-3"><span>{c.name}</span><span className="font-semibold tabular">GHS {c.amountGhs}</span></li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">Rules only — no credit is granted in the demo.</p>
            </div>
          </Reveal>
          <Reveal as="ul" className="grid gap-3 sm:grid-cols-2">
            {ELIGIBILITY.map((e) => (
              <Item key={e.text} className={cn("rounded-2xl border p-4 text-sm", e.ok ? "border-border bg-card" : "border-destructive/30 bg-destructive/5")}>
                <span className={cn("mb-2 inline-flex size-7 items-center justify-center rounded-full", e.ok ? "bg-kente-green/15 text-kente-green" : "bg-destructive/10 text-destructive")}>
                  {e.ok ? <BadgeCheck className="size-4" aria-hidden /> : <ShieldCheck className="size-4" aria-hidden />}
                </span>
                <p>{e.text}</p>
              </Item>
            ))}
          </Reveal>
        </div>
      </section>

      {/* How to apply — timeline */}
      <section className="surface-abyss relative overflow-hidden px-4 py-16 text-navy-foreground sm:px-6 lg:px-8" aria-labelledby="how-h">
        <div className="grain absolute inset-0 opacity-25" aria-hidden />
        <Reveal className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan">How to apply</p>
          <h2 id="how-h" className="mt-2 font-display text-3xl font-semibold sm:text-4xl">From application to first ledgered request</h2>
        </Reveal>
        <div className="perspective-1200 relative mt-10">
          <div className="absolute left-6 top-0 hidden h-full w-px bg-gradient-to-b from-gold via-cyan to-transparent lg:left-1/2 lg:block" aria-hidden />
          <ol className="grid gap-5 lg:grid-cols-2">
            {STEPS.map((s, i) => (
              <motion.li
                key={s.n}
                initial={{ opacity: 0, rotateX: -18, y: 30 }}
                whileInView={{ opacity: 1, rotateX: 0, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className={cn("card-gold-glass preserve-3d rounded-3xl p-6", i % 2 === 1 && "lg:translate-y-10")}
              >
                <div className="flex items-center gap-3">
                  <span className="font-display text-3xl font-semibold text-gold">{s.n}</span>
                  <span className="inline-flex size-9 items-center justify-center rounded-xl bg-navy-foreground/10 text-cyan"><s.icon className="size-4" aria-hidden /></span>
                  <h3 className="font-display text-lg font-semibold">{s.title}</h3>
                </div>
                <p className="mt-3 text-sm text-navy-foreground/75">{s.body}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>
      <KenteDivider thin />

      {/* Apply form + queue */}
      <section id="apply" className="scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8" aria-labelledby="apply-h">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-electric">Apply</p>
            <h2 id="apply-h" className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Request a pilot seat</h2>
            <p className="mt-2 text-sm text-muted-foreground">Simulation: this form writes to this browser's demo store so the review queue can be demonstrated. Nobody is contacted and no account is created.</p>
            <ApplyForm onSubmit={applyToPilot} />
          </Reveal>
          <Reveal>
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">Review queue</h3>
                <Sparkles className="size-4 text-gold" aria-hidden />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{state?.applications.length ?? 0} simulated application{state?.applications.length === 1 ? "" : "s"} in this browser.</p>
              <ul className="mt-4 space-y-3">
                {(state?.applications ?? []).length === 0 && <li className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">No applications yet — submit the form to see one land here with a reserve-style status flow.</li>}
                {(state?.applications ?? []).map((a) => (
                  <motion.li key={a.id} layout initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="rounded-2xl border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{a.org}</p>
                        <p className="text-xs text-muted-foreground">{a.id} · {TRACKS.find((t) => t.id === a.track)?.label} · {a.country} · GHS {a.monthlyBudgetGhs}/mo</p>
                      </div>
                      <StatusPill status={a.status} />
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{a.useCase}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(["reviewing", "approved", "waitlisted"] as const).map((st) => (
                        <button key={st} type="button" onClick={() => setApplicationStatus(a.id, st)} disabled={a.status === st} className="rounded-full border border-border px-2.5 py-1 text-xs font-medium capitalize hover:bg-muted disabled:opacity-40">{st}</button>
                      ))}
                    </div>
                  </motion.li>
                ))}
              </ul>
              <Link to="/admin/pilot" className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-electric hover:underline">Open pilot controls <ArrowRight className="size-4" aria-hidden /></Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

function StatusPill({ status }: { status: PilotApplication["status"] }) {
  const map: Record<PilotApplication["status"], string> = {
    received: "bg-muted text-foreground",
    reviewing: "bg-electric/10 text-electric",
    approved: "bg-kente-green/15 text-kente-green",
    waitlisted: "bg-gold/15 text-gold-foreground",
  };
  return <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize", map[status])}>{status}</span>;
}

function ApplyForm({ onSubmit }: { onSubmit: (a: Omit<PilotApplication, "id" | "at" | "status">) => void }) {
  const [org, setOrg] = useState("");
  const [track, setTrack] = useState<PilotApplication["track"]>("agency");
  const [country, setCountry] = useState("Ghana");
  const [useCase, setUseCase] = useState("");
  const [budget, setBudget] = useState(300);
  const [sent, setSent] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!org.trim() || !useCase.trim()) return;
    onSubmit({ org: org.trim(), track, country, useCase: useCase.trim(), monthlyBudgetGhs: budget });
    setSent(true);
    setOrg("");
    setUseCase("");
    window.setTimeout(() => setSent(false), 3500);
  }

  const input = "mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3 text-base outline-none focus:ring-1 focus:ring-ring";

  return (
    <form onSubmit={submit} className="mt-6 space-y-5 rounded-3xl border border-border bg-card p-6 shadow-sm">
      <fieldset>
        <legend className="text-sm font-medium">Track</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TRACKS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTrack(t.id)} aria-pressed={track === t.id} className={cn("flex flex-col items-start gap-1 rounded-2xl border p-3 text-left text-xs font-medium transition-all", track === t.id ? "border-gold bg-navy text-navy-foreground ring-gold-glow" : "border-border hover:bg-muted")}>
              <t.icon className={cn("size-4", track === t.id ? "text-gold" : "text-electric")} aria-hidden />
              {t.label}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="app-org" className="text-sm font-medium">Organisation</label>
          <input id="app-org" required value={org} onChange={(e) => setOrg(e.target.value)} placeholder="e.g. Osu Creative Lab" className={input} />
        </div>
        <div>
          <label htmlFor="app-country" className="text-sm font-medium">Country</label>
          <select id="app-country" value={country} onChange={(e) => setCountry(e.target.value)} className={input}>
            {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          {country !== "Ghana" && <p className="mt-1 text-xs text-gold-foreground">Cohort 1 is Ghana-only — this would be waitlisted for a later cohort.</p>}
        </div>
      </div>
      <div>
        <label htmlFor="app-use" className="text-sm font-medium">What will you build?</label>
        <textarea id="app-use" required rows={3} value={useCase} onChange={(e) => setUseCase(e.target.value)} placeholder="One or two sentences — the audience, the output and why local billing matters." className={cn(input, "h-auto py-2.5")} />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="app-budget" className="text-sm font-medium">Expected monthly budget</label>
          <span className="font-display text-lg font-semibold tabular text-electric">GHS {budget}</span>
        </div>
        <input id="app-budget" type="range" min={50} max={2000} step={50} value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="mt-2 w-full accent-[var(--gold)]" />
        <p className="mt-1 text-xs text-muted-foreground">Caps are set at or below this figure. Pilot programme hard stop: GHS 5,000 / month across all teams.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" className="bg-navy text-navy-foreground hover:bg-navy/90">Submit simulated application <Send className="size-4" aria-hidden /></Button>
        {sent && <motion.span role="status" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-1.5 text-sm font-medium text-kente-green"><BadgeCheck className="size-4" aria-hidden /> Received — it is now in the review queue.</motion.span>}
      </div>
    </form>
  );
}
