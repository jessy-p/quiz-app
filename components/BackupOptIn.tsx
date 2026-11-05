"use client";

import { useEffect } from "react";
import { captureBackupSecretFromUrl } from "@/lib/backupSync";

/** Picks up `/?backup=<secret>` on load to enable backup on this device. Renders nothing. */
export function BackupOptIn() {
  useEffect(() => {
    captureBackupSecretFromUrl();
  }, []);

  return null;
}
