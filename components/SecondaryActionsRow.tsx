"use client";

import type { ActionSheetVariant } from "./ActionSheet";

interface SecondaryActionsRowProps {
  onOpen: (variant: ActionSheetVariant) => void;
}

const ACTIONS: { variant: ActionSheetVariant; label: string }[] = [
  { variant: "reference", label: "Reference" },
  { variant: "teach-me", label: "Teach Me" },
  { variant: "double-check", label: "Double Check" },
];

/**
 * Reference / Teach Me / Double Check — fixed order, visually quiet.
 * Buttons use padding + matching negative margin so the 44x44 tap target
 * doesn't expand the visible layout around the small uppercase label.
 */
export function SecondaryActionsRow({ onOpen }: SecondaryActionsRowProps) {
  return (
    <div className="mt-5 flex items-center justify-center gap-3 font-sans text-[10.5px] font-medium uppercase tracking-[0.05em] text-ink-58">
      {ACTIONS.map((action, index) => (
        <div key={action.variant} className="flex items-center gap-3">
          {index > 0 && <span aria-hidden="true">·</span>}
          <button
            type="button"
            onClick={(event) => {
              event.currentTarget.focus();
              onOpen(action.variant);
            }}
            className="-m-[15px] p-[15px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber focus-visible:outline-offset-2"
          >
            {action.label}
          </button>
        </div>
      ))}
    </div>
  );
}
