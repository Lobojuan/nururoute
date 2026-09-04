import { pageMeta } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, ArrowRight, Scale } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Section, SectionHead, DemoNotice, Stars, DemoBadge } from "@/components/site/primitives";
import { Carousel3D } from "@/components/site/carousel-3d";
import { KenteBlock } from "@/components/site/kente";
import { Tilt } from "@/components/site/motion";
import { cn } from "@/lib/utils";
import { formatGhs } from "@/lib/demo";
import { LedgerRunner, useLedgerLink } from "@/components/site/ledger-runner";
import { CATEGORIES, MODELS, TYPICAL, ROUTING_DISCLAIMER, AFRICAN_DISCLAIMER, byCategory, estimate, unitLabel, type CatalogModel, type Category , usePublishedPrices } from "@/lib/catalog";

const TITLE = "Model catalogue — NuruRoute";
const DESC = "Compare simulated chat, coding, image, video, voice, dubbing and audiobook models by capability, quality, speed and estimated GHS cost. Demo mode.";

const searchSchema = z.object({
  category: z.enum(CATEGORIES as [Category, ...Category[]]).optional(),
});

export const Route = createFileRoute("/models")({
  validateSearch: searchSchema,
  head: () => pageMeta("/models", TITLE, DESC),
  component: ModelsPage,
});

