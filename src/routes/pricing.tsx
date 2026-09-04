import { pageMeta } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, SectionHead, DemoNotice, Feature } from "@/components/site/primitives";
import { cn } from "@/lib/utils";

const TITLE = "Pricing — NuruRoute";
const DESC = "Wallet credit you top up in GHS, plus illustrative Starter, Creator, Developer, Team and Enterprise tiers. All pricing on this page is illustrative.";

export const Route = createFileRoute("/pricing")({
  head: () => pageMeta("/pricing", TITLE, DESC),
  component: PricingPage,
});

const TIERS = [
  { name: "Starter", price: "GHS 0", period: "/month", who: "Students & first-time users", credit: "Pay as you go from GHS 5", features: ["All chat & coding models", "Image previews", "Standard routing", "Community support"], cta: "Start with a top-up" },
  { name: "Creator", price: "GHS 49", period: "/month", who: "Creators & freelancers", credit: "Includes GHS 40 wallet credit", features: ["Everything in Starter", "Image, voice & audiobook studios", "Priority queue", "Project history"], cta: "Choose Creator" },
  { name: "Developer", price: "GHS 99", period: "/month", who: "Builders shipping products", credit: "Includes GHS 85 wallet credit", features: ["Everything in Creator", "API keys & usage exports", "Per-model spend limits", "Email support"], cta: "Choose Developer", featured: true },
  { name: "Team", price: "GHS 349", period: "/month", who: "Agencies & SMEs", credit: "Includes GHS 300 shared credit", features: ["Everything in Developer", "Up to 10 seats, shared wallet", "Roles & approvals", "Video & dubbing studios"], cta: "Choose Team" },
  { name: "Enterprise", price: "Custom", period: "", who: "Universities, banks, telcos", credit: "Negotiated wallet terms", features: ["Everything in Team", "SSO & audit exports", "Data-residency options", "Dedicated success manager"], cta: "Talk to us" },
];

function PricingPage() {
  return (
    <>
      <Section className="pb-8">
        <SectionHead as="h1" align="center" eyebrow="Pricing" title="A wallet first. Plans when you need more." body="Every account runs on prepaid GHS credit. Plans add tools, seats and support — and bundle credit at a better rate." />
        <DemoNotice className="mx-auto mt-6 max-w-2xl">All prices, credits and tier contents on this page are illustrative and subject to change. No discounts or partner rates are claimed.</DemoNotice>
      </Section>

      <Section tone="muted" className="pt-0 sm:pt-0 lg:pt-0">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          {TIERS.map((t) => (
            <div key={t.name} className={cn("flex flex-col rounded-3xl border p-6", t.featured ? "surface-navy border-transparent text-navy-foreground shadow-xl" : "border-border bg-card shadow-sm")}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{t.name}</h2>
                {t.featured && <span className="rounded-full bg-gold px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-gold-foreground">Popular</span>}
              </div>
              <p className={cn("mt-1 text-xs", t.featured ? "text-navy-foreground/70" : "text-muted-foreground")}>{t.who}</p>
              <p className="mt-4 font-display text-3xl font-semibold tabular">{t.price}<span className={cn("text-sm font-medium", t.featured ? "text-navy-foreground/70" : "text-muted-foreground")}>{t.period}</span></p>
              <p className={cn("mt-1 text-xs font-medium", t.featured ? "text-cyan" : "text-electric")}>{t.credit}</p>
              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {t.features.map((f) => <li key={f} className="flex gap-2"><Check className={cn("mt-0.5 size-4 shrink-0", t.featured ? "text-cyan" : "text-success")} aria-hidden />{f}</li>)}
              </ul>
              <Button asChild className={cn("mt-6 w-full", t.featured ? "bg-gold text-gold-foreground hover:bg-gold/90" : "bg-navy text-navy-foreground hover:bg-navy/90")}>
                <Link to="/wallet">{t.cta}</Link>
              </Button>
              <p className={cn("mt-2 text-center text-[11px]", t.featured ? "text-navy-foreground/60" : "text-muted-foreground")}>Illustrative</p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHead eyebrow="How wallet credit works" title="Only the actual cost leaves your wallet" />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <Feature icon={<span className="font-display font-bold">1</span>} title="Top up in cedis" body="Add credit from GHS 5 with mobile money. Bundled plan credit lands in the same wallet." />
          <Feature icon={<span className="font-display font-bold">2</span>} title="Estimate, then reserve" body="Every model shows the maximum GHS cost before you run. That amount is held — never more." />
          <Feature icon={<span className="font-display font-bold">3</span>} title="Settle and release" body="You're charged the actual cost; the unused hold returns instantly. Credit never expires while your account is active (illustrative policy)." />
        </div>
        <div className="mt-10 flex flex-col items-start gap-4 rounded-3xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="text-xl font-semibold">See per-model prices</h2>
            <p className="mt-1 text-sm text-muted-foreground">Compare estimated GHS cost per token, image, second or minute in the catalogue.</p>
          </div>
          <Button asChild variant="outline"><Link to="/models">Open catalogue <ArrowRight /></Link></Button>
        </div>
      </Section>
    </>
  );
}
