#!/usr/bin/env node
// Answer-bias check for the question bank (or a staged batch).
//
//   node scripts/check-bias.mjs                      # every live topic file
//   node scripts/check-bias.mjs data/_staging/x.json # specific file(s)
//   node scripts/check-bias.mjs --list               # also list each flagged id
//
// Reports, per file:
//   - correct-answer position spread (should be roughly even)
//   - "longest-answer tell": how often the correct option is clearly the
//     longest one, so a test-taker could guess it without knowing the topic.
//     By chance this would be about 1/n for n options.
//   - explanations that refer to options by letter/number ("Option B",
//     "(option 2)"). The UI never shows letters and options get reordered,
//     so these are always wrong. These fail the check (exit code 1).
//
//   - wording cues (scripts/surface-cues.mjs): punctuation, "since…"
//     clauses, parentheticals, absolute words — any feature far more common
//     on correct options than wrong ones (or vice versa).
//
// The longest-answer tell and wording cues are warnings, not failures:
// fixing them means rewriting options, which needs judgment and review.
import path from "node:path";
import { pathToFileURL } from "node:url";
import { questionFiles, readQuestions } from "./questionFile.mjs";
import { cueStats, flaggedCues } from "./surface-cues.mjs";

// Correct option counts as "clearly longest" when it is at least this much
// longer than the longest wrong option. Length ties or near-ties aren't a tell.
export const LENGTH_TELL_RATIO = 1.2;

export const OPTION_REFERENCE =
  /\b(?:options?|answers?|choices?)\s+(?:\d|[A-E]\b)|\((?:[A-E]|\d)\)/i;

export function hasLengthTell(question) {
  const lengths = question.options.map((o) => o.length);
  const correct = lengths[question.correctIndex];
  const longestWrong = Math.max(
    ...lengths.filter((_, i) => i !== question.correctIndex),
  );
  return correct >= longestWrong * LENGTH_TELL_RATIO;
}

export function analyze(questions) {
  const positions = {};
  const lengthTells = [];
  const optionReferences = [];
  for (const q of questions) {
    const letter = String.fromCharCode(65 + q.correctIndex);
    positions[letter] = (positions[letter] ?? 0) + 1;
    if (hasLengthTell(q)) lengthTells.push(q.id);
    if (OPTION_REFERENCE.test(q.explanation)) optionReferences.push(q.id);
  }
  return { total: questions.length, positions, lengthTells, optionReferences };
}

function pct(n, total) {
  return total ? `${Math.round((100 * n) / total)}%` : "-";
}

// CLI — only when run directly, not when imported by rebalance-positions.mjs.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const list = args.includes("--list");
  const paths = args.filter((a) => !a.startsWith("--"));
  const files = paths.length ? paths.map((p) => path.resolve(p)) : questionFiles();

  let failed = false;
  for (const file of files) {
    const r = analyze(readQuestions(file));
    const spread = Object.keys(r.positions)
      .sort()
      .map((k) => `${k} ${pct(r.positions[k], r.total)}`)
      .join("  ");
    console.log(`\n${path.basename(file)} — ${r.total} questions`);
    console.log(`  correct position:     ${spread}`);
    console.log(
      `  longest-answer tell:  ${r.lengthTells.length}/${r.total} (${pct(r.lengthTells.length, r.total)})`,
    );
    console.log(`  option references:    ${r.optionReferences.length}`);
    const questions = readQuestions(file);
    const cues = cueStats(questions);
    const flagged = flaggedCues(cues, questions.length);
    console.log(
      `  wording cues:         ${flagged.length ? flagged.map((n) => `${n} (${cues[n].giveaways.length} give away the answer)`).join(", ") : "none flagged"}`,
    );
    if (list && r.lengthTells.length) console.log(`    tells: ${r.lengthTells.join(", ")}`);
    if (r.optionReferences.length) {
      console.log(`    FAIL — explanations refer to options by letter/number: ${r.optionReferences.join(", ")}`);
      failed = true;
    }
  }
  process.exitCode = failed ? 1 : 0;
}
