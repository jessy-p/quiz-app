---
description: Interactive planning conversation for a content batch — clarifies goals and references, checks current bank coverage, breaks the target into non-overlapping sections, and produces a confirmed spec for /generate (in Claude Code, or exported for external use).
argument-hint: [topic, e.g. "javascript"] (optional — can also just start talking)
---

You are running the planning half of the Study Loop content pipeline. Full design context: `PROJECT_BRIEF.md` → "Content generation pipeline", `PLAN.md` → Phase 6. This command does not call any subagent — it's a guided conversation with the user that ends in a printed, confirmed spec. Nothing gets generated here.

## Step 1 — Ground the conversation

1. If `$ARGUMENTS` names a topic, treat it as the starting point. Otherwise ask what they want to work on.
2. Read `data/questions/*.json` for current per-topic (and per-mode) counts. A topic whose file doesn't exist yet is zero, not an error — that's a legitimate "new bank" starting point, not a problem to flag.
3. Ask the open questions naturally, as a conversation, not a rigid form:
   - What do you actually want to learn here (interview prep angle, cert prep, a specific weak spot)?
   - Do you already have reference material — docs, articles, notes, a file — you want the questions grounded in? If yes, get it now (paste, or a file path to read) and note which part of the topic it applies to.
4. Using the current coverage counts plus what they said, **propose candidate sub-topics** — call out actual gaps (thin or zero coverage) rather than generic textbook chapter lists. Discuss until the two of you agree on what this round should cover. This is the one open-ended, steerable part of the whole pipeline — take the time here rather than rushing to a spec.

## Step 2 — Break the target into sections

A **section** is a self-contained, non-overlapping sub-topic — the unit that later becomes one parallel generator call. Getting the split right here is what lets `/generate` produce more than one call's worth of good questions without a quality hit, so don't skip this even for a small ask.

For each section, settle:

- **Sub-focus** — specific enough that two sections can't accidentally cover the same ground (e.g. "closures & scope" and "array iteration methods," not both just "javascript").
- **Mode** — a per-section judgment call, not one fixed value for the whole batch. Sections that are genuinely a design/judgment tradeoff (which approach fits this situation, why does this common mistake happen, what's the right pattern here) should be `scenario`; sections that are a single syntax/mechanism fact (what does this operator do, what does this API return) should be `quick-fire`. Don't force scenario framing onto a plain fact, and don't flatten a genuine tradeoff into quick-fire.
- **Count** — cap each section at **~15-20**. This is the same generation-quality ceiling as before (a single call's creative-writing variety degrades past that); sectioning is what lets the *total* exceed it, not a loosening of the per-call limit. Default modest (~10) if there's no strong reason for more.
- **Fact-check** — mandatory for any section that's **time-sensitive**: content new or fast-moving enough that training data is likely thin, stale, or already out of date (a new/evolving certification, a recently released API or language feature, exact spec-version claims, "current" tooling status — anything that could plausibly have changed recently). This is a property of the content, not a fixed list of topics — judge it fresh each time rather than pattern-matching to past examples. Skipped by default for stable, well-established content, where a search is unlikely to catch a real error.

Keep sections **deliberately non-overlapping** — that's what lets them be generated in parallel later without needing to see each other's output. (The adversarial reviewer still cross-checks the combined batch for accidental duplicates as a backstop, but the split should already prevent most of them.)

## Step 3 — Confirm the spec

Print the full spec in one block:

- Bank (topic), existing or new, current count.
- Reference material collected, if any, and which section(s) it applies to.
- One line per section: sub-focus, mode, count, fact-check (required/skipped + why).

Then confirm via AskUserQuestion (proceed as-is, or adjust). Don't move on without an explicit go-ahead — this is the checkpoint that replaces per-stage inspection later in the pipeline.

## Step 4 — Where does generation happen?

Ask via AskUserQuestion:

- **Generate here, now** — stay in this conversation and run `/generate` next; it reads the confirmed spec straight out of the conversation and spawns one parallel generator subagent per section.
- **Export a prompt** — get a single copy-paste block instead, to run in a different tool (another chat, elsewhere), then bring the output back later via `/generate`.

**If "generate here"**: just tell the user the spec is confirmed and ready — they (or you, immediately) invoke `/generate` next in this same conversation. Nothing further to produce here.

**If "export"**: assemble one fenced block containing, in order:
1. Brief framing for whatever tool will read this (writing quiz questions for a personal study app, following an exact schema).
2. The exact `Question` schema from `types/question.ts`, pasted in directly.
3. The schema conventions: `explanation` in scenario mode covers why *every* wrong option fails, not just why the right one wins; `teachMePrompt` always names the broader concept/mental model, never just restates the narrow fact; `references` are plain display strings unless a tappable URL is actually wanted. Plus the two bias rules from `generate.md`'s "Distractor quality rules": **no surface tells** (all options of similar length, specificity and tone, so the correct one can't be spotted by form) and **never refer to options by position** in explanations (options get reordered; refer to them by content).
4. The two reference examples (quick-fire and scenario) from `.claude/commands/generate.md`, pasted in directly.
5. Any reference material collected in Step 1, embedded verbatim if it was pasted/a local file (the external tool can't reach this filesystem), or listed as URLs with an instruction to read them first if it can browse.
6. The full section list from Step 3, each with its dedup list — the target topic's current live-bank `prompt` strings that overlap that section's sub-focus (empty if none), with the instruction not to regenerate anything substantively the same.
7. For any section marked time-sensitive (Step 2's fact-check criterion): an explicit instruction to search the web for current information before writing those — don't assume the external tool searches unprompted.
8. Working instructions: do one section at a time; after finishing a section, list the prompts just written before starting the next, to avoid duplicating across sections within the same sitting; return each section's batch as a JSON array using placeholder IDs prefixed by section number (`NEW-1-1`, `NEW-1-2`, ... for section 1, `NEW-2-1`, ... for section 2) so the sections don't collide when combined.
9. A closing line: when done, bring the combined JSON back into this project and run `/generate` with it (paste it in, or save to a file and give the path).

Print the block and stop — nothing else happens until the user brings content back.
