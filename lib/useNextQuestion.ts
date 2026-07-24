import { useEffect, useState } from "react";
import type { Question } from "@/types/question";
import { selectNextQuestion } from "@/lib/selectNextQuestion";
import { getAttempts, appendAttempt, getLastShownId, setLastShownId } from "@/lib/storage";
import { BIAS } from "@/lib/config";
import { syncBackup } from "@/lib/backupSync";

/**
 * The only thing that touches localStorage. Picks the first question on
 * mount and exposes recordAnswer/advance for the rest of the loop.
 *
 * `active` lets this idle while sequential study mode is in use instead of
 * picking a question that then just sits stale — and re-picks a fresh one
 * when switching back to random mode.
 */
export function useNextQuestion(pool: Question[], active: boolean) {
  const [question, setQuestion] = useState<Question | null>(null);

  useEffect(() => {
    if (!active) return;
    const history = getAttempts();
    const lastShownId = getLastShownId();
    const next = selectNextQuestion(pool, history, BIAS, lastShownId);
    setLastShownId(next.id);
    // localStorage is unavailable during SSR, so the first pick can only
    // happen client-side on mount — this is the brief's documented loading flicker.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuestion(next);
    // pool is a static import, stable across renders — intentionally re-run only on `active` change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  function recordAnswer(selectedIndex: number, correct: boolean) {
    if (!question) return;
    const attempts = appendAttempt({ questionId: question.id, correct, timestamp: Date.now() });
    syncBackup(attempts);
  }

  function advance() {
    const history = getAttempts();
    const next = selectNextQuestion(pool, history, BIAS, question?.id ?? null);
    setLastShownId(next.id);
    setQuestion(next);
  }

  return { question, loading: question === null, recordAnswer, advance };
}
