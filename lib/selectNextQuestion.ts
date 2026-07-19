import type { Question } from "@/types/question";
import type { Attempt } from "@/lib/storage";

/**
 * Pure selection function — no framework or storage coupling, easy to
 * test standalone. Never immediately repeats lastShownId. At bias <= 0,
 * uniform random. At bias > 0, a question whose most recent attempt was
 * incorrect gets weight (1 + bias) instead of 1 — no due-dates, no
 * review-queue, just a likelihood nudge (see PROJECT_BRIEF.md).
 */
export function selectNextQuestion(
  pool: Question[],
  history: Attempt[],
  bias: number,
  lastShownId: string | null
): Question {
  const candidates =
    pool.length > 1 ? pool.filter((q) => q.id !== lastShownId) : pool;

  if (bias <= 0) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  const weights = candidates.map((q) => {
    const attemptsForQuestion = history.filter((a) => a.questionId === q.id);
    const mostRecent = attemptsForQuestion[attemptsForQuestion.length - 1];
    const missed = mostRecent !== undefined && !mostRecent.correct;
    return missed ? 1 + bias : 1;
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let r = Math.random() * totalWeight;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}
