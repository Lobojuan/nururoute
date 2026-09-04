"use client";
/**
 * The NuruRoute signature object: one gold cedi coin that appears — and moves —
 * the same way on every surface (hero, wallet, studio, ledger).
 */
import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import { useEffect, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { useEffects3D } from "@/lib/motion-prefs";

export function CediCoin({ size = 40, spin = true, className, label }: { size?: number; spin?: boolean; className?: string; label?: string }) {
  const reduce = useReducedMotion();
  const three = useEffects3D();
  const animate = spin && !reduce;
  return (
    <span
      className={cn("relative inline-block shrink-0 [perspective:600px]", className)}
      style={{ width: size, height: size }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <span
        className={cn("cedi-coin absolute inset-0 grid place-items-center rounded-full font-display font-bold text-gold-foreground [transform-style:preserve-3d]", animate && three && "cedi-spin", animate && !three && "cedi-shimmer")}
        style={{ fontSize: size * 0.5 }}
      >
        ₵
        <span className="cedi-edge absolute inset-0 rounded-full" aria-hidden />
      </span>
    </span>
  );
}

/** Reads element centres relative to the viewport. */
function centre(el: HTMLElement | null) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/**
 * A single cedi flies from `from` to `to` along an arc whenever `fireKey` changes.
 * Fixed-positioned so it works across layout boundaries; removed after landing.
 */
export function CediFlight({ fireKey, from, to, size = 34, onLand, duration = 0.9 }: { fireKey: number; from: RefObject<HTMLElement | null>; to: RefObject<HTMLElement | null>; size?: number; onLand?: () => void; duration?: number }) {
  const reduce = useReducedMotion();
  const [flight, setFlight] = useState<{ id: number; a: { x: number; y: number }; b: { x: number; y: number } } | null>(null);
  useEffect(() => {
    if (!fireKey) return;
    const a = centre(from.current);
    const b = centre(to.current);
    if (!a || !b || reduce) {
      onLand?.();
      return;
    }
    setFlight({ id: fireKey, a, b });
  }, [fireKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const lift = flight ? Math.min(160, Math.max(60, Math.abs(flight.b.x - flight.a.x) * 0.25)) : 0;
  return (
    <AnimatePresence>
      {flight && (
        <motion.div
          key={flight.id}
          className="pointer-events-none fixed left-0 top-0 z-[70]"
          style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }}
          initial={{ x: flight.a.x, y: flight.a.y, scale: 0.6, opacity: 0 }}
          animate={{
            x: [flight.a.x, (flight.a.x + flight.b.x) / 2, flight.b.x],
            y: [flight.a.y, Math.min(flight.a.y, flight.b.y) - lift, flight.b.y],
            scale: [0.6, 1.15, 0.9],
            opacity: [0, 1, 1],
            rotateY: [0, 540, 720],
          }}
          transition={{ duration, ease: [0.3, 0.7, 0.2, 1], times: [0, 0.55, 1] }}
          exit={{ opacity: 0, scale: 1.6, transition: { duration: 0.25 } }}
          onAnimationComplete={() => {
            onLand?.();
            setFlight(null);
          }}
        >
          <CediCoin size={size} spin={false} />
          <span className="absolute inset-0 -z-10 rounded-full bg-gold/40 blur-md" aria-hidden />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
