---
description: Execute a confirmed spec (from /discuss) by generating each section in parallel, or validate/stage question content brought back from elsewhere — either way, stages the survivors for /merge.
argument-hint: [topic, e.g. "for javascript"] or [path to / pasted content of already-written questions]
---

You are running the generation half of the Study Loop content pipeline. Full design context: `PROJECT_BRIEF.md` → "Content generation pipeline", `PLAN.md` → Phase 6. Planning happens in `/discuss`, not here — this command executes a spec, or validates content, it doesn't hold a planning conversation.

## Which mode?

- **Execute.** This conversation has a confirmed spec (from `/discuss`, or a bare topic ask) and wants questions generated now, in Claude Code. Default when no actual question content is present.
- **Bring-your-own.** The user has already-written question content (pasted, or a file path in `$ARGUMENTS`/conversation) and wants it format-checked, reviewed, and fact-checked — not invented. Use this whenever real question content, not just a topic description, is present. This is also where content generated via `/discuss`'s exported prompt comes back in.

If neither a confirmed spec, a topic, nor actual content is present in this conversation, stop and ask instead of guessing.

The two modes share Steps 2 through 6 almost entirely; they differ only in how the draft batch is produced (Step 1).

## Reference examples (style anchor — independent of the live bank)

The live bank starts empty or thin and gets wiped/regenerated over time — don't depend on it having good examples in it. These two are the permanent style anchor for tone, difficulty, and the `teachMePrompt` convention. Use them (not live-bank lookups) whenever the steps below call for an example, in **both modes** — in Bring-your-own, format-checking includes confirming supplied questions actually follow this convention, not just that the JSON shape is technically valid.

**Quick-fire:**
```json
{
  "id": "js-0001",
  "topic": "javascript",
  "mode": "quick-fire",
  "prompt": "What does `typeof null` return in JavaScript?",
  "options": ["'null'", "'undefined'", "'object'", "'number'"],
  "correctIndex": 2,
  "explanation": "`typeof null` returns \"object\" — a long-standing language bug preserved for backwards compatibility. `null` is not actually an object; this is purely a quirk of `typeof`.",
  "references": ["MDN: typeof"],
  "teachMePrompt": "I just learned that `typeof null === 'object'` in JavaScript. Teach me the full mental model behind it — how `typeof` classifies each of JavaScript's types, why primitives and objects are checked differently, and the other well-known quirks that fall out of the same object model (arrays, functions, NaN). Don't just explain the null case in isolation — show me how it fits alongside the others.",
  "doubleCheckPrompt": "Is it accurate that `typeof null` returns 'object' in JavaScript, and that this is considered a bug in the language spec? Cite sources."
}
```

**Scenario:**
```json
{
  "id": "ra-0002",
  "topic": "rest-api",
  "mode": "scenario",
  "prompt": "A client integration keeps double-charging customers because their 'Place Order' POST request times out and their retry logic resubmits it. What's the standard REST/HTTP-level fix, without asking the client to change their retry behavior?",
  "options": [
    "Change the endpoint from POST to GET so retries are automatically safe",
    "Have the server require an Idempotency-Key header from the client, and return the original result if it sees a repeat key instead of creating a new order",
    "Add a CAPTCHA to slow down retries",
    "Tell the client to increase their timeout so retries happen less often"
  ],
  "correctIndex": 1,
  "explanation": "An idempotency key (a client-generated unique token sent per logical request) lets the server recognize a retried request as the same operation and return the original result instead of creating a duplicate — this is the standard pattern used by payment APIs like Stripe. Switching to GET is wrong because GET must be safe/non-mutating by spec, and placing an order is inherently a side-effecting write, not a read. A CAPTCHA doesn't address the underlying double-submission problem and adds friction for legitimate use. A longer timeout just delays retries — it doesn't stop a legitimate slow response from still triggering a retry-driven duplicate.",
  "references": ["stripe.com: Idempotent requests", "MDN: Idempotent (HTTP glossary)"],
  "teachMePrompt": "I just learned how idempotency keys prevent duplicate charges from client retries. Teach me the full mental model of idempotency in distributed systems: why POST isn't naturally idempotent, how idempotency keys let you make an inherently non-idempotent operation safe to retry, how a real implementation (like Stripe's) stores and checks keys, and how this connects to the same idempotency concept behind PUT and GET in the REST spec. Don't just explain the keys mechanism — show me how it fits into the bigger idempotency picture.",
  "doubleCheckPrompt": "Is it accurate that idempotency keys are the standard mechanism for making a normally non-idempotent operation like 'place an order' safe to retry, and that this is the pattern payment APIs such as Stripe use? Cite sources."
}
```

