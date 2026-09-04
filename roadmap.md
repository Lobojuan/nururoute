# NuruNode roadmap

## In progress
- [ ] Public NuruRoute experience in root TanStack app (`src/`): landing, models, wallet demo, developers, studio, pricing, impact, investors + demo header balance + support widget. Frontend only; backend/ledger/payments untouched.
- HARD STOP RULE (user, 2026-09-03): edit only root public TanStack frontend (`src/`). Never touch apps/web, apps/api, packages, docs, migrations, tests, env files or dashboard routes; stop and ask if a change outside `src/` would be needed.

## Queued
- (none)

## Done
- [x] Safe MVP foundation (monorepo, docs, DB ledger, mock adapters, API, tests, dashboard v1)
- [x] End-to-end dashboard walk-through verified balances
- [x] MTN MoMo **sandbox** adapter behind `PAYMENT_ADAPTER=momo_sandbox` (no live money)
- [x] Per-organisation pricing (`org_model_prices`) + developer API keys
- [x] Dashboard rebuild (7 screens, NuruNode brand, mobile responsive, screenshots delivered)
- [x] `bun run dev:all` script (API + web together)

## Approved decisions (2026-09-03)
- Editor preview stays a status page; the real dashboard lives in `apps/web`.
- Reservation accounting model as documented in `docs/ledger-rules.md`.
- Deliberately high test pricing for the large mock model.
- Google sign-in remains a 501 scaffold until credentials are explicitly approved.
- Plain CSS in `apps/web` (no Tailwind/shadcn).
- API restricted to `mock` and `momo_sandbox` adapters; live environments rejected.

## Investor simulation upgrade (2026-09-03)
- [ ] Console route (`/console`): real data via server-side proxy to local API, simulated fallback; syncs header wallet
- [ ] Server proxy `src/routes/api/nuru/$.ts` (no CORS/API changes needed)
- [ ] Landing: motion animations, 3D studio carousel, agency spotlight, named routing targets (OpenAI, Grok, Kimi K3, Claude Code, Codex — no partnership claims)
- [ ] Studio: agency mode, 3D product carousel, audiobook flow polish
- [ ] Positioning: pan-African — "AI for all Africans, paid with mobile money, no credit card" (MTN MoMo, M-Pesa, Airtel Money, Orange Money, Wave shown as roadmap rails, not live)
- [ ] Header: Console nav + "Open dashboard" (local Next dashboard)

## Requested 13:03 UTC — Option A console (real orgs sign in from the public site)
- [x] Sign-in-gated `/console` in public frontend (same-origin proxy `/api/nuru/*`, no CORS needed)
- [ ] Confirm proxy target is configurable so the hosted preview can reach a deployed API
- [x] African models in ledger catalogue (approved backend edit: packages/provider-adapters/src/index.ts) + `/models` ledger runner

## Requested 13:06–13:09 UTC
- [x] Pan-African mobile-money demo (15 countries, operator detection, illustrative local currency) — public wallet, landing rails, impact copy
- [~] Deploy Fastify API — deploy/ artifacts ready (Dockerfile, fly.toml, README); needs user to run on a host with Postgres, then set NURU_API_URL secret
- [x] 'Do all': deploy artifacts prepared; NURU_API_URL secret pending a real URL

## Hardening brief + admin demo (approved 13:48 UTC 2026-09-03)
- [ ] SEO: h1 on all public pages, canonical/og:url, sitemap route, robots Sitemap line
- [ ] Demo safeguards note (footer + action areas), Ghana launch vs planned country labels, FX estimate note
- [ ] Privacy sweep of public copy (no backend names/infra)
- [ ] `/admin` demo area (unlinked, noindex, localStorage only): gate, pricing control centre + versioned table + audit log, support centre + simulated assistant
- [ ] Responsive QA 390/820/1280 incl. admin; typecheck; change log
- [ ] Admin Knowledge Base (approved 14:03 UTC): editable demo article catalogue with status/owner/reviewed date; workbench answers only from Approved articles with sources, otherwise queues simulated human ticket; safety rules; public widget stays scripted
- [!] BLOCKED — "Replace mock AI provider in API with real Qwen/Gemini/Claude" (14:03 UTC): requires editing apps/api + packages/provider-adapters and real provider keys/live AI. Conflicts with HARD STOP rule and hardening brief; awaiting explicit approval + credentials decision before any change.

## Closed-pilot foundation (approved 2026-09-03) — root src/ only
- [x] Pilot status banner + "Demo / pilot — no live payments or AI processing" labelling
- [x] /admin/pilot: invite-only concept (no real auth), spend-cap preview (per-user/daily/monthly), promo-credit preview, provider-usage log mock data, kill-switch OFF
- [x] Live-provider configuration = disabled placeholders + prerequisite checklist
- [x] Typecheck + touched-files report
- Blocked (unchanged): live providers, API keys, billing, backend deploy, real signup

