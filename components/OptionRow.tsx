export type OptionVariant =
  | "rest"
  | "correct-selected"
  | "wrong-selected"
  | "correct-unselected"
  | "dimmed";

interface OptionRowProps {
  label: string;
  variant: OptionVariant;
  checked: boolean;
  onClick?: () => void;
}

const VARIANT_CLASSES: Record<OptionVariant, string> = {
  rest: "border border-ink-82/20 text-ink-82",
  "correct-selected": "border border-amber bg-amber/10 text-amber-text",
  "wrong-selected": "border border-oxide bg-oxide/12 text-oxide-text",
  "correct-unselected": "border border-amber text-amber-text",
  dimmed: "border border-ink-82/8 text-ink-50",
};

const GLYPH: Partial<Record<OptionVariant, string>> = {
  "correct-selected": "✓",
  "correct-unselected": "✓",
  "wrong-selected": "✕",
};

/**
 * Single answer option. Purely controlled by `variant` — no internal
 * state; QuestionCard decides which variant each option should render.
 */
export function OptionRow({ label, variant, checked, onClick }: OptionRowProps) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!onClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  }

  return (
    <div
      role="radio"
      aria-checked={checked}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`flex min-h-[52px] w-full items-center justify-between rounded-[10px] px-4 py-[13px] font-sans text-[14px] leading-[1.4] motion-safe:transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber focus-visible:outline-offset-2 ${VARIANT_CLASSES[variant]}`}
    >
      <span>{label}</span>
      {GLYPH[variant] && <span aria-hidden="true">{GLYPH[variant]}</span>}
    </div>
  );
}
