"use client";
/**
 * Cinema-grade simulated reveal for the Creative Studio.
 * Nothing is generated: this is a staged visual (blur → sharp, film strip, or waveform)
 * synchronised with the price settling from the reserved maximum to the actual cost.
 */
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { TickingMoney } from "@/components/site/motion";
import { CediCoin } from "@/components/site/cedi";
import { formatGhs } from "@/lib/demo";
import { playCoin } from "@/lib/sound";

export type RevealKind = "image" | "video" | "audio";

const EASE = [0.22, 1, 0.36, 1] as const;

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Abstract "artwork" derived from the prompt so each run looks different. */
function Artwork({ seed, sharp, frame = 0 }: { seed: number; sharp: boolean; frame?: number }) {
  const hue1 = (seed % 360) + frame * 6;
  const hue2 = ((seed >> 8) % 360) + 40 + frame * 6;
  const hue3 = ((seed >> 16) % 360) + frame * 6;
  return (
    <div className={cn("absolute inset-0 transition-[filter,transform] duration-[1400ms] ease-out", sharp ? "blur-0 scale-100" : "blur-2xl scale-110")} aria-hidden>
      <div className="absolute inset-0" style={{ background: `radial-gradient(60% 70% at ${20 + (seed % 40)}% ${30 + ((seed >> 4) % 40)}%, oklch(0.72 0.17 ${hue1}) 0%, transparent 60%), radial-gradient(50% 60% at ${60 + ((seed >> 6) % 30)}% ${60 + ((seed >> 10) % 30)}%, oklch(0.65 0.15 ${hue2}) 0%, transparent 65%), linear-gradient(160deg, oklch(0.25 0.06 ${hue3}), oklch(0.12 0.04 265))` }} />
      <div className="kente-weave absolute inset-0 opacity-15 mix-blend-overlay" />
      <div className="grain absolute inset-0 opacity-30" />
    </div>
  );
}

export function CinematicReveal({ kind, prompt, reserved, actual, runKey, className }: { kind: RevealKind; prompt: string; reserved: number; actual: number; runKey: number; className?: string }) {
  const reduce = useReducedMotion();
  const seed = useMemo(() => hash(prompt + runKey), [prompt, runKey]);
  const [stage, setStage] = useState<0 | 1 | 2 | 3>(reduce ? 3 : 0); // 0 blurred, 1 sharp, 2 settled, 3 released
  useEffect(() => {
    if (reduce) {
      setStage(3);
      return;
    }
    setStage(0);
    const t1 = window.setTimeout(() => setStage(1), 250);
    const t2 = window.setTimeout(() => { setStage(2); playCoin("settle"); }, 1500);
    const t3 = window.setTimeout(() => { setStage(3); if (reserved - actual > 0) playCoin("release"); }, 2400);
    return () => [t1, t2, t3].forEach((t) => window.clearTimeout(t));
  }, [runKey, reduce, reserved, actual]);
  const released = reserved - actual;
  const price = stage >= 2 ? actual : reserved;

  return (
    <div className={cn("absolute inset-0", className)}>
      {kind === "image" && <Artwork seed={seed} sharp={stage >= 1} />}

      {kind === "video" && (
        <>
          <Artwork seed={seed} sharp={stage >= 1} frame={stage >= 1 ? 3 : 0} />
          <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-gradient-to-t from-navy/90 to-transparent p-3 pt-8" aria-hidden>
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div key={i} className="relative h-9 flex-1 overflow-hidden rounded-[3px] border border-gold/40" initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: stage >= 1 ? 1 : 0.25, y: 0 }} transition={{ delay: 0.15 + i * 0.08, ease: EASE }}>
                <Artwork seed={seed + i * 97} sharp frame={i * 2} />
              </motion.div>
            ))}
          </div>
          <motion.div className="absolute left-3 top-3 h-0.5 rounded-full bg-gold" initial={{ width: 0 }} animate={{ width: stage >= 1 ? "calc(100% - 1.5rem)" : 0 }} transition={{ duration: reduce ? 0 : 1.2, ease: "linear" }} aria-hidden />
        </>
      )}

      {kind === "audio" && (
        <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_60%,oklch(0.28_0.08_265),oklch(0.12_0.04_265)_70%)]">
          <div className="flex h-24 w-4/5 items-end justify-center gap-[3px]" aria-hidden>
            {Array.from({ length: 48 }).map((_, i) => {
              const h = 12 + ((seed >> (i % 24)) % 70) + Math.abs(Math.sin(i * 0.6)) * 20;
              return (
                <motion.span
                  key={i}
                  className="w-full max-w-[6px] rounded-full bg-gradient-to-t from-cyan to-gold"
                  initial={reduce ? false : { height: 4, opacity: 0.4 }}
                  animate={{ height: stage >= 1 ? `${h}%` : 4, opacity: stage >= 1 ? 1 : 0.4 }}
                  transition={{ delay: 0.1 + i * 0.02, type: "spring", stiffness: 180, damping: 14 }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Price settle HUD */}
      <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2 text-navy-foreground">
        <motion.span initial={reduce ? false : { opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="rounded-full bg-navy/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur">
          {stage < 1 ? "Rendering (simulated)" : stage < 2 ? "Settling" : "Simulated output"}
        </motion.span>
        <div className="flex flex-col items-end gap-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-navy/70 px-2.5 py-1 text-xs font-semibold tabular backdrop-blur">
            <CediCoin size={16} spin={stage < 2} />
            <span className={cn("text-[10px] uppercase tracking-wider", stage >= 2 ? "text-navy-foreground/60" : "text-cyan")}>{stage >= 2 ? "charged" : "held"}</span>
            <TickingMoney pesewas={price} />
          </span>
          {stage >= 3 && released > 0 && (
            <motion.span initial={reduce ? false : { opacity: 0, y: -6, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="rounded-full bg-kente-green/90 px-2.5 py-1 text-[11px] font-semibold text-navy tabular">
              + {formatGhs(released)} released
            </motion.span>
          )}
        </div>
      </div>
    </div>
  );
}
