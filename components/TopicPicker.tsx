"use client";

import { useEffect, useRef } from "react";
import type { StudyMode } from "@/lib/storage";
import { getTopicSummaries, humanizeTopic } from "@/lib/topics";
import { questionPool } from "@/lib/questionPool";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/bodyScrollLock";

interface TopicPickerProps {
  open: boolean;
  mode: StudyMode;
  onSelect: (mode: StudyMode) => void;
  onClose: () => void;
}

const ROW_CLASSES =
  "w-full rounded-[10px] border border-ink-82/20 px-4 py-3 text-left font-sans text-[14px] text-ink-82 motion-safe:transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber focus-visible:outline-offset-2";

const ROW_ACTIVE_CLASSES = "border-amber bg-amber/10 text-amber-text";

/**
 * Bottom-sheet overlay, same pattern as ActionSheet (stays mounted, CSS
 * transform gates visibility, focus trap, Escape-to-close, swipe-to-dismiss,
 * body-scroll lock) but with list content instead of a variant switch.
 * Higher z-index than ActionSheet so tapping the study-mode icon while a
 * per-question action sheet is open just draws on top, no coordination needed.
 */
export function TopicPicker({ open, mode, onSelect, onClose }: TopicPickerProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const summaries = getTopicSummaries(questionPool);

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
        aria-labelledby="topic-picker-heading"
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
          <h2 id="topic-picker-heading" className="font-serif text-[18px] text-ink">
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
          {summaries.map(({ topic, count }) => {
            const active = mode.type === "sequential" && mode.topic === topic;
            return (
              <li key={topic}>
                <button
                  type="button"
                  onClick={() => onSelect({ type: "sequential", topic })}
                  aria-current={active}
                  className={`${ROW_CLASSES} ${active ? ROW_ACTIVE_CLASSES : ""}`}
                >
                  {humanizeTopic(topic)} · {count} questions
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
