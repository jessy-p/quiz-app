import type { Question } from "@/types/question";
import type { Attempt } from "@/lib/storage";
import { getTopicSummaries, humanizeTopic } from "@/lib/topics";

/** Below this many attempts on a topic, miss-rate is too noisy to call "weak." */
const MIN_TOPIC_ATTEMPTS = 3;
const MAX_WEAK_TOPICS = 5;
const MAX_REPEAT_MISSES = 10;

export interface WeakTopic {
  topic: string;
  label: string;
  missed: number;
  attempted: number;
  missRate: number;
}

export interface RepeatMiss {
  questionId: string;
  topic: string;
  label: string;
  prompt: string;
  missed: number;
}

export interface TopicCoverage {
  topic: string;
  label: string;
  attempted: number;
  total: number;
  coveragePct: number;
  /** Attempted, most recent attempt correct. */
  clean: number;
  /** Attempted, most recent attempt wrong. */
  mistake: number;
  /** Never attempted. */
  unattempted: number;
}

export interface ProgressSummary {
  totalAttempts: number;
  weakTopics: WeakTopic[];
  repeatMisses: RepeatMiss[];
  questionsAttempted: number;
  poolSize: number;
  coveragePct: number;
  topicCoverage: TopicCoverage[];
}

/** Pure — pool + local attempt log in, summary stats out. No I/O. */
export function computeProgress(pool: Question[], attempts: Attempt[]): ProgressSummary {
  const questionsById = new Map(pool.map((q) => [q.id, q]));

  const topicStats = new Map<string, { attempted: number; missed: number }>();
  const questionStats = new Map<string, { attempted: number; missed: number }>();
  const attemptedIds = new Set<string>();
  const topicAttemptedIds = new Map<string, Set<string>>();
  /** Overwritten on every attempt for a question, so it ends up holding the most recent one (attempts is chronological). */
  const lastCorrect = new Map<string, boolean>();

  for (const attempt of attempts) {
    const question = questionsById.get(attempt.questionId);
    if (!question) continue;

    attemptedIds.add(attempt.questionId);
    lastCorrect.set(attempt.questionId, attempt.correct);

    const topic = topicStats.get(question.topic) ?? { attempted: 0, missed: 0 };
    topic.attempted += 1;
    if (!attempt.correct) topic.missed += 1;
    topicStats.set(question.topic, topic);

    const topicIds = topicAttemptedIds.get(question.topic) ?? new Set<string>();
    topicIds.add(attempt.questionId);
    topicAttemptedIds.set(question.topic, topicIds);

    const perQuestion = questionStats.get(attempt.questionId) ?? { attempted: 0, missed: 0 };
    perQuestion.attempted += 1;
    if (!attempt.correct) perQuestion.missed += 1;
    questionStats.set(attempt.questionId, perQuestion);
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
      coveragePct: count === 0 ? 0 : Math.round((attempted / count) * 100),
      clean,
      mistake,
      unattempted: count - attempted,
    };
  });

  const weakTopics = [...topicStats.entries()]
    .filter(([, stats]) => stats.attempted >= MIN_TOPIC_ATTEMPTS)
    .map(([topic, stats]) => ({
      topic,
      label: humanizeTopic(topic),
      missed: stats.missed,
      attempted: stats.attempted,
      missRate: stats.missed / stats.attempted,
    }))
    .sort((a, b) => b.missRate - a.missRate)
    .slice(0, MAX_WEAK_TOPICS);

  const repeatMisses = [...questionStats.entries()]
    .filter(([, stats]) => stats.missed > 1)
    .map(([questionId, stats]) => {
      const question = questionsById.get(questionId)!;
      return {
        questionId,
        topic: question.topic,
        label: humanizeTopic(question.topic),
        prompt: question.prompt,
        missed: stats.missed,
      };
    })
    .sort((a, b) => b.missed - a.missed)
    .slice(0, MAX_REPEAT_MISSES);

  return {
    totalAttempts: attempts.length,
    weakTopics,
    repeatMisses,
    questionsAttempted: attemptedIds.size,
    poolSize: pool.length,
    coveragePct: pool.length === 0 ? 0 : Math.round((attemptedIds.size / pool.length) * 100),
    topicCoverage,
  };
}
