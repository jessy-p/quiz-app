"use client";

import { useEffect, useRef, useState } from "react";
import type { StudyMode } from "@/lib/storage";
import { questionPool } from "@/lib/questionPool";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/bodyScrollLock";
import { TopicList } from "./TopicList";
import { ProgressSummary } from "./ProgressSummary";

interface StudyHubProps {
  open: boolean;
  mode: StudyMode;
  onSelect: (mode: StudyMode) => void;
  onClose: () => void;
}

type ExpandedSection = "sequential" | "progress" | null;

const ROW_CLASSES =
  "w-full rounded-[10px] border border-ink-82/20 px-4 py-3 text-left font-sans text-[14px] text-ink-82 motion-safe:transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber focus-visible:outline-offset-2";

const ROW_ACTIVE_CLASSES = "border-amber bg-amber/10 text-amber-text";

/**
 * Bottom-sheet overlay, same pattern as ActionSheet (stays mounted, CSS
 * transform gates visibility, focus trap, Escape-to-close, swipe-to-dismiss,
 * body-scroll lock). Three-section accordion — Random / Sequential /
 * Progress — where Random is a direct action and the other two toggle a
 * local `expanded` section to reveal their content underneath. Higher
 * z-index than ActionSheet so tapping the hub icon while a per-question
 * action sheet is open just draws on top, no coordination needed.
 */
export function StudyHub({ open, mode, onSelect, onClose }: StudyHubProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const [expanded, setExpanded] = useState<ExpandedSection>(null);

  useEffect(() => {
    if (!open) return;

    sheetRef.current?.focus();
    lockBodyScroll();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !sheetRef.current) return;

      const focusable = sheetRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      unlockBodyScroll();
    };
  }, [open, onClose]);

  function handleTouchStart(event: React.TouchEvent) {
    touchStartY.current = event.touches[0].clientY;
  }

  function handleTouchEnd(event: React.TouchEvent) {
    if (touchStartY.current === null) return;
    const deltaY = event.changedTouches[0].clientY - touchStartY.current;
    touchStartY.current = null;
    if (deltaY > 60) onClose();
  }

  function toggleSection(section: "sequential" | "progress") {
    setExpanded((current) => (current === section ? null : section));
  }

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-50 bg-black motion-safe:transition-opacity motion-safe:duration-300 ${
          open ? "opacity-60" : "pointer-events-none opacity-0"
        }`}
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="study-hub-heading"
        aria-hidden={!open}
        tabIndex={-1}
        className={`fixed inset-x-0 bottom-0 z-[60] max-h-[70vh] overflow-y-auto rounded-t-[10px] border-t border-ink-82/10 bg-bg px-6 pb-8 pt-3 motion-safe:transition-transform motion-safe:duration-300 ${
          open ? "translate-y-0" : "pointer-events-none translate-y-full"
        }`}
      >
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="flex justify-center pb-3"
        >
          <span aria-hidden="true" className="h-1 w-9 rounded-full bg-ink-82/20" />
        </div>

        <div className="flex items-center justify-between">
          <h2 id="study-hub-heading" className="font-serif text-[18px] text-ink">
            Study
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-m-[15px] p-[15px] font-sans text-[13px] text-ink-58"
          >
            Close
          </button>
        </div>

        <ul className="mt-4 flex flex-col gap-2">
          <li>
            <button
              type="button"
              onClick={() => onSelect({ type: "random" })}
              aria-current={mode.type === "random"}
              className={`${ROW_CLASSES} ${mode.type === "random" ? ROW_ACTIVE_CLASSES : ""}`}
            >
              Random · {questionPool.length} questions
            </button>
          </li>

          <li>
            <button
              type="button"
              onClick={() => toggleSection("sequential")}
              aria-expanded={expanded === "sequential"}
              aria-controls="study-hub-sequential-panel"
              aria-current={mode.type === "sequential"}
              className={`${ROW_CLASSES} ${mode.type === "sequential" ? ROW_ACTIVE_CLASSES : ""}`}
            >
              Sequential
            </button>
            {expanded === "sequential" && (
              <div id="study-hub-sequential-panel">
                <TopicList mode={mode} onSelect={(topic) => onSelect({ type: "sequential", topic })} />
              </div>
            )}
          </li>

          <li>
            <button
              type="button"
              onClick={() => toggleSection("progress")}
              aria-expanded={expanded === "progress"}
              aria-controls="study-hub-progress-panel"
              className={ROW_CLASSES}
            >
              Progress
            </button>
            {expanded === "progress" && (
              <div id="study-hub-progress-panel">
                <ProgressSummary />
              </div>
            )}
          </li>
        </ul>
      </div>
    </>
  );
}
