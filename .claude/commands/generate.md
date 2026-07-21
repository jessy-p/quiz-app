---
description: Generate one batch (max ~15) of quiz questions from the planning discussion already in this conversation — runs generator, adversarial reviewer, and fact-checker automatically, then stages the survivors for /merge.
argument-hint: [topic/focus, e.g. "for javascript" or "hoisting, javascript"]
---

You are running the Study Loop content-generation pipeline. Full design context: `PROJECT_BRIEF.md` → "Content generation pipeline", `PLAN.md` → Phase 6.

**This command only makes sense in a conversation that already discussed what to generate.** If nothing in this conversation established a topic/focus, stop and ask the user to describe what they want generated instead of guessing.

**One batch per invocation, hard cap ~15 questions.** This matches what a single generator/reviewer/fact-checker subagent call can actually do well — quality (variety of distractors, genuine per-item scrutiny, real search verification) visibly degrades past that in one call. If the conversation asked for more than ~15, don't try to chunk it yourself — say so plainly and tell the user to run `/generate` again for the next round once this one's merged. Tracking which sub-topics have been covered across multiple rounds is the user's job, not this command's.

## Reference examples (style anchor — independent of the live bank)

The live bank starts empty or thin and gets wiped/regenerated over time — don't depend on it having good examples in it. These two are the permanent style anchor for tone, difficulty, and the `teachMePrompt` convention. Use them (not live-bank lookups) whenever the steps below call for an example.

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

## Step 0 — Synthesize the spec

Before touching anything else:

1. **Determine the topic.** `$ARGUMENTS` (whatever followed `/generate`, e.g. "for javascript") is the primary source — the user states the bank directly, this isn't something to infer or guess. If no arguments were given, take it from the preceding conversation instead. Either way, the topic is already known at this point, not something to figure out.
2. Read `data/questions/*.json` and note current counts for that topic (and its mode split), so you know actual coverage, not a guess. If the topic's file doesn't exist yet, that's zero, not an error.
3. From the preceding conversation (plus any arguments), write out an explicit spec: bank/topic, specific focus/sub-topic, mode (`quick-fire` / `scenario`), and count (≤15; default to something modest like 10 if the conversation didn't give a number).
4. Print the full spec — including the bank as its own line (e.g. "Bank: `javascript`, existing, N questions currently" or "Bank: `system-design`, doesn't exist yet — this would create it") so it's visible as part of what's being confirmed, not because it was in doubt — then confirm via AskUserQuestion (single question: proceed, or let them adjust). Do not proceed without an explicit go-ahead — this is the one deliberate checkpoint before the rest of the pipeline runs unattended.

## Step 1 — Generator (isolated subagent)

Spawn one subagent (Agent tool, `subagent_type: general-purpose`, foreground — the next step depends on its output). It does not inherit this conversation, so its prompt must include everything it needs directly:

- The confirmed spec (focus, mode, count).
- The exact `Question` schema from `types/question.ts`, pasted in directly (not referenced by path).
- The two reference examples above (whichever mode matches, or both), pasted in directly, so tone/style/difficulty/`teachMePrompt` convention stays consistent — these are the permanent anchor, not a live-bank lookup.
- **If the target topic's bank is non-empty**, its current prompts (just the `prompt` strings, not full objects), with the instruction: don't regenerate anything substantively the same as these. If it's empty (new topic, or the bank was just cleared), skip this — nothing to check against yet.
- For **any CCAF question**: must use web search and ground claims in current sources — training data for this cert is thin/stale (launched ~March 2026). Don't treat exam-format figures as settled without re-verifying via search.
- Instruction to use placeholder IDs (`NEW-1`, `NEW-2`, ...) — final sequential IDs are assigned at merge time.
- Instruction to return the batch as a JSON array in its final response text — **not written to any file**. You (the command, not the subagent) are the only writer.

## Step 2 — Adversarial reviewer (isolated subagent)

Spawn a separate subagent with the draft batch pasted into its prompt, plus the same existing-bank prompts list from Step 1 (if any — empty is fine, nothing to check against). Frame it explicitly as: *"Try to break these questions."* For each question it must judge:

- For `scenario` mode: does every wrong option fail for a genuinely distinct reason, or are two wrong for the same underlying reason in disguise? Is there a defensible case for a "wrong" answer? Does the explanation actually teach the tradeoff, or just assert the right answer?
- For `quick-fire` mode: is the correct answer actually unambiguous, and are the distractors plausible rather than filler?
- **If an existing-bank prompts list was given, is this a duplicate or near-duplicate of anything in it?** Plain judgment call, no tooling needed — if it's substantively the same question as one already live, fail it.

Return a verdict per placeholder ID: pass, or fail with a specific, concrete reason.

## Step 3 — Fact-checker (isolated subagent)

Spawn another separate subagent with the same draft batch. It must pull every factual claim out of context and verify it independently via web search, flagging anything it cannot source — especially load-bearing for CCAF content. Same verdict format: pass, or fail with the specific unverifiable/wrong claim.

## Step 4 — Flag-and-drop

A question is staged only if **both** the adversarial reviewer and the fact-checker passed it. Anything else is dropped — never silently rewritten or auto-fixed. Collect the drop reasons; you'll report them, not act on them further.

## Step 5 — Write staging output

Write the surviving questions (still with placeholder IDs) to `data/_staging/batch-{YYYYMMDDHHMMSS}.json` (actual current timestamp), as a JSON array. Create `data/_staging/` if it doesn't exist.

## Step 6 — Report

Print a summary: how many were generated, how many staged, how many dropped (each with its reason — nothing "just vanishes"), the staging file path, and a reminder that `/merge` is next.
