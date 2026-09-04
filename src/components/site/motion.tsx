"use client";
import { motion, useInView, useMotionValue, useMotionTemplate, useSpring, useReducedMotion, useScroll, useTransform, type Variants } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useEffects3D } from "@/lib/motion-prefs";
import { CediCoin } from "@/components/site/cedi";

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

/** Reveals children with a staggered fade-up when scrolled into view. */
export function Reveal({ children, className, as = "div", delay = 0 }: { children: ReactNode; className?: string; as?: "div" | "section" | "ul" | "li"; delay?: number }) {
  const reduce = useReducedMotion();
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      {...(reduce ? {} : { initial: "hidden" })}
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: delay } } }}
    >
      {children}
    </Comp>
  );
}

export function Item({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={fadeUp}>
      {children}
    </motion.div>
  );
}

/** Counts up to a target value when it enters the viewport. */
export function CountUp({ to, prefix = "", suffix = "", decimals = 0, className }: { to: number; prefix?: string; suffix?: string; decimals?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 60, damping: 20 });
  useEffect(() => {
    if (inView) mv.set(to);
  }, [inView, to, mv]);
  useEffect(() => {
    const unsub = spring.on("change", (v) => {
      if (ref.current) ref.current.textContent = `${prefix}${v.toLocaleString("en-GH", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
    });
    return unsub;
  }, [spring, prefix, suffix, decimals]);
  return (
    <span ref={ref} className={cn("tabular", className)}>
      {prefix}
      {(0).toFixed(decimals)}
      {suffix}
    </span>
  );
}

/** Gentle floating for hero cards. */
export function Float({ children, className, delay = 0, amplitude = 10 }: { children: ReactNode; className?: string; delay?: number; amplitude?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      {...(reduce ? {} : { animate: { y: [0, -amplitude, 0] } })}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay }}
    >
      {children}
    </motion.div>
  );
}

/** Horizontal infinite marquee. */
export function Marquee({ items, className, speed = 30 }: { items: ReactNode[]; className?: string; speed?: number }) {
  const reduce = useReducedMotion();
  const row = (
    <div className="flex shrink-0 items-center gap-3 pr-3">
      {items.map((it, i) => (
        <div key={i} className="shrink-0">
          {it}
        </div>
      ))}
    </div>
  );
  return (
    <div className={cn("relative max-w-full overflow-hidden", className)} aria-hidden>
      <motion.div className="flex w-max max-w-full" {...(reduce ? {} : { animate: { x: ["0%", "-50%"] } })} transition={{ duration: speed, repeat: Infinity, ease: "linear" }}>
        {row}
        {row}
      </motion.div>
    </div>
  );
}

/** Animated aurora beams for navy hero surfaces. */
export function Aurora({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <motion.div
        className="absolute -left-1/4 top-[-30%] h-[70%] w-[70%] rounded-full bg-electric/25 blur-3xl"
        {...(reduce ? {} : { animate: { x: [0, 80, 0], y: [0, 40, 0], scale: [1, 1.15, 1] } })}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-[-15%] top-[10%] h-[60%] w-[55%] rounded-full bg-cyan/20 blur-3xl"
        {...(reduce ? {} : { animate: { x: [0, -60, 0], y: [0, 60, 0] } })}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      <motion.div
        className="absolute bottom-[-30%] left-[30%] h-[50%] w-[45%] rounded-full bg-gold/15 blur-3xl"
        {...(reduce ? {} : { animate: { x: [0, 40, 0], scale: [1, 1.2, 1] } })}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 4 }}
      />
    </div>
  );
}

export { motion };

/** Animates a money value toward its latest target on every change (springs, no re-mount). Respects reduced motion. */
export function TickingMoney({ pesewas, className }: { pesewas: number; className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const mv = useMotionValue(pesewas);
  const spring = useSpring(mv, { stiffness: 90, damping: 22 });
  const fmt = (p: number) => `GHS ${(p / 100).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  useEffect(() => {
    if (reduce) mv.jump(pesewas);
    else mv.set(pesewas);
  }, [pesewas, mv, reduce]);
  useEffect(() => {
    const unsub = spring.on("change", (v) => {
      if (ref.current) ref.current.textContent = fmt(v);
    });
    return unsub;
  }, [spring]);
  return (
    <span ref={ref} className={cn("tabular", className)}>
      {fmt(pesewas)}
    </span>
  );
}

/** Pointer-tracked 3D tilt with a moving highlight. Disabled under reduced motion and on touch. */
export function Tilt({ children, className, max = 8, glare = true }: { children: ReactNode; className?: string; max?: number; glare?: boolean }) {
  const reduce = useReducedMotion() || !useEffects3D();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const srx = useSpring(rx, { stiffness: 220, damping: 22 });
  const sry = useSpring(ry, { stiffness: 220, damping: 22 });
  const glareBg = useMotionTemplate`radial-gradient(40rem circle at ${gx}% ${gy}%, oklch(0.95 0.1 90 / 0.14), transparent 40%)`;
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry.set((px - 0.5) * max * 2);
    rx.set((0.5 - py) * max * 2);
    gx.set(px * 100);
    gy.set(py * 100);
  };
  const reset = () => {
    rx.set(0);
    ry.set(0);
  };
  return (
    <motion.div
      className={cn("relative [transform-style:preserve-3d] will-change-transform", className)}
      style={{ rotateX: srx, rotateY: sry, perspective: 1000 }}
      onPointerMove={onMove}
      onPointerLeave={reset}
    >
      {children}
      {glare && !reduce && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 [div:hover>&]:opacity-100"
          style={{ background: glareBg }}
        />
      )}
    </motion.div>
  );
}

/** Word-by-word kinetic headline: each word flips up from below with a slight 3D rotation. */
export function KineticWords({ text, className, delay = 0, wordClassName }: { text: string; className?: string; delay?: number; wordClassName?: (word: string, i: number) => string | undefined }) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  return (
    <span className={cn("inline-block [perspective:800px]", className)} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom" aria-hidden>
          <motion.span
            className={cn("inline-block origin-bottom will-change-transform", wordClassName?.(w, i))}
            initial={{ y: "110%", rotateX: -40, opacity: 0 }}
            animate={{ y: 0, rotateX: 0, opacity: 1 }}
            transition={reduce ? { duration: 0 } : { duration: 0.7, delay: delay + i * 0.09, ease: [0.22, 1, 0.36, 1] }}
          >
            {w}
          </motion.span>
          {i < words.length - 1 ? "\u00a0" : ""}
        </span>
      ))}
    </span>
  );
}