## Visual upgrade (approved Sep 3 2026)
- [ ] Pass 1: design system, WebGL hero, wallet money-flow
- [x] Pass 2: model ring, studio cinematic, investor timeline
- [ ] Credit the platform to Thomas Baafi and Uffe Jon Carlson — "visionaries on the African AI market space" — and the developers (footer credit)
- [ ] Responsive QA 390/820/1280 + typecheck + change log
- [x] (in progress) Admin pricing → catalogue/support: make the admin pricing centre (browser-local, simulated) the source of truth for customer prices shown in /models, studios and the support workbench (no live provider pricing; margins stay admin-only)
- [ ] Wallet top-up: confirm simulated local-payment top-up persists between sessions (already localStorage-backed via useDemo); polish flow + persistence indicator
- [x] (requested 15:35) /admin/pilot: live-provider config as editable-but-inert placeholders (values stored locally, no keys, no calls) gated by a checklist: terms, budget cap, payment partner, secret storage, privacy, incident handling — "Enable" stays locked until all checked and still makes no real AI call
- [x] (requested 15:35) /admin/pilot: provider-usage log with model runs, credits used, spend-cap preview bar; kill-switch that zeroes/blocks further simulated runs (local state)
- [ ] /admin/pilot: invite-only pilot application flow — invited partner applies (simulated form), status (Invited/Applied/Under review/Approved/Declined), admin review step; no real accounts
- [x] (requested 15:36) Motion preferences: public “3D effects” toggle + presets (Full / Balanced / Reduced) persisted locally; hero WebGL, ring, tilt, coin burst and reveals respect it; layouts unchanged in every preset
- [ ] Quality bar: best-in-class current UI moves (bento layouts, magnetic/tilt cards, scroll-linked reveals, glass+depth, 3D product ring, cinematic previews) across all public routes — no clutter, reduced-motion safe
- [ ] (requested 15:58) Make the /models “Spin the ring, pick a model” 3D scroll feel less boring — more kinetic, premium, Afro-futurist
- [ ] (requested 16:00) Research real public AI-provider token/media pricing and update the simulated admin pricing control centre cost basis so investor-facing prices reflect real market economics; keep all provider behaviour simulated (no live keys/calls)
- [x] (requested 16:03) Full QA + E2E (qa/visual-qa.py: 63 checks green, investors overflow fixed): verify every public route link, nav, CTA, form, and UI element; fix broken links/interactions; document findings
- [x] (requested 16:14) Fix mobile overflow / cut-off layout on wallet and home pages; make cards and text fit 390px viewport

- [x] /admin/programme pilot landing + simulated application queue
- [x] (requested 16:19) /models ring: clicking the focused card navigates to Studio/Developers; make the ring section background beautiful, not flat blue
- [x] (requested 16:20) Confirm Thomas Baafi + Uffe Jon Carlson credited as platform developers/visionaries
- [x] (requested 16:25) Go as far as possible on the simulation ahead of MTN MoMo API access: request-to-pay lifecycle boundary (`src/lib/payments.ts`), wallet approve/decline/timeout paths, /admin/payments reconciliation + readiness checklist
- [x] (requested 16:28) Landing page: more animations / 3D — richer hero + scroll-linked, money-movement and depth moments (motion-pref safe)
- [x] (requested 16:33) Mind-blowing pass: shared cedi coin object across hero/wallet/studio/ledger; live Africa heartbeat (activity ticker + lazy 3D pin globe, poster fallback); cinema studio reveals synced with price settle; QA-as-a-feature (visual QA script + public "tested on" bar); opt-in coin sound (off by default); both 390px and desktop first-class

## Requested 17:42 UTC — contracts hub + procurement pack
- [x] Simulated contracts hub + revenue-split engine (`src/lib/contracts.ts`, `/admin/contracts`), payout ledger, API-contract section on `/developers`
- [x] Procurement pack for OpenAI / Anthropic API purchase in `/mnt/documents/procurement/`

## Pricing edge (in progress)
- [x] Model-routing simulator + outcome packs with live margin readouts in /admin/contracts — all labelled illustrative, honest about assumptions
- [x] Catalogue prices derived from explicit illustrative cost basis at 60% target margin (schema v2; stale browser tables re-seeded)
- [x] True-to-life rate-card benchmark vs OpenAI/Anthropic/xAI/Google list prices + deal-lever calculator in /admin/contracts (checked 2026-09-03)

## Requested 19:42 UTC — "NuruRoute Signature Experience" final pass (root src/ only, simulation)
- [ ] Landing hero: Kinetic-bold direction (chosen) — editorial display type, gold gradient "AI answers.", border-left stat rails, glowing ledger card
- [ ] 1. Cedi Flight: one continuous coin story phone → Africa network → balance → reserve/settle/release → creative outputs
- [ ] 2. Africa AI network field (Accra origin, lines to planned cities, simulated activity feed, flat mobile poster)
- [ ] 3. "Pick your power" model ring: depth, magnetic hover, reflection, cost/speed/quality signals, keyboard/touch/reduced-motion
- [ ] 4. Creator moments: image blur→sharp, video storyboard→frames→final, voice waveform+language, code plan→build→ship; wallet cost synced
- [ ] 5. "Built for African reality" confidence strip
- [ ] 6. Design craft: Kente/Adinkra as structural rhythm; ink/gold/cyan; no blobs/glass excess
- [ ] 7. QA 390/820/1280/1440 all public routes; report changes, QA result, unresolved

## Requested 19:48 UTC — Final investor-polish fixes (root src/ only)
- [ ] Canonical demo link https://demo.nururoute.com everywhere public (replace Netlify demo links)
- [ ] "Request an investor walkthrough" / "Apply for the Ghana pilot" simulated browser-local interest form with confirmation; invite-only note
- [ ] Admin pricing: source domain, model/version, verified-on, next review, owner, "Public list price / illustrative" status; public copy "Estimated local price — confirmed before every job."
- [ ] /admin notice: "Investor simulation only — not production authentication or a live financial control panel."; no public links to admin
- [ ] Persistent public status chip "Investor Demo · Payments and AI calls simulated."
- [ ] Typecheck + QA 390/820/1280/1440 + reduced motion; report touched files + unresolved
