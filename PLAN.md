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

**Caching strategy decision (so Phase 5/6 data refreshes actually land):**
- Question bank is `import`ed into the JS bundle, not fetched as a separate JSON asset — Next.js content-hashes chunk filenames per build, so a URL-keyed cache doesn't go silently stale the way a hand-cached `/data/questions.json` would.
- **Hand-rolled `public/sw.js`, no Serwist** — the app is a single route with a small bundle, so build-time precache-manifest generation (Serwist's main value) isn't earning its dependency here. Runtime caching only, ~40-50 lines:
  - **Cache-first** for hashed static assets (`_next/static/*`, the JS chunk the question bank lives in) — safe forever, since a content change means a new filename, not a stale hit.
  - **Network-first, cache-as-offline-fallback** for the page navigation request (`/`, unhashed URL) — this is the one thing that must stay network-first, since it's what discovers new deploys (it references whichever hashed chunk names are current).
  - Versioned cache name + `activate` handler that purges old-named caches, so deploys don't leave orphaned cache entries behind.
- `Cache-Control: no-cache, no-store, must-revalidate` on `/sw.js` itself — otherwise the browser's HTTP cache can block the SW update-check from ever seeing a new version.
- `skipWaiting()` + `clients.claim()` in the SW so new deploys activate on next cold open, no "update available" banner — consistent with the app's zero-chrome philosophy. Tradeoff: a rare double-fetch on a tab left open exactly at deploy time, acceptable for single-user use.
- Phase 5's backup POST is already fire-and-forget and doesn't route through the SW cache — no interaction with this.

## Phase 5 — Backup sync
Device token generation, Vercel Blob-backed API route, fire-and-forget POST after each attempt. Goal: protect against localStorage loss (browser reset, PWA reinstall, iOS storage eviction).

**Built against Vercel Blob, not KV** — Vercel KV is deprecated (existing stores migrated to Upstash Redis; new projects are pointed at a Marketplace Redis integration instead). The actual write pattern here — overwrite one JSON snapshot per device, no querying — is a better fit for Blob than Redis anyway: simpler client code, no Redis dependency, and `@vercel/blob` is the current maintained package. Store is `access: "private"`; the blob URL is never returned to the client, only the device token (sent over HTTPS to our own route) and the store's own server-side token can reach it. Overwrite behavior needs both `addRandomSuffix: false` and `allowOverwrite: true` on `put()` — Blob's default is to append a random suffix per write, which would silently accumulate a new object per attempt instead of overwriting.

## Phase 6 — Content pipeline
Two Claude Code slash commands — `/generate` (runs generator → adversarial reviewer → fact-checker → stage, fully automatic once invoked) and `/merge` (staging → live, after a human skim) — with a conversational planning step right before `/generate` each time, in the same session, to agree on scope/topics/sources. Then the actual push to grow the bank to real size across all 8 topics. Most open-ended phase — can run in parallel with or after daily use starts, since it doesn't block anything upstream.

**Design note:** originally scoped as 4 separate commands (`generate`/`review`/`factcheck`/`merge`) invoked one at a time, each producing output to inspect before running the next. Revised to 2 — review and fact-check now run automatically inside `/generate` rather than as separate manual steps, since per-stage inspection wasn't the actual value being sought. The real checkpoints are upfront (deciding what to generate, in conversation) and at the end (a batch-level skim before merge) — not stage-by-stage. Failed/flagged questions are dropped from the batch automatically (flag-and-drop, not auto-fix, see `PROJECT_BRIEF.md`) rather than queued for individual triage.

**Context handoff:** `/generate` must be invoked in the same conversation as the planning discussion — a fresh session has no way to know what was agreed. The target bank is given directly by the user (as the command's argument, e.g. "`/generate for javascript`", or from the preceding conversation if no argument was given) — never inferred or guessed. On invocation, the command synthesizes the rest (focus/mode/count) into an explicit spec in the conversation itself, printing the bank as its own line alongside it, rather than assuming any of it carries through implicitly. This matters specifically because the generator/reviewer/fact-checker stages run as separate spawned agent calls, which don't inherit the parent conversation's history — the synthesized spec is what actually reaches them.

**Batch size: ~15 max, per invocation.** A single subagent call's quality visibly degrades past that — distractor variety, per-item review rigor, real (not assumed-fine) search verification. Bigger topics are covered by running `/generate` again for the next round, not by auto-chunking a big ask into sections within one run — the user tracks what's been covered across rounds themselves, offline. The generator also gets the existing bank's prompts for that topic as context (avoid regenerating covered ground), and the adversarial reviewer flags any duplicate/near-duplicate against that same list — plain judgment, no similarity tooling.

## Phase 7 — Progress command
`/progress` — reads from the Vercel Blob backup or a copy-pasted attempt log, cross-references against the question bank, reports weakest topics / repeat misses / coverage.

## Phase 8 — Deploy + polish
Vercel deploy. Accessibility re-check against real rendered output (not just the spec's on-paper contrast math). Real-device testing — one-handed use, low light, an actual elevator if you can manage it.

## Explicitly deferred (not a phase — revisit only if it becomes a real problem)
- Question bank fetch-as-static-asset (currently bundled import) — revisit around ~500 questions
- Backup transport switched from full-snapshot writes to append-only — revisit if the log grows large enough to notice
