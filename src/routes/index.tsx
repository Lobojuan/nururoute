import { pageMeta } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  Wallet,
  Route as RouteIcon,
  ShieldCheck,
  Coins,
  Code2,
  GraduationCap,
  Store,
  Megaphone,
  FlaskConical,
  Clapperboard,
  Smartphone,
  Lock,
  Image as ImageIcon,
  Film,
  Mic,
  Languages,
  BookOpenText,
  TerminalSquare,
  Check,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, SectionHead, Eyebrow, Feature, DemoBadge, DemoNotice, Stat } from "@/components/site/primitives";
import { Reveal, Item, CountUp, Marquee, Aurora, motion, KineticWords, ParallaxLayer, ScrollProgress, ScrollMoneyJourney, Tilt } from "@/components/site/motion";
import { Carousel3D } from "@/components/site/carousel-3d";
import { HeroMoney } from "@/components/site/hero-money";
import { AfricaHeartbeat } from "@/components/site/heartbeat";
import { CediCoin } from "@/components/site/cedi";
import { Adinkra, KenteBlock, KenteDivider } from "@/components/site/kente";
import { formatGhs, useDemo } from "@/lib/demo";
import { CATEGORIES, byCategory, ROUTING_TARGETS, ROUTING_DISCLAIMER, usePublishedPrices, type Category } from "@/lib/catalog";

const TITLE = "NuruRoute — AI for Africa, paid with mobile money";
const DESC =
  "One mobile-money wallet, pay-as-you-go access to global AI for chat, coding, image, video, voice, dubbing and audiobooks. No credit card needed. Ghana-first, Africa-ready. Public demo.";

export const Route = createFileRoute("/")({
  head: () => pageMeta("/", TITLE, DESC, { card: "summary_large_image" }),
  component: Landing,
});

const AUDIENCES = [
  { icon: <Code2 />, title: "Developers", body: "Route to OpenAI, Claude Code, Codex, Grok or Kimi K3 from one wallet and one key. Reserve the maximum, pay the actual." },
  { icon: <GraduationCap />, title: "Students", body: "Top up GHS 5 with mobile money and study with a tutor-grade model — no card needed." },
  { icon: <Store />, title: "SMEs", body: "Write product copy, answer customers and design flyers from one prepaid balance you control." },
  { icon: <Megaphone />, title: "Agencies", body: "Run client campaigns across image, video, voice and dubbing with per-project cost visibility." },
  { icon: <FlaskConical />, title: "Researchers", body: "Compare models side by side with transparent per-token pricing in local currency." },
  { icon: <Clapperboard />, title: "Creators", body: "Dub, narrate and storyboard in local languages, with the cost shown before you press generate." },
];

const STUDIOS: { id: Category; icon: ReactNode; title: string; blurb: string; from: string; hue: string }[] = [
  { id: "Chat & Coding", icon: <TerminalSquare />, title: "Coding & agents", blurb: "Claude Code, Codex, Grok, Kimi K3 — one wallet.", from: "from-electric/70 to-navy", hue: "text-cyan" },
  { id: "Image", icon: <ImageIcon />, title: "Image studio", blurb: "Campaign visuals, product shots, typography.", from: "from-gold/70 to-navy", hue: "text-gold" },
  { id: "Video", icon: <Film />, title: "Video studio", blurb: "Cinematic ads with camera control.", from: "from-cyan/70 to-navy", hue: "text-cyan" },
  { id: "Voice", icon: <Mic />, title: "Voice studio", blurb: "Ghanaian English, Twi, Hausa, Swahili narration.", from: "from-electric/60 to-navy-deep", hue: "text-electric" },
  { id: "Dubbing", icon: <Languages />, title: "Dubbing", blurb: "Re-voice a film into local languages.", from: "from-gold/60 to-navy-deep", hue: "text-gold" },
  { id: "Audiobooks", icon: <BookOpenText />, title: "Audiobooks", blurb: "Long-form multi-voice narration.", from: "from-cyan/60 to-navy-deep", hue: "text-cyan" },
];

