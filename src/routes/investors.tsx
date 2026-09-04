import { pageMeta } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, ArrowRight, Smartphone, Route as RouteIcon, Wallet, Coins, ShieldCheck, Lock, Scale, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, SectionHead, DemoNotice, Feature, Eyebrow } from "@/components/site/primitives";
import { cn } from "@/lib/utils";
import { LedgerFlow } from "@/components/site/money-flow";
import { KenteBlock, KenteDivider } from "@/components/site/kente";
import { Tilt } from "@/components/site/motion";
import { motion, useReducedMotion } from "motion/react";

const TITLE = "Investors — NuruRoute";
const DESC = "The problem, the solution, the mobile-money wedge, business model, rollout roadmap and risk controls behind NuruRoute — an access, pricing, routing and wallet layer for AI in Africa.";
const SIM_URL = "https://demo.nururoute.com";

export const Route = createFileRoute("/investors")({
  head: () => pageMeta("/investors", TITLE, DESC),
  component: InvestorsPage,
});

function SimLink({ className, size = "lg" }: { className?: string; size?: "lg" | "default" }) {
  return (
    <Button asChild size={size} className={cn("bg-gold text-gold-foreground hover:bg-gold/90", className)}>
      <a href={SIM_URL} target="_blank" rel="noopener noreferrer">
        Open investor simulation <ArrowUpRight />
      </a>
    </Button>
  );
}

const ROADMAP = [
  { phase: "Phase 0 · Now", title: "Safe foundation", items: ["Immutable GHS ledger with reserve → settle → release", "Simulated payments and AI responses, automated tests", "Public demo experience (this site)"] },
  { phase: "Phase 1", title: "Ghana pilot", items: ["Mobile-money testing, then live top-ups only after regulatory and partner approval", "Provider access under approved commercial terms (none in place yet)", "Developer API and creator studio with cost caps"] },
  { phase: "Phase 2", title: "Depth", items: ["Team wallets, approvals and spend policies", "Local-language voice, dubbing and audiobooks", "Usage analytics and per-org pricing"] },
  { phase: "Phase 3", title: "West Africa", items: ["Additional mobile-money markets, each planned and subject to local validation", "Regional routing and data-residency options", "Enterprise and institutional programmes"] },
];

const RISKS = [
  { icon: <Lock />, title: "Money safety", body: "No direct balance mutation. Every top-up, hold, charge and release is recorded as a separate, unchangeable entry; duplicate payment confirmations are ignored by design." },
  { icon: <ShieldCheck />, title: "Provider exposure", body: "Provider credentials would never reach a browser. Clients always call NuruRoute, and spend is capped by a reservation before any provider would be called." },
  { icon: <Scale />, title: "Regulatory", body: "Prepaid wallet model, collection intended through appropriately licensed payment providers, and data handling designed around Ghana's data-protection principles. No approvals are held today; live money only after explicit sign-off." },
  { icon: <Activity />, title: "Margin & FX", body: "Cedi pricing is refreshed against provider cost; per-organisation prices and buffers protect margin when FX moves." },
];

