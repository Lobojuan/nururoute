# Claude-ready simulated public support widget

## Goal
Make the public NuruRoute support widget feel like it is powered by Claude, while keeping it strictly simulated — no live Anthropic API calls, no real keys, no customer data leaving the browser. Educate the user that only an Anthropic API/developer plan can power a real platform integration; a Claude Pro chat subscription cannot.

## Context
- The public support widget lives at `src/components/site/support-widget.tsx`.
- It currently uses hard-coded scripted answers and a simple bot/you message list.
- The admin support workbench (`src/routes/admin.support.tsx`) already has a local knowledge-base retrieval system (`src/lib/admin-kb.ts`) with safety rules, sensitive-data detection, and simulated routing targets including "Claude".
- The public widget does not yet share that KB; this plan proposes reusing the same browser-local KB and safety layer for the public widget so answers feel "Claude-generated" but remain fully simulated and safe.

## What we will build

### 1. Claude plan clarification (user-facing note)
Add a short, honest note in the widget header or footer:
- Claude Pro / Team (the chat app at claude.ai) cannot power a website.
- Only an Anthropic API key + developer plan can run platform support.
- This demo shows what that experience would look like without making API calls.

### 2. Reuse the local knowledge base in the public widget
- Import `retrieve`, `detectSensitive`, `SAFETY_RULES`, `CANNOT_VERIFY`, and `SEED_ARTICLES` from `src/lib/admin-kb.ts`.
- Replace the hard-coded `answer()` function with KB retrieval over `SEED_ARTICLES`.
- If a question matches Approved articles, compose a warm, Claude-style reply from the article answers.
- If no Approved article matches, show the `CANNOT_VERIFY` message and offer to "queue a human agent" (simulated).
- Run `detectSensitive` on every user message; if sensitive data is detected, warn the user not to share it and refuse to process it.

### 3. Claude-like UX polish
- Add a "Claude is thinking" state with a subtle animated sparkle/typing indicator before the reply appears.
- Stream the reply text in word-by-word or sentence-by-sentence chunks to mimic Claude's response style.
- Add a small "Powered by Claude · Demo mode" badge in the widget header, with a tooltip/modal explaining it is simulated.
- Update the quick-reply chips to include Claude-style follow-ups, e.g.:
  - "What can you do?"
  - "How do I top up?"
  - "Is my data safe?"
  - "Which AI providers are live?"
- Keep the existing Afro-futurist navy/gold/cyan styling; do not introduce Anthropic's purple unless it conflicts with the design system.

### 4. Safety and simulation safeguards
- Keep the existing demo disclaimer: "Answers are generated locally from an approved knowledge base. No live AI provider is called."
- Enforce the same sensitive-data blocking as the admin workbench.
- Never claim a provider, payment rail, or feature is live unless the matched KB article is both `Approved` and `live: true`.
- Add a persistent status chip: "Investor Demo · AI calls simulated."

### 5. Motion and accessibility
- Respect Full / Balanced / Reduced motion modes via the existing `useMotionPrefs` hook.
- For Reduced motion, skip the streaming text and show the full reply immediately.
- Ensure the widget is usable at 390 px: no overflow, tap targets ≥44 px, focus states visible.

### 6. QA
- Run `tsgo` / typecheck.
- Test the widget on `/` and at least two other public routes at 390 px and 1280 px.
- Verify:
  - Quick-reply chips work.
  - Sensitive-data detection blocks PIN/OTP/password/API-key input.
  - Unmatched questions show the "cannot verify" path.
  - Reduced motion disables streaming.
  - No console errors or layout overflow.

## Files to change
- `src/components/site/support-widget.tsx` — main widget rewrite.
- `src/lib/admin-kb.ts` — possibly export `SEED_ARTICLES` if not already exported (it is already exported).
- `src/components/site/layout.tsx` — verify the widget is still rendered on public routes.

## Out of scope
- No real Anthropic API integration.
- No backend, adapter, migration, environment, or dashboard changes.
- No changes to `apps/web`, `apps/api`, `packages`, docs, or environment files.

## Success criteria
- Public support widget feels like a Claude-style assistant.
- All answers still come from the local KB and remain simulated.
- Sensitive-data detection and demo disclaimers are visible and enforced.
- TypeScript/build clean; widget works at 390 px and 1280 px; no console errors.
