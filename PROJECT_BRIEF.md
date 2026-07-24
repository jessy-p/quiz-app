# Study Loop — Project Brief

A phone-first MCQ study app to replace idle scrolling with actual studying. Single user, single device, no accounts, no filtering UI. Open it, answer a question, close it — zero friction in either direction.

## Why this exists

Idle, reflexive phone scrolling → redirect that reflex toward something useful: studying whatever's actually on the docket. That's interview/cert prep today, but the app and pipeline aren't tied to any fixed subject — the topic is whatever the content pipeline gets pointed at next (a cert exam, world capitals, political history, anything), entirely at the user's discretion, not something baked into the design.

Design philosophy: **the app must never become a chore or add pressure.** No streaks, no "X remaining," no session summaries, no gamification, no filtering/menu chrome before the question. Selection is random **by default** — this is explicitly *not* a curriculum or due-date scheduler. See Selection logic below for the optional bias mechanism.

## Core loop

1. Open app → a random question is already on screen (no landing page, no deck picker).
2. Answer (tap an option).
3. Immediate right/wrong feedback + a short (2–3 sentence) explanation.
4. Auto-advance to the next random question — no "continue" tap required, or a single light tap, whichever feels more seamless in testing.
5. Close the tab whenever. State persists silently.

No session end state. No "you got 7/10." The only summary exists outside the live loop (see Progress, below).

## Content: two modes, same pool

Both modes are drawn from **one shared random pool** — invisibly tagged by `topic` and `mode` in the data, never exposed as a filter in the UI.

**Quick Fire** — straight MCQ, fast, single correct answer, brief explanation. Fits any subject where a fact has one unambiguous right answer — syntax & concepts, terminology, dates, geography, whatever the current topic actually is.

**Scenario** — design-judgment questions. Format: a short realistic scenario, several options where **every wrong option is wrong for a distinct, real reason** — not generic distractors. The explanation must cover why each wrong answer fails, not just confirm the right one. This is the mode's entire value; don't let it degrade into Quick-Fire-with-more-words. Fits subjects with genuine tradeoffs to reason through (e.g. REST/system design, backend architecture) — not every subject needs it; a purely factual topic may end up quick-fire only, and that's fine.

## Per-question actions (static, no live API calls, fully offline-capable)

