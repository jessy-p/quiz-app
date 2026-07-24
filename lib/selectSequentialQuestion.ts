import type { Question } from "@/types/question";

/**
 * Pure ordering/selection functions — no framework or storage coupling,
 * mirrors selectNextQuestion.ts's shape. Filters by the `topic` field, never
 * by id prefix (e.g. javascript.json uses "js-0001" ids, so prefix !== topic).
 */
export function getSortedTopicQuestions(pool: Question[], topic: string): Question[] {
  return pool
    .filter((q) => q.topic === topic)
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

export function selectSequentialQuestion(
  topicQuestions: Question[],
  lastShownId: string | null
): Question {
  const lastIndex = lastShownId
    ? topicQuestions.findIndex((q) => q.id === lastShownId)
    : -1;
  const nextIndex = (lastIndex + 1) % topicQuestions.length;
  return topicQuestions[nextIndex];
}
