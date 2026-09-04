"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { useEffects3D } from "@/lib/motion-prefs";
import { TickingMoney } from "@/components/site/motion";

/**
 * CoinBurst — fires a stream of coins from an origin element into a target element.
 * Triggered by incrementing `fireKey`. Pure DOM + Motion, respects reduced motion.
 */
export function CoinBurst({ fireKey, from, to, count = 14, color = "bg-gold" }: { fireKey: number; from: React.RefObject<HTMLElement | null>; to: React.RefObject<HTMLElement | null>; count?: number; color?: string }) {
  const reduce = useReducedMotion();
  const [coins, setCoins] = useState<{ id: number; dx: number; dy: number; sx: number; sy: number; i: number }[]>([]);
  const last = useRef(fireKey);

  useEffect(() => {
    if (fireKey === last.current || reduce) return;
    last.current = fireKey;
    const a = from.current?.getBoundingClientRect();
    const b = to.current?.getBoundingClientRect();
    if (!a || !b) return;
    const sx = a.left + a.width / 2;
    const sy = a.top + a.height / 2;
    const dx = b.left + b.width / 2 - sx;
    const dy = b.top + b.height / 2 - sy;
    const batch = Array.from({ length: count }, (_, i) => ({ id: fireKey * 100 + i, dx, dy, sx, sy, i }));
    setCoins(batch);
    const t = window.setTimeout(() => setCoins([]), 1600);
    return () => window.clearTimeout(t);
  }, [fireKey, from, to, count, reduce]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]" aria-hidden>
      <AnimatePresence>
        {coins.map((c) => (
          <motion.span
            key={c.id}
            className={cn("absolute size-3 rounded-full shadow-[0_0_12px_var(--gold)]", color)}
            style={{ left: c.sx, top: c.sy }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
            animate={{
              x: [0, c.dx * 0.45 + (c.i % 5 - 2) * 26, c.dx],
              y: [0, c.dy * 0.35 - 90 - (c.i % 3) * 30, c.dy],
              opacity: [0, 1, 0.9, 0],
              scale: [0.4, 1.1, 1, 0.5],
            }}
            transition={{ duration: 1.1, delay: c.i * 0.045, ease: [0.22, 1, 0.36, 1] }}
            exit={{ opacity: 0 }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * BalanceDisc — a 3D-tilted stacked disc showing available / reserved / spent as slices.
 * Re-slices with a spring whenever the values change.
 */
export function BalanceDisc({
  available,
  reserved,
  spent,
  label,
  primary,
  secondary,
  className,
  pulse,
}: {
  available: number;
  reserved: number;
  spent: number;
  label?: ReactNode;
  /** Formatted primary amount (e.g. local currency). If omitted, a ticking GHS value is used. */
  primary?: ReactNode;
  secondary?: ReactNode;
  className?: string;
  pulse?: boolean;
}) {
  const reduce = useReducedMotion();
  const fx3d = useEffects3D();
  const total = Math.max(1, available + reserved + spent);
  const a = (available / total) * 360;
  const r = (reserved / total) * 360;
  const conic = `conic-gradient(var(--gold) 0deg ${a}deg, var(--cyan) ${a}deg ${a + r}deg, oklch(1 0 0 / 0.14) ${a + r}deg 360deg)`;
  const empty = available + reserved + spent === 0;

  return (
    <div className={cn("perspective-1200 relative mx-auto w-full max-w-xs", className)}>
      <motion.div
        className="preserve-3d relative aspect-square"
        initial={false}
        animate={reduce ? {} : fx3d ? { rotateX: [58, 54, 58], rotateZ: [0, 3, 0] } : { rotateX: 0, rotateZ: 0 }}
        transition={fx3d ? { duration: 9, repeat: Infinity, ease: "easeInOut" } : { duration: 0.6 }}
        style={{ rotateX: fx3d ? 56 : 0 }}
      >
        {/* stacked shadow layers for depth */}
        {[18, 12, 6].map((z, i) => (
          <div key={z} className="absolute inset-0 rounded-full bg-navy-abyss/70" style={{ transform: `translateZ(-${z}px)`, opacity: 0.35 + i * 0.15 }} />
        ))}
        <motion.div
          className={cn("absolute inset-0 rounded-full shadow-[0_0_60px_-10px_var(--gold)]", pulse && !reduce && "animate-pulse")}
          animate={{ background: empty ? "conic-gradient(oklch(1 0 0 / 0.14) 0deg 360deg)" : conic }}
          transition={{ duration: reduce ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{ background: conic }}
        />
        <div className="absolute inset-[14%] rounded-full bg-navy-abyss ring-1 ring-gold/30" style={{ transform: "translateZ(2px)" }} />
        <div className="absolute inset-[20%] rounded-full kente-weave opacity-60" style={{ transform: "translateZ(3px)" }} />
      </motion.div>
      {/* Upright readout floats above the disc */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="-translate-y-4 text-center">
          {label && <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-navy-foreground/60">{label}</p>}
          <p className="mt-1 font-display text-2xl font-bold text-navy-foreground tabular sm:text-3xl">{primary ?? <TickingMoney pesewas={available} />}</p>
          {secondary && <p className="mt-0.5 text-[11px] text-navy-foreground/55 tabular">{secondary}</p>}
        </div>
      </div>
      <ul className="mt-2 flex items-center justify-center gap-4 text-[11px] text-navy-foreground/70">
        <li className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-gold" /> Available</li>
        <li className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-cyan" /> Reserved</li>
        <li className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-navy-foreground/30" /> Spent</li>
      </ul>
    </div>
  );
}

/** Horizontal reserve → settle → release flow with travelling pulse; used on Investors and Impact. */
export function LedgerFlow({ className, invert }: { className?: string; invert?: boolean }) {
  const reduce = useReducedMotion();
  const steps = [
    { k: "Top up", v: "+ GHS 50.00", c: "bg-gold text-gold-foreground" },
    { k: "Reserve", v: "− GHS 0.40", c: "bg-gold/80 text-gold-foreground" },
    { k: "Settle", v: "GHS 0.32", c: "bg-cyan text-cyan-foreground" },
    { k: "Release", v: "+ GHS 0.08", c: "bg-kente-green text-navy-foreground" },
  ];
  return (
    <div className={cn("relative", className)}>
      <div className={cn("absolute left-0 right-0 top-6 h-0.5", invert ? "bg-navy-foreground/15" : "bg-border")} aria-hidden />
      {!reduce && (
        <motion.span
          className="absolute top-[21px] size-3 rounded-full bg-gold shadow-[0_0_16px_var(--gold)]"
          animate={{ left: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        />
      )}
      <ol className="relative grid grid-cols-2 gap-4 sm:grid-cols-4">
        {steps.map((s, i) => (
          <motion.li
            key={s.k}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12 }}
            className="flex flex-col items-start"
          >
            <span className={cn("grid size-12 place-items-center rounded-2xl font-display text-sm font-bold shadow-depth", s.c)}>{i + 1}</span>
            <p className={cn("mt-3 font-semibold", invert && "text-navy-foreground")}>{s.k}</p>
            <p className={cn("text-sm tabular", invert ? "text-navy-foreground/70" : "text-muted-foreground")}>{s.v}</p>
          </motion.li>
        ))}
      </ol>
      <p className={cn("mt-4 text-xs", invert ? "text-navy-foreground/50" : "text-muted-foreground")}>Illustrative ledger flow. No real money moves in this demo.</p>
    </div>
  );
}