/** Pointer-tracked parallax layer. `depth` > 0 moves with the pointer, < 0 against it. Off under reduced motion / no 3D. */
export function ParallaxLayer({ children, className, depth = 20 }: { children: ReactNode; className?: string; depth?: number }) {
  const reduce = useReducedMotion() || !useEffects3D();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 60, damping: 20, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 60, damping: 20, mass: 0.6 });
  useEffect(() => {
    if (reduce || typeof window === "undefined" || window.matchMedia("(pointer: coarse)").matches) return;
    const onMove = (e: PointerEvent) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      x.set(nx * depth);
      y.set(ny * depth);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce, depth, x, y]);
  return (
    <motion.div className={cn("will-change-transform", className)} style={{ x: sx, y: sy }}>
      {children}
    </motion.div>
  );
}

/** Thin gold scroll-progress bar fixed to the top of the viewport. */
export function ScrollProgress({ className }: { className?: string }) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  return <motion.div aria-hidden className={cn("pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-gold via-gold-bright to-cyan", className)} style={{ scaleX }} />;
}

/**
 * Scroll-driven money journey: as the band scrolls through the viewport a gold "cedi"
 * travels the track from Wallet → Reserve → Provider → Settle, and the unused part flows back.
 */
export function ScrollMoneyJourney({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 35%"] });
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 26 });
  const coinLeft = useTransform(p, [0, 0.75], ["0%", "100%"]);
  const trackScale = useTransform(p, [0, 0.75], [0, 1]);
  const refundScale = useTransform(p, [0.78, 1], [0, 1]);
  const refundOpacity = useTransform(p, [0.75, 0.85], [0, 1]);
  const stops = [
    { k: "Wallet", v: "GHS 50.00", hint: "Your MoMo top-up" },
    { k: "Reserve", v: "− GHS 4.20", hint: "Max estimate held" },
    { k: "Provider", v: "job runs", hint: "Keys stay server-side" },
    { k: "Settle", v: "GHS 2.85", hint: "Actual cost charged" },
  ];
  const s0 = useTransform(p, [0, 0.08], [0.35, 1]);
  const s1 = useTransform(p, [0.23, 0.33], [0.35, 1]);
  const s2 = useTransform(p, [0.48, 0.58], [0.35, 1]);
  const s3 = useTransform(p, [0.73, 0.83], [0.35, 1]);
  const stopOn = [s0, s1, s2, s3];
  return (
    <div ref={ref} className={cn("relative", className)}>
      <div className="relative mx-auto max-w-5xl px-2">
        {/* Track */}
        <div className="relative mt-10 h-1.5 rounded-full bg-navy-foreground/10">
          <motion.div className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-gradient-to-r from-gold via-gold-bright to-cyan" style={{ scaleX: trackScale }} />
          {/* Coin */}
          <motion.div aria-hidden className="absolute top-1/2 -ml-5 size-10 -translate-y-1/2 rounded-full ring-4 ring-navy" style={{ left: coinLeft }}>
            <CediCoin size={40} />
          </motion.div>
        </div>
        {/* Refund arc */}
        <div className="relative mt-3 h-1 rounded-full bg-navy-foreground/5">
          <motion.div className="absolute inset-y-0 right-0 w-1/2 origin-right rounded-full bg-kente-green" style={{ scaleX: refundScale, opacity: refundOpacity }} />
          <motion.p className="absolute right-0 top-3 text-[11px] font-semibold text-kente-green" style={{ opacity: refundOpacity }}>+ GHS 1.35 released back to Wallet</motion.p>
        </div>
        {/* Stops */}
        <ol className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stops.map((s, i) => (
            <motion.li key={s.k} style={{ opacity: stopOn[i] }} className="card-gold-glass rounded-2xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-navy-foreground/60">{i + 1} · {s.k}</p>
              <p className="mt-1 font-display text-lg font-semibold text-navy-foreground tabular">{s.v}</p>
              <p className="mt-0.5 text-xs text-navy-foreground/60">{s.hint}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </div>
  );
}
