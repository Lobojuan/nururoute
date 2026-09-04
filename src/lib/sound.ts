/**
 * Opt-in micro-sounds. Off by default, persisted per device, synthesised with
 * WebAudio (no assets, no network). Never plays unless the user turned it on.
 */
import { useCallback, useEffect, useState } from "react";

export const SOUND_KEY = "nururoute-sound";
const listeners = new Set<() => void>();
let cached: boolean | null = null;

export function soundEnabled() {
  if (cached !== null) return cached;
  if (typeof window === "undefined") return false;
  cached = window.localStorage.getItem(SOUND_KEY) === "on";
  return cached;
}

export function setSoundEnabled(on: boolean) {
  cached = on;
  try {
    window.localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function useSoundPref() {
  const [on, setOn] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const sync = () => setOn(soundEnabled());
    sync();
    setHydrated(true);
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);
  const set = useCallback((v: boolean) => {
    setSoundEnabled(v);
    if (v) playCoin("settle");
  }, []);
  return { on, hydrated, set };
}

let ctx: AudioContext | null = null;
function audio() {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export type CoinSound = "topup" | "reserve" | "settle" | "release";

/** Short bell-like "coin" tick. Each kind has its own pitch so the ledger becomes audible. */
export function playCoin(kind: CoinSound) {
  if (!soundEnabled()) return;
  const ac = audio();
  if (!ac) return;
  const base = { topup: 1046, reserve: 784, settle: 1318, release: 1568 }[kind];
  const t0 = ac.currentTime;
  [1, 2.01, 2.99].forEach((mult, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(base * mult, t0);
    const peak = 0.11 / (i + 1);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35 - i * 0.05);
    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + 0.4);
  });
  if (kind === "release") {
    // little upward second note: money coming back
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(base * 1.25, t0 + 0.12);
    gain.gain.setValueAtTime(0, t0 + 0.12);
    gain.gain.linearRampToValueAtTime(0.08, t0 + 0.125);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
    osc.connect(gain).connect(ac.destination);
    osc.start(t0 + 0.12);
    osc.stop(t0 + 0.5);
  }
}
