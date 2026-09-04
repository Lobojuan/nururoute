import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Bold woven divider between sections. */
export function KenteDivider({ className, thin }: { className?: string; thin?: boolean }) {
  return <div className={cn(thin ? "kente-strip-thin" : "kente-strip", "w-full", className)} aria-hidden />;
}

/** Card with a kente edge on top and a gold hairline — the signature dark-surface card. */
export function KenteCard({ children, className, edge = "top" }: { children: ReactNode; className?: string; edge?: "top" | "left" | "none" }) {
  return (
    <div className={cn("card-gold-glass overflow-hidden rounded-3xl", className)}>
      {edge === "top" && <div className="kente-strip-thin" aria-hidden />}
      <div className={cn("relative", edge === "left" && "border-l-4 border-gold")}>{children}</div>
    </div>
  );
}

/**
 * Adinkra-inspired abstract marks. Geometric, not literal reproductions.
 * Each is a 24x24 stroke icon so it sits alongside lucide icons.
 */
const marks = {
  /* Concentric rings with a centre — continuity / the wallet */
  ring: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </>
  ),
  /* Diamond lattice — weaving / routing */
  weave: (
    <>
      <path d="M12 3l9 9-9 9-9-9z" />
      <path d="M12 7.5l4.5 4.5-4.5 4.5L7.5 12z" />
      <path d="M3 12h18M12 3v18" />
    </>
  ),
  /* Spiral — growth / value released */
  spiral: <path d="M12 12m0-1a1 1 0 1 0 1 1a2 2 0 1 1-2-2a3.5 3.5 0 1 1 3.5 3.5a5 5 0 1 1-5-5a6.5 6.5 0 1 1 6.5 6.5" />,
  /* Crossed keys / shield — trust */
  shield: (
    <>
      <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z" />
      <path d="M8.5 12h7M12 8.5v7" />
    </>
  ),
  /* Sun rays — light (Nuru) */
  sun: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
    </>
  ),
};

export type AdinkraName = keyof typeof marks;

export function Adinkra({ name, className }: { name: AdinkraName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={cn("size-6", className)} aria-hidden>
      {marks[name]}
    </svg>
  );
}

/** Large decorative kente block for hero corners. */
export function KenteBlock({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none kente-weave rounded-2xl opacity-80", className)} aria-hidden>
      <div className="h-full w-full bg-gradient-to-br from-transparent via-transparent to-navy-abyss/80" />
    </div>
  );
}
