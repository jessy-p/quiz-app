"use client";

import { InlineCode } from "./InlineCode";

import type { Question } from "@/types/question";
import { OptionRow, type OptionVariant } from "./OptionRow";

interface QuestionCardProps {
  question: Question;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onAdvance: () => void;
}

function getVariant(
  index: number,
  selectedIndex: number | null,
  correctIndex: number
): OptionVariant {
  if (selectedIndex === null) return "rest";
  const answeredCorrectly = selectedIndex === correctIndex;
  if (answeredCorrectly) {
    return index === selectedIndex ? "correct-selected" : "dimmed";
  }
  if (index === selectedIndex) return "wrong-selected";
  if (index === correctIndex) return "correct-unselected";
  return "dimmed";
}

/**
 * The one real screen's core card. Tap anywhere on the card to advance
 * once answered — options themselves lose their click handler, so the
 * tap bubbles to the container's onAdvance.
 */
export function QuestionCard({
  question,
  selectedIndex,
  onSelect,
  onAdvance,
}: QuestionCardProps) {
  const answered = selectedIndex !== null;
  const correct = answered && selectedIndex === question.correctIndex;

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!answered) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onAdvance();
    }
  }

  return (
    <div
      className={`relative flex w-full max-w-[320px] flex-col items-center ${answered ? "cursor-pointer" : ""}`}
      onClick={answered ? onAdvance : undefined}
      onKeyDown={answered ? handleKeyDown : undefined}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber/20 blur-[80px]"
      />

      <p className="font-serif text-[20px] leading-[1.5] font-normal text-ink">
        <InlineCode text={question.prompt} />
      </p>

      <div
        role="radiogroup"
        aria-label="Answer options"
        className="mt-6 flex w-full flex-col gap-[9px]"
      >
        {question.options.map((option, index) => (
          <OptionRow
            key={index}
            label={option}
            variant={getVariant(index, selectedIndex, question.correctIndex)}
            checked={selectedIndex === index}
            onClick={answered ? undefined : () => onSelect(index)}
          />
        ))}
      </div>

      {answered && (
        <>
          <div aria-live="polite" className="sr-only">
            {correct
              ? "Correct."
              : `Incorrect. You chose ${question.options[selectedIndex]}. Correct answer: ${question.options[question.correctIndex]}.`}
          </div>
          <div className="mt-4 w-full border-t border-ink-82/10 pt-4 text-[13px] leading-[1.55] text-ink-60">
            <InlineCode text={question.explanation} />
          </div>
        </>
      )}
    </div>
  );
}