What to take from these: `explanation` in scenario mode covers why *every* wrong option fails, not just why the right one wins. `teachMePrompt` always names the broader concept/mental model the fact belongs to and asks for related parts too — never just restates the narrow fact. `references` are plain display strings unless a tappable link is actually wanted.

## Distractor quality rules

Ground every distractor in a named, real misconception before writing it — the process is "identify a documented way people actually get this wrong, then phrase it," not "invent a wrong-sounding answer." If a genuine misconception doesn't exist for a slot, use fewer options rather than fabricate one to hit a fixed count — `options` is a plain `string[]`, not locked to any particular length; 3 sharp options beat 4 where the 4th is padding.

Every option (correct and incorrect) needs its own explanation line — state precisely what's wrong with each wrong one, not a collective "the others are incorrect." Before finalizing, check each option against the stem (does it contradict something the stem already established?) and against its own explanation (does the explanation accurately restate what the option claims before refuting it?).

---

## Execute mode

### Step 0 — Get the spec

Check whether this conversation already has a confirmed spec from `/discuss` — a bank/topic plus a list of sections, each with sub-focus, mode, count, and a fact-check decision. If so, use it exactly as confirmed there; don't re-derive or re-ask anything already settled.

If not — `/generate` was invoked directly without running `/discuss` first — synthesize a lightweight single-section spec inline:

1. **Determine the topic.** `$ARGUMENTS` is the primary source (the user states the bank directly, this isn't something to infer). If no arguments were given, take it from the preceding conversation.
2. Read `data/questions/*.json` for that topic's current count and mode split (zero if the file doesn't exist yet — not an error).
3. Write out a one-section spec: sub-focus, mode (same per-question judgment call as `/discuss` uses — design/judgment tradeoffs are `scenario`, single syntax/mechanism facts are `quick-fire`), and count (**hard cap ~15-20**, default ~10 if unclear).
4. Decide fact-check the same way `/discuss` does: mandatory for content that's **time-sensitive** (new or fast-moving enough that training data is likely thin or stale), skipped by default for stable fundamentals.
5. Print the spec — bank as its own line (e.g. "Bank: `javascript`, existing, N questions currently" or "doesn't exist yet — this would create it") — and confirm via AskUserQuestion before proceeding. For anything bigger than one quick batch, running `/discuss` first is the better path; this fallback exists for small one-off asks.

### Step 1 — Generator subagents, one per section (parallel)

For each section in the confirmed spec, spawn one subagent (Agent tool, `subagent_type: general-purpose`). **Issue all sections' Agent calls together in the same turn, not one after another** — sections are deliberately non-overlapping, so they don't need to see each other's output to avoid duplicating each other. Run in foreground; Step 2 depends on every section finishing.

**Model per section:** pass `model: "haiku"` for `quick-fire` sections — plausible-distractor generation for a single syntax/mechanism fact doesn't need a stronger model. Leave `scenario` sections, and **any section marked time-sensitive regardless of mode**, on the default (omit `model`, inherits this conversation's model) — scenario mode's "every wrong option fails for a genuinely distinct reason" bar, and time-sensitive content's thin/stale training data, are exactly where a weaker model would reintroduce the quality problem sectioning exists to solve, not a place to save on.

