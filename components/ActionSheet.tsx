"use client";

import { useEffect, useRef, useState } from "react";
import type { Question } from "@/types/question";

export type ActionSheetVariant = "reference" | "teach-me" | "double-check";

interface ActionSheetProps {
  variant: ActionSheetVariant | null;
  question: Question | null;
  onClose: () => void;
}

const HEADINGS: Record<ActionSheetVariant, string> = {
  reference: "Reference",
  "teach-me": "Teach me",
  "double-check": "Verify this independently",
};

function isUrl(ref: string) {
  return ref.startsWith("https://");
}

const COPY_BUTTON_CLASSES =
  "self-start rounded-[10px] border border-amber/40 px-3 py-3 font-sans text-[12px] uppercase tracking-[0.05em] text-amber-text motion-safe:transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber focus-visible:outline-offset-2";

const PROMPT_BLOCK_CLASSES =
  "rounded-[10px] border border-ink-82/10 bg-ink-82/5 p-4 font-mono text-[13px] leading-[1.5] text-ink-82";

function SheetContent({
  variant,
  question,
  onCopy,
}: {
  variant: ActionSheetVariant;
  question: Question;
  onCopy: (text: string) => void;
}) {
  if (variant === "reference") {
    return (
      <ul className="flex flex-col gap-2 font-mono text-[13px] text-ink-82">
        {question.references.map((ref, index) =>
          isUrl(ref) ? (
            <li key={index}>
              <a
                href={ref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-text underline underline-offset-2"
              >
                {ref}
              </a>
            </li>
          ) : (
            <li key={index}>{ref}</li>
          )
        )}
      </ul>
    );
  }

  if (variant === "teach-me") {
    return (
      <div className="flex flex-col gap-4">
        <p className="font-sans text-[13px] leading-[1.55] text-ink-60">{question.explanation}</p>
        <div className={PROMPT_BLOCK_CLASSES}>{question.teachMePrompt}</div>
        <button
          type="button"
          onClick={() => onCopy(question.teachMePrompt)}
          className={COPY_BUTTON_CLASSES}
        >
          Copy
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={PROMPT_BLOCK_CLASSES}>{question.doubleCheckPrompt}</div>
      <button
        type="button"
        onClick={() => onCopy(question.doubleCheckPrompt)}
        className={COPY_BUTTON_CLASSES}
      >
        Copy
      </button>
    </div>
  );
}

/**
 * Shared bottom sheet for Reference / Teach Me / Double Check. Stays
 * mounted (translated off-screen) at all times so both open and close
 * can animate via a plain transform change, gated by prefers-reduced-motion.
 */
export function ActionSheet({ variant, question, onClose }: ActionSheetProps) {
  const open = variant !== null;
  const [displayVariant, setDisplayVariant] = useState<ActionSheetVariant | null>(null);
  const [copied, setCopied] = useState(false);
  const [prevVariant, setPrevVariant] = useState<ActionSheetVariant | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);

  // Adjust state during render (not in an effect) when the variant prop
  // changes — keeps the last non-null content visible while the sheet
  // slides closed, per React's "adjusting state on prop change" pattern.
  if (variant !== prevVariant) {
    setPrevVariant(variant);
    setCopied(false);
    if (variant) setDisplayVariant(variant);
  }

  useEffect(() => {
    if (!open) return;

    sheetRef.current?.focus();
    document.body.style.overflow = "hidden";

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
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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
        className={`fixed inset-0 z-40 bg-black motion-safe:transition-opacity motion-safe:duration-300 ${
          open ? "opacity-60" : "pointer-events-none opacity-0"
        }`}
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-sheet-heading"
        aria-hidden={!open}
        tabIndex={-1}
        className={`fixed inset-x-0 bottom-0 z-50 max-h-[60vh] overflow-y-auto rounded-t-[10px] border-t border-ink-82/10 bg-bg px-6 pb-8 pt-3 motion-safe:transition-transform motion-safe:duration-300 ${
          open ? "translate-y-0" : "pointer-events-none translate-y-full"
        }`}
      >
        <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className="flex justify-center pb-3">
          <span aria-hidden="true" className="h-1 w-9 rounded-full bg-ink-82/20" />
        </div>

        {displayVariant && (
          <>
            <div className="flex items-center justify-between">
              <h2 id="action-sheet-heading" className="font-serif text-[18px] text-ink">
                {HEADINGS[displayVariant]}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="-m-[15px] p-[15px] font-sans text-[13px] text-ink-58"
              >
                Close
              </button>
            </div>

            <div className="mt-4">
              {question && (
                <SheetContent variant={displayVariant} question={question} onCopy={handleCopy} />
              )}
            </div>

            {copied && (
              <div aria-live="polite" className="mt-3 font-sans text-[12px] text-ink-58">
                Copied — paste into Claude or ChatGPT
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
