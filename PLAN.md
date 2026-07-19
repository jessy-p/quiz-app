# Study Loop — Build Plan

Companion to `PROJECT_BRIEF.md` (what to build) — this is the order to build it in. Expected to be edited/checked off as work progresses, unlike the brief.

Ordering principle: front-load "does this feel right" before investing in plumbing, and push open-ended content growth to a phase that doesn't block daily use — you should be able to use the app for real well before the content pipeline or backup sync exist.

## Phase 1 — Skeleton
Next.js + Tailwind scaffold. Reading Lamp tokens wired in as CSS variables / Tailwind config. Static question card rendering one hardcoded question, no answer logic yet. Goal: confirm the visual direction actually renders the way the spec describes before anything else is built on top of it.

## Phase 2 — Core loop
Real `selectNextQuestion` (bias = 0), answer states (correct/wrong, dimming, aria-live), localStorage attempt logging, auto-advance. A small hand-written question set (10-20 questions across a few topics) — enough to exercise the loop, not the real bank. Goal: the app works end to end and is genuinely usable, even if the content is thin.

## Phase 3 — Secondary actions
`ActionSheet` component, three content variants (Reference / Teach Me / Double Check), copy-to-clipboard + toast. Goal: full per-question interaction set complete.

## Phase 4 — PWA + offline
Manifest, service worker, installability, cached question bank for true offline use. Goal: the app already works after Phase 2-3 (online); this phase makes it hold up in the actual use case (elevator, dead zones, one-handed phone use) where connectivity isn't guaranteed.

## Phase 5 — Backup sync
Device token generation, KV API route, fire-and-forget POST after each attempt. Goal: protect against localStorage loss (browser reset, PWA reinstall, iOS storage eviction).

## Phase 6 — Content pipeline
Claude Code slash commands (`generate` → `review` → `factcheck` → `merge`), then the actual push to grow the bank to real size across all 8 topics. Most open-ended phase — can run in parallel with or after daily use starts, since it doesn't block anything upstream.

## Phase 7 — Progress command
`/progress` — reads from KV backup or a pasted blob, cross-references against the question bank, reports weakest topics / repeat misses / coverage.

## Phase 8 — Deploy + polish
Vercel deploy. Accessibility re-check against real rendered output (not just the spec's on-paper contrast math). Real-device testing — one-handed use, low light, an actual elevator if you can manage it.

## Explicitly deferred (not a phase — revisit only if it becomes a real problem)
- Question bank fetch-as-static-asset (currently bundled import) — revisit around ~500 questions
- Backup transport switched from full-snapshot writes to append-only — revisit if the log grows large enough to notice
