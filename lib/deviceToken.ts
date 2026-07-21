const DEVICE_TOKEN_KEY = "study-loop:deviceToken";

/**
 * Random per-device identifier, generated once and persisted in
 * localStorage. Not real auth — just enough that the backup endpoint isn't
 * wide open to anyone who finds the URL. See PROJECT_BRIEF.md — State & storage.
 */
export function getDeviceToken(): string {
  const existing = localStorage.getItem(DEVICE_TOKEN_KEY);
  if (existing) return existing;

  const token = crypto.randomUUID();
  localStorage.setItem(DEVICE_TOKEN_KEY, token);
  return token;
}
