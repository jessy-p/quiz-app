"use client";

import { useState } from "react";
import { useNextQuestion } from "@/lib/useNextQuestion";
import { questionPool } from "@/lib/questionPool";
import { QuestionCard } from "./QuestionCard";

/**
 * Client Component boundary — selection depends on localStorage, so this
 * can't be server-rendered. Owns the per-question answered/selected state;
 * QuestionCard itself stays a controlled, stateless presentation.
 */
export function QuestionScreen() {
  const { question, loading, recordAnswer, advance } = useNextQuestion(questionPool);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  function handleSelect(index: number) {
    if (selectedIndex !== null || !question) return;
    setSelectedIndex(index);
    recordAnswer(index, index === question.correctIndex);
  }

  function handleAdvance() {
    setSelectedIndex(null);
    advance();
  }

  if (loading || !question) {
    return <div className="w-full max-w-[320px]" aria-hidden="true" />;
  }

  return (
    <QuestionCard
      question={question}
      selectedIndex={selectedIndex}
      onSelect={handleSelect}
      onAdvance={handleAdvance}
    />
  );
}
