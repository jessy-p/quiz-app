import type { Attempt } from "@/lib/storage";
import { getDeviceToken } from "@/lib/deviceToken";

const BACKUP_SECRET_KEY = "study-loop:backupSecret";
const BACKUP_PARAM = "backup";

/**
 * Backup is opt-in per device: open the app once as `/?backup=<secret>` and
 * the device remembers the secret (the param is then stripped from the
 * address bar). `/?backup=` with no value turns it off again. Devices
 * without it — anyone else using the app — never call the backup endpoint;
 * their progress stays in their own browser.
 */
export function captureBackupSecretFromUrl(): void {
  const url = new URL(window.location.href);
  const secret = url.searchParams.get(BACKUP_PARAM);
  if (secret === null) return;
  try {
    if (secret) localStorage.setItem(BACKUP_SECRET_KEY, secret);
    else localStorage.removeItem(BACKUP_SECRET_KEY);
  } catch {
    // storage unavailable (private mode etc.) — backup just stays off
  }
  url.searchParams.delete(BACKUP_PARAM);
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
}

function getBackupSecret(): string | null {
  try {
    return localStorage.getItem(BACKUP_SECRET_KEY);
  } catch {
    return null;
  }
}

/**
 * Fire-and-forget backup write. localStorage is already authoritative and
 * already has this data — if the write fails (offline, etc.) the app
 * doesn't care and never waits on it. See PROJECT_BRIEF.md's State & storage.
 */
export function syncBackup(attempts: Attempt[]): void {
  const secret = getBackupSecret();
  if (!secret) return;
  const token = getDeviceToken();
  fetch("/api/backup", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
    body: JSON.stringify({ token, attempts }),
  }).catch(() => {});
}
