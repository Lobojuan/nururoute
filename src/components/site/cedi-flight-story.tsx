"use client";
/**
 * The Cedi Flight — one continuous, scroll-driven story of a single cedi:
 * phone wallet → Africa network → NuruRoute balance → reserve / settle / release → creative output.
 * Illustrative figures; nothing here moves real money. Reduced motion renders the completed story.
 */
import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { Smartphone, Code2, Image as ImageIcon, Film, Mic, BookOpenText } from "lucide-react";
import { cn } from "@/lib/utils";
import { CediCoin } from "@/components/site/cedi";
import { Adinkra } from "@/components/site/kente";
import { useMotionPrefs } from "@/lib/motion-prefs";

const STAGES = [
  { k: "Phone", title: "MoMo wallet", amount: "+ GHS 50.00", hint: "A student in Tamale tops up from her phone.", tone: "text-gold" },
  { k: "Network", title: "Africa network", amount: "routed", hint: "Accra origin. Keys and providers stay behind NuruRoute.", tone: "text-cyan" },
  { k: "Balance", title: "NuruRoute balance", amount: "GHS 50.00", hint: "Available, reserved and spent are always visible.", tone: "text-gold" },
  { k: "Ledger", title: "Reserve → settle → release", amount: "− 4.20 → 2.85 → + 1.35", hint: "Maximum held, actual charged, remainder returned.", tone: "text-cyan" },
  { k: "Output", title: "Creative output", amount: "5 studios", hint: "Code, image, video, voice and audiobook — one balance.", tone: "text-kente-green" },
] as const;

const OUTPUTS: { icon: ReactNode; label: string }[] = [
  { icon: <Code2 />, label: "Code" },
  { icon: <ImageIcon />, label: "Image" },
  { icon: <Film />, label: "Video" },
  { icon: <Mic />, label: "Voice" },
  { icon: <BookOpenText />, label: "Audiobook" },
];

const SPLIT = [
  { label: "Reserve", v: "− GHS 4.20", cls: "border-gold/60 text-gold" },
  { label: "Settle", v: "GHS 2.85", cls: "border-cyan/60 text-cyan" },
  { label: "Release", v: "+ GHS 1.35", cls: "border-kente-green/60 text-kente-green" },
];

// Progress checkpoints for the five stages.
const T = [0.04, 0.26, 0.48, 0.7, 0.94];

function StageNode({ i, on }: { i: number; on: MotionValue<number> }) {
  const icon = [<Smartphone key="p" className="size-5" />, <Adinkra key="n" name="weave" className="size-5" />, <Adinkra key="b" name="ring" className="size-5" />, <Adinkra key="l" name="spiral" className="size-5" />, <Adinkra key="o" name="sun" className="size-5" />][i];
  const scale = useTransform(on, [0.35, 1], [0.9, 1]);
  return (
    <motion.span style={{ opacity: on, scale }} className="relative z-10 grid size-11 place-items-center rounded-full border border-gold/50 bg-navy-abyss text-gold shadow-gold-glow">
      {icon}
    </motion.span>
  );
}

