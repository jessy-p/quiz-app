"use client";

import type { StudyMode } from "@/lib/storage";
import { getTopicSummaries, humanizeTopic } from "@/lib/topics";
import { questionPool } from "@/lib/questionPool";

interface TopicListProps {
  mode: StudyMode;
  onSelect: (topic: string) => void;
}

const ROW_CLASSES =
  "w-full rounded-[10px] border border-ink-82/20 px-4 py-3 text-left font-sans text-[14px] text-ink-82 motion-safe:transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber focus-visible:outline-offset-2";

const ROW_ACTIVE_CLASSES = "border-amber bg-amber/10 text-amber-text";

/** Extracted from StudyHub — every topic in the pool, one row each, for picking a Sequential target. */
export function TopicList({ mode, onSelect }: TopicListProps) {
  const summaries = getTopicSummaries(questionPool);

  return (
    <ul className="mt-2 flex flex-col gap-2">
      {summaries.map(({ topic, count }) => {
        const active = mode.type === "sequential" && mode.topic === topic;
        return (
          <li key={topic}>
            <button
              type="button"
              onClick={() => onSelect(topic)}
              aria-current={active}
              className={`${ROW_CLASSES} ${active ? ROW_ACTIVE_CLASSES : ""}`}
            >
              {humanizeTopic(topic)} · {count} questions
            </button>
          </li>
        );
      })}
    </ul>
  );
}