Each subagent's prompt must be self-contained (subagents don't inherit this conversation):

- That section's spec only: sub-focus, mode, count.
- The exact `Question` schema from `types/question.ts`, pasted in directly.
- The two reference examples above, pasted in directly.
- The distractor quality rules above, pasted in directly.
- That section's dedup list: current live-bank `prompt` strings (just the strings, not full objects) whose topic overlaps this section's sub-focus, with the instruction not to regenerate anything substantively the same. Empty is fine — nothing to check against for a new bank or sub-focus.
- Any reference material `/discuss` collected for this section, pasted in directly.
- For a section marked time-sensitive: must use web search, ground claims in current sources.
- Instruction to use placeholder IDs prefixed with this section's number (section 1 → `NEW-1-1`, `NEW-1-2`, ...; section 2 → `NEW-2-1`, ...) so sections don't collide once combined.
- Instruction to return the batch as a JSON array in its final response text — not written to any file. You (the command, not the subagent) are the only writer.

If a single section's own count exceeds ~15-20, it was sized wrong at the planning stage — say so plainly and point back to `/discuss` to split it, rather than silently spawning a second call for the same section (which would reintroduce the same-sub-topic dedup problem sectioning exists to avoid).

Once every section's subagent returns, concatenate all sections' arrays into one **draft batch** — this is what Steps 2-6 (shared, below) operate on.

---

## Bring-your-own mode

### Step 0 — Locate, validate, and spec

