const DEVICE_TOKEN_KEY = "study-loop:deviceToken";

/**
 * Random per-device identifier, generated once and persisted in
 * localStorage. Only used to name this device's backup file — access control
 * is the backup secret (see backupSync.ts), not this token.
 */
export function getDeviceToken(): string {
  const existing = localStorage.getItem(DEVICE_TOKEN_KEY);
  if (existing) return existing;

  const token = crypto.randomUUID();
  localStorage.setItem(DEVICE_TOKEN_KEY, token);
  return token;
}
