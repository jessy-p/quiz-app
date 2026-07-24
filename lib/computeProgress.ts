import type { Question } from "@/types/question";
import type { Attempt } from "@/lib/storage";
import { getTopicSummaries, humanizeTopic } from "@/lib/topics";

export interface TopicCoverage {
  topic: string;
  label: string;
  attempted: number;
  total: number;
  /** Attempted, most recent attempt correct. */
  clean: number;
  /** Attempted, most recent attempt wrong. */
  mistake: number;
  /** Never attempted. */
  unattempted: number;
}

export interface ProgressSummary {
  totalAttempts: number;
  topicCoverage: TopicCoverage[];
}

/** Pure — pool + local attempt log in, summary stats out. No I/O. */
export function computeProgress(pool: Question[], attempts: Attempt[]): ProgressSummary {
  const questionsById = new Map(pool.map((q) => [q.id, q]));

  const topicAttemptedIds = new Map<string, Set<string>>();
  /** Overwritten on every attempt for a question, so it ends up holding the most recent one (attempts is chronological). */
  const lastCorrect = new Map<string, boolean>();

  for (const attempt of attempts) {
    const question = questionsById.get(attempt.questionId);
    if (!question) continue;

    lastCorrect.set(attempt.questionId, attempt.correct);

    const topicIds = topicAttemptedIds.get(question.topic) ?? new Set<string>();
    topicIds.add(attempt.questionId);
    topicAttemptedIds.set(question.topic, topicIds);
  }

  const topicCoverage = getTopicSummaries(pool).map(({ topic, count }) => {
    const attemptedIdsForTopic = topicAttemptedIds.get(topic) ?? new Set<string>();
    const attempted = attemptedIdsForTopic.size;

    let clean = 0;
    let mistake = 0;
    for (const id of attemptedIdsForTopic) {
      if (lastCorrect.get(id)) clean += 1;
      else mistake += 1;
    }

    return {
      topic,
      label: humanizeTopic(topic),
      attempted,
      total: count,
      clean,
      mistake,
      unattempted: count - attempted,
    };
  });

  return {
    totalAttempts: attempts.length,
    topicCoverage,
  };
}
