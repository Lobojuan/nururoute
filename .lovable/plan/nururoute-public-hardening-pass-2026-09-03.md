# NuruRoute public hardening pass

Scope: root public TanStack frontend only (`src/`, `public/`). No backend, API, database, payment, provider, dashboard, env or docs changes. Nothing gets deployed and no accounts, keys or payments are created.

## What is verified today

- Every public route already has `title`, `description`, `og:title/description/type` and `twitter:card`, but none has a canonical link or `og:url`. Root has no `og:site_name`.
- Failing SEO findings: missing `<h1>` on Pricing, Models, Studio, Developers, Impact and Wallet (they use `SectionHead`, which always renders `<h2>`); no sitemap; Google Search Console not connected. A low-priority "MoMo + OpenAI guide" content opportunity is also listed.
- `public/robots.txt` exists (allow all). No sitemap mechanism exists anywhere.
- Footer copy still says "money logic lives in the authenticated NuruNode dashboard" (internal name). Investor risk cards mention database-level enforcement, idempotent webhooks, "licensed payment partners", "Act 843-aligned" and "controlled live top-ups after approval" — these leak backend detail or imply regulatory/partner status.
- Wallet lists 15 countries with no "launch market" vs "planned" distinction; conversions are labelled "illustrative" but not "estimate / not a live rate".
- Root already has `notFoundComponent` and `errorComponent`; proxy offline responses already return handled 200 envelopes.

## Plan

### 1. SEO fixes
- `SectionHead` gains an `as="h1" | "h2"` prop (default `h2`). Each of the six pages passes `as="h1"` to its first heading; `Card`-style `<h3>`s stay below an `<h2>`.
- Add a small `src/lib/seo.ts` helper (`SITE_URL = "https://demo.nururoute.com"`, `pageMeta(path, title, desc)`) that returns meta + `og:url` + `twitter:title/description` and a self-referencing canonical `link`. Apply on all eight public leaf routes; `/console` keeps `noindex` and gets no canonical.
- Root: add `og:site_name`, `og:locale` and a WebSite JSON-LD block. No canonical/og:image at root. No `og:image` anywhere (no share-sized absolute image exists; placeholders are worse than none).
- New `src/routes/sitemap[.]xml.ts` server route listing `/`, `/models`, `/wallet`, `/developers`, `/studio`, `/pricing`, `/impact`, `/investors` (no `lastmod`; `/console` excluded). Add `Sitemap:` line to `public/robots.txt`.
- Audit the two `<img>` tags and any decorative icons for `alt` / `aria-hidden`.
- Google Search Console: not part of this pass — it requires you to authorise a Google account in chat. I will leave that finding open and can start it on request. The "MoMo + OpenAI guide" opportunity is skipped (it would require claiming an OpenAI payment path we do not offer).

### 2. Simulation labelling
- Add a reusable `DemoSafeguards` component (compact card: no real payments, no live AI processing, prices illustrative, provider/operator names do not imply partnership, Ghana launch market / other countries planned). Rendered in the footer on every page and inline next to the action areas on Wallet, Studio, Developers, Console and the models ledger runner.
- Confirm every action button (top-up, generate, run request, create org) sits under a visible "Demo mode — no real money or live AI access" line; add where missing.

### 3. Ghana-first market labelling
- `src/lib/momo.ts`: add `status: "launch" | "planned"` (Ghana = launch, all others = planned) and a `FX_NOTE` string ("display estimate only, not a live rate or local wallet").
- Wallet page: country picker shows Ghana first with a "Launch market" badge; other countries get an "Illustrative · planned" badge and a one-line note when selected. Local-currency figures carry an "est." marker and the FX note; GHS remains the wallet currency.
- Impact/Investors/landing copy: "rolling out to other markets" becomes "planned, subject to local validation".

### 4. Privacy sweep
- Rewrite footer line to "Public demo experience. Simulated wallet and AI activity only."
- Investors risk cards and roadmap: keep the concepts (reserve → settle → release, keys never in the browser, prepaid model, data-protection intent) but drop technology names, webhook/database detail, "licensed partners", "Act 843-aligned", and "live top-ups after approval" phrasing. Replace with "intended", "planned", "subject to approval" language.
- Grep the entire `src/` for host names, port numbers, "Fastify", "Postgres", "NuruNode", "webhook", "adapter", ".env", "localhost" in rendered strings and error/tooltip text; fix any remaining hits.

