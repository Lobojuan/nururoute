"use client";
/**
 * Cinema-grade creator moments (landing). Four staged, fully simulated demos —
 * image (blur → sharp), video (storyboard → frames → final), voice (waveform + language),
 * code (plan → build → ship) — each synchronised with a wallet strip that reserves,
 * settles and releases in step with the visual. Nothing is generated or charged.
 */
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { Image as ImageIcon, Film, Mic, Code2, RotateCcw, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { TickingMoney } from "@/components/site/motion";
import { CediCoin } from "@/components/site/cedi";
import { CinematicReveal } from "@/components/site/cinematic-reveal";
import { DemoBadge } from "@/components/site/primitives";
import { formatGhs } from "@/lib/demo";

type Kind = "image" | "video" | "voice" | "code";
const EASE = [0.22, 1, 0.36, 1] as const;

const MOMENTS: Record<Kind, { label: string; icon: React.ReactNode; prompt: string; reserved: number; actual: number; steps: [string, string, string] }> = {
  image: { label: "Image", icon: <ImageIcon />, prompt: "Sobolo bottle on wet Accra asphalt, golden hour, editorial", reserved: 120, actual: 90, steps: ["Compose", "Render", "Sharpen"] },
  video: { label: "Video", icon: <Film />, prompt: "15 s beverage spot, night market, slow dolly", reserved: 6800, actual: 6300, steps: ["Storyboard", "Frames", "Final cut"] },
  voice: { label: "Voice", icon: <Mic />, prompt: "Radio read, warm, 20 s", reserved: 90, actual: 72, steps: ["Script", "Voice", "Master"] },
  code: { label: "Code", icon: <Code2 />, prompt: "Add MoMo receipt export to the invoices page", reserved: 320, actual: 245, steps: ["Plan", "Build", "Ship"] },
};
const LANGS = ["Ghanaian English", "Twi", "Ga", "Hausa", "Swahili"];
const DUR = 4200;

// 0 idle/reserve, 1 stage A, 2 stage B, 3 settled, 4 released
type Stage = 0 | 1 | 2 | 3 | 4;

function useStages(runKey: number, still: boolean) {
  const [stage, setStage] = useState<Stage>(still ? 4 : 0);
  useEffect(() => {
    if (still) { setStage(4); return; }
    setStage(0);
    const ts = [
      window.setTimeout(() => setStage(1), 300),
      window.setTimeout(() => setStage(2), 1500),
      window.setTimeout(() => setStage(3), 2900),
      window.setTimeout(() => setStage(4), 3600),
    ];
    return () => ts.forEach((t) => window.clearTimeout(t));
  }, [runKey, still]);
  return stage;
}

function Panel({ seed, i, sharp }: { seed: number; i: number; sharp: boolean }) {
  const h1 = (seed + i * 47) % 360;
  const h2 = (seed + i * 91 + 60) % 360;
  return (
    <div className={cn("absolute inset-0 transition-[filter] duration-700", sharp ? "blur-0" : "blur-md")} style={{ background: `radial-gradient(70% 70% at ${30 + (i * 13) % 40}% ${35 + (i * 29) % 40}%, oklch(0.7 0.16 ${h1}) 0%, transparent 65%), linear-gradient(160deg, oklch(0.28 0.07 ${h2}), oklch(0.12 0.04 265))` }} />
  );
}

function VideoMoment({ stage, seed }: { stage: Stage; seed: number }) {
  const reduce = useReducedMotion();
  return (
    <div className="absolute inset-0 bg-navy-abyss">
      <AnimatePresence mode="wait" initial={false}>
        {stage <= 1 && (
          <motion.div key="board" className="absolute inset-0 grid grid-cols-3 gap-1.5 p-3" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.4 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div key={i} className="relative overflow-hidden rounded-md border border-gold/30" initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, ease: EASE }}>
                <Panel seed={seed} i={i} sharp={false} />
                <span className="absolute left-1.5 top-1 text-[9px] font-semibold text-navy-foreground/80">SC {i + 1}</span>
              </motion.div>
            ))}
            <span className="absolute bottom-2 left-3 rounded-full bg-navy/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-navy-foreground/80">Storyboard</span>
          </motion.div>
        )}
        {stage === 2 && (
          <motion.div key="frames" className="absolute inset-0 flex items-center gap-1 overflow-hidden px-3" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            <motion.div className="flex gap-1" animate={reduce ? {} : { x: [0, -260] }} transition={{ duration: 1.3, ease: "linear" }}>
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="relative h-28 w-20 shrink-0 overflow-hidden rounded border border-navy-foreground/20"><Panel seed={seed} i={i} sharp /></div>
              ))}
            </motion.div>
            <span className="absolute bottom-2 left-3 rounded-full bg-navy/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-navy-foreground/80">Frame sequence · 24 fps</span>
          </motion.div>
        )}
        {stage >= 3 && (
          <motion.div key="final" className="absolute inset-0 grid place-items-center p-4" initial={reduce ? false : { opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: EASE }}>
            <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-xl border border-gold/50 shadow-gold-glow">
              <Panel seed={seed} i={2} sharp />
              <div className="absolute inset-x-0 top-0 h-[8%] bg-navy-abyss" />
              <div className="absolute inset-x-0 bottom-0 h-[8%] bg-navy-abyss" />
              <div className="absolute bottom-[14%] left-4 text-navy-foreground">
                <p className="font-display text-sm font-bold">Night Market · 15 s</p>
                <p className="text-[10px] text-navy-foreground/70">1080p · simulated final cut</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function VoiceMoment({ stage, seed, lang, setLang }: { stage: Stage; seed: number; lang: string; setLang: (l: string) => void }) {
  const reduce = useReducedMotion();
  const live = stage === 2;
  return (
    <div className="absolute inset-0 flex flex-col bg-[radial-gradient(circle_at_50%_70%,oklch(0.28_0.08_265),oklch(0.12_0.04_265)_70%)] p-3">
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Narration language (simulated)">
        {LANGS.map((l) => (
          <button key={l} type="button" role="radio" aria-checked={lang === l} onClick={() => setLang(l)} className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors", lang === l ? "border-gold bg-gold text-gold-foreground" : "border-navy-foreground/20 text-navy-foreground/75 hover:border-gold/60")}>{l}</button>
        ))}
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="flex h-24 w-full items-center justify-center gap-[3px]" aria-hidden>
          {Array.from({ length: 56 }).map((_, i) => {
            const base = 10 + ((seed >> (i % 20)) % 60) + Math.abs(Math.sin(i * 0.45)) * 25;
            const h = stage >= 1 ? base : 6;
            return (
              <motion.span key={i} className="w-full max-w-[5px] rounded-full bg-gradient-to-t from-cyan to-gold"
                animate={reduce ? { height: `${h}%` } : live ? { height: [`${h * 0.4}%`, `${h}%`, `${h * 0.55}%`] } : { height: `${stage >= 3 ? h * 0.7 : h}%` }}
                transition={live ? { duration: 0.7 + (i % 5) * 0.08, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" } : { type: "spring", stiffness: 160, damping: 16, delay: i * 0.01 }} />
            );
          })}
        </div>
      </div>
      <p className="text-center text-[11px] text-navy-foreground/70">{stage < 1 ? "Preparing script…" : live ? `Speaking ${lang}… (simulated)` : `${lang} · 20 s mastered · simulated`}</p>
    </div>
  );
}

function CodeMoment({ stage }: { stage: Stage }) {
  const lines = [
    { at: 1, t: "plan   › read invoices page, wallet receipt schema", c: "text-cyan" },
    { at: 1, t: "plan   › 3 files, 1 test, no schema change", c: "text-cyan" },
    { at: 2, t: "build  › src/invoices/export.ts        +48 −3", c: "text-gold" },
    { at: 2, t: "build  › src/invoices/ReceiptButton.tsx +31", c: "text-gold" },
    { at: 2, t: "test   › receipt export ✓ 4 passed", c: "text-navy-foreground/80" },
    { at: 3, t: "ship   › preview ready · cost settled from reservation", c: "text-kente-green" },
  ];
  const shown = lines.filter((l) => l.at <= stage);
  return (
    <div className="terminal absolute inset-0 rounded-none p-4 text-[11px] leading-relaxed text-navy-foreground sm:text-xs">
      <div className="mb-2 flex items-center gap-1.5" aria-hidden><span className="size-2 rounded-full bg-ember" /><span className="size-2 rounded-full bg-gold" /><span className="size-2 rounded-full bg-kente-green" /><span className="ml-2 text-navy-foreground/50">nururoute agent · simulated</span></div>
      <p className="text-navy-foreground/60">$ nuru run "Add MoMo receipt export to the invoices page"</p>
      <AnimatePresence initial={false}>
        {shown.map((l, i) => (
          <motion.p key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, delay: (i % 2) * 0.15 }} className={l.c}>{l.t}</motion.p>
        ))}
      </AnimatePresence>
      {stage < 4 && <p className="caret text-navy-foreground/60" />}
      {stage >= 4 && <p className="mt-1 inline-flex items-center gap-1 text-kente-green"><Check className="size-3" /> shipped · nothing was executed for real</p>}
    </div>
  );
}

export function CreatorMoments({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const [kind, setKind] = useState<Kind>("video");
  const [lang, setLang] = useState(LANGS[1]!);
  const [run, setRun] = useState(0);
  const host = useRef<HTMLDivElement>(null);
  const inView = useInView(host, { once: true, margin: "-20%" });
  useEffect(() => { if (inView) setRun((r) => r + 1); }, [inView]);
  const m = MOMENTS[kind];
  const still = !!reduce;
  const stage = useStages(run, still);
  const seed = useMemo(() => (kind.length * 977 + run * 131 + 17) % 100000, [kind, run]);

  // Wallet strip: available 50.00 start; reserve at 0→1; settle at 3; release at 4.
  const AVAIL = 5000;
  const reserved = stage >= 1 && stage < 4 ? (stage >= 3 ? 0 : m.reserved) : 0;
  const spent = stage >= 3 ? m.actual : 0;
  const held = stage >= 1 && stage < 3 ? m.reserved : 0;
  const available = AVAIL - held - spent;
  const released = m.reserved - m.actual;

  useEffect(() => {
    if (!inView) return;
    const t = window.setInterval(() => setRun((r) => r + 1), still ? 999999 : DUR + 2600);
    return () => window.clearInterval(t);
  }, [inView, still]);

  const select = (k: Kind) => { setKind(k); setRun((r) => r + 1); };

  return (
    <div ref={host} className={cn("grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch", className)}>
      {/* Left: picker + steps + wallet */}
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-4 gap-2" role="tablist" aria-label="Creator moment">
          {(Object.keys(MOMENTS) as Kind[]).map((k) => (
            <button key={k} role="tab" aria-selected={kind === k} type="button" onClick={() => select(k)} className={cn("flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-xs font-semibold transition-all [&>svg]:size-5", kind === k ? "border-gold bg-gold/10 text-gold shadow-gold-glow" : "border-navy-foreground/15 text-navy-foreground/70 hover:border-gold/50 hover:text-navy-foreground")}>
              {MOMENTS[k].icon} {MOMENTS[k].label}
            </button>
          ))}
        </div>
        <div className="card-gold-glass rounded-2xl p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-navy-foreground/55">Brief · simulated</p>
          <p className="mt-1 text-sm text-navy-foreground">“{m.prompt}”</p>
          <ol className="mt-4 grid grid-cols-3 gap-2">
            {m.steps.map((s, i) => {
              const done = stage >= i + 1 && (i < 2 || stage >= 3);
              const now = stage === i + 1 || (i === 2 && stage === 3);
              return (
                <li key={s} className={cn("rounded-xl border px-2 py-2 text-center text-[11px] font-semibold transition-colors", done && !now ? "border-kente-green/50 text-kente-green" : now ? "border-gold bg-gold/10 text-gold" : "border-navy-foreground/10 text-navy-foreground/45")}>{s}</li>
              );
            })}
          </ol>
        </div>
        <div className="card-gold-glass rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-navy-foreground/55">Wallet · moves with the picture</p>
            <CediCoin size={22} spin={stage > 0 && stage < 3} />
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-navy-foreground">
            {[["Available", available, "text-gold"], ["Reserved", stage >= 1 && stage < 3 ? m.reserved : reserved, "text-cyan"], ["Spent", spent, "text-navy-foreground"]].map(([k, v, c]) => (
              <div key={k as string} className="rounded-xl bg-navy-foreground/5 px-2.5 py-2">
                <dt className="text-[10px] uppercase tracking-wider text-navy-foreground/55">{k as string}</dt>
                <dd className={cn("mt-0.5 text-sm font-semibold", c as string)}><TickingMoney pesewas={v as number} /></dd>
              </div>
            ))}
          </dl>
          <div className="mt-2 flex h-5 items-center justify-between text-[11px]">
            <span className="text-navy-foreground/55">{stage === 0 ? "Estimate shown before the job" : stage < 3 ? `Held ${formatGhs(m.reserved)} · never below zero` : stage === 3 ? `Settled ${formatGhs(m.actual)}` : "Complete"}</span>
            <AnimatePresence>{stage >= 4 && released > 0 && <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="font-semibold text-kente-green tabular">+ {formatGhs(released)} released</motion.span>}</AnimatePresence>
          </div>
        </div>
        <button type="button" onClick={() => setRun((r) => r + 1)} className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-navy-foreground/70 hover:text-gold"><RotateCcw className="size-3.5" /> Replay</button>
      </div>

      {/* Right: the stage */}
      <div className="relative min-h-[300px] overflow-hidden rounded-3xl border border-gold/30 bg-navy-abyss shadow-depth sm:min-h-[380px]">
        <div className="kente-strip-thin absolute inset-x-0 top-0 z-10" aria-hidden />
        <div className="absolute inset-0 top-1">
          {kind === "image" && <CinematicReveal kind="image" prompt={m.prompt} reserved={m.reserved} actual={m.actual} runKey={run} />}
          {kind === "video" && <VideoMoment stage={stage} seed={seed} />}
          {kind === "voice" && <VoiceMoment stage={stage} seed={seed} lang={lang} setLang={setLang} />}
          {kind === "code" && <CodeMoment stage={stage} />}
        </div>
        {kind !== "image" && <div className="absolute right-3 top-3 z-10"><DemoBadge /></div>}
        <div className="grain pointer-events-none absolute inset-0" aria-hidden />
      </div>
    </div>
  );
}
