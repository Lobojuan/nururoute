# NuruRoute Visual Upgrade — Afro-futurist 3D

Investor-facing simulation only. No backend, wallet logic, payments, providers or protected paths change. All work stays in root `src/` plus one approved dependency (Three.js) in root `package.json`.

## Locked decisions (from your answers)

- Mood: **Afro-futurist, bold & visible** — woven Kente geometry, Adinkra-inspired marks, gold as light on deep navy.
- Tech: **Three.js hero only** (lazy-loaded, client-only). Everything else CSS 3D + existing `motion`.
- Hero moment: **Money moving** — MoMo top-up -> wallet -> reserve -> settle -> release as a visible 3D credit flow.
- Approach: **restyle in place** across Landing, Models, Studio, Wallet, Investors; full responsive QA after.
- Protect: mobile performance, reduced-motion, LCP/SEO, Demo-mode labelling.

## What you will see

### 1. Design system refresh (all pages)
- New tokens: kente gold, ember, indigo-navy depth scale, cyan "signal", woven-pattern CSS backgrounds (pure CSS, no images).
- Kente-strip section dividers, Adinkra-abstract icon set (SVG), glass + gold-edge card treatment, depth shadows.
- Typography: bolder display face for headlines (loaded via `<link>`), tighter hero hierarchy. Single H1 per page kept.

### 2. Landing hero — "Money moves, AI answers" (WebGL)
- 3D scene: a MoMo credit stream flows from a phone into a glowing wallet ring, splits into **Reserved / Settled / Released** particle paths, then routes out along light lines to model nodes (OpenAI, Claude, Kimi, African models). Loops every ~12 s, synced to a small live caption strip ("Reserve GHS 0.40 -> Settle GHS 0.32 -> Release GHS 0.08 — simulated").
- Woven gold/navy pattern as the scene floor; Afro-futurist, not neon/Tron.
- Loads after the H1/CTA paint; static poster image on mobile (<768px), low-power devices and reduced-motion.
- "Demo mode" chip stays visible over the scene.

### 3. Model catalogue — 3D product ring
- Upgrade existing `carousel-3d` into a spinnable ring (drag/keys/swipe) with Kente-framed cards, depth blur, gold focus glow.
- Card flip reveals capability/speed/quality/GHS estimate; "Compare" pins two cards side by side with an animated bar reveal.
- Category tabs (Chat & Coding, Image, Video, Voice, Dubbing, Audiobooks) morph the ring contents.
- Mobile: ring becomes a snap-scroll deck with tilt on scroll.

### 4. Creative studio — agency cinematic
- Preview canvas with perspective tilt and film-grain overlay; aspect-ratio picker as small 3D frames that rotate into place.
- Cost estimate animates with `TickingMoney` before "Generate (simulated)".
- Project history as a parallax filmstrip; 4K items keep "provider validation required" badge.

### 5. Wallet — money in motion (CSS/Motion)
- Top-up: coins stream from the selected operator logo into the balance ring; available/reserved/spent as a stacked 3D disc that re-slices on each action.
- Country switch cross-fades currency with local-first display (existing logic untouched).
- Zero-balance: ring dims, gold "top up" pulse; Demo disclaimer always visible.

### 6. Investor page
- Roadmap as a scroll-driven 3D timeline (cards tilt in as you scroll).
- Business-model diagram animates the same reserve/settle/release flow in 2D for consistency with the hero.
- "Open investor simulation" link kept prominent.

### 7. Motion & performance rules
- Every animation ties to meaning (money, reveal, selection). No idle decoration.
- `prefers-reduced-motion`: static posters, instant state changes, ring becomes a grid.
- WebGL: pixel ratio capped at 1.5, <60 draw calls, no CDN assets, unmounted when off-screen.
- LCP: hero text is plain DOM; canvas is `React.lazy` behind `ClientOnly` + IntersectionObserver.

### 8. QA and delivery
- Playwright screenshots of every public route at 390 / 820 / 1280; fix overlap, clipping, horizontal scroll.
- Typecheck, runtime-error and console sweep, privacy scan (no backend/API text), SEO heads unchanged.
- Change log listing only touched files.

## Technical details

New dependency (needs your OK, already given): `three`, `@react-three/fiber@^9`, `@react-three/drei@^10`, `@types/three` — root `package.json` only.

Files touched (root `src/` only):
- `src/styles.css` — tokens, woven patterns, kente utilities, 3D helpers.
- `src/routes/__root.tsx` — display font `<link>`.
- New: `src/components/site/hero-scene.tsx` (R3F, client-only), `src/components/site/hero-poster.tsx`, `src/components/site/kente.tsx` (dividers/patterns/icons), `src/components/site/money-flow.tsx` (2D CSS/Motion flow reused on Wallet + Investors), `src/components/site/product-ring.tsx`.
- Edited: `src/components/site/carousel-3d.tsx`, `primitives.tsx`, `motion.tsx`, `layout.tsx`; routes `index.tsx`, `models.tsx`, `studio.tsx`, `wallet.tsx`, `investors.tsx` (pricing/impact/developers get the token refresh only).

Untouched: `apps/`, `packages/`, `docs/`, migrations, tests, env files, dashboard routes, `/admin`, `/console` logic, ledger/API proxy, all simulated money logic and Demo labels.

## Grill-back: things I want you to confirm or veto
1. Kente "bold & visible" on every page can get heavy — I will keep pattern on hero, dividers and card frames, and leave reading surfaces (pricing tables, forms) calm. Veto if you want pattern everywhere.
2. The hero scene will show fictional model names side by side. Provider logos will NOT be used (no partnership implication) — text nodes only.
3. Mobile gets a poster, not WebGL. If you demo to investors on a phone, the "money moving" story is carried by the Wallet CSS animation instead.
4. This is a large restyle; I will ship it in two passes (system + hero + wallet first, then catalogue/studio/investors) so you can react midway.