function InvestorsPage() {
  return (
    <>
      <Section tone="navy" className="surface-abyss relative overflow-hidden">
        <div className="grid-fade pointer-events-none absolute inset-0" aria-hidden />
        <KenteBlock className="absolute -left-20 -bottom-24 hidden h-64 w-64 -rotate-12 opacity-70 lg:block" />
        <div className="relative grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <Eyebrow className="text-cyan">Investor brief</Eyebrow>
            <h1 className="mt-3 text-4xl font-semibold text-navy-foreground sm:text-5xl">The wallet and routing layer for AI in Africa</h1>
            <p className="mt-5 max-w-xl text-lg text-navy-foreground/80">Global AI is priced in dollars and gated by cards. NuruRoute makes it accessible, prepaid and transparent in local currency — starting with Ghana's mobile-money rails.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <SimLink />
              <Button asChild size="lg" variant="outline" className="border-navy-foreground/25 bg-transparent text-navy-foreground hover:bg-navy-foreground/10 hover:text-navy-foreground"><Link to="/wallet">Try the product demo</Link></Button>
            </div>
            <p className="mt-4 text-xs text-navy-foreground/60">The simulation opens in a new tab on an external site.</p>
          </div>
          <Tilt max={6} className="card-gold-glass rounded-3xl p-6 text-navy-foreground">
            <p className="text-xs font-semibold uppercase tracking-wider text-navy-foreground/60">At a glance</p>
            <dl className="mt-4 space-y-4 text-sm text-navy-foreground">
              {[["Model", "Prepaid GHS wallet · pay-per-use · tiered plans"], ["Wedge", "Mobile-money top-ups for AI, Ghana first"], ["Moat", "Ledger-grade trust, local pricing, routing data"], ["Stage", "Safe MVP foundation; no live money yet"]].map(([k, v]) => (
                <div key={k} className="flex gap-4"><dt className="w-16 shrink-0 text-navy-foreground/60">{k}</dt><dd className="font-medium">{v}</dd></div>
              ))}
            </dl>
            <div className="mt-6 border-t border-navy-foreground/10 pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-navy-foreground/55">The signature move · reserve → settle → release</p>
              <LedgerFlow invert className="mt-3" />
            </div>
          </Tilt>
        </div>
      </Section>
      <KenteDivider />

      <Section>
        <DemoNotice className="max-w-3xl">This page describes strategy and design intent. No customers, revenue, partnerships or financial results are claimed.</DemoNotice>
        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHead eyebrow="Problem" title="Access is the bottleneck, not intelligence" />
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              <li><strong className="text-foreground">Payment friction.</strong> Most people and small businesses in Ghana have mobile money, not an international card.</li>
              <li><strong className="text-foreground">Currency opacity.</strong> Dollar pricing per token means nobody knows what a job costs in cedis until the bill arrives.</li>
              <li><strong className="text-foreground">Fragmentation.</strong> Chat, image, video and voice live on different platforms, each with its own account and billing.</li>
              <li><strong className="text-foreground">Trust.</strong> Prepaid users need a guarantee they can never be overcharged.</li>
            </ul>
          </div>
          <div>
            <SectionHead eyebrow="Solution" title="One wallet, one gateway, transparent cedi pricing" />
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              <li><strong className="text-foreground">Local wallet.</strong> Fund in GHS with mobile money; spend across every model.</li>
              <li><strong className="text-foreground">Reserve → settle → release.</strong> Maximum cost is held first, actual cost charged, remainder returned — enforced in the ledger.</li>
              <li><strong className="text-foreground">Routing.</strong> Choose by capability, quality, speed or price; keys and providers stay behind NuruRoute.</li>
              <li><strong className="text-foreground">Studios.</strong> Developer API plus creator tools for image, video, voice, dubbing and audiobooks.</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section tone="muted">
        <SectionHead eyebrow="The MoMo wedge" title="Mobile money is the on-ramp" body="Mobile money is how Ghana pays for airtime, data and daily commerce. Making AI credit as easy to buy as airtime is the wedge — and each top-up deepens the wallet relationship." />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <Feature icon={<Smartphone />} title="Familiar" body="Top up from the phone in your hand, in amounts that fit the week's budget." />
          <Feature icon={<Wallet />} title="Sticky" body="A funded balance and history across tools makes NuruRoute the default place to run AI work." />
          <Feature icon={<RouteIcon />} title="Extensible" body="The same wallet extends to other mobile-money markets across West Africa." />
        </div>
      </Section>

      <Section>
        <SectionHead eyebrow="Business model" title="Margin on usage, plans for depth" />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <Feature icon={<Coins />} title="Usage margin" body="A spread between provider cost and the cedi price per unit, with per-organisation pricing and buffers." />
          <Feature icon={<Wallet />} title="Plans" body="Creator, Developer and Team tiers bundle wallet credit with tools, seats, limits and support (illustrative)." />
          <Feature icon={<ShieldCheck />} title="Institutional" body="Enterprise wallets for universities, banks, telcos and programmes needing controls and audit." />
        </div>
      </Section>

      <Section tone="muted">
        <SectionHead eyebrow="Rollout roadmap" title="Safe foundation first, live money only by approval" />
        <ol className="mt-10 grid gap-5 overflow-x-clip [perspective:1600px] md:grid-cols-2 xl:grid-cols-4">
          {ROADMAP.map((r, i) => (
            <RoadmapCard key={r.phase} index={i} current={i === 0}>
              <p className="text-xs font-semibold uppercase tracking-wider text-electric [li.border-gold_&]:text-gold-foreground">{r.phase}</p>
              <h3 className="mt-2 text-lg font-semibold">{r.title}</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {r.items.map((it) => <li key={it} className="flex gap-2"><ArrowRight className="mt-0.5 size-3.5 shrink-0 text-electric" aria-hidden />{it}</li>)}
              </ul>
            </RoadmapCard>
          ))}
        </ol>
      </Section>

      <Section>
        <SectionHead eyebrow="Risk controls" title="How we keep money and trust safe" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {RISKS.map((r) => <Feature key={r.title} icon={r.icon} title={r.title} body={r.body} />)}
        </div>
        <div className="surface-abyss relative mt-12 overflow-hidden rounded-3xl p-8 sm:p-12">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-3xl font-semibold text-navy-foreground">See the numbers move</h2>
              <p className="mt-2 max-w-xl text-navy-foreground/75">The investor simulation lets you adjust assumptions and watch the wallet economics respond. It is a model, not a forecast.</p>
            </div>
            <SimLink />
          </div>
        </div>
      </Section>
    </>
  );
}


function RoadmapCard({ index, current, children }: { index: number; current: boolean; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, rotateY: -35, x: 24 }}
      whileInView={{ opacity: 1, rotateY: 0, x: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ type: "spring", stiffness: 90, damping: 18, delay: index * 0.12 }}
      className={cn("relative rounded-2xl border p-6 [transform-style:preserve-3d]", current ? "border-gold bg-gold/10 ring-gold-glow" : "border-border bg-card")}
    >
      <span className="absolute -top-3 left-6 grid size-7 place-items-center rounded-full bg-navy font-display text-xs font-bold text-gold" aria-hidden>{index + 1}</span>
      {children}
    </motion.li>
  );
}
