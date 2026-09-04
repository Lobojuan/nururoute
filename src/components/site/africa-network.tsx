"use client";
/**
 * Africa AI network field — a cinematic, lightweight SVG (no WebGL, no globe).
 * Accra is the origin; soft cyan routing lines reach planned cities. Every dot,
 * line and pulse is illustrative: the platform is a simulation, no live traffic exists.
 */
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { PINS, type Pin } from "@/lib/heartbeat";

// Coarse Africa coastline (lon, lat) — deliberately simplified, editorial silhouette.
const COAST: [number, number][] = [
  [-5.8, 35.8], [3, 36.7], [10.2, 37], [13.2, 32.9], [20, 32.1], [29.9, 31.2], [32.3, 31.3], [32.5, 30],
  [35.8, 23.9], [37.2, 19.6], [39.5, 15.6], [43.1, 11.6], [51.3, 11.8], [45.3, 2], [42.5, -0.4], [39.7, -4],
  [39.3, -6.8], [40.5, -12], [34.9, -19.8], [32.6, -26], [31, -29.9], [26, -33.8], [20, -34.8], [18.4, -33.9],
  [15.2, -26.6], [14.5, -22.9], [12, -15.5], [13.2, -8.8], [11.9, -4.8], [9.4, 0.4], [9.7, 4], [6.5, 4.3],
  [3.4, 6.4], [-0.2, 5.5], [-4, 5.3], [-7.7, 4.4], [-10.8, 6.3], [-13.2, 8.5], [-16.5, 12.3], [-17.4, 14.7],
  [-16, 18.1], [-15.9, 23.7], [-13, 27.6], [-9.6, 30.4], [-7.6, 33.6],
];

const LON0 = -22, LON1 = 56, LAT0 = 40, LAT1 = -38;
const W = 600, H = 600;
export function project(lon: number, lat: number) {
  return { x: ((lon - LON0) / (LON1 - LON0)) * W, y: ((LAT0 - lat) / (LAT0 - LAT1)) * H };
}

const ORIGIN = PINS[0]!;

function arc(a: Pin, b: Pin) {
  const p = project(a.lon, a.lat);
  const q = project(b.lon, b.lat);
  const mx = (p.x + q.x) / 2;
  const my = (p.y + q.y) / 2;
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const len = Math.hypot(dx, dy) || 1;
  // Bow every route gently to the upper-left of its chord so lines read as light paths, not spokes.
  const cx = mx - (dy / len) * Math.min(90, len * 0.22);
  const cy = my + (dx / len) * Math.min(90, len * 0.22);
  return `M${p.x.toFixed(1)},${p.y.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${q.x.toFixed(1)},${q.y.toFixed(1)}`;
}

export function AfricaNetwork({ active, animate = true, className, label = true }: { active?: string | undefined; animate?: boolean; className?: string; label?: boolean }) {
  const [hover, setHover] = useState<string | null>(null);
  const focus = hover ?? active;
  const coast = useMemo(() => COAST.map(([lon, lat]) => { const p = project(lon, lat); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(" "), []);
  const routes = useMemo(() => PINS.slice(1).map((p) => ({ pin: p, d: arc(ORIGIN, p) })), []);
  const o = project(ORIGIN.lon, ORIGIN.lat);
  const focusPin = PINS.find((p) => p.code === focus);

  return (
    <div className={cn("relative w-full", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Simulated NuruRoute network: Accra origin with planned routes to other African cities">
        <defs>
          <radialGradient id="an-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(0.82 0.15 80)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="oklch(0.82 0.15 80)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="an-land" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.3 0.08 265)" />
            <stop offset="100%" stopColor="oklch(0.19 0.06 264)" />
          </linearGradient>
          <pattern id="an-dots" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="oklch(0.8 0.13 210)" opacity="0.28" />
          </pattern>
          <clipPath id="an-clip"><polygon points={coast} /></clipPath>
        </defs>

        {/* Land */}
        <polygon points={coast} fill="url(#an-land)" stroke="oklch(0.82 0.15 80 / 0.35)" strokeWidth="1.2" strokeLinejoin="round" />
        <rect width={W} height={H} fill="url(#an-dots)" clipPath="url(#an-clip)" />

        {/* Routes */}
        <g fill="none" strokeLinecap="round">
          {routes.map(({ pin, d }) => {
            const on = focus === pin.code;
            return (
              <g key={pin.code}>
                <path d={d} stroke="oklch(0.8 0.13 210)" strokeOpacity={on ? 0.55 : 0.16} strokeWidth={on ? 2.2 : 1.2} />
                {animate && <path d={d} className="route-line" stroke={on ? "oklch(0.9 0.14 88)" : "oklch(0.8 0.13 210)"} strokeOpacity={on ? 1 : 0.5} strokeWidth={on ? 2.2 : 1.4} />}
              </g>
            );
          })}
        </g>

        {/* Origin glow */}
        <circle cx={o.x} cy={o.y} r="46" fill="url(#an-glow)" />

        {/* City nodes */}
        {PINS.map((p) => {
          const c = project(p.lon, p.lat);
          const on = focus === p.code;
          return (
            <g key={p.code} className="cursor-pointer" onPointerEnter={() => setHover(p.code)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(p.code)} onBlur={() => setHover(null)} tabIndex={0} role="button" aria-label={`${p.city}, ${p.country} — ${p.launch ? "launch market" : "planned"} (simulated)`}>
              <circle cx={c.x} cy={c.y} r={on ? 16 : 12} fill="transparent" />
              {(on || p.launch) && <circle cx={c.x} cy={c.y} r={p.launch ? 11 : 9} fill={p.launch ? "oklch(0.82 0.15 80)" : "oklch(0.8 0.13 210)"} opacity="0.22" className={animate ? "route-node" : undefined} />}
              <circle cx={c.x} cy={c.y} r={p.launch ? 5 : on ? 4.2 : 3} fill={p.launch ? "oklch(0.9 0.14 88)" : "oklch(0.8 0.13 210)"} stroke="oklch(0.14 0.05 266)" strokeWidth="1.5" />
            </g>
          );
        })}

        {/* Origin label */}
        <text x={o.x - 14} y={o.y + 26} fontSize="13" fontWeight="700" fill="oklch(0.9 0.14 88)" fontFamily="inherit">Accra</text>
        <text x={o.x - 14} y={o.y + 40} fontSize="9.5" fill="oklch(0.985 0.004 240 / 0.6)" fontFamily="inherit">origin · launch market</text>

        {/* Focused city label */}
        {focusPin && !focusPin.launch && (() => { const c = project(focusPin.lon, focusPin.lat); const right = c.x < W * 0.6; return (
          <g>
            <rect x={right ? c.x + 12 : c.x - 132} y={c.y - 22} width="120" height="34" rx="8" fill="oklch(0.14 0.05 266 / 0.9)" stroke="oklch(0.82 0.15 80 / 0.4)" />
            <text x={right ? c.x + 22 : c.x - 122} y={c.y - 7} fontSize="12" fontWeight="700" fill="oklch(0.985 0.004 240)" fontFamily="inherit">{focusPin.city}</text>
            <text x={right ? c.x + 22 : c.x - 122} y={c.y + 6} fontSize="9.5" fill="oklch(0.985 0.004 240 / 0.6)" fontFamily="inherit">{focusPin.country} · planned</text>
          </g>
        ); })()}
      </svg>
      {label && (
        <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-navy/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-navy-foreground/70">Simulated network · 15 countries</span>
      )}
    </div>
  );
}

export default AfricaNetwork;
