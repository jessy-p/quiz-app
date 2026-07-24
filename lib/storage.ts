export interface Attempt {
  questionId: string;
  correct: boolean;
  timestamp: number;
}

export type StudyMode = { type: "random" } | { type: "sequential"; topic: string };

const ATTEMPTS_KEY = "study-loop:attempts";
const LAST_SHOWN_ID_KEY = "study-loop:lastShownId";
const STUDY_MODE_KEY = "study-loop:studyMode";
const SEQUENTIAL_CURSORS_KEY = "study-loop:sequentialCursors";

export function getAttempts(): Attempt[] {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    return raw ? (JSON.parse(raw) as Attempt[]) : [];
  } catch {
    return [];
  }
}

export function appendAttempt(attempt: Attempt): Attempt[] {
  const attempts = getAttempts();
  attempts.push(attempt);
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
  return attempts;
}

export function getLastShownId(): string | null {
  return localStorage.getItem(LAST_SHOWN_ID_KEY);
}

export function setLastShownId(id: string): void {
  localStorage.setItem(LAST_SHOWN_ID_KEY, id);
}

export function getStudyMode(): StudyMode {
  try {
    const raw = localStorage.getItem(STUDY_MODE_KEY);
    if (!raw) return { type: "random" };
    const parsed = JSON.parse(raw) as StudyMode;
    if (parsed.type === "sequential" && typeof parsed.topic === "string") return parsed;
    if (parsed.type === "random") return parsed;
    return { type: "random" };
  } catch {
    return { type: "random" };
  }
}

export function setStudyMode(mode: StudyMode): void {
  localStorage.setItem(STUDY_MODE_KEY, JSON.stringify(mode));
}

function getSequentialCursors(): Record<string, string> {
  try {
    const raw = localStorage.getItem(SEQUENTIAL_CURSORS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function getSequentialLastShownId(topic: string): string | null {
  return getSequentialCursors()[topic] ?? null;
}

export function setSequentialLastShownId(topic: string, id: string): void {
  const cursors = getSequentialCursors();
  cursors[topic] = id;
  localStorage.setItem(SEQUENTIAL_CURSORS_KEY, JSON.stringify(cursors));
}
