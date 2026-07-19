export type Topic =
  | "javascript"
  | "python"
  | "node"
  | "rest-api"
  | "system-design"
  | "backend-general"
  | "interview-facts"
  | "ccaf";

export type Mode = "quick-fire" | "scenario";

export interface Question {
  id: string;
  topic: Topic;
  mode: Mode;
  prompt: string;
  options: string[];
  correctIndex: number;
  /** Brief, 2-3 sentences. For scenario mode: covers why each wrong option fails. */
  explanation: string;
  /**
   * Plain display strings by default (e.g. "MDN: HTTP redirects").
   * An entry renders as a tappable link only if it's a full https:// URL.
   */
  references: string[];
  /** Copyable prompt text for an external LLM (Teach Me). */
  teachMePrompt: string;
  /** Copyable prompt text, skeptical/verification framing (Double Check). */
  doubleCheckPrompt: string;
}
