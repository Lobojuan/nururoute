import { pageMeta } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Smartphone, ShieldCheck, Languages, Database, Scale, HeartHandshake, GraduationCap, Store, Stethoscope, Tractor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, SectionHead, DemoNotice, Feature } from "@/components/site/primitives";

const TITLE = "Impact — NuruRoute for Ghana and West Africa";
const DESC = "How local payment access, transparent cedi pricing, responsible AI and clear data practices make global AI usable across Ghana and West Africa.";

export const Route = createFileRoute("/impact")({
  head: () => pageMeta("/impact", TITLE, DESC),
  component: ImpactPage,
});

const CASES = [
  { icon: <GraduationCap />, title: "Students in Tamale and Kumasi", body: "A GHS 5 top-up buys an evening of tutoring-grade explanations in English or Twi, without a bank card." },
  { icon: <Store />, title: "Market traders and SMEs", body: "Product descriptions, WhatsApp replies and flyer designs from one prepaid balance the owner controls." },
  { icon: <Stethoscope />, title: "Community health workers", body: "Summaries of guidelines and voice prompts in local languages — with cost caps set by the programme." },
  { icon: <Tractor />, title: "Agri cooperatives", body: "Dubbed training videos and audiobook-style extension material for members with feature phones and low data." },
  { icon: <HeartHandshake />, title: "NGOs and civic groups", body: "Shared team wallets with approvals, so grant money for AI tools is visible down to the pesewa." },
  { icon: <Languages />, title: "Creators across ECOWAS", body: "The same wallet model is planned for other mobile-money markets, each subject to local validation before launch." },
];

function ImpactPage() {
  return (
    <>
      <Section tone="navy" className="relative overflow-hidden">
        <div className="grid-fade pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative">
          <SectionHead as="h1" invert eyebrow="Impact" title="Global AI should not require a dollar card" body="Most of Africa pays with mobile money, budgets in local currency and works on constrained connections. NuruRoute is designed around those realities, starting in Ghana." />
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="bg-gold text-gold-foreground hover:bg-gold/90"><Link to="/wallet">See the wallet demo <ArrowRight /></Link></Button>
            <Button asChild variant="outline" className="border-navy-foreground/25 bg-transparent text-navy-foreground hover:bg-navy-foreground/10 hover:text-navy-foreground"><Link to="/investors">Read the investor brief</Link></Button>
          </div>
        </div>
      </Section>

      <Section>
        <SectionHead eyebrow="Use cases" title="Ghana and West Africa, in practice" body="Illustrative scenarios that shaped the product. They are design targets, not customer claims." />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CASES.map((c) => <Feature key={c.title} icon={c.icon} title={c.title} body={c.body} />)}
        </div>
      </Section>

      <Section tone="muted">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHead eyebrow="Local payment access" title="Built for mobile money first" body="Top-ups in cedis via the networks people already use. Small amounts, no minimum plan, and a balance that is always shown in GHS." />
            <ul className="mt-6 space-y-3 text-sm">
              {["Mobile-money top-ups from GHS 5 — demo covers 15 countries from Ghana and Nigeria to Kenya and Tanzania (MoMo, M-Pesa, Airtel Money, Orange Money, Wave and more)", "Prepaid by design — no overdraft, no surprise invoices", "Available, reserved and spent are always separate, always visible", "Shared wallets for teams, schools and programmes"].map((t) => (
                <li key={t} className="flex gap-3"><Smartphone className="mt-0.5 size-4 shrink-0 text-electric" aria-hidden />{t}</li>
              ))}
            </ul>
          </div>
          <div>
            <SectionHead eyebrow="Responsible AI" title="Clear about what the model is and isn't" body="Routing is transparent: users see which simulated provider handles a job, its quality and speed rating, and the cost — before they commit." />
            <ul className="mt-6 space-y-3 text-sm">
              {["Cost shown before every request; zero-balance requests are blocked, not queued", "Voice cloning requires verified consent; 4K media requires provider validation", "Provider keys never reach the client; every request is routed through NuruRoute", "Human-readable audit trail of every reservation, charge and release"].map((t) => (
                <li key={t} className="flex gap-3"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-electric" aria-hidden />{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section>
        <SectionHead eyebrow="Data & privacy positioning" title="Your prompts are yours" body="Our stated principles for handling data. This describes intent for the product; it is not a legal notice." />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <Feature icon={<Database />} title="Minimal retention" body="Prompts and outputs are retained only as long as needed to bill, debug and let you review history — with user-controlled deletion." />
          <Feature icon={<Scale />} title="Designed around Ghana's data-protection principles" body="Purpose limitation, consent and data-subject rights guide the design. This is a design intent, not a certification or legal approval." />
          <Feature icon={<ShieldCheck />} title="No training on your data" body="We do not use customer prompts to train models, and we route to providers under terms that respect the same principle." />
        </div>
        <DemoNotice className="mt-10 max-w-3xl">This public site is a demo. It stores only a simulated wallet in your browser and sends nothing to a server.</DemoNotice>
      </Section>
    </>
  );
}
