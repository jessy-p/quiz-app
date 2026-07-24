"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { StudyMode } from "@/lib/storage";
import { getStudyMode, setStudyMode } from "@/lib/storage";
import { questionPool } from "@/lib/questionPool";
import { StudyHubIcon } from "./StudyHubIcon";
import { StudyHub } from "./StudyHub";

interface StudyModeContextValue {
  mode: StudyMode;
  hydrated: boolean;
}

const StudyModeContext = createContext<StudyModeContextValue | null>(null);

export function useStudyMode(): StudyModeContextValue {
  const ctx = useContext(StudyModeContext);
  if (!ctx) throw new Error("useStudyMode must be used within StudyModeProvider");
  return ctx;
}

/**
 * Bridges the Server/Client boundary between the icon (must live in the
 * root layout, several Server Component layers above QuestionScreen) and
 * the rest of the app. `mode` starts at the same default on server and
 * first client paint (localStorage isn't available during SSR), then
 * flips to the persisted value in a mount effect — `hydrated` gates
 * QuestionScreen's render so that flip never shows as a visible flicker.
 */
export function StudyModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<StudyMode>({ type: "random" });
  const [hydrated, setHydrated] = useState(false);
  const [hubOpen, setHubOpen] = useState(false);

  useEffect(() => {
    const persisted = getStudyMode();
    const topicExists =
      persisted.type === "sequential" && questionPool.some((q) => q.topic === persisted.topic);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setModeState(persisted.type === "sequential" && !topicExists ? { type: "random" } : persisted);
    setHydrated(true);
  }, []);

  function handleSelect(next: StudyMode) {
    setModeState(next);
    setStudyMode(next);
    setHubOpen(false);
  }

  return (
    <StudyModeContext.Provider value={{ mode, hydrated }}>
      <StudyHubIcon mode={mode} onOpen={() => setHubOpen(true)} />
      <StudyHub open={hubOpen} mode={mode} onSelect={handleSelect} onClose={() => setHubOpen(false)} />
      {children}
    </StudyModeContext.Provider>
  );
}
