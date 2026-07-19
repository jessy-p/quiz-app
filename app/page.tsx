import { QuestionCard } from "@/components/QuestionCard";
import type { Question } from "@/types/question";

// Hardcoded for Phase 1 (skeleton) only — real selection lands in Phase 2.
const sampleQuestion: Question = {
  id: "js-0001",
  topic: "javascript",
  mode: "quick-fire",
  prompt: 'What does `typeof null` return in JavaScript?',
  options: ["'null'", "'undefined'", "'object'", "'number'"],
  correctIndex: 2,
  explanation:
    "`typeof null` returns \"object\" — a long-standing language bug preserved for backwards compatibility. `null` is not actually an object; this is purely a quirk of `typeof`.",
  references: ["MDN: typeof"],
  teachMePrompt:
    "Explain why `typeof null === 'object'` in JavaScript, and how this quirk affects real-world null checks.",
  doubleCheckPrompt:
    "Is it accurate that `typeof null` returns 'object' in JavaScript, and that this is considered a bug in the language spec? Cite sources.",
};

export default function Home() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6">
      <QuestionCard question={sampleQuestion} />
    </main>
  );
}
