export interface Attempt {
  questionId: string;
  correct: boolean;
  timestamp: number;
}

const ATTEMPTS_KEY = "study-loop:attempts";
const LAST_SHOWN_ID_KEY = "study-loop:lastShownId";

export function getAttempts(): Attempt[] {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    return raw ? (JSON.parse(raw) as Attempt[]) : [];
  } catch {
    return [];
  }
}

export function appendAttempt(attempt: Attempt): void {
  const attempts = getAttempts();
  attempts.push(attempt);
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
}

export function getLastShownId(): string | null {
  return localStorage.getItem(LAST_SHOWN_ID_KEY);
}

export function setLastShownId(id: string): void {
  localStorage.setItem(LAST_SHOWN_ID_KEY, id);
}
