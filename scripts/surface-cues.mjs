// Surface cues: features of an option's *wording* (not its content) that
// distinguish correct options from wrong ones. A test-taker who learns
// "the answer is the one with a parenthetical" can score above chance
// without knowing the topic. Used by check-bias.mjs.
//
// Each cue is a regex over the option text. For a set of questions we
// report how often correct vs wrong options have the feature, and how many
// questions it "gives away": the feature is on the correct option and on
// no wrong one, or missing from the correct option and on every wrong one.

export const CUES = {
  "reason clause": /\b(since|because|so|which)\b/i,
  parenthetical: /\(/,
  "colon/semicolon": /[:;]/,
  "em dash": /—/,
  "trailing period": /\.\s*$/,
  "e.g. example": /\be\.g\./i,
  absolute: /\b(always|never|entirely|impossible|guaranteed|every|nothing|at all|by definition)\b/i,
};

export function cueStats(questions) {
  const stats = {};
  for (const [name, re] of Object.entries(CUES)) {
    let correctWith = 0, wrongWith = 0, wrongTotal = 0, giveaways = [];
    for (const q of questions) {
      const has = q.options.map((o) => re.test(o));
      const c = has[q.correctIndex];
      const wrong = has.filter((_, i) => i !== q.correctIndex);
      if (c) correctWith++;
      wrongWith += wrong.filter(Boolean).length;
      wrongTotal += wrong.length;
      if ((c && wrong.every((w) => !w)) || (!c && wrong.every((w) => w))) giveaways.push(q.id);
    }
    stats[name] = {
      correctRate: correctWith / questions.length,
      wrongRate: wrongTotal ? wrongWith / wrongTotal : 0,
      giveaways,
    };
  }
  return stats;
}

// Rough bar for "this cue is worth fixing": rates differ by 20+ points, or
// it singles out the answer in more than 10% of questions. By chance a
// feature would single out the answer in some questions anyway, so a
// small giveaway count is expected; flag only when it's out of proportion.
export function flaggedCues(stats, total) {
  return Object.entries(stats)
    .filter(([, s]) => Math.abs(s.correctRate - s.wrongRate) >= 0.2 || s.giveaways.length / total > 0.1)
    .map(([name]) => name);
}