const RAILS = [
  { name: "MTN MoMo", where: "Ghana · Nigeria · Uganda · Rwanda · Cameroon · Zambia · Benin", status: "Demo" },
  { name: "M-Pesa", where: "Kenya · Tanzania · Mozambique · Ethiopia", status: "Demo" },
  { name: "Airtel Money", where: "Kenya · Tanzania · Uganda · Rwanda · Zambia · Malawi", status: "Demo" },
  { name: "Orange Money", where: "Côte d'Ivoire · Senegal · Cameroon", status: "Demo" },
  { name: "Wave", where: "Senegal · Côte d'Ivoire", status: "Demo" },
  { name: "telebirr", where: "Ethiopia", status: "Demo" },
  { name: "OPay · PalmPay", where: "Nigeria", status: "Demo" },
  { name: "Telecel Cash · AirtelTigo", where: "Ghana", status: "Demo" },
];

function Landing() {
  usePublishedPrices();
  const { available, hydrated } = useDemo();
  const [studio, setStudio] = useState<Category>("Video");
  const active = STUDIOS.find((s) => s.id === studio) ?? STUDIOS[0]!;

  return (
    <>
      <ScrollProgress />
      {/* Hero — kinetic bold */}
      <section className="surface-abyss relative overflow-hidden">
        <Aurora className="opacity-60" />
        <ParallaxLayer depth={-28} className="absolute -left-24 -top-24 hidden lg:block"><KenteBlock className="h-72 w-72 rotate-12" /></ParallaxLayer>
        <ParallaxLayer depth={-18} className="absolute -bottom-28 -right-20 hidden lg:block"><KenteBlock className="h-80 w-80 -rotate-6" /></ParallaxLayer>
        {/* Giant ghost word behind the fold line */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-2 hidden select-none overflow-hidden lg:block">
          <motion.p
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="whitespace-nowrap text-center font-display text-[9.5rem] font-extrabold uppercase leading-none tracking-tight text-stroke-faint"
          >
            Money moves
          </motion.p>
        </div>

        <div className="container-site relative pb-12 pt-16 lg:pt-24">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="flex flex-wrap items-center gap-2">
            <DemoBadge />
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-navy-foreground/70"><Adinkra name="sun" className="size-3.5 text-gold" /> Ghana-first · Africa-ready</span>
          </motion.div>

          {/* Monumental headline + intro */}
          <div className="mt-10 grid items-end gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-14">
            <h1 className="display-editorial text-[16vw] text-navy-foreground sm:text-7xl lg:text-[5.4rem] xl:text-[6.6rem]">
              <KineticWords text="Money moves." delay={0.1} />
              <span className="block"><KineticWords text="AI answers." delay={0.4} wordClassName={() => "text-gold-sheen"} /></span>
            </h1>
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}>
              <p className="max-w-xl text-lg leading-relaxed text-navy-foreground/80">
                Most of Africa has no credit card — but has a phone with mobile money. NuruRoute turns that
                balance into pay-as-you-go access to the world's best AI: coding agents, image, video, voice,
                dubbing and audiobooks. The cost is shown in your currency before every job.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 bg-gold px-6 text-base font-semibold text-gold-foreground shadow-gold-glow hover:bg-gold-bright">
                  <Link to="/wallet">
                    Top up with MoMo (demo) <ArrowRight />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 border-navy-foreground/25 bg-transparent px-6 text-base text-navy-foreground hover:bg-navy-foreground/10 hover:text-navy-foreground">
                  <Link to="/studio">Open the creative studio</Link>
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Wallet visual + stat rail */}
          <div className="mt-12 grid items-center gap-10 lg:mt-16 lg:grid-cols-[1fr_1.05fr] lg:gap-12">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.5, ease: [0.22, 1, 0.36, 1] }} className="order-2 lg:order-1">
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-navy-foreground/70">
                <li className="inline-flex items-center gap-2"><CreditCard className="size-4 text-cyan" aria-hidden /> No credit card. Ever.</li>
                <li className="inline-flex items-center gap-2"><Smartphone className="size-4 text-cyan" aria-hidden /> MoMo · M-Pesa · Airtel Money · Wave · 15 countries (demo)</li>
                <li className="inline-flex items-center gap-2"><Lock className="size-4 text-cyan" aria-hidden /> Provider keys never leave our servers</li>
              </ul>
              <div className="mt-8 grid grid-cols-1 gap-5 border-t border-navy-foreground/15 pt-6 sm:grid-cols-3">
                <div className="stat-rail relative">
                  <CediCoin size={20} className="absolute -top-1 right-0" />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-navy-foreground/55">Available</p>
                  <p className="mt-1 font-display text-xl font-semibold text-gold tabular">{hydrated ? formatGhs(available) : "GHS —"}</p>
                </div>
                <div className="stat-rail" style={{ borderLeftColor: "oklch(0.8 0.13 210 / 0.5)" }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-navy-foreground/55">Reserve → Settle</p>
                  <p className="mt-1 font-display text-xl font-semibold text-cyan">Max, then actual</p>
                </div>
                <div className="stat-rail" style={{ borderLeftColor: "oklch(0.6 0.14 150 / 0.55)" }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-navy-foreground/55">Release</p>
                  <p className="mt-1 font-display text-xl font-semibold text-kente-green">Unused returns</p>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.96, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }} className="relative order-1 w-full lg:order-2">
              <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-gold/25 via-transparent to-cyan/20 blur-3xl" aria-hidden />
              <ParallaxLayer depth={14}><HeroMoney className="relative" /></ParallaxLayer>
            </motion.div>
          </div>
        </div>

        <KenteDivider />

        {/* Price ticker tape */}
        <div className="relative py-5">
          <Marquee
            speed={34}
            items={[
              ...CATEGORIES.map((c) => {
                const list = byCategory(c);
                const cheapest = Math.min(...list.map((m) => m.pesewas));
                return (
                  <span key={c} className="inline-flex items-center gap-2 text-sm font-medium text-navy-foreground/85">
                    <CediCoin size={14} />
                    <span className="font-display font-semibold text-navy-foreground">{c}</span>
                    <span className="tabular text-gold">from {formatGhs(cheapest)}</span>
                    <span className="text-navy-foreground/50">/ {list[0]?.unit}</span>
                    <span className="ml-4 text-gold/40" aria-hidden>◆</span>
                  </span>
                );
              }),
              ...ROUTING_TARGETS.slice(0, 4).map((t) => (
                <span key={t} className="inline-flex items-center gap-2 text-sm text-navy-foreground/60">
                  <span className="size-1.5 rounded-full bg-cyan" aria-hidden /> {t}
                  <span className="ml-4 text-gold/40" aria-hidden>◆</span>
                </span>
              )),
            ]}
          />
          <p className="container-site mt-3 text-[11px] text-navy-foreground/45">Simulated prices, shown before every job. {ROUTING_DISCLAIMER}</p>
        </div>
      </section>

      {/* Numbers strip */}
      <Section className="!py-10">
        <Reveal className="grid gap-6 sm:grid-cols-3">
          {[
            { v: 5, prefix: "GHS ", suffix: "", label: "Minimum top-up — the price of a sachet of data" },
            { v: 8, prefix: "", suffix: "+", label: "Global AI tools routed through one local wallet" },
            { v: 0, prefix: "", suffix: " cards", label: "needed. Mobile money is the account" },
          ].map((s) => (
            <Item key={s.label} className="rounded-2xl border border-border bg-card p-6">
              <p className="font-display text-4xl font-semibold text-navy">
                <CountUp to={s.v} prefix={s.prefix} suffix={s.suffix} />
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
            </Item>
          ))}
        </Reveal>
      </Section>

      {/* Live Africa heartbeat */}
      <Section tone="navy" className="relative overflow-hidden">
        <KenteBlock className="absolute -right-24 -top-24 hidden h-64 w-64 rotate-12 opacity-60 lg:block" />
        <SectionHead invert eyebrow="Live across Africa" title="One heartbeat, fifteen countries" body="A simulated feed of what the platform is built to do: local top-ups, reserved holds, settled jobs and released change — Accra first, the continent next." />
        <AfricaHeartbeat className="mt-10" />
      </Section>

      {/* Scroll-driven money journey */}
      <Section tone="navy" className="surface-aurora relative overflow-hidden">
        <SectionHead invert align="center" eyebrow="Follow the cedi" title="Scroll, and watch one cedi do its job" body="Reserve the maximum, run the job, settle the actual cost and release the rest — nothing is ever silently subtracted. Illustrative demo figures." />
        <ScrollMoneyJourney className="mt-2" />
      </Section>

      {/* 3D studio carousel */}
      <Section tone="navy" className="overflow-hidden">
        <SectionHead invert align="center" eyebrow="Pick a studio" title="Spin the ring. Every studio, one balance." body="Drag or use the arrows. Each card is a professional workspace priced in your local currency before you generate." />
        <div className="mt-10">
          <Carousel3D
            selected={studio}
            onSelect={(id) => setStudio(id as Category)}
            cardWidth={280}
            cardHeight={340}
            items={STUDIOS.map((s) => ({
              id: s.id,
              label: s.title,
              node: (
                <div className={`flex h-full w-full flex-col justify-between bg-gradient-to-br ${s.from} p-6 text-navy-foreground`}>
                  <div className="flex items-center justify-between">
                    <span className={`grid size-11 place-items-center rounded-xl bg-navy-foreground/10 ${s.hue} [&>svg]:size-6`}>{s.icon}</span>
                    <DemoBadge />
                  </div>
                  <div>
                    <p className="font-display text-2xl font-semibold">{s.title}</p>
                    <p className="mt-2 text-sm text-navy-foreground/75">{s.blurb}</p>
                    <p className="mt-4 text-xs text-navy-foreground/60">
                      From <span className="font-semibold text-navy-foreground tabular">{formatGhs(Math.min(...byCategory(s.id).map((m) => m.pesewas)))}</span> per {byCategory(s.id)[0]?.unit}
                    </p>
                  </div>
                </div>
              ),
            }))}
          />
        </div>
        <div className="mx-auto mt-8 flex max-w-xl flex-col items-center gap-3 text-center">
          <p className="text-navy-foreground/80">
            <span className="font-semibold text-navy-foreground">{active.title}</span> — {active.blurb}
          </p>
          <Button asChild className="bg-gold text-gold-foreground hover:bg-gold/90">
            {active.id === "Chat & Coding" ? (
              <Link to="/developers">
                Open {active.title.toLowerCase()} <ArrowRight />
              </Link>
            ) : (
              <Link to="/studio" search={{ tab: active.id }}>
                Open {active.title.toLowerCase()} <ArrowRight />
              </Link>
            )}
          </Button>
        </div>
      </Section>

      {/* Agency spotlight */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <Reveal>
            <Item>
              <SectionHead
                eyebrow="Agency spotlight"
                title="An Osu art director, a Monday brief, one MoMo top-up"
                body="Simulated walkthrough of how a Ghanaian advertising agency ships a campaign on NuruRoute — from storyboard to Twi dub — with every cedi visible before it is spent."
              />
            </Item>
            <ol className="mt-8 space-y-3">
              {[
                ["09:10", "Top up GHS 300 from the agency MTN MoMo line", "top_up", "+ GHS 300.00"],
                ["09:25", "Image studio: 12 product visuals for a beverage client", "settle", "GHS 10.80"],
                ["10:40", "Video studio: 15-second cinematic spot, 1080p", "settle", "GHS 63.00"],
                ["11:05", "Dubbing: re-voice the spot in Twi and Hausa", "settle", "GHS 16.20"],
                ["11:06", "Unused reservation released back to the wallet", "release", "+ GHS 9.00"],
              ].map(([t, d, kind, v]) => (
                <Item key={t}>
                  <div className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3">
                    <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">{t}</span>
                    <span className="min-w-0 flex-1 text-sm">{d}</span>
                    <span className={`shrink-0 text-sm font-semibold tabular ${kind === "settle" ? "text-foreground" : "text-cyan-foreground"}`}>{v}</span>
                  </div>
                </Item>
              ))}
            </ol>
            <Item>
              <p className="mt-4 text-xs text-muted-foreground">Illustrative timeline with demo prices. Figures are not customer results.</p>
            </Item>
          </Reveal>
          <Reveal className="relative">
            <Item>
              <Tilt max={6} className="rounded-3xl">
              <div className="relative overflow-hidden rounded-3xl border border-border bg-navy p-6 text-navy-foreground shadow-xl">
                <Aurora className="opacity-70" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-navy-foreground/60">Campaign wallet · Adinkra Creative</p>
                    <DemoBadge />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {[
                      ["Available", 21_900],
                      ["Reserved", 0],
                      ["Spent today", 90_00],
                    ].map(([l, v]) => (
                      <div key={l as string} className="rounded-xl bg-navy-foreground/5 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-navy-foreground/60">{l}</p>
                        <p className="mt-1 text-lg font-semibold tabular">{formatGhs(v as number)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    {["Beverage · KV 01", "Beverage · KV 02", "Spot · 15s"].map((t, i) => (
                      <motion.div
                        key={t}
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + i * 0.15 }}
                        className={`aspect-[4/5] rounded-xl bg-gradient-to-br ${i === 2 ? "from-cyan/40 to-electric/30" : "from-gold/40 to-navy-foreground/10"} p-3`}
                      >
                        <p className="text-[10px] font-medium text-navy-foreground/80">{t}</p>
                        <p className="mt-auto text-[10px] text-navy-foreground/60">Simulated preview</p>
                      </motion.div>
                    ))}
                  </div>
                  <ul className="mt-5 space-y-1.5 text-xs text-navy-foreground/75">
                    {["Every job reserved before the provider is called", "Client-ready cost sheet exported in GHS", "Twi & Hausa dubs reviewed before delivery"].map((x) => (
                      <li key={x} className="flex items-center gap-2"><Check className="size-3.5 text-cyan" aria-hidden /> {x}</li>
                    ))}
                  </ul>
                </div>
              </div>
              </Tilt>
            </Item>
          </Reveal>
        </div>
      </Section>

      {/* Value props */}
      <Section tone="muted">
        <SectionHead
          eyebrow="Why NuruRoute"
          title="Not just a chatbot — the layer between Africa and global AI"
          body="Global AI tools assume a credit card, a dollar balance and a fast connection. NuruRoute replaces those assumptions with a local wallet, transparent local pricing and smart routing."
        />
        <Reveal className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Item><Feature icon={<Wallet />} title="Local wallet" body="One prepaid balance funded by mobile money. Available, reserved and spent are always visible." /></Item>
          <Item><Feature icon={<Coins />} title="Transparent pricing" body="Every model shows an estimated local-currency cost before you run it. No surprise bills, no FX maths." /></Item>
          <Item><Feature icon={<RouteIcon />} title="Smart routing" body="Pick by capability, quality, speed or price — or let NuruRoute route to the best fit for the job." /></Item>
          <Item><Feature icon={<ShieldCheck />} title="Trusted access" body="Reserve → settle → release means you can never overspend. Provider keys stay server-side." /></Item>
        </Reveal>
      </Section>

      {/* Pan-African rails */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionHead
              eyebrow="Pay as you go, across Africa"
              title="Fund it like airtime. Spend it like a pro."
              body="No subscriptions required. Top up any amount from GHS 5 on the rails people already use, and only the actual cost of each job leaves your wallet."
            />
            <ol className="mt-8 space-y-4">
              {[
                ["Top up", "Send money from your mobile-money wallet to your NuruRoute balance."],
                ["See the estimate", "Choose a model; the maximum cost is shown in your currency before you confirm."],
                ["Reserve", "That maximum is held so the request can never push you below zero."],
                ["Settle & release", "The actual cost is charged and any unused hold returns immediately."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-navy text-sm font-semibold text-navy-foreground">{i + 1}</span>
                  <div>
                    <p className="font-semibold">{t}</p>
                    <p className="text-sm text-muted-foreground">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Button asChild className="mt-8 bg-electric text-electric-foreground hover:bg-electric/90">
              <Link to="/wallet">Try a simulated top-up <ArrowRight /></Link>
            </Button>
          </div>
          <div>
            <Reveal className="grid gap-3 sm:grid-cols-2">
              {RAILS.map((r) => (
                <Item key={r.name}>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{r.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.where}</p>
                    </div>
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${r.status === "Demo" ? "bg-gold/15 text-gold-foreground" : "bg-muted text-muted-foreground"}`}>{r.status}</span>
                  </div>
                </Item>
              ))}
            </Reveal>
            <p className="mt-3 text-xs text-muted-foreground">Rails shown as simulated onboarding intent across 15 African countries. No live payment integration exists on this site.</p>
            <div className="mt-6 grid gap-3 grid-cols-3">
              <Stat label="Available" value="GHS 19.91" hint="Ready" />
              <Stat label="Reserved" value="GHS 0.00" hint="Held" />
              <Stat label="Spent" value="GHS 0.09" hint="Settled" />
            </div>
          </div>
        </div>
      </Section>

      {/* Catalogue teaser */}
      <Section tone="muted">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHead eyebrow="Model catalogue" title="Six categories. One balance." body="Simulated provider cards with capability, quality, speed and estimated GHS cost." />
          <Button asChild variant="outline"><Link to="/models">See all models <ArrowRight /></Link></Button>
        </div>
        <Reveal className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c) => {
            const list = byCategory(c);
            const cheapest = Math.min(...list.map((m) => m.pesewas));
            return (
              <Item key={c}>
                <Link to="/models" search={{ category: c }} className="group block rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-electric/50 hover:shadow-lg">
                  <p className="font-display text-lg font-semibold">{c}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{list.length} simulated models</p>
                  <p className="mt-4 text-sm">
                    From <span className="font-semibold tabular">{formatGhs(cheapest)}</span>{" "}
                    <span className="text-muted-foreground">{list[0] ? `per ${list[0].unit}` : ""}</span>
                  </p>
                </Link>
              </Item>
            );
          })}
        </Reveal>
      </Section>

      {/* Audiences */}
      <Section tone="navy">
        <SectionHead invert eyebrow="Built for" title="Whoever you are, the wallet is the same" body="From a student in Tamale to an agency in Osu to a developer in Nairobi, everyone gets the same transparent access." />
        <Reveal className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {AUDIENCES.map((a) => (
            <Item key={a.title}><Feature invert icon={a.icon} title={a.title} body={a.body} /></Item>
          ))}
        </Reveal>
      </Section>

      {/* CTA */}
      <Section>
        <div className="rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <Eyebrow>Get started</Eyebrow>
              <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Explore the demo, then talk to us.</h2>
              <p className="mt-3 max-w-xl text-muted-foreground">Walk through the wallet, catalogue, studios and organisation console. Everything is simulated so you can explore freely.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-navy text-navy-foreground hover:bg-navy/90"><Link to="/wallet">Open wallet demo</Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/investors">For investors</Link></Button>
            </div>
          </div>
          <DemoNotice className="mt-8" />
        </div>
      </Section>
    </>
  );
}
