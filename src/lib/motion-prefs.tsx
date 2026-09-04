/**
 * Visitor-controlled motion preferences (browser-local).
 *
 * Presets:
 *  - full:     all animations + 3D effects (WebGL hero, product ring, tilt, balance disc)
 *  - balanced: animations on, 3D effects off (flat fallbacks keep the same layout)
 *  - reduced:  Motion's reducedMotion="always" — transforms/layout animations are skipped,
 *              opacity fades remain; 3D off. Also the default when the OS asks for reduced motion.
 *
 * `effects3d` can be toggled independently of the preset. Every fallback keeps the
 * same DOM footprint so switching never shifts layout.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { MotionConfig } from "motion/react";

export type MotionPreset = "full" | "balanced" | "reduced";
export const MOTION_KEY = "nururoute-motion";

type Prefs = { preset: MotionPreset; effects3d: boolean };
type Ctx = Prefs & {
  hydrated: boolean;
  /** True when the visitor (or their OS) asked for reduced motion. */
  reduced: boolean;
  setPreset: (p: MotionPreset) => void;
  setEffects3d: (on: boolean) => void;
};

const DEFAULT: Prefs = { preset: "full", effects3d: true };
const MotionPrefsContext = createContext<Ctx | null>(null);

export function MotionPrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let next = DEFAULT;
    try {
      const raw = window.localStorage.getItem(MOTION_KEY);
      if (raw) next = { ...DEFAULT, ...(JSON.parse(raw) as Partial<Prefs>) };
      else if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) next = { preset: "reduced", effects3d: false };
    } catch {
      /* ignore */
    }
    setPrefs(next);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(MOTION_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
    document.documentElement.dataset["motion"] = prefs.preset;
    document.documentElement.dataset["fx3d"] = prefs.effects3d ? "on" : "off";
  }, [prefs, hydrated]);

  const setPreset = useCallback((preset: MotionPreset) => setPrefs((p) => ({ preset, effects3d: preset === "full" ? true : preset === "reduced" ? false : p.effects3d })), []);
  const setEffects3d = useCallback((effects3d: boolean) => setPrefs((p) => ({ preset: p.preset === "reduced" && effects3d ? "balanced" : p.preset, effects3d })), []);

  const value = useMemo<Ctx>(
    () => ({ ...prefs, hydrated, reduced: prefs.preset === "reduced", setPreset, setEffects3d }),
    [prefs, hydrated, setPreset, setEffects3d],
  );

  return (
    <MotionPrefsContext.Provider value={value}>
      <MotionConfig reducedMotion={prefs.preset === "reduced" ? "always" : "user"}>{children}</MotionConfig>
    </MotionPrefsContext.Provider>
  );
}

export function useMotionPrefs(): Ctx {
  const ctx = useContext(MotionPrefsContext);
  // Safe default outside the provider (tests, isolated renders).
  return ctx ?? { ...DEFAULT, hydrated: false, reduced: false, setPreset: () => {}, setEffects3d: () => {} };
}

/** Convenience: true when 3D effects should render (after hydration, so SSR and first paint agree). */
export function useEffects3D() {
  const { effects3d, hydrated } = useMotionPrefs();
  return hydrated && effects3d;
}
