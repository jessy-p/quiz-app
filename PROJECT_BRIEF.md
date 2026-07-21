# Study Loop — Project Brief

A phone-first MCQ study app to replace idle scrolling with interview/cert prep. Single user, single device, no accounts, no filtering UI. Open it, answer a question, close it — zero friction in either direction.

## Why this exists

Idle, reflexive phone scrolling → redirect that reflex toward something useful: interview prep (JS/Python/Node, REST/system design/backend architecture, general interview facts) and CCAF (Claude Certified Architect – Foundations) exam prep.

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

**Quick Fire** — straight MCQ. JS/Python/Node syntax & concepts, general interview facts, CCAF terminology. Fast, single correct answer, brief explanation.

**Scenario** — design-judgment questions. REST/system design, backend architecture, and the judgment-heavy CCAF domains (agentic orchestration, MCP tool boundaries, context management tradeoffs). Format: a short realistic scenario, several options where **every wrong option is wrong for a distinct, real reason** — not generic distractors. The explanation must cover why each wrong answer fails, not just confirm the right one. This is the mode's entire value; don't let it degrade into Quick-Fire-with-more-words.

## Per-question actions (static, no live API calls, fully offline-capable)

- **Reference** — short list of sources to check (MDN, official docs, Anthropic docs for CCAF domains, etc.)
- **Teach me** — a brief explanation plus a **copyable prompt** worded to take to Claude/ChatGPT for a deeper explanation elsewhere. The app does not have a bundled chat — this is a handoff, not a feature.
- **Double check** — a second, differently-worded **copyable prompt**, specifically phrased for skeptical independent verification ("is this claim accurate, cite sources") — distinct wording from Teach Me since the intents differ.

All three open as a shared bottom-sheet component over the question card — see **Secondary action behavior** under Design direction for the full interaction spec (content per variant, copy-button behavior, dismiss/focus/motion handling).

## Data model

Static JSON in the repo, not a database. Something like:

```
/data/questions/js.json
/data/questions/python.json
/data/questions/node.json
/data/questions/rest-api.json
/data/questions/system-design.json
/data/questions/backend-general.json
/data/questions/interview-facts.json
/data/questions/ccaf.json
```

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

Schema should be finalized once, then treated as a contract — the app, the generator pipeline, and the progress-reporting command all depend on it staying stable.

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

- Transport model: each backup write sends the **full current log as a snapshot**, not a diff/append against what's already stored — simplest option, fine at current scale (a few hundred bytes per attempt, thousands of attempts is still a small payload). This is a property of the backup write only; the local log itself is still appended to normally. Each write overwrites the same blob path (`addRandomSuffix: false` + `allowOverwrite: true`) rather than accumulating a new object per attempt — Blob's default is to append a random suffix per write, which would silently do the latter if left unset.
- A random device token, generated on first load and stored in localStorage, is sent with each write and used as part of the blob's path — not real auth, just enough that the backup endpoint isn't wide open to anyone who finds the URL. The store itself is private (`access: "private"`); the blob URL is never returned to the client, so reaching the data requires both the token and the store's own server-side credential, not just a guessable URL.
- The backend is a **passive backup destination only** — it never participates in the live question loop, and selection never reads from it. This was a real decision point, not an oversight: moving selection server-side would reintroduce a network dependency on the one interaction that most needs to stay instant and offline-capable.

## Progress reporting (deliberately kept OUT of the app)

In-app: one small, unobtrusive **"Copy progress data" button** (tucked away, not on the main question screen) that copies the full attempt log + a schema/version marker to clipboard as JSON. This remains useful as a no-backend-needed fallback even with Blob backup in place.

Outside the app: a Claude Code slash command, e.g. `/progress`, that reads the attempt log and cross-references it against `/data/questions/*.json` to report things like weakest topics by miss-rate, questions missed more than once, overall coverage. Two ways to get the data in:
- Pull directly from the Vercel Blob backup (preferred once it exists — no manual step).
- Or take the pasted/copied blob from the in-app button (paste into terminal, or drop into a gitignored local file) — works with zero backend dependency.

Either way, this is a look backward for the human, never a lever that changes app behavior.

## Content generation pipeline (Claude Code, agentic)

