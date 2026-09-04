"use client";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { useReducedMotion } from "motion/react";
import { useEffects3D } from "@/lib/motion-prefs";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { DemoBadge } from "@/components/site/primitives";
import { Adinkra } from "@/components/site/kente";
import type { Phase } from "@/components/site/hero-scene";

const HeroScene = lazy(() => import("@/components/site/hero-scene"));

const CAPTIONS: Record<Phase, { title: string; amount: string; tone: string; body: string }> = {
  topup: { title: "Top up", amount: "+ GHS 50.00", tone: "text-gold", body: "Mobile-money credit lands in the local wallet." },
  reserve: { title: "Reserve", amount: "− GHS 0.40", tone: "text-gold", body: "The maximum cost is held before any model runs." },
  settle: { title: "Settle", amount: "GHS 0.32", tone: "text-cyan", body: "Only the actual cost is charged on completion." },
  release: { title: "Release", amount: "+ GHS 0.08", tone: "text-kente-green", body: "Unused hold returns instantly. Never below zero." },
};
const ORDER: Phase[] = ["topup", "reserve", "settle", "release"];

/** Static poster used on mobile, low-power devices, reduced motion and while the scene loads. */
export function HeroPoster({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-full w-full overflow-hidden kente-weave", className)} aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-br from-navy-abyss/70 via-navy-abyss/40 to-navy-deep/90" />
      <div className="absolute inset-0 grid place-items-center">
        <div className="relative -translate-y-10 sm:-translate-y-4">
          <div className="size-44 rounded-full border-[10px] border-gold/80 shadow-[0_0_80px_-10px_var(--gold)] sm:size-56" />
          <div className="absolute inset-6 rounded-full border-2 border-cyan/60 sm:inset-8" />
          <div className="absolute inset-0 grid place-items-center">
            <Adinkra name="ring" className="size-14 text-cyan" />
          </div>
          {[
            ["-left-16 top-6", "bg-gold"],
            ["-right-14 top-2", "bg-cyan"],
            ["-right-10 bottom-4", "bg-electric"],
            ["-left-10 bottom-0", "bg-kente-green"],
          ].map(([pos, c]) => (
            <span key={pos} className={cn("absolute size-3 rounded-full", pos, c)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function useCanRun3D() {
  const reduce = useReducedMotion();
  const fx3d = useEffects3D();
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (reduce || !fx3d) { setOk(false); return; }
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    const low = (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) || nav.connection?.saveData === true || navigator.hardwareConcurrency <= 2;
    const wide = window.matchMedia("(min-width: 768px)").matches;
    let webgl = false;
    try {
      const c = document.createElement("canvas");
      webgl = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      webgl = false;
    }
    setOk(!low && wide && webgl && fx3d);
  }, [reduce, fx3d]);
  return ok;
}

/**
 * Hero visual: WebGL money-flow scene on capable desktops, poster otherwise.
 * The scene is only mounted while the hero is on screen.
 */
export function HeroMoney({ className }: { className?: string }) {
  const can3D = useCanRun3D();
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<Phase>("topup");
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // When the 3D scene is not running (poster mode), still walk the caption through the ledger steps.
  const reduce = useReducedMotion();
  const sceneRunning = can3D && visible;
  useEffect(() => {
    if (sceneRunning || reduce) return;
    const id = window.setInterval(() => setPhase((p) => ORDER[(ORDER.indexOf(p) + 1) % ORDER.length]!), 3000);
    return () => window.clearInterval(id);
  }, [sceneRunning, reduce]);

  const cap = CAPTIONS[phase];

  return (
    <div ref={host} className={cn("relative overflow-hidden rounded-[2rem] border border-gold/30 bg-navy-abyss shadow-depth", className)}>
      <div className="kente-strip-thin absolute inset-x-0 top-0 z-10" aria-hidden />
      <div className="relative aspect-[4/3] w-full sm:aspect-[16/10] lg:aspect-auto lg:h-[520px]">
        <ClientOnly fallback={<HeroPoster />}>
          {sceneRunning ? (
            <Suspense fallback={<HeroPoster />}>
              <HeroScene onPhase={setPhase} />
            </Suspense>
          ) : (
            <HeroPoster />
          )}
        </ClientOnly>
      </div>

      {/* Live caption strip */}
      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-navy-abyss via-navy-abyss/85 to-transparent p-4 sm:p-5">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ol className="flex items-center gap-1" aria-label="Ledger steps">
                {ORDER.map((p) => (
                  <li key={p} className={cn("h-1.5 rounded-full transition-all duration-500", p === phase ? "w-6 bg-gold" : "w-2 bg-navy-foreground/25")} />
                ))}
              </ol>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-navy-foreground/55">Ledger flow · simulated</span>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={phase} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }} className="mt-2">
                <p className="font-display text-base font-bold text-navy-foreground sm:text-xl">
                  {cap.title} <span className={cn("whitespace-nowrap tabular", cap.tone)}>{cap.amount}</span>
                </p>
                <p className="truncate text-xs text-navy-foreground/70 sm:text-sm">{cap.body}</p>
              </motion.div>
            </AnimatePresence>
          </div>
          <DemoBadge className="shrink-0" />
        </div>
      </div>
    </div>
  );
}
