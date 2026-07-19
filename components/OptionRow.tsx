interface OptionRowProps {
  label: string;
}

/**
 * Single answer option. Renders only the "Rest" visual state from the
 * Reading Lamp spec — no click handling or answer state yet (Phase 2).
 */
export function OptionRow({ label }: OptionRowProps) {
  return (
    <div
      role="radio"
      aria-checked={false}
      tabIndex={0}
      className="flex min-h-[52px] w-full items-center rounded-[10px] border border-ink-82/20 px-4 py-[13px] font-sans text-[14px] leading-[1.4] text-ink-82"
    >
      {label}
    </div>
  );
}