function ModelsPage() {
  const { category } = Route.useSearch();
  const navigate = Route.useNavigate();
  const active: Category = category ?? "Chat & Coding";
  const list = byCategory(active);
  const [compare, setCompare] = useState<string[]>([]);
  const link = useLedgerLink();
  const pricing = usePublishedPrices();
  const [focus, setFocus] = useState<string | undefined>(undefined);
  const focused = useMemo(() => list.find((m) => m.id === focus) ?? null, [list, focus]);

  const compared = useMemo(() => compare.map((id) => MODELS.find((m) => m.id === id)).filter(Boolean) as CatalogModel[], [compare]);

  useEffect(() => setFocus(undefined), [active]);

  function toggle(id: string) {
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 3 ? [...c.slice(1), id] : [...c, id]));
  }

  return (
    <>
      <Section className="pb-8 sm:pb-10 lg:pb-12">
        <SectionHead
          as="h1"
          eyebrow="Model catalogue"
          title="Every model, priced in cedis"
          body="Pick by capability, quality or speed. The estimated GHS cost is shown per unit and for a typical job so non-technical users can compare at a glance."
        />
        <DemoNotice className="mt-6 max-w-3xl">Providers and models below are simulated placeholders. No partnerships or live integrations are claimed.</DemoNotice>

        <div className="mt-8 -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0" role="tablist" aria-label="Categories">
          <div className="flex w-max gap-2 pb-1">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                role="tab"
                aria-selected={c === active}
                onClick={() => navigate({ search: { category: c } })}
                className={cn(
                  "whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  c === active ? "border-navy bg-navy text-navy-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* Product ring */}
      <section className="surface-aurora relative overflow-hidden py-12 sm:py-16">
        <KenteBlock className="absolute -right-24 -top-24 hidden h-72 w-72 rotate-12 opacity-80 lg:block" />
        <KenteBlock className="absolute -bottom-28 -left-28 hidden h-64 w-64 -rotate-6 opacity-40 lg:block" />
        <div className="container-site relative">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHead invert eyebrow={`${active} · ${list.length} simulated models`} title="Spin the ring, pick a model" body="Drag, swipe or use the arrow keys. Tap the front card to open it and start." />
            <p className="text-xs text-navy-foreground/55">Typical job: <strong className="text-navy-foreground/85">{TYPICAL[active].label}</strong></p>
          </div>
          <div className="mt-8">
            <Carousel3D
              key={active}
              selected={focus ?? list[0]?.id}
              onSelect={setFocus}
              onActivate={(id) =>
                active === "Chat & Coding"
                  ? navigate({ to: "/developers", search: { model: id } })
                  : navigate({ to: "/studio", search: { tab: active, model: id } })
              }
              activateLabel={active === "Chat & Coding" ? "Open in Developer studio" : "Open in Creative studio"}
              cardWidth={250}
              cardHeight={336}
              autoRotate={false}
              items={list.map((m) => ({
                id: m.id,
                label: m.name,
                node: (
                  <div className="card-gold-glass flex h-full w-full flex-col justify-between p-5 text-navy-foreground">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[11px] font-medium text-navy-foreground/60">{m.provider}</p>
                        <DemoBadge />
                      </div>
                      <p className="mt-2 font-display text-xl font-bold leading-tight">{m.name}</p>
                      <p className="mt-2 line-clamp-3 text-xs text-navy-foreground/70">{m.capability}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-3 text-[11px] text-navy-foreground/70">
                        <span className="inline-flex items-center gap-1">Q <Stars value={m.quality} label="Quality" /></span>
                        <span className="inline-flex items-center gap-1">S <Stars value={m.speed} label="Speed" /></span>
                      </div>
                      <p className="mt-3 font-display text-lg font-bold text-gold tabular">{formatGhs(m.pesewas)} <span className="text-xs font-medium text-navy-foreground/60">{unitLabel[m.unit]}</span></p>
                      <p className="text-[11px] text-navy-foreground/60 tabular">≈ {formatGhs(estimate(m, TYPICAL[active].units))} per typical job</p>
                    </div>
                  </div>
                ),
              }))}
            />
          </div>
          {focused && (
            <div className="mx-auto mt-6 flex max-w-2xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-center">
              <Button onClick={() => toggle(focused.id)} variant="outline" className="border-gold/50 bg-transparent text-navy-foreground hover:bg-navy-foreground/10 hover:text-navy-foreground">
                {compare.includes(focused.id) ? "Remove from comparison" : "Add to comparison"}
              </Button>
              <Button asChild className="bg-gold text-gold-foreground hover:bg-gold-bright">
                <Link to={active === "Chat & Coding" ? "/developers" : "/studio"} search={active === "Chat & Coding" ? { model: focused.id } : { tab: active, model: focused.id }}>
                  Try {focused.name} <ArrowRight />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      <Section tone="muted" className="adinkra-lattice">
        <p className="mb-5 text-sm text-muted-foreground">
          Typical job for {active}: <strong className="text-foreground">{TYPICAL[active].label}</strong>. Tick up to three models to compare. <span className="text-xs">Price table: {pricing.version ? `${pricing.version} (effective ${pricing.effectiveDate})` : "catalogue default"} · simulated</span>
        </p>
        {active === "Chat & Coding" && (
          <div className="mb-4 space-y-1.5 text-xs text-muted-foreground">
            <p>{ROUTING_DISCLAIMER}</p>
            <p>{AFRICAN_DISCLAIMER}</p>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((m) => {
            const selected = compare.includes(m.id);
            return (
              <Tilt key={m.id} max={5} className="h-full">
              <article id={`model-${m.id}`} className={cn("flex h-full flex-col rounded-2xl border bg-card p-5 shadow-sm transition-[border-color,box-shadow]", selected ? "border-electric" : focus === m.id ? "border-gold ring-gold-glow" : "border-border")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">{m.provider}</p>
                    <h3 className="mt-0.5 text-lg font-semibold">{m.name}</h3>
                    {m.routesTo && <p className="mt-1 inline-flex rounded-md bg-electric/10 px-1.5 py-0.5 text-[10px] font-semibold text-electric">Routing target · {m.routesTo}</p>}
                    {m.africanBuilt && <p className="mt-1 inline-flex rounded-md bg-gold/15 px-1.5 py-0.5 text-[10px] font-semibold text-gold-foreground">African-built · {m.africanBuilt.country}</p>}
                  </div>
                  <DemoBadge />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{m.capability}</p>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-xs text-muted-foreground">Quality</dt><dd className="mt-1"><Stars value={m.quality} label="Quality" /></dd></div>
                  <div><dt className="text-xs text-muted-foreground">Speed</dt><dd className="mt-1"><Stars value={m.speed} label="Speed" /></dd></div>
                  <div><dt className="text-xs text-muted-foreground">Estimated cost</dt><dd className="mt-1 font-semibold tabular">{formatGhs(m.pesewas)} <span className="font-normal text-muted-foreground">{unitLabel[m.unit]}</span></dd></div>
                  <div><dt className="text-xs text-muted-foreground">{TYPICAL[active].label}</dt><dd className="mt-1 font-semibold tabular">≈ {formatGhs(estimate(m, TYPICAL[active].units))}</dd></div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {m.tags.map((t) => <span key={t} className="rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">{t}</span>)}
                  {m.resolutions?.map((res) => (
                    <span key={res} className={cn("rounded-md px-2 py-0.5 text-xs font-medium", res === "4K" ? "bg-gold/15 text-gold-foreground" : "bg-muted text-muted-foreground")}>{res}</span>
                  ))}
                  {m.fourK && <span className="rounded-md bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold-foreground">4K: provider validation required</span>}
                  {m.context && <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{m.context} context</span>}
                  {m.maxOutputTokens && <span className="rounded-md bg-electric/10 px-2 py-0.5 text-xs font-semibold text-electric">{m.maxOutputTokens.toLocaleString()} max out</span>}
                </div>
                {m.africanBuilt && <p className="mt-3 text-xs text-muted-foreground">Languages: {m.africanBuilt.languages.join(", ")}</p>}
                {m.ledgerModelId && <LedgerRunner ledgerModelId={m.ledgerModelId} link={link} />}
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={() => toggle(m.id)}
                    aria-pressed={selected}
                    className={cn("inline-flex items-center gap-1.5 text-sm font-medium", selected ? "text-electric" : "text-muted-foreground hover:text-foreground")}
                  >
                    <span className={cn("grid size-4 place-items-center rounded border", selected ? "border-electric bg-electric text-electric-foreground" : "border-border")}>{selected && <Check className="size-3" />}</span>
                    Compare
                  </button>
                  <Button asChild size="sm" variant="outline">
                    <Link to={active === "Chat & Coding" ? "/developers" : "/studio"} search={active === "Chat & Coding" ? { model: m.id } : { tab: active, model: m.id }}>
                      Try in studio <ArrowRight />
                    </Link>
                  </Button>
                </div>
              </article>
              </Tilt>
            );
          })}
        </div>
      </Section>

      <Section id="compare">
        <SectionHead eyebrow="Comparison" title="Side by side" body="Select models above. Estimated costs are illustrative." />
        {compared.length < 2 ? (
          <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-10 text-center">
            <Scale className="size-8 text-muted-foreground" aria-hidden />
            <p className="font-medium">Pick at least two models to compare</p>
            <p className="text-sm text-muted-foreground">Use the Compare toggle on any card in the same category.</p>
          </div>
        ) : (
          <div className="mt-8 -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[36rem] border-separate border-spacing-0 overflow-hidden rounded-2xl border border-border text-sm">
              <thead className="bg-muted text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">Attribute</th>
                  {compared.map((m) => <th key={m.id} className="px-4 py-3 font-semibold">{m.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Provider", (m: CatalogModel) => m.provider],
                  ["Ledger", (m: CatalogModel) => (m.ledgerModelId ? "Real ledger (mock funds)" : "Simulated")],
                  ["Capability", (m: CatalogModel) => m.capability],
                  ["Quality", (m: CatalogModel) => <Stars value={m.quality} label="Quality" />],
                  ["Speed", (m: CatalogModel) => <Stars value={m.speed} label="Speed" />],
                  ["Cost per unit", (m: CatalogModel) => `${formatGhs(m.pesewas)} ${unitLabel[m.unit]}`],
                  [`Typical: ${TYPICAL[active].label}`, (m: CatalogModel) => `≈ ${formatGhs(estimate(m, TYPICAL[active].units))}`],
                  ["Context window", (m: CatalogModel) => m.context ?? "—"],
                  ["Max output tokens", (m: CatalogModel) => (m.maxOutputTokens ? m.maxOutputTokens.toLocaleString() : "—")],
                  ["4K output", (m: CatalogModel) => (m.fourK ? "Provider validation required" : "—")],
                ].map(([label, fn]) => (
                  <tr key={label as string} className="border-t border-border odd:bg-card even:bg-muted/40">
                    <th scope="row" className="px-4 py-3 text-left font-medium text-muted-foreground">{label as string}</th>
                    {compared.map((m) => <td key={m.id} className="px-4 py-3">{(fn as (m: CatalogModel) => ReactNode)(m)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}