export function CediFlightStory({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { reduced } = useMotionPrefs();
  const still = reduce || reduced;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 78%", "end 45%"] });
  const spring = useSpring(scrollYProgress, { stiffness: 80, damping: 24, restDelta: 0.001 });
  const one = useMotionValue(1);
  const p = still ? one : spring;

  // Coin along the rail (desktop: % of width; mobile: % of height).
  const along = useTransform(p, T, ["10%", "30%", "50%", "70%", "90%"]);
  const bob = useTransform(p, [0, 0.15, 0.26, 0.37, 0.48, 0.59, 0.7, 0.82, 0.94], [0, -26, 0, -26, 0, -26, 0, -26, 0]);
  const rail = useTransform(p, [0.04, 0.94], [0, 1]);
  const coinOpacity = useTransform(p, [0, 0.03, 0.97, 1], [0, 1, 1, 0]);

  const on0 = useTransform(p, [0, 0.06], [0.3, 1]);
  const on1 = useTransform(p, [0.2, 0.28], [0.3, 1]);
  const on2 = useTransform(p, [0.42, 0.5], [0.3, 1]);
  const on3 = useTransform(p, [0.64, 0.72], [0.3, 1]);
  const on4 = useTransform(p, [0.88, 0.96], [0.3, 1]);
  const ons = [on0, on1, on2, on3, on4];

  // Split coins fan out from the ledger node.
  const splitOpacity = useTransform(p, [0.7, 0.76, 0.9, 0.96], [0, 1, 1, 0]);
  const splitSpread = useTransform(p, [0.7, 0.8], [0, 1]);
  const splitA = useTransform(splitSpread, (v) => v * -54);
  const splitC = useTransform(splitSpread, (v) => v * 54);

  // Outputs light up one by one.
  const o0 = useTransform(p, [0.86, 0.9], [0.25, 1]);
  const o1 = useTransform(p, [0.88, 0.92], [0.25, 1]);
  const o2 = useTransform(p, [0.9, 0.94], [0.25, 1]);
  const o3 = useTransform(p, [0.92, 0.96], [0.25, 1]);
  const o4 = useTransform(p, [0.94, 0.98], [0.25, 1]);
  const outs = [o0, o1, o2, o3, o4];

  return (
    <div ref={ref} className={cn("relative", className)}>
      {/* Desktop: horizontal rail */}
      <div className="hidden md:block">
        <div className="relative h-36">
          <div className="absolute inset-x-[10%] top-1/2 h-px -translate-y-1/2 bg-navy-foreground/15" />
          <motion.div className="absolute inset-x-[10%] top-1/2 h-0.5 origin-left -translate-y-1/2 bg-gradient-to-r from-gold via-cyan to-kente-green" style={{ scaleX: rail }} />
          {STAGES.map((s, i) => (
            <div key={s.k} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${10 + i * 20}%` }}>
              <StageNode i={i} on={ons[i]!} />
            </div>
          ))}
          {/* Split badges around the ledger node */}
          {SPLIT.map((s, k) => (
            <motion.span key={s.label} style={{ opacity: splitOpacity, y: k === 0 ? splitA : k === 2 ? splitC : 0, left: "70%" }} className={cn("absolute top-1/2 ml-9 -translate-y-1/2 whitespace-nowrap rounded-full border bg-navy-abyss/80 px-2.5 py-1 text-[11px] font-semibold tabular backdrop-blur", s.cls)}>
              {s.label} {s.v}
            </motion.span>
          ))}
          {/* Output chips around the last node */}
          <div className="absolute left-[90%] top-1/2 ml-9 flex -translate-y-1/2 flex-col gap-1">
            {OUTPUTS.map((o, k) => (
              <motion.span key={o.label} style={{ opacity: outs[k] }} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-navy-foreground/15 bg-navy-abyss/70 px-2 py-0.5 text-[10px] font-semibold text-navy-foreground [&>svg]:size-3 [&>svg]:text-kente-green">
                {o.icon} {o.label}
              </motion.span>
            ))}
          </div>
          {/* The coin */}
          <motion.div aria-hidden className="absolute top-1/2 z-20 -ml-6 -mt-6 size-12" style={{ left: along, y: bob, opacity: coinOpacity }}>
            <CediCoin size={48} spin={!still} />
            <span className="absolute inset-0 -z-10 rounded-full bg-gold/40 blur-lg" />
          </motion.div>
        </div>
        <ol className="grid grid-cols-5 gap-3">
          {STAGES.map((s, i) => (
            <motion.li key={s.k} style={{ opacity: ons[i] }} className="card-gold-glass rounded-2xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-navy-foreground/60">{i + 1} · {s.title}</p>
              <p className={cn("mt-1 font-display text-base font-semibold tabular", s.tone)}>{s.amount}</p>
              <p className="mt-1 text-xs text-navy-foreground/65">{s.hint}</p>
            </motion.li>
          ))}
        </ol>
      </div>

      {/* Mobile: vertical rail */}
      <div className="relative md:hidden">
        <div className="absolute bottom-[10%] left-[22px] top-[10%] w-px bg-navy-foreground/15" />
        <motion.div className="absolute bottom-[10%] left-[22px] top-[10%] w-0.5 origin-top bg-gradient-to-b from-gold via-cyan to-kente-green" style={{ scaleY: rail }} />
        <motion.div aria-hidden className="absolute left-[22px] z-20 -ml-5 -mt-5 size-10" style={{ top: along, opacity: coinOpacity }}>
          <CediCoin size={40} spin={!still} />
        </motion.div>
        <ol className="space-y-0">
          {STAGES.map((s, i) => (
            <li key={s.k} className="grid min-h-[7.5rem] grid-cols-[44px_1fr] items-center gap-3 py-1">
              <StageNode i={i} on={ons[i]!} />
              <motion.div style={{ opacity: ons[i] }} className="card-gold-glass rounded-2xl p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-navy-foreground/60">{i + 1} · {s.title}</p>
                <p className={cn("mt-0.5 font-display text-sm font-semibold tabular", s.tone)}>{s.amount}</p>
                <p className="mt-1 text-xs text-navy-foreground/65">{s.hint}</p>
                {i === 3 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {SPLIT.map((x) => <span key={x.label} className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular", x.cls)}>{x.label} {x.v}</span>)}
                  </div>
                )}
                {i === 4 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {OUTPUTS.map((o, k) => <motion.span key={o.label} style={{ opacity: outs[k] }} className="inline-flex items-center gap-1 rounded-full border border-navy-foreground/15 px-2 py-0.5 text-[10px] font-semibold text-navy-foreground [&>svg]:size-3 [&>svg]:text-kente-green">{o.icon} {o.label}</motion.span>)}
                  </div>
                )}
              </motion.div>
            </li>
          ))}
        </ol>
      </div>
      <p className="mt-4 text-center text-[11px] text-navy-foreground/50">Illustrative figures · simulated ledger · no real money moves on this site.</p>
    </div>
  );
}