1. **Get the content.** From `$ARGUMENTS`/conversation: a file path (read it) or content pasted directly. If it's genuinely unclear where the content is, ask — don't guess at a file path.
2. **Format-check every entry** against the exact `Question` schema in `types/question.ts` and the reference-example convention above: all required fields present and correctly typed, `correctIndex` within range, `options` a reasonable length, `mode`/`topic` valid enum values, `teachMePrompt` actually follows the "name the broader mental model" convention (not just present as a string), `references` follow the plain-string-unless-URL rule. **Report format problems plainly and ask how to proceed** (fix and resupply, or exclude the bad ones and continue with what's valid) — don't silently drop or silently "fix" malformed entries yourself.
3. **Group the valid entries by their own `topic` field** — supplied content can span multiple topics in one file. For each topic present, read `data/questions/{topic}.json` for current counts (zero if it doesn't exist).
4. **Decide fact-check need per topic**, same rule as Execute mode — mandatory for time-sensitive content, skipped by default for stable fundamentals.
5. Print the full spec (per-topic counts, fact-check decision per topic) and confirm via AskUserQuestion, same as Execute mode. This is still the one checkpoint before unattended work starts.

Reassign placeholder IDs (`NEW-1`, `NEW-2`, ...) to every valid entry regardless of what ID the user supplied — final sequential IDs are still assigned at merge time from the live bank's own numbering.

**No Step 1 here — there is no generator.** The format-checked, re-ID'd supplied content *is* the draft batch for Steps 2-6.

---

## Steps 2-6 — Shared by both modes

### Step 2 & Step 3 — Adversarial reviewer, and fact-checker where the spec calls for it (parallel, isolated subagents)

**Chunk the combined draft batch at ~20-25 questions per subagent call, regardless of mode.** Execute mode's combined batch (summed across sections) can just as easily exceed one call's rigor ceiling as a large Bring-your-own batch can — this isn't Bring-your-own-specific. If the draft batch is at or under ~20-25, it's one chunk.

**Adversarial reviewer always runs on every chunk.** If fact-check is needed for a chunk (any section/topic in it was marked required), **spawn both subagents for that chunk in the same turn** (two Agent calls together, not one-then-wait) — they're independent evaluations of the same chunk, and review is typically the far slower of the two, so serializing them just adds the faster stage's time for no benefit. Chunks themselves can also be dispatched together — there's no need to review chunk 1 to completion before starting chunk 2.

**Model:** the adversarial reviewer stays on the default model (no `model` override) — it's the pipeline's actual quality gate, and per `PLAN.md` it's the stage that's caught real issues on the one live run so far, so it's the last place to economize. The fact-checker, when it runs, gets `model: "haiku"` — its task is mechanical relative to review (pull a claim, search, compare, flag what can't be sourced), and its accuracy comes from the search results it reads rather than the model's own training-data recall, so a cheaper model doing the same searches is a reasonable trade regardless of which time-sensitive topic it's checking.

When fact-check runs for a chunk, it checks the **full chunk**, not just whatever review passes — gating it on review's verdicts would make them sequential again.

**Paste the full chunk's JSON directly into every subagent's prompt.** Don't make any of them read a file to get the content it's evaluating.

**Adversarial reviewer** — frame it explicitly as: *"Try to break these questions."* For each question it must judge:

- For `scenario` mode: does every wrong option fail for a genuinely distinct reason, or are two wrong for the same underlying reason in disguise? Is there a defensible case for a "wrong" answer? Does the explanation actually teach the tradeoff, or just assert the right answer?
- For `quick-fire` mode: is the correct answer actually unambiguous, and are the distractors plausible rather than filler?
- **Per-option explanation completeness:** every option — correct and incorrect — needs its own explanation line stating precisely what's wrong (or right) about it. A collective "the others are incorrect" is a fail, not a pass with a note.
- **Distractor grounding:** is each wrong option traceable to a real, plausible misconception, or does it read as generic filler manufactured to hit a fixed option count? Fewer, sharper options beat padding — a distractor that exists only to make the array length 4 is a fail.
- **Consistency pass, both directions:** does any option contradict something the stem already established? Does each option's explanation accurately restate what that option claims before refuting it, or does it misstate/strawman the option?
- **Time-sensitive claim check:** even in a chunk where fact-check wasn't required, flag (fail with reason) any claim that's browser-default/framework-version/spec-dependent (cookies, CORS, HTTP defaults, and similar) rather than silently passing it — these are exactly the claims that go stale or were never quite right, and the section-level fact-check decision is made at too coarse a grain to catch one stray claim in an otherwise-stable section.
- **Duplicate/near-duplicate check, two directions:** against the live-bank dedup list given for that question's section/topic (empty is fine), and **within the draft batch itself** — including across sections (Execute mode) or across chunks (Bring-your-own) — since sectioning/chunking is a design aid, not a guarantee two pieces of content never converge. Plain judgment call, no tooling needed.

**Fact-checker** (only when called for) — must pull every factual claim out of context and verify it independently via web search, flagging anything it cannot source — especially load-bearing for time-sensitive content.

Every subagent that runs returns a verdict per placeholder ID: pass, or fail with a specific, concrete reason.

### Step 4 — Flag-and-drop

A question is staged if the adversarial reviewer passed it, **and** the fact-checker passed it too if one ran for its chunk (skipped fact-check counts as pass-by-default for that check, not a rejection). Anything else is dropped — never silently rewritten or auto-fixed, in either mode. Collect the drop reasons; you'll report them, not act on them further.

### Step 5 — Write staging output

Write the surviving questions (still with placeholder IDs) to `data/_staging/batch-{YYYYMMDDHHMMSS}.json` (actual current timestamp), as a JSON array. Create `data/_staging/` if it doesn't exist. This is one combined file across all sections/chunks/topics — `/merge` already groups by each question's own `topic` field when writing to the live bank, so a multi-topic staging file works without extra handling.

### Step 6 — Report

Print a summary: how many were processed (generated per section, in Execute mode; supplied and format-valid, in Bring-your-own), how many staged, how many dropped (each with its reason — nothing "just vanishes"), the staging file path, and a reminder that `/merge` is next. In Bring-your-own, also report any entries excluded at the format-check stage (Step 0.2) separately from pipeline drops, since those failed for a different reason (malformed input, not a review/fact-check judgment).
