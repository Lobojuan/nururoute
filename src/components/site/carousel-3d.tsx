"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { useEffects3D } from "@/lib/motion-prefs";

export type CarouselItem = { id: string; node: ReactNode; label: string };

/**
 * A true 3D ring carousel (CSS perspective + rotateY). Drag or use the arrows,
 * auto-rotates gently when idle. Keyboard accessible via the arrow buttons.
 */
export function Carousel3D({
  items,
  selected,
  onSelect,
  onActivate,
  activateLabel = "Open",
  className,
  radius,
  cardWidth = 260,
  cardHeight = 320,
  autoRotate = true,
}: {
  items: CarouselItem[];
  selected?: string | undefined;
  onSelect?: (id: string) => void;
  /** Called when the user clicks/taps the already-focused card (or presses Enter on the ring). */
  onActivate?: (id: string) => void;
  activateLabel?: string;
  className?: string;
  radius?: number;
  cardWidth?: number;
  cardHeight?: number;
  autoRotate?: boolean;
}) {
  const reduce = useReducedMotion();
  const fx3d = useEffects3D();
  const n = items.length;
  const step = 360 / n;
  const r = radius ?? Math.round(cardWidth / 2 / Math.tan(Math.PI / n)) + 40;
  const [index, setIndex] = useState(() => Math.max(0, items.findIndex((i) => i.id === selected)));
  const [dragging, setDragging] = useState(false);
  const idle = useRef(true);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => setCompact(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const i = items.findIndex((it) => it.id === selected);
    if (i >= 0) setIndex(i);
  }, [selected, items]);

  useEffect(() => {
    if (!autoRotate || reduce) return;
    const t = setInterval(() => {
      if (idle.current && !dragging) setIndex((i) => i + 1);
    }, 4200);
    return () => clearInterval(t);
  }, [autoRotate, reduce, dragging]);

  const go = (d: number) => {
    idle.current = false;
    setIndex((i) => i + d);
    setTimeout(() => (idle.current = true), 8000);
  };

  useEffect(() => {
    const it = items[((index % n) + n) % n];
    if (it && onSelect && it.id !== selected) onSelect(it.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const pick = (i: number, id: string) => {
    idle.current = false;
    const isActive = ((index % n) + n) % n === i;
    if (isActive && onActivate) { onActivate(id); return; }
    setIndex(i);
    onSelect?.(id);
  };

  const hint = (active: boolean) =>
    onActivate ? (
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-3 bottom-3 z-10 flex items-center justify-center gap-1.5 rounded-full border border-gold/50 bg-navy-abyss/70 px-3 py-1.5 text-[11px] font-semibold text-gold backdrop-blur transition-all duration-500",
          active ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        )}
      >
        {activateLabel} <ChevronRight className="size-3" />
      </span>
    ) : null;

  const scale = compact ? 0.72 : 1;
  const rotation = -index * step;
  const activeIndex = ((index % n) + n) % n;

  const controls = (
      <div className="mt-2 flex items-center justify-center gap-3">
        <button type="button" onClick={() => go(-1)} aria-label="Previous" className="grid size-10 place-items-center rounded-full border border-border bg-card text-foreground shadow-sm transition hover:border-gold/70">
          <ChevronLeft className="size-5" />
        </button>
        <div className="flex items-center gap-1.5" aria-hidden>
          {items.map((it, i) => (
            <span key={it.id} className={cn("h-1.5 rounded-full transition-all", activeIndex === i ? "w-6 bg-gold" : "w-1.5 bg-border")} />
          ))}
        </div>
        <button type="button" onClick={() => go(1)} aria-label="Next" className="grid size-10 place-items-center rounded-full border border-border bg-card text-foreground shadow-sm transition hover:border-gold/70">
          <ChevronRight className="size-5" />
        </button>
      </div>
  );

  // Flat fallback (3D effects off): same height, horizontal snap row, same controls.
  if (!fx3d) {
    return (
      <div className={cn("relative select-none", className)}>
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2" style={{ height: cardHeight * scale + 60 }} role="group" aria-roledescription="carousel" aria-label="Product list">
          {items.map((it, i) => (
            <button
              type="button"
              key={it.id}
              aria-label={it.label}
              aria-pressed={activeIndex === i}
              onClick={() => pick(i, it.id)}
              className={cn("relative mt-[30px] shrink-0 snap-center overflow-hidden rounded-2xl border text-left outline-none transition-[opacity,box-shadow] focus-visible:ring-2 focus-visible:ring-cyan", activeIndex === i ? "border-gold/60 opacity-100 shadow-[0_0_0_1px_oklch(0.82_0.15_80/0.5)]" : "border-navy-foreground/10 opacity-70")}
              style={{ width: cardWidth * scale, height: cardHeight * scale }}
            >
              <span className="kente-strip-thin absolute inset-x-0 top-0 z-10" aria-hidden />
              <div style={{ zoom: scale, width: cardWidth, height: onActivate ? cardHeight - 46 : cardHeight }}>{it.node}</div>
              {hint(activeIndex === i)}
            </button>
          ))}
        </div>
        {controls}
      </div>
    );
  }

  return (
    <div className={cn("relative select-none", className)}>
      <div
        className="relative mx-auto overflow-hidden outline-none"
        style={{ height: cardHeight * scale + 60, perspective: Math.max(1400, r * scale * 2.4) }}
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label="Product ring"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
          if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
          if (e.key === "Enter" && onActivate && e.target === e.currentTarget) {
            const it = items[activeIndex];
            if (it) onActivate(it.id);
          }
        }}
        onPointerDown={() => setDragging(true)}
        onPointerUp={() => setDragging(false)}
        onPointerLeave={() => setDragging(false)}
      >
        <motion.div
          className="absolute left-1/2 top-[30px]"
          style={{ transformStyle: "preserve-3d", width: cardWidth * scale, height: cardHeight * scale, marginLeft: -(cardWidth * scale) / 2, z: -r * scale }}
          animate={{ rotateY: rotation }}
          transition={{ type: "spring", stiffness: 60, damping: 16 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.05}
          onDragEnd={(_, info) => {
            if (info.offset.x < -40) go(1);
            else if (info.offset.x > 40) go(-1);
          }}
        >
          {items.map((it, i) => {
            const active = ((index % n) + n) % n === i;
            return (
              <button
                type="button"
                key={it.id}
                aria-label={it.label}
                aria-pressed={active}
                onClick={() => pick(i, it.id)}
                className={cn(
                  "absolute inset-0 overflow-hidden rounded-2xl border text-left outline-none transition-[opacity,filter,box-shadow,transform] duration-500 focus-visible:ring-2 focus-visible:ring-cyan",
                  active
                    ? "cursor-pointer border-gold/60 opacity-100 shadow-[0_0_0_1px_oklch(0.82_0.15_80/0.5),0_30px_80px_-30px_oklch(0.82_0.15_80/0.6)] hover:shadow-[0_0_0_2px_oklch(0.82_0.15_80/0.8),0_40px_90px_-30px_oklch(0.82_0.15_80/0.8)]"
                    : "cursor-pointer border-navy-foreground/10 opacity-50 blur-[0.6px] saturate-[0.7] hover:opacity-75 hover:blur-0",
                )}
                style={{
                  transform: `rotateY(${i * step}deg) translateZ(${r * scale}px)`,
                  backfaceVisibility: "hidden",
                }}
              >
                <span className="kente-strip-thin absolute inset-x-0 top-0 z-10" aria-hidden />
                <div style={{ zoom: scale, width: cardWidth, height: onActivate ? cardHeight - 46 : cardHeight }}>{it.node}</div>
                {hint(active)}
              </button>
            );
          })}
        </motion.div>
      </div>
      {controls}
    </div>
  );
}
