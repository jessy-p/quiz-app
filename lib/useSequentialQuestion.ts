import { useEffect, useMemo, useState } from "react";
import type { Question } from "@/types/question";
import { getSortedTopicQuestions, selectSequentialQuestion } from "@/lib/selectSequentialQuestion";
import { getSequentialLastShownId, setSequentialLastShownId, appendAttempt } from "@/lib/storage";
import { syncBackup } from "@/lib/backupSync";

/**
 * Sibling to useNextQuestion, same { question, loading, recordAnswer, advance }
 * shape so QuestionScreen can treat both hooks interchangeably. Idle
 * (question stays null) while topic is null or has zero matching questions.
 */
export function useSequentialQuestion(pool: Question[], topic: string | null) {
  const topicQuestions = useMemo(
    () => (topic ? getSortedTopicQuestions(pool, topic) : []),
    [pool, topic]
  );
  const [question, setQuestion] = useState<Question | null>(null);

  useEffect(() => {
    if (!topic || topicQuestions.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuestion(null);
      return;
    }
    const lastShownId = getSequentialLastShownId(topic);
    const next = selectSequentialQuestion(topicQuestions, lastShownId);
    setSequentialLastShownId(topic, next.id);
    setQuestion(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);

  function recordAnswer(selectedIndex: number, correct: boolean) {
    if (!question) return;
    const attempts = appendAttempt({ questionId: question.id, correct, timestamp: Date.now() });
    syncBackup(attempts);
  }

  function advance() {
    if (!topic || !question || topicQuestions.length === 0) return;
    const next = selectSequentialQuestion(topicQuestions, question.id);
    setSequentialLastShownId(topic, next.id);
    setQuestion(next);
  }

  return { question, loading: question === null, recordAnswer, advance };
}