- **Reference** — short list of sources to check (MDN, official docs, or whatever's canonical for the current subject, etc.)
- **Teach me** — a brief explanation plus a **copyable prompt** worded to take to Claude/ChatGPT for a deeper explanation elsewhere. The app does not have a bundled chat — this is a handoff, not a feature.
- **Double check** — a second, differently-worded **copyable prompt**, specifically phrased for skeptical independent verification ("is this claim accurate, cite sources") — distinct wording from Teach Me since the intents differ.

All three open as a shared bottom-sheet component over the question card — see **Secondary action behavior** under Design direction for the full interaction spec (content per variant, copy-button behavior, dismiss/focus/motion handling).

## Data model

Static JSON in the repo, not a database — one file per topic, created as needed:

```
/data/questions/{topic}.json    # e.g. javascript.json, capitals-and-countries.json — any topic, no fixed list
```

`topic` is an open string (see `types/question.ts`) — the app has no built-in notion of which subjects exist. New topics just mean a new file; nothing elsewhere needs to change to support one.

Each question object:

```json
{
  "id": "js-0042",
  "topic": "javascript",
  "mode": "quick-fire",       // or "scenario"
  "prompt": "...",
  "options": ["...", "...", "...", "..."],
  "correctIndex": 1,
  "explanation": "brief, 2-3 sentences. For scenario mode: cover why each wrong option fails.",
  "references": ["MDN: ...", "..."],
  "teachMePrompt": "copyable prompt text for external LLM",
  "doubleCheckPrompt": "copyable prompt text, skeptical framing"
```

`references` entries are plain display strings by default (e.g. `"MDN: HTTP redirects"`). If an entry should render as a tappable link in the Reference sheet, it must be a full `https://` URL string, detected at render time with a simple URL check — not a separate `{label, url}` shape. Keep this in mind when writing questions: only include a full URL when a tappable link is actually wanted.

Schema should be finalized once, then treated as a contract — the app, the generator pipeline, and the in-app Progress view all depend on it staying stable.

## Selection logic

Selection is a small, pure function — `lib/selectNextQuestion.ts` — that takes the full question pool, the attempt history, a bias value, and the last-shown question ID (so it never immediately repeats), and returns the next question. No framework coupling, easy to test standalone.

- **Bias defaults to `0`** — a constant in `lib/config.ts`, not a UI toggle. At `0`, selection is uniform random across the full pool, full stop.
- **If bias is ever turned up:** questions answered wrong get a higher weight in the pool — persistently, until answered correctly — and the function does a weighted random draw instead of a plain one. No due-dates, no decay curve, no "review queue" concept. The only thing that changes is which question is more *likely* to come up, not a scheduled reappearance.
- This must stay invisible in the UI either way — no indication a question is showing "because you got it wrong," no review-mode framing. From the user's seat it should always feel like open-ended random, whether bias is 0 or not.
- A small client-side hook (e.g. `useNextQuestion()`) wraps the pure function and is the only thing that touches localStorage — called once on mount (first question) and again after each answer.
- **Next.js consequence:** since selection depends on localStorage (per-device history), it cannot run server-side. The question screen must be a Client Component, and the first question can't be server-rendered — expect a brief loading state on initial mount rather than an instantly-painted question.

## State & storage

**localStorage is authoritative** — the app must work fully offline and never depend on a network call to function. Two things stored locally:

1. Attempt log — flat array, appended to locally on every attempt: `{ questionId, correct, timestamp }`. This feeds both the selection bias (if turned up) and progress reporting.
2. Nothing else needs persisting — no in-progress session state, since there's no session concept.

**Backup sync (secondary, not authoritative):** after each attempt, fire-and-forget `POST` the full updated attempt log to a simple API route backed by **Vercel Blob**, purely for data-loss recovery (localStorage can be cleared by browser resets, PWA reinstalls, iOS storage eviction). If the write fails (offline, etc.), the app doesn't care — localStorage already has it, nothing is lost from the app's perspective, and the loop never waits on this call.

**Manual recovery (deliberate, by-hand — not automated):** the device token that addresses the Blob path lives in the same localStorage as the attempt log, so a wipe loses the pointer to the backup along with the data itself — the app can't self-heal automatically. If it ever happens: open the Vercel dashboard's Blob store, find `attempts/<token>.json` (one file per device), copy its `attempts` array, then in the browser devtools console run `localStorage.setItem('study-loop:attempts', '<pasted JSON>')` and reload. No need to restore the old token — a fresh one is minted the next time it's needed and backup writes continue under a new blob path; the old file is simply orphaned. This stays a manual, occasional fallback by design, consistent with the app not caring when a backup write itself fails.

- Transport model: each backup write sends the **full current log as a snapshot**, not a diff/append against what's already stored — simplest option, fine at current scale (a few hundred bytes per attempt, thousands of attempts is still a small payload). This is a property of the backup write only; the local log itself is still appended to normally. Each write overwrites the same blob path (`addRandomSuffix: false` + `allowOverwrite: true`) rather than accumulating a new object per attempt — Blob's default is to append a random suffix per write, which would silently do the latter if left unset.
- A random device token, generated on first load and stored in localStorage, is sent with each write and used as part of the blob's path — not real auth, just enough that the backup endpoint isn't wide open to anyone who finds the URL. The store itself is private (`access: "private"`); the blob URL is never returned to the client, so reaching the data requires both the token and the store's own server-side credential, not just a guessable URL.
- The backend is a **passive backup destination only** — it never participates in the live question loop, and selection never reads from it. This was a real decision point, not an oversight: moving selection server-side would reintroduce a network dependency on the one interaction that most needs to stay instant and offline-capable.

## Progress reporting

In-app only (Study Hub → Progress) — a quick glance, computed entirely from the local attempt log already on-device (see Study Hub, below). Instant, no network call, no export step.

A separate Claude Code command reading the Blob backup for deeper cross-referencing (weakest topics, repeat misses, overall coverage) was considered and deliberately dropped — the in-app per-topic view already carries enough signal on its own.

This is a look backward for the human, never a lever that changes app behavior.

## Content generation pipeline (Claude Code, agentic)

Single-shot generation is weak for this — it tends to produce shallow or generic distractors, especially for Scenario mode, and can't fact-check itself. Three commands:

1. **`/discuss`** — an interactive planning command, not an ad-hoc conversation. Asks what you want to learn and whether you already have reference material (files/links/notes) to ground the batch in; reads current per-topic/per-mode counts from the live bank so topic suggestions are grounded in actual gaps, not guesses; then **breaks the target into sections** — non-overlapping sub-topics, each with its own sub-focus, mode (`quick-fire`/`scenario`, a per-section judgment call — design/judgment tradeoffs are scenario, single syntax/mechanism facts are quick-fire), count, and fact-check decision. Sections exist specifically so generation can scale past a single call's quality ceiling: each section stays small enough (~15-20) to stay sharp, and — because sections are non-overlapping by construction — they can be generated **in parallel** rather than one at a time. Ends by confirming the full spec, then asking whether to generate now (in this same conversation, via `/generate`) or export a copy-paste prompt to run in a different tool, bringing the result back into `/generate` afterward.
2. **`/generate`** — executes the confirmed spec, or validates content brought back from elsewhere:
   - **Execute mode**: reads the spec `/discuss` produced (must be invoked in the same conversation — a fresh session has no way to know what was agreed) and spawns **one generator subagent per section, in parallel** — not sequentially, since non-overlapping sections don't need to see each other's output to avoid duplicating one another. Each subagent is self-contained: its own section's spec, the exact schema, the style-anchor examples, that section's dedup list (existing bank prompts for that sub-focus), any reference material `/discuss` collected for it, and — for any section marked **time-sensitive** (new or fast-moving enough that training data is likely thin or stale) — an instruction to use web search and ground claims in current sources. CCAF is today's clearest example (the cert is new enough, launched ~March 2026 per a quick search at brief-writing time, that training data is thin or stale; exam-format figures found at brief-writing time — 60 questions, 120 min, 720/1000 to pass — are **not confirmed current** and must be re-checked), but the treatment applies to any topic with the same property, not to CCAF specifically. If `/generate` is invoked directly without `/discuss` first, it falls back to a lightweight single-section spec synthesized inline (same per-question mode/fact-check judgment calls, still capped ~15-20) — fine for a small one-off ask, but `/discuss` is the better path for anything bigger.
   - **Bring-your-own mode**: the user supplies already-written question content (pasted, or a file) — including content generated externally via `/discuss`'s exported prompt — and `/generate` format-checks it against the schema first, then runs it through the same review/fact-check below. No per-section generation cap applies (nothing's being invented), but review/fact-check still chunk at ~20-25 per call, same as Execute mode.
   - **Adversarial reviewer always runs; fact-checker is conditional**, decided per section/topic. Fact-check is mandatory for **time-sensitive** content — anything new or fast-moving enough that training data is likely thin or stale (CCAF is today's clearest example, not a special case baked into the rule itself). It's skipped by default for stable, well-established technical content, where a search is very unlikely to catch a real error: on the one real batch run so far, review caught 2 substantive issues out of 15 while fact-check caught 0 out of 13, which is exactly the pattern you'd expect for foundational language mechanics versus a fast-moving domain. When fact-check does run, it goes in parallel with review (not sequentially) — both are independent evaluations of the same batch/chunk, and review is typically the far slower stage, so serializing them just adds the faster one's time for no benefit. Fact-check (when it runs) covers the full chunk, not just whatever review passes — gating one on the other would reintroduce the sequential dependency. Every subagent that runs gets the full batch/chunk pasted directly into its prompt (not a file to read), to avoid an extra tool round-trip. Review/fact-check chunk at ~20-25 questions per call **regardless of mode** — Execute mode's combined batch (summed across sections) can exceed one call's rigor ceiling just as easily as a large bring-your-own batch can.
   - **Adversarial reviewer** — explicitly framed as "try to break this question." For Scenario mode specifically: does each wrong option fail for a genuinely distinct reason, or are two of them wrong for the same underlying reason in disguise? Is there a defensible case for a "wrong" answer? Does the explanation actually teach the tradeoff or just assert the answer? Also checks for duplicate/near-duplicate against the section's/topic's dedup list *and* across sections/chunks within the same run — no similarity tooling, just the reviewer's own read.
   - **Fact-checker** (when it runs) — pulls claims out of context, verifies independently via search, flags anything it can't source. Especially load-bearing for time-sensitive content.
   - **Flag-and-drop, not auto-fix.** A question is staged if it clears review (and fact-check too, when fact-check ran) — otherwise it's dropped with its rejection reason logged in the command's summary output. Never silently rewritten — auto-fixing would mean trusting the fixer's judgment on every questionable case with no visibility, which defeats the point of a separate review stage. A dropped item just means the batch lands under the requested count; nothing needs individual triage.
   - Output goes to `/data/_staging/{batch}.json`, not directly into the live bank. Full mechanics in `.claude/commands/discuss.md` and `.claude/commands/generate.md`.
3. **Staging skim (you)** — a general skim of the batch shape before it enters your actual study pool, not a per-question reference audit.
4. **`/merge`** — staging → live bank, after your skim.

Suggested repo shape for this:

```
/data/questions/{topic}.json      # live bank
/data/_staging/{batch}.json       # pending review, gitignored or PR'd
/.claude/commands/discuss.md      # interactive planning -> confirmed spec, sectioned for parallel generation
/.claude/commands/generate.md     # executes the spec (parallel per-section) or validates bring-your-own content -> review -> fact-check -> stage
/.claude/commands/merge.md        # staging -> live, after human skim
```

## Tech stack

- **Next.js** (App Router), deployed on **Vercel**
- **Tailwind** for styling — see design note below, avoid generic-AI-app look
- No auth, no gate. Deployment is an obscure-but-technically-public URL — acceptable since this isn't sensitive, but don't actively promote/index it.
- **PWA**: manifest + service worker so it installs to the home screen and the question bank is cached for true offline use (elevator, dead zones — matches the actual use case).
- **Vercel Blob** — one small API route, used *only* for the fire-and-forget attempt-log backup described in State & storage. Not used for question selection, not used for the question bank, not required for the app to function. No live API calls at runtime beyond this passive backup write — everything the loop needs is static content shipped with the app.

## Repo structure

Consolidated view — individual pieces are described in their own sections above; this is the full tree.

```
app/
  page.tsx                    # the one real screen — question view
  layout.tsx
  manifest.ts                 # PWA manifest
  icon-192/route.tsx          # code-generated icons (next/og ImageResponse, no image tool needed)
  icon-512/route.tsx
  apple-icon.tsx
  api/
    backup/route.ts           # POST handler for the Blob fire-and-forget write

components/
  QuestionCard.tsx
  OptionRow.tsx
  AnswerState.tsx             # correct/wrong visual + aria-live announcement
  SecondaryActionsRow.tsx     # Reference / Teach Me / Double Check row
  ActionSheet.tsx             # shared bottom-sheet, 3 content variants
  StudyModeProvider.tsx       # Context bridging the Server Component root layout to the Client Component question screen
  StudyHubIcon.tsx            # fixed top-right icon, opens the Study Hub
  StudyHub.tsx                # accordion shell — Random / Sequential / Progress
  TopicList.tsx               # topic rows shown under Sequential
  ProgressSummary.tsx         # per-topic coverage bars shown under Progress

lib/
  selectNextQuestion.ts       # pure function — pool, history, bias, lastShownId -> next question
  useNextQuestion.ts          # client hook wrapping the above, touches localStorage
  selectSequentialQuestion.ts # pure function — sorted topic questions + lastShownId -> next question, strict ID order
  useSequentialQuestion.ts    # sibling hook to useNextQuestion, same shape, for Sequential mode
  topics.ts                   # per-topic question counts + topic-slug humanizing, derived from the pool
  computeProgress.ts          # pure function — pool + local attempt log -> per-topic correct/missed/not-attempted counts
  bodyScrollLock.ts           # reference-counted body-scroll lock shared by ActionSheet and StudyHub
  config.ts                   # bias constant (default 0), other tunables
  storage.ts                  # localStorage read/write for attempt log, study mode, sequential cursors
  deviceToken.ts              # generates/persists the anti-abuse token
  backupSync.ts               # fire-and-forget POST to the Blob-backed API route

types/
  question.ts                 # Question schema — single source of truth. Imported
                               # directly by app/component code; the .claude/commands/
                               # markdown prompts can't literally import a .ts type,
                               # but should quote/read this file's contents so generated
                               # content can't silently drift from what the app expects

data/
  questions/
    {topic}.json               # one per topic, created as needed — no fixed list
  _staging/
    {batch}.json               # pending review, gitignored or PR'd before merge

.claude/
  commands/
    discuss.md                  # interactive planning -> confirmed spec, sectioned for parallel generation
    generate.md                 # executes the spec (parallel per-section) or validates bring-your-own content -> stage
    merge.md

public/
  sw.js                        # hand-rolled service worker, runtime caching (see PLAN.md Phase 4)
```

## Design direction — "Reading Lamp" (finalized)

Direction chosen after exploring three options in Claude Design. Full dev-ready spec below; treat this as the source of truth for styling — Claude Code should not improvise tokens.

**Concept:** studying alone at night, one warm light in a dark room. Near-black background, warm paper-white text, amber accent used sparingly (active/correct), muted oxide for incorrect (not alarm-red). Single centered card, generous negative space, everything else recedes to near-black.

**Color tokens** (verified WCAG 2.1 AA at actual rendered opacity — do not use lower opacities than listed, several were raised from initial values to clear 4.5:1):

| Role | Hex (effective) | Contrast vs bg |
|---|---|---|
| Background `--bg` | `#17140F` | — |
| Prompt/body text `--ink` | `#F6F1E9` | 16.3:1 |
| Option text (rest) `--ink-82` | ≈`#C2BFB8` | 10.0:1 |
| Dimmed option (post-answer) `--ink-50` | ≈`#807C76` | 4.43:1 |
| Explanation text `--ink-60` | ≈`#94918B` | 5.84:1 |
| Secondary action labels `--ink-58` | ≈`#908D86` | 5.54:1 |
| Amber accent (active/correct border) `--amber` | `#DD9C42` | 7.79:1 |
| Amber text (correct state) `--amber-text` | `#F7C383` | 11.45:1 |
| Oxide border (wrong state) `--oxide` | `#9A614D` | 3.67:1 (non-text UI min) |
| Oxide text (wrong state) `--oxide-text` | `#CC9684` | 7.23:1 |

**Typography:**
- Question prompt: Source Serif 4, 20px/1.5, 400 (don't shrink below 20px on mobile)
- Option label: Inter, 14px/1.4, 400
- Explanation body: Inter, 13px/1.55, 400
- Secondary action label: Inter, 10.5px/1.3, uppercase, 0.05em tracking, 500
- Code/reference snippets: IBM Plex Mono, 13px/1.5, 400

**Layout:** single column, centered card, max content width 320px, screen padding 24px + safe-area insets. Vertical rhythm: prompt → 24px → options (9px between rows) → 14–20px → explanation (correct/wrong only) → secondary actions row. Radial glow fixed behind the card (~320px circle, amber at 16–22% opacity, blurred falloff), decorative and `aria-hidden="true"`, excluded from layout. Option rows: full-width, 13px/16px padding, 10px border-radius, 1px hairline border, min-height 52px.

**Answer states:**
- *Rest:* hairline border, `--ink-82` text, explanation hidden.
- *Correct:* amber border + 10% amber fill, `--amber-text`, trailing ✓; other options dim to `--ink-50`, borders fade to 8% opacity; explanation shown in `--ink-60` with a top hairline divider.
- *Wrong:* selected option gets oxide border + 12% oxide fill, `--oxide-text`, trailing ✕; the correct option gets an amber border only (no fill) + ✓ so it's still visible; remaining two dim to `--ink-50`; explanation shown.
- Correct/wrong states are never color-only — always paired with a ✓/✕ glyph, plus an `aria-live="polite"` announcement (e.g. "Incorrect. You chose 302 Found. Correct answer: 301 Moved Permanently").

**Secondary actions row (Reference / Teach Me / Double Check):** 10.5px uppercase text, no border/fill, centered below the card, separated by `·`. Visually quieter than option rows and answer states. Fixed order (muscle memory). Invisible padding to reach 44×44px tap target even though visible text is small.

**Accessibility requirements (non-negotiable, not just nice-to-have):**
- All text tokens must clear their listed contrast ratio at actual rendered opacity — never use an unverified/lower opacity for a token.
- Options render as a proper radio group (`role="radiogroup"` / `role="radio"` per option, or a native fieldset), not bare clickable `div`s.
- Focus visibility: 2px `--amber` focus ring, 2px offset, on `:focus-visible` only (never on mouse/touch click).
- Motion: radial glow is static by default; any answer-select transition must be gated behind `prefers-reduced-motion: no-preference`.
- Touch targets: option rows ≥52px tall; every small/icon affordance (secondary actions) padded to 44×44px regardless of visible glyph size.
- Low-light use: avoid pure white anywhere — `#F6F1E9` is the max brightness token, to prevent glare in dark rooms (this is a genuinely dark-room-use app, not just a dark *theme*).

### Secondary action behavior (bottom sheet)

Reference / Teach Me / Double Check all open the **same reusable bottom-sheet component** with three content variants — not three different UI patterns, and not an inline-expanding card (would disrupt the card's fixed, calm footprint) or a full modal (too heavy for low-stakes supplementary info).

- **Reference:** heading "Reference," plain list from `references[]`. Bare source names stay as plain text; real URLs are tappable and open externally. Read-only, no copy action.
- **Teach me:** heading "Teach me," the in-app `explanation` shown first as plain body text, then `teachMePrompt` in a visually distinct block (monospace/quoted styling, unambiguous "this is copyable text") with a **Copy** button beneath it.
- **Double check:** shorter — a one-line frame ("Verify this independently"), then `doubleCheckPrompt` in the same copyable-block style + Copy button. No duplicate explanation, to keep it visibly distinct from Teach Me rather than a reskin of the same feature.
- **Copy button:** tap → clipboard write → brief toast ("Copied — paste into Claude or ChatGPT"). Sheet stays open afterward (no auto-dismiss) in case they want to reread.

**Sheet mechanics:**
- `role="dialog"` `aria-modal="true"`; focus moves into the sheet on open, returns to the triggering action label on close.
- Dismiss via backdrop tap, swipe-down, explicit close control, or Escape (external keyboard).
- Slide-up transition, gated behind `prefers-reduced-motion` (fade instead, if set).
- Max-height ~55–60% of viewport, scrolls internally if content overflows — never covers the full screen.
- **Opening a sheet never resets or advances the question underneath** — it's a read-only overlay on a frozen moment; dismissing returns to exactly the answered/unanswered state left behind.

### Study Hub

A fixed top-right amber dot icon — same quiet, no-chrome visual family as the rest of the app's affordances — opens a bottom-sheet overlay, same component pattern as the per-question `ActionSheet` above, stacked above it via z-index so both can independently be open. Three sections, fixed order:

- **Random** — tapping switches selection back to the default uniform-random pool immediately and closes the hub.
- **Sequential** — tapping expands to list every topic present in the pool with its question count; picking one switches to walking that topic's questions in strict ascending ID order (never random), auto-advancing forward on every answer regardless of correct/incorrect. A per-topic cursor (last question shown) persists across sessions, so returning to a topic later resumes where you left off rather than restarting.
- **Progress** — tapping expands to a per-topic coverage view: for each topic, a bar showing how many questions are currently correct, missed, or not yet attempted — computed entirely from the on-device attempt log, instantly, with no network call. See Progress reporting, below.

Opening or closing the hub alone never changes anything on screen — only an actual selection (Random, or a Sequential topic) does.

## Explicitly out of scope (for now)

- No live chat/API calls from within the app (Teach Me / Double Check are copyable prompts, not inline answers)
- No cross-device sync (single device; Blob backup is for recovery, not sync — no read-back into the app)
- No classic spaced repetition (due-dates, decay curves, review queues) — only a simple optional weight-toward-missed-questions bias, off by default
- No auth/accounts (device token is anti-abuse only, not real auth)
- ~~No in-app progress dashboard — reporting lives in Claude Code / external chat only~~ Reversed: a lightweight in-app Progress view exists (behind the Study Hub icon, opt-in, computed entirely from the local attempt log — never a network call, never shown on the main loop). No separate Claude Code reporting command exists or is planned — the in-app view is the only progress reporting this app has.