Single-shot generation is weak for this — it tends to produce shallow or generic distractors, especially for Scenario mode, and can't fact-check itself. Two commands, with a planning conversation ahead of the first one:

1. **Plan (conversation, not a command)** — before any generation runs, talk it through in a normal Claude Code conversation: what's thin in the current bank (topic/mode coverage gaps), what to target this round, any specific sources or angles to emphasize. This is the one point where scope and direction get steered — everything after it runs unattended. `/generate` is then invoked in the same conversation once the plan is agreed, not as a separate session with a formal handoff document.
2. **`/generate`** — takes the agreed plan as context and runs the full pipeline **automatically, in one call**, no per-stage manual invocation:
   - **One batch per invocation, hard-capped at ~15 questions.** That's roughly what a single generator/reviewer/fact-checker subagent call can do well before quality (distractor variety, genuine per-item scrutiny, real search verification rather than assumed-fine) visibly degrades. Bigger topics get covered across multiple separate `/generate` rounds over time, not one large auto-chunked run — tracking which sub-topics still need a round is the user's job (kept offline, outside the app/pipeline), not something the command tracks or persists.
   - **Must be invoked in the same conversation as the planning step**, not a fresh session — that's what makes "takes the agreed plan as context" true at all. On invocation, the command's first move is to explicitly **synthesize the planning discussion into a concrete spec** (focus/sub-topic, mode, count) right there in the conversation, rather than assume it'll carry through implicitly. This matters because the generator/reviewer/fact-checker stages below run as separate, narrowly-scoped agent calls — spawned subagents don't automatically inherit the parent conversation's history, so the synthesized spec is what actually gets passed into each one.
   - **The target bank is stated by the user directly** (e.g. "`/generate for javascript`" — takes `topic` as its argument), not inferred or guessed. The confirmation step prints it as its own visible line alongside the rest of the spec ("Bank: `javascript`, existing, N questions currently") — that's a checkpoint on the whole spec before anything unattended starts, not a mechanism for catching a wrong guess.
   - **Generator** drafts a batch, follows the schema exactly. Given the existing bank's current prompts for that topic as context, so it doesn't regenerate ground already covered. For CCAF, **must use web search** and ground claims in current sources — this cert is new enough (launched ~March 2026, per a quick search at brief-writing time) that training data is thin or stale. Domains to know, subject to re-verification: Agentic Architecture & Orchestration, Tool Design & MCP Integration, Claude Code Configuration & Workflows, Prompt Engineering & Structured Output, Context Management & Reliability. Exam format figures found at brief-writing time (60 questions, 120 min, 720/1000 to pass) are **not confirmed current** — the generator must re-check these via search before relying on them for any question content, rather than treating the numbers above as settled fact.
   - **Adversarial reviewer** — separate internal call, explicitly framed as "try to break this question." For Scenario mode specifically: does each wrong option fail for a genuinely distinct reason, or are two of them wrong for the same underlying reason in disguise? Is there a defensible case for a "wrong" answer? Does the explanation actually teach the tradeoff or just assert the answer? Also given the same existing-bank prompts as the generator, and flags anything that's a plain-judgment duplicate or near-duplicate of a question already live — no similarity tooling, just the reviewer's own read.
   - **Fact-checker** — separate internal call, pulls claims out of context, verifies independently via search, flags anything it can't source. Especially load-bearing for CCAF content.
   - **Flag-and-drop, not auto-fix.** A question either clears both checks and gets staged, or is dropped from the batch with its rejection reason logged in the command's summary output. Never silently rewritten — auto-fixing would mean trusting the fixer's judgment on every questionable case with no visibility, which defeats the point of a separate review stage. A dropped item just means the batch lands under the requested count; nothing needs individual triage.
   - Output goes to `/data/_staging/{batch}.json`, not directly into the live bank.
3. **Staging skim (you)** — a general skim of the batch shape before it enters your actual study pool, not a per-question reference audit.
4. **`/merge`** — staging → live bank, after your skim.

Suggested repo shape for this:

