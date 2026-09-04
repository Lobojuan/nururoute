"use client";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Film, Image as ImageIcon, Languages, Mic, Sparkles, X, CupSoda, Droplets, Shirt, ChefHat, Smartphone, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Section, SectionHead, DemoBadge } from "./primitives";
import { Carousel3D } from "./carousel-3d";
import { Reveal, Item, motion } from "./motion";
import { formatGhs, useDemo } from "@/lib/demo";
import { estimate, modelById, usePublishedPrices } from "@/lib/catalog";

/**
 * "Agency mode": a Ghanaian advertising agency picks products on a 3D ring,
 * builds a campaign bundle (visuals, spot, dubs) and sees the total GHS before
 * paying from the simulated mobile-money wallet.
 */
type Product = { id: string; name: string; client: string; palette: string; icon: ReactNode };

const PRODUCTS: Product[] = [
  { id: "sobolo", name: "Sobolo Sparkle 500ml", client: "Accra Beverages", palette: "from-[oklch(0.55_0.2_20)] to-navy", icon: <CupSoda /> },
  { id: "shea", name: "Shea Glow Body Butter", client: "Tamale Naturals", palette: "from-gold/80 to-navy", icon: <Droplets /> },
  { id: "kente", name: "Kente Weekend Collection", client: "Bonwire Studio", palette: "from-electric/80 to-navy-deep", icon: <Shirt /> },
  { id: "jollof", name: "Jollof Spice Mix", client: "Kumasi Kitchens", palette: "from-[oklch(0.65_0.18_50)] to-navy", icon: <ChefHat /> },
  { id: "momo", name: "Campus Data Bundle", client: "Telco (fictional)", palette: "from-cyan/80 to-navy-deep", icon: <Smartphone /> },
  { id: "solar", name: "Solar Home Kit", client: "Volta Power", palette: "from-[oklch(0.7_0.15_140)] to-navy", icon: <Sun /> },
];

const BUNDLE = [
  { id: "kv", icon: <ImageIcon />, label: "6 key visuals · 2K", model: "image-studio", units: 6 },
  { id: "spot", icon: <Film />, label: "15s cinematic spot · 1080p", model: "video-cinema", units: 15 },
  { id: "vo", icon: <Mic />, label: "Voice-over · Ghanaian English", model: "voice-natural", units: 0.6 },
  { id: "dub", icon: <Languages />, label: "Dub into Twi + Hausa", model: "dub-pro", units: 0.5 },
];

