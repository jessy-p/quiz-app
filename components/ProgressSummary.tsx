"use client";

import { getAttempts } from "@/lib/storage";
import { computeProgress } from "@/lib/computeProgress";
import { questionPool } from "@/lib/questionPool";

const SECTION_HEADING_CLASSES = "font-sans text-[10.5px] uppercase tracking-[0.05em] text-ink-58";

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Local-only — reads the on-device attempt log directly, no network call. */
export function ProgressSummary() {
  const summary = computeProgress(questionPool, getAttempts());

  if (summary.totalAttempts === 0) {
    return (
      <div className="mt-2 rounded-[10px] border border-ink-82/10 px-4 py-3 font-sans text-[13px] text-ink-58">
        No attempts yet — answer a few questions to see progress.
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-4 rounded-[10px] border border-ink-82/10 px-4 py-3">
      <div>
        <p className={SECTION_HEADING_CLASSES}>Coverage</p>
        <p className="mt-1 font-sans text-[13px] text-ink-82">
          {summary.questionsAttempted} / {summary.poolSize} questions attempted ({summary.coveragePct}%)
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {summary.topicCoverage.map((t) => (
            <li key={t.topic}>
              <div className="flex items-baseline justify-between font-sans text-[13px] text-ink-82">
                <span>{t.label}</span>
                <span className="text-ink-58">
                  {t.attempted}/{t.total}
                </span>
              </div>
              <div className="mt-1 flex h-1.5 w-full overflow-hidden rounded-full bg-ink-82/10">
                <div className="h-full bg-ink-82/40" style={{ width: `${t.coveragePct}%` }} />
                <div className="h-full bg-oxide/50" style={{ width: `${100 - t.coveragePct}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>

      {summary.weakTopics.length > 0 && (
        <div>
          <p className={SECTION_HEADING_CLASSES}>Weakest topics</p>
          <ul className="mt-1 flex flex-col gap-1">
            {summary.weakTopics.map((t) => (
              <li key={t.topic} className="font-sans text-[13px] text-ink-82">
                {t.label} — {t.missed}/{t.attempted} missed ({Math.round(t.missRate * 100)}%)
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.repeatMisses.length > 0 && (
        <div>
          <p className={SECTION_HEADING_CLASSES}>Missed more than once</p>
          <ul className="mt-1 flex flex-col gap-1">
            {summary.repeatMisses.map((q) => (
              <li key={q.questionId} className="font-sans text-[13px] text-ink-82">
                {q.label}: {truncate(q.prompt, 70)} — missed {q.missed}×
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
