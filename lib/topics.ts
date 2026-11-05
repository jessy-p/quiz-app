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

/** Display names that naive title-casing gets wrong. */
const TOPIC_NAMES: Record<string, string> = {
  javascript: "JavaScript",
  ccaf: "CCAF",
};

/** Title-case a topic slug (e.g. "backend-engineering" -> "Backend Engineering"), with overrides for names like "JavaScript". */
export function humanizeTopic(topic: string): string {
  if (TOPIC_NAMES[topic]) return TOPIC_NAMES[topic];
  return topic
    .split("-")
    .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}
