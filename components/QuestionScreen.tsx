"use client";

import { useRef, useState } from "react";
import { useNextQuestion } from "@/lib/useNextQuestion";
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
  const { question, loading, recordAnswer, advance } = useNextQuestion(questionPool);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [sheetVariant, setSheetVariant] = useState<ActionSheetVariant | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

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

  if (loading || !question) {
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