export function AgencyCampaign() {
  usePublishedPrices();
  const demo = useDemo();
  const [product, setProduct] = useState<string>(PRODUCTS[0]!.id);
  const [picked, setPicked] = useState<string[]>(BUNDLE.map((b) => b.id));
  const [result, setResult] = useState<{ ok: boolean; max: number; actual: number } | null>(null);

  const lines = BUNDLE.filter((b) => picked.includes(b.id)).map((b) => {
    const m = modelById(b.model)!;
    const actual = estimate(m, b.units);
    return { ...b, m, actual, max: Math.ceil(actual * 1.15) };
  });
  const totalActual = lines.reduce((a, l) => a + l.actual, 0);
  const totalMax = lines.reduce((a, l) => a + l.max, 0);
  const prod = PRODUCTS.find((p) => p.id === product) ?? PRODUCTS[0]!;

  const run = () => {
    const ok = demo.run(`Campaign · ${prod.name}`, totalMax, totalActual, {
      studio: "Video",
      title: `Campaign · ${prod.name}`,
      model: lines.map((l) => l.m.name).join(" + "),
    });
    setResult({ ok, max: totalMax, actual: totalActual });
  };

  return (
    <Section tone="navy" className="overflow-hidden">
      <SectionHead
        invert
        align="center"
        eyebrow="Agency mode"
        title="Pick the product. Build the campaign. Pay with MoMo."
        body="A simulated flow for an Accra advertising agency: spin the ring to choose a client product, assemble visuals, a spot and local-language dubs, and see the full GHS cost before a single job runs."
      />
      <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <Carousel3D
            selected={product}
            onSelect={setProduct}
            cardWidth={240}
            cardHeight={300}
            autoRotate={false}
            items={PRODUCTS.map((p) => ({
              id: p.id,
              label: p.name,
              node: (
                <div className={`flex h-full w-full flex-col justify-between bg-gradient-to-br ${p.palette} p-5 text-navy-foreground`}>
                  <div className="flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-xl bg-navy-foreground/15 text-navy-foreground [&>svg]:size-6" aria-hidden>{p.icon}</span>
                    <DemoBadge />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-navy-foreground/60">{p.client}</p>
                    <p className="mt-1 font-display text-xl font-semibold leading-tight">{p.name}</p>
                  </div>
                </div>
              ),
            }))}
          />
          <p className="mt-3 text-center text-xs text-navy-foreground/50">Fictional products and clients for the simulation.</p>
        </div>

        <Reveal>
          <Item>
            <div className="rounded-3xl border border-navy-foreground/10 bg-navy-foreground/5 p-6 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-navy-foreground/60">Campaign bundle</p>
                  <p className="mt-1 font-display text-xl font-semibold text-navy-foreground">{prod.name}</p>
                </div>
                <span className="grid size-11 place-items-center rounded-xl bg-navy-foreground/10 text-cyan [&>svg]:size-6" aria-hidden>{prod.icon}</span>
              </div>
              <ul className="mt-5 space-y-2">
                {BUNDLE.map((b) => {
                  const on = picked.includes(b.id);
                  const line = lines.find((l) => l.id === b.id);
                  return (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => setPicked((p) => (on ? p.filter((x) => x !== b.id) : [...p, b.id]))}
                        aria-pressed={on}
                        className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${on ? "border-cyan/50 bg-navy-deep/50" : "border-navy-foreground/10 opacity-60"}`}
                      >
                        <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${on ? "bg-cyan/20 text-cyan" : "bg-navy-foreground/10 text-navy-foreground/60"} [&>svg]:size-4`}>{b.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-navy-foreground">{b.label}</span>
                          <span className="block text-xs text-navy-foreground/60">{modelById(b.model)!.name}</span>
                        </span>
                        <span className="shrink-0 text-sm font-semibold text-navy-foreground tabular">{line ? formatGhs(line.actual) : "—"}</span>
                        <span className="shrink-0 text-navy-foreground/60">{on ? <Check className="size-4 text-cyan" /> : <X className="size-4" />}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-5 rounded-xl bg-navy-deep/50 p-4 text-sm">
                <div className="flex justify-between text-navy-foreground/70"><span>Estimated actual</span><span className="tabular text-navy-foreground">{formatGhs(totalActual)}</span></div>
                <div className="mt-1 flex justify-between font-semibold text-navy-foreground"><span>Reserved before running (+15%)</span><span className="tabular">{formatGhs(totalMax)}</span></div>
                <div className="mt-1 flex justify-between text-navy-foreground/70"><span>Wallet available</span><span className="tabular">{demo.hydrated ? formatGhs(demo.available) : "—"}</span></div>
              </div>
              {result && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`mt-4 rounded-xl border p-3 text-sm ${result.ok ? "border-cyan/50 bg-cyan/10 text-navy-foreground" : "border-gold/50 bg-gold/10 text-navy-foreground"}`}>
                  {result.ok ? (
                    <>Campaign queued. Reserved {formatGhs(result.max)}, settled {formatGhs(result.actual)}, released {formatGhs(result.max - result.actual)}. See it in project history above.</>
                  ) : (
                    <>Not enough balance to reserve {formatGhs(result.max)}. <Link to="/wallet" className="font-semibold underline">Top up with MoMo (demo)</Link> and try again.</>
                  )}
                </motion.div>
              )}
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Button onClick={run} disabled={lines.length === 0 || !demo.hydrated} className="bg-gold text-gold-foreground hover:bg-gold/90">
                  <Sparkles className="size-4" aria-hidden /> Reserve & run campaign (demo)
                </Button>
                <Button asChild variant="outline" className="border-navy-foreground/25 bg-transparent text-navy-foreground hover:bg-navy-foreground/10 hover:text-navy-foreground">
                  <Link to="/wallet">Top up first <ArrowRight /></Link>
                </Button>
              </div>
              <p className="mt-3 text-[11px] text-navy-foreground/50">Demo mode — no real money or live AI access. 4K output requires provider validation.</p>
            </div>
          </Item>
        </Reveal>
      </div>
    </Section>
  );
}
