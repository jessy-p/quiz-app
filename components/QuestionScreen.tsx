"use client";

import { useRef, useState } from "react";
import { useNextQuestion } from "@/lib/useNextQuestion";
import { useSequentialQuestion } from "@/lib/useSequentialQuestion";
import { useStudyMode } from "./StudyModeProvider";
import { questionPool } from "@/lib/questionPool";
import { QuestionCard } from "./QuestionCard";
import { SecondaryActionsRow } from "./SecondaryActionsRow";
import { ActionSheet, type ActionSheetVariant } from "./ActionSheet";

/**
 * Client Component boundary — selection depends on localStorage, so this
 * can't be server-rendered. Owns the per-question answered/selected state
 * and the action sheet's open/closed state; QuestionCard itself stays a
 * controlled, stateless presentation.
 */
export function QuestionScreen() {
  const { mode, hydrated } = useStudyMode();
  const isSequential = mode.type === "sequential";
  const modeKey = isSequential ? `sequential:${mode.topic}` : "random";

  // Both hooks are called unconditionally (Rules of Hooks); the inactive
  // one idles via its active/topic param instead of doing pointless work.
  const random = useNextQuestion(questionPool, !isSequential);
  const sequential = useSequentialQuestion(questionPool, isSequential ? mode.topic : null);
  const { question, loading, recordAnswer, advance } = isSequential ? sequential : random;

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [sheetVariant, setSheetVariant] = useState<ActionSheetVariant | null>(null);
  const [prevModeKey, setPrevModeKey] = useState(modeKey);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Adjust state during render (not in an effect) when modeKey changes —
  // same pattern ActionSheet uses for prevVariant. Resets stale "answered"
  // state left over from *before* a mode/topic switch via the study-mode
  // picker (handleAdvance already resets this for a normal in-mode
  // advance). Keyed on modeKey, not question.id — a topic with exactly one
  // question always hands back the same id on advance(), so an id-keyed
  // reset would never fire for that case.
  if (modeKey !== prevModeKey) {
    setPrevModeKey(modeKey);
    setSelectedIndex(null);
  }

  function handleSelect(index: number) {
    if (selectedIndex !== null || !question) return;
    setSelectedIndex(index);
    recordAnswer(index, index === question.correctIndex);
  }

  function handleAdvance() {
    setSelectedIndex(null);
    advance();
  }

  function handleOpenSheet(variant: ActionSheetVariant) {
    triggerRef.current = document.activeElement as HTMLElement;
    setSheetVariant(variant);
  }

  function handleCloseSheet() {
    setSheetVariant(null);
    triggerRef.current?.focus();
  }

  if (!hydrated || loading || !question) {
    return <div className="w-full max-w-[320px]" aria-hidden="true" />;
  }

  return (
    <>
      <div className="flex w-full flex-col items-center">
        <QuestionCard
          question={question}
          selectedIndex={selectedIndex}
          onSelect={handleSelect}
          onAdvance={handleAdvance}
        />
        <SecondaryActionsRow onOpen={handleOpenSheet} />
      </div>
      <ActionSheet variant={sheetVariant} question={question} onClose={handleCloseSheet} />
    </>
  );
}
