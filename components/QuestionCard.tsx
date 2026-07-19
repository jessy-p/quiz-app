import type { Question } from "@/types/question";
import { OptionRow } from "./OptionRow";

interface QuestionCardProps {
  question: Question;
}

/**
 * The one real screen's core card. Phase 1: static render of the "Rest"
 * state only — no answer logic, dimming, or explanation yet (Phase 2).
 */
export function QuestionCard({ question }: QuestionCardProps) {
  return (
    <div className="relative flex w-full max-w-[320px] flex-col items-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber/20 blur-[80px]"
      />

      <p className="font-serif text-[20px] leading-[1.5] font-normal text-ink">
        {question.prompt}
      </p>

      <div
        role="radiogroup"
        aria-label="Answer options"
        className="mt-6 flex w-full flex-col gap-[9px]"
      >
        {question.options.map((option, index) => (
          <OptionRow key={index} label={option} />
        ))}
      </div>
    </div>
  );
}
