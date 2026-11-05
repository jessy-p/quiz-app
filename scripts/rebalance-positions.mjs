#!/usr/bin/env node
// Spread correct answers evenly across positions, in place.
//
//   node scripts/rebalance-positions.mjs                      # every live topic file
//   node scripts/rebalance-positions.mjs data/_staging/x.json # specific file(s)
//
// Language models are bad at randomness, so generated questions cluster the
// correct answer in some positions. This reorders each question's options
// so that, within each file, correct answers are split evenly across
// positions (per option count), then updates `correctIndex`. Wrong options
// are shuffled too. Nothing else changes.
//
// Safe because: explanations never refer to options by position (enforced
// by check-bias.mjs), and attempt history stores only questionId/correct,
// never which option was picked.
//
// Seeded by the file's contents, so the same input always gives the same
// output.
import path from "node:path";
import { createHash } from "node:crypto";
import { questionFiles, readQuestions, writeQuestions } from "./questionFile.mjs";
import { OPTION_REFERENCE } from "./check-bias.mjs";

function seededRandom(seedText) {
  let seed = createHash("sha256").update(seedText).digest().readUInt32LE(0);
  // mulberry32
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(items, random) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function rebalance(questions, random) {
  const byOptionCount = new Map();
  for (const q of questions) {
    const n = q.options.length;
    if (!byOptionCount.has(n)) byOptionCount.set(n, []);
    byOptionCount.get(n).push(q);
  }
  for (const [n, group] of byOptionCount) {
    // Even spread of target positions (0,1,…,n-1,0,1,…), in random order.
    const targets = shuffle(group.map((_, i) => i % n), random);
    group.forEach((q, i) => {
      const correct = q.options[q.correctIndex];
      const wrong = shuffle(q.options.filter((_, j) => j !== q.correctIndex), random);
      wrong.splice(targets[i], 0, correct);
      q.options = wrong;
      q.correctIndex = targets[i];
    });
  }
  return questions;
}

const paths = process.argv.slice(2);
const files = paths.length ? paths.map((p) => path.resolve(p)) : questionFiles();

for (const file of files) {
  const questions = readQuestions(file);
  const blocked = questions.filter((q) => OPTION_REFERENCE.test(q.explanation));
  if (blocked.length) {
    console.error(
      `${path.basename(file)}: not rebalanced — these explanations refer to options by letter/number, ` +
        `which would point at the wrong option after reordering: ${blocked.map((q) => q.id).join(", ")}`,
    );
    process.exitCode = 1;
    continue;
  }
  rebalance(questions, seededRandom(JSON.stringify(questions)));
  writeQuestions(file, questions);
  console.log(`${path.basename(file)}: rebalanced ${questions.length} questions`);
}
