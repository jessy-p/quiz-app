/**
 * Renders `backtick` spans in question content as inline code. The bank's
 * JSON uses Markdown-style backticks for code (`Promise.all`, `this`); this
 * is the only Markdown the app interprets, so no parser dependency.
 */
export function InlineCode({ text }: { text: string }) {
  const parts = text.split(/`([^`]+)`/);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <code key={i} className="rounded-[4px] bg-ink-82/10 px-[0.3em] font-mono text-[0.9em]">
            {part}
          </code>
        ) : (
          part
        ),
      )}
    </>
  );
}