### 5. Route QA and fallbacks
- Playwright pass over all nine routes at 390, 820 and 1280 px: check `scrollWidth <= clientWidth`, no console errors, no clipped controls in carousels/tables, all internal links resolve, external investor link has `rel="noopener noreferrer"`.
- Verify 404 and error pages render inside the site chrome with brand styling and "Demo" tone; verify `/console`, wallet and ledger runner show the friendly offline/simulated state (no raw error codes).
- Fix any overlap/overflow found (typically long model names in comparison table and country chips on mobile).

### 6. Visual direction
- No new animation systems. Keep `TickingMoney`, reveals and 3D carousels; make sure every new badge/card respects `prefers-reduced-motion` (they will be static).

### 7. Admin demo area (`/admin`) — investor simulation only
Unlinked, `noindex`, excluded from the sitemap, not in header/footer/widget. Browser-only: all state lives in `localStorage` (`nururoute-admin-demo`), no server endpoints, no accounts, no secrets, no provider calls. A distinct admin visual shell (dark slate chrome, persistent red-gold "Demo admin — simulated data only" banner, `aria-label="Demo admin area"`) makes it obviously separate from public pages.

- **Demo gate** (`/admin` index): a single "Enter demo admin" step that stores a session flag (plus a demo passphrase field that accepts a shown placeholder such as `demo`). Explicit copy: "This gate is a simulation, not authentication." A "Leave admin" control clears it.
- **Pricing control centre** (`/admin/pricing`): per-model editable inputs seeded from the catalogue — provider cost basis (USD per 1M input / output tokens, or per image / second / minute for media), unit, FX rate assumption (display estimate), FX buffer %, payment/collection buffer %, operational buffer %, target gross-margin %. Live preview panel shows provider cost, buffers, total cost-to-serve, customer price in GHS and the currently selected local currency (estimate), gross profit, gross margin and markup. Formula shown verbatim: `customer price = (provider cost + FX + payment + operational buffers) ÷ (1 − target gross margin)`. Guard against margin ≥ 100 %.
- **Versioned price table**: "Propose changes" → review screen (diff of old vs new per model, effective date, required change-reason) → "Confirm and publish demo version". Each version is appended to an append-only demo audit log (version id, timestamp, actor "Demo admin", reason, per-field diff). The log has no edit/delete controls and rows are visibly locked. Public pages keep reading the static catalogue; nothing in `src/lib/catalog.ts` is mutated by admin.
- **Support centre** (`/admin/support`): seeded simulated tickets (failed top-up, held reservation not released, wrong balance shown, API key rotation request, refund query) with masked fictional customers; ticket detail shows a fake ledger excerpt. Private support-assistant workbench: choose a simulated routing target (OpenAI / Claude / Kimi), type a draft, get a locally generated canned reply from a small template set. Every reply is stamped "Simulation — no customer data sent to an AI provider." and the target selector states "Illustrative routing label only — no integration, no keys."
- **Privacy rules**: admin figures (cost basis, margin, buffers, audit log) are only rendered under `/admin`; the public pricing/models pages and `DemoSafeguards` never import admin state. The public support widget is unchanged in behaviour (already scripted, no provider selection) apart from the safeguards note.

### 8. Wrap-up
- Add the admin/pricing task to `roadmap.md` at the start of implementation (plan mode forbids editing it now).
- Run root typecheck and the Playwright QA script (now including `/admin`, `/admin/pricing`, `/admin/support` at 390/820/1280 px and a grep that no admin strings appear in public route HTML); mark the h1 and sitemap SEO findings as fixed; report a change log limited to files touched plus unresolved items (Search Console connection, live-site publish required for head changes to reach demo.nururoute.com).

## Files expected to change

Hardening: `src/lib/seo.ts` (new), `src/routes/sitemap[.]xml.ts` (new), `src/components/site/demo-safeguards.tsx` (new), `src/components/site/primitives.tsx`, `src/components/site/layout.tsx`, `src/components/site/ledger-runner.tsx`, `src/lib/momo.ts`, `src/routes/__root.tsx`, `src/routes/index.tsx`, `models.tsx`, `wallet.tsx`, `developers.tsx`, `studio.tsx`, `pricing.tsx`, `impact.tsx`, `investors.tsx`, `console.tsx`, `public/robots.txt`.

Admin demo: `src/lib/admin-demo.ts` (new — pricing formula, versions, audit log, tickets, canned replies, localStorage persistence), `src/components/admin/admin-shell.tsx` (new), `src/routes/admin.tsx` (new layout with gate + `<Outlet />`), `src/routes/admin.index.tsx`, `src/routes/admin.pricing.tsx`, `src/routes/admin.support.tsx` (new), `roadmap.md`.

Nothing under `apps/`, `packages/`, `docs/`, migrations, tests, env files or dashboard routes is touched. No external service, endpoint, database, real authentication or deployment is added.
