import type { Attempt } from "@/lib/storage";
import { getDeviceToken } from "@/lib/deviceToken";

/**
 * Fire-and-forget backup write. localStorage is already authoritative and
 * already has this data — if the write fails (offline, etc.) the app
 * doesn't care and never waits on it. See PROJECT_BRIEF.md's State & storage.
 */
export function syncBackup(attempts: Attempt[]): void {
  const token = getDeviceToken();
  fetch("/api/backup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, attempts }),
  }).catch(() => {});
}
