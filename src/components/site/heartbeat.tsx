"use client";
/**
 * "Live across Africa" — simulated heartbeat: an interactive Africa network field
 * (Accra origin, planned routes) plus a ticker of illustrative wallet events. Demo only.
 * Motion presets: Full/Balanced animate the routing light; Reduced shows a still field.
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatGhs } from "@/lib/demo";
import { useMotionPrefs } from "@/lib/motion-prefs";
import { nextBeat, type Beat } from "@/lib/heartbeat";
import { CediCoin } from "@/components/site/cedi";
import { AfricaNetwork } from "@/components/site/africa-network";

const KIND: Record<Beat["kind"], { label: string; cls: string; sign: string }> = {
  topup: { label: "Top-up", cls: "text-gold", sign: "+" },
  reserve: { label: "Reserve", cls: "text-cyan", sign: "−" },
  settle: { label: "Settle", cls: "text-navy-foreground", sign: "" },
  release: { label: "Release", cls: "text-kente-green", sign: "+" },
};

export function AfricaHeartbeat({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const { reduced, hydrated } = useMotionPrefs();
  const [beats, setBeats] = useState<Beat[]>([]);
  const idRef = useRef(0);
  useEffect(() => {
    const push = () => setBeats((b) => [nextBeat(++idRef.current), ...b].slice(0, 6));
    push();
    push();
    push();
    const t = window.setInterval(push, reduce ? 5200 : 2600);
    return () => window.clearInterval(t);
  }, [reduce]);
  const active = beats[0]?.pin.code;
  const totals = beats.reduce((a, b) => a + (b.kind === "settle" || b.kind === "topup" ? b.pesewas : 0), 0);
  const animate = hydrated && !reduced && !reduce;

  return (
    <div className={cn("grid items-center gap-8 lg:grid-cols-[1fr_1.1fr]", className)}>
      <div className="relative mx-auto w-full max-w-[28rem]">
        <div className="absolute -inset-8 rounded-full bg-gold/10 blur-3xl" aria-hidden />
        <AfricaNetwork active={active} animate={animate} className="relative" />
      </div>

      <div>
        <p className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-navy-foreground/5 px-3 py-1 text-xs font-semibold text-navy-foreground">
          <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-kente-green opacity-70" /><span className="relative inline-flex size-2 rounded-full bg-kente-green" /></span>
          <Radio className="size-3.5 text-gold" aria-hidden /> Heartbeat · simulated demo feed
        </p>
        <ul className="mt-4 space-y-2" aria-live="polite" aria-label="Simulated wallet activity across Africa">
          <AnimatePresence initial={false}>
            {beats.map((b, i) => (
              <motion.li
                key={b.id}
                layout
                initial={{ opacity: 0, y: -14, scale: 0.98 }}
                animate={{ opacity: 1 - i * 0.13, y: 0, scale: 1 }}
                exit={{ opacity: 0, height: 0, marginTop: 0, transition: { duration: 0.25 } }}
                transition={{ type: "spring", stiffness: 260, damping: 26 }}
                className="card-gold-glass flex items-center gap-3 rounded-2xl px-3 py-2.5"
              >
                <CediCoin size={28} spin={i === 0} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-navy-foreground"><strong className="font-semibold">{b.pin.city} {b.who}</strong> <span className="text-navy-foreground/70">{b.text}</span></p>
                  <p className="text-[11px] text-navy-foreground/55">{b.pin.country}{b.pin.launch ? " · launch market" : " · planned"} · {KIND[b.kind].label} · simulated</p>
                </div>
                <span className={cn("shrink-0 text-sm font-semibold tabular", KIND[b.kind].cls)}>{KIND[b.kind].sign}{formatGhs(b.pesewas)}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        <p className="mt-3 text-xs text-navy-foreground/55">Illustrative events generated in your browser · last few moments ≈ {formatGhs(totals)} of simulated flow. Ghana is the launch market; other cities are planned routes, not live traffic.</p>
      </div>
    </div>
  );
}