```
/data/questions/{topic}.json      # live bank
/data/_staging/{batch}.json       # pending review, gitignored or PR'd
/.claude/commands/generate.md     # runs generate -> adversarial review -> fact-check -> stage, end to end
/.claude/commands/merge.md        # staging -> live, after human skim
/.claude/commands/progress.md     # reads pasted attempt log, reports back
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
  CopyProgressGlyph.tsx       # corner affordance, outside the card

lib/
  selectNextQuestion.ts       # pure function — pool, history, bias, lastShownId -> next question
  useNextQuestion.ts          # client hook wrapping the above, touches localStorage
  config.ts                   # bias constant (default 0), other tunables
  storage.ts                  # localStorage read/write for attempt log
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
    js.json
    python.json
    node.json
    rest-api.json
    system-design.json
    backend-general.json
    interview-facts.json
    ccaf.json
  _staging/
    {batch}.json               # pending review, gitignored or PR'd before merge

.claude/
  commands/
    generate.md                 # generate -> adversarial review -> fact-check -> stage, end to end
    merge.md
    progress.md

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

**Copy progress data affordance:** small glyph icon fixed in a corner of the app shell (e.g. top-right, above safe area), `--ink-50` at rest, never competing with the question. Tap copies to clipboard, brief toast confirms. Same 44×44px padded hit-target treatment.

**Accessibility requirements (non-negotiable, not just nice-to-have):**
- All text tokens must clear their listed contrast ratio at actual rendered opacity — never use an unverified/lower opacity for a token.
- Options render as a proper radio group (`role="radiogroup"` / `role="radio"` per option, or a native fieldset), not bare clickable `div`s.
- Focus visibility: 2px `--amber` focus ring, 2px offset, on `:focus-visible` only (never on mouse/touch click).
- Motion: radial glow is static by default; any answer-select transition must be gated behind `prefers-reduced-motion: no-preference`.
- Touch targets: option rows ≥52px tall; every small/icon affordance (secondary actions, copy-progress glyph) padded to 44×44px regardless of visible glyph size.
- Low-light use: avoid pure white anywhere — `#F6F1E9` is the max brightness token, to prevent glare in dark rooms (this is a genuinely dark-room-use app, not just a dark *theme*).

### Secondary action behavior (bottom sheet)

Reference / Teach Me / Double Check all open the **same reusable bottom-sheet component** with three content variants — not three different UI patterns, and not an inline-expanding card (would disrupt the card's fixed, calm footprint) or a full modal (too heavy for low-stakes supplementary info).

- **Reference:** heading "Reference," plain list from `references[]`. Bare source names stay as plain text; real URLs are tappable and open externally. Read-only, no copy action.
- **Teach me:** heading "Teach me," the in-app `explanation` shown first as plain body text, then `teachMePrompt` in a visually distinct block (monospace/quoted styling, unambiguous "this is copyable text") with a **Copy** button beneath it.
- **Double check:** shorter — a one-line frame ("Verify this independently"), then `doubleCheckPrompt` in the same copyable-block style + Copy button. No duplicate explanation, to keep it visibly distinct from Teach Me rather than a reskin of the same feature.
- **Copy button:** tap → clipboard write → brief toast ("Copied — paste into Claude or ChatGPT"), same pattern as the copy-progress-data affordance. Sheet stays open afterward (no auto-dismiss) in case they want to reread.

**Sheet mechanics:**
- `role="dialog"` `aria-modal="true"`; focus moves into the sheet on open, returns to the triggering action label on close.
- Dismiss via backdrop tap, swipe-down, explicit close control, or Escape (external keyboard).
- Slide-up transition, gated behind `prefers-reduced-motion` (fade instead, if set).
- Max-height ~55–60% of viewport, scrolls internally if content overflows — never covers the full screen.
- **Opening a sheet never resets or advances the question underneath** — it's a read-only overlay on a frozen moment; dismissing returns to exactly the answered/unanswered state left behind.

## Explicitly out of scope (for now)

- No live chat/API calls from within the app (Teach Me / Double Check are copyable prompts, not inline answers)
- No cross-device sync (single device; Blob backup is for recovery, not sync — no read-back into the app)
- No classic spaced repetition (due-dates, decay curves, review queues) — only a simple optional weight-toward-missed-questions bias, off by default
- No auth/accounts (device token is anti-abuse only, not real auth)
- No in-app progress dashboard — reporting lives in Claude Code / external chat only
