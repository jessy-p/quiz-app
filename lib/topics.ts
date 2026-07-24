import type { Question, Topic } from "@/types/question";

export interface TopicSummary {
  topic: Topic;
  count: number;
}

/** Topic is deliberately an open string (types/question.ts) — no registry, derive from the pool itself. */
export function getTopicSummaries(pool: Question[]): TopicSummary[] {
  const counts = new Map<string, number>();
  for (const q of pool) {
    counts.set(q.topic, (counts.get(q.topic) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => a.topic.localeCompare(b.topic));
}

/** Naive title-case (e.g. "backend-engineering" -> "Backend Engineering"); no override table for cases like "JavaScript". */
export function humanizeTopic(topic: string): string {
  return topic
    .split("-")
    .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}
