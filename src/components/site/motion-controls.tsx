"use client";
import { Sparkles, Box, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMotionPrefs, type MotionPreset } from "@/lib/motion-prefs";
import { useSoundPref } from "@/lib/sound";

const PRESETS: { id: MotionPreset; label: string; hint: string }[] = [
  { id: "full", label: "Full", hint: "All animations and 3D" },
  { id: "balanced", label: "Balanced", hint: "Animations on, 3D off — lighter on older phones" },
  { id: "reduced", label: "Reduced", hint: "Minimal motion — fades only" },
];

/** Compact motion / 3D preference control. Layout never changes between presets. */
export function MotionControls({ className }: { className?: string }) {
  const { preset, effects3d, hydrated, setPreset, setEffects3d } = useMotionPrefs();
  const sound = useSoundPref();
  return (
    <div className={cn("rounded-2xl border border-border bg-background/60 p-3", className)} aria-busy={!hydrated}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Sparkles className="size-3.5" aria-hidden /> Motion</p>
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium">
          <Box className="size-3.5 text-muted-foreground" aria-hidden /> 3D effects
          <button
            type="button"
            role="switch"
            aria-checked={effects3d}
            aria-label="3D effects"
            disabled={!hydrated}
            onClick={() => setEffects3d(!effects3d)}
            className={cn("relative h-5 w-9 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50", effects3d ? "bg-gold" : "bg-muted-foreground/30")}
          >
            <span className={cn("absolute top-0.5 size-4 rounded-full bg-background shadow transition-[left]", effects3d ? "left-[18px]" : "left-0.5")} />
          </button>
        </label>
      </div>
      <div role="radiogroup" aria-label="Motion preset" className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={preset === p.id}
            title={p.hint}
            disabled={!hydrated}
            onClick={() => setPreset(p.id)}
            className={cn("rounded-lg px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50", preset === p.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">{PRESETS.find((p) => p.id === preset)?.hint}. Saved on this device.</p>
      <label className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2 text-xs font-medium">
        <span className="inline-flex items-center gap-1.5"><Volume2 className="size-3.5 text-muted-foreground" aria-hidden /> Coin sounds <span className="font-normal text-muted-foreground">· off by default</span></span>
        <button
          type="button"
          role="switch"
          aria-checked={sound.on}
          aria-label="Coin sounds"
          disabled={!sound.hydrated}
          onClick={() => sound.set(!sound.on)}
          className={cn("relative h-5 w-9 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50", sound.on ? "bg-gold" : "bg-muted-foreground/30")}
        >
          <span className={cn("absolute top-0.5 size-4 rounded-full bg-background shadow transition-[left]", sound.on ? "left-[18px]" : "left-0.5")} />
        </button>
      </label>
    </div>
  );
}
