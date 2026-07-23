---
description: Review a staged question batch (from /generate) and merge it into the live question bank, after a human skim.
argument-hint: [staging-file]
---

You are running the merge half of the Study Loop content pipeline. Full design context: `PROJECT_BRIEF.md` → "Content generation pipeline", `PLAN.md` → Phase 6.

## Step 0 — Find the batch

If `$1` was given, use `data/_staging/$1` (or the literal path if it already includes `data/_staging/`). Otherwise list `data/_staging/*.json` (ignore `.gitkeep`):

- Exactly one file → use it.
- Multiple → ask which one.
- None → say so plainly and stop; there's nothing to merge.

## Step 1 — Validate

Read the staged file. Confirm it's a JSON array and every entry has the required `Question` fields (`types/question.ts`): `id`, `topic`, `mode`, `prompt`, `options`, `correctIndex` (in range), `explanation`, `references`, `teachMePrompt`, `doubleCheckPrompt`. If anything is malformed, report exactly what and stop — don't attempt to guess-fix it.

## Step 2 — Skim summary

Print a scannable summary, one line per question: topic, mode, and the prompt (truncate if long). This is a **general skim, not a per-question audit** — the point is to sanity-check the batch shape (right topics, right mix, nothing obviously off), not to re-review references or re-verify facts. If the user asks to see any specific one in full, show it.

## Step 3 — Confirm

Ask for confirmation via AskUserQuestion: merge the whole batch, or let the user name specific ones to drop first (they may just say so in plain chat — e.g. "drop the third one" — since this is a conversation, not a form). Do not merge without an explicit go-ahead. This is the real remaining checkpoint in the pipeline — treat it as such, don't rubber-stamp past it.

## Step 4 — Assign real IDs and merge, per topic

Topics are open (any lowercase-hyphenated slug — see `types/question.ts`), so there's no fixed prefix table. **The ID prefix is the topic slug itself** — a `capitals-and-countries` question gets IDs like `capitals-and-countries-0001`. Simple and collision-free without needing to invent or maintain an abbreviation per topic.

For each topic present in the confirmed batch:

1. If `data/questions/{topic}.json` doesn't exist yet, create it as `[]` first.
2. Scan the existing file for whatever prefix its IDs already use (a topic file created before this convention, like `javascript`'s `js-0001`, keeps its existing prefix — don't rename established IDs) and the current highest `{prefix}-NNNN` number (0 if the file is empty); assign the batch's new questions sequential numbers continuing from there, zero-padded to 4 digits. For a brand-new topic file, the prefix is the topic slug itself.
3. Append the questions to the array and write the file back. Match the existing formatting style (2-space indent); it's fine if it's not byte-identical to hand-written entries, just keep it readable and consistent within the file.
4. If this topic file didn't exist before this run, add the missing import + spread line to `lib/questionPool.ts` (follow the existing pattern exactly — it's a small hand-maintained list, not auto-discovered).

## Step 5 — Clean up and verify

1. Delete the merged staging file — it's redundant once merged (git history covers the live bank; staging is gitignored and meant to be transient).
2. Run `npm run lint` and `npm run build` to confirm the merge didn't break anything (bad JSON, a `lib/questionPool.ts` edit that doesn't compile, etc.). If either fails, report the failure clearly — don't silently leave the bank in a broken state; fix it or tell the user exactly what's wrong.

## Step 6 — Report

Print what got merged (question count per topic, the new ID range assigned), and new total counts per topic in the live bank.
