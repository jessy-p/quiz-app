"use client";

import type { StudyMode } from "@/lib/storage";
import { humanizeTopic } from "@/lib/topics";

interface StudyHubIconProps {
  mode: StudyMode;
  onOpen: () => void;
}

function describeMode(mode: StudyMode): string {
  return mode.type === "random" ? "Random" : humanizeTopic(mode.topic);
}

/**
 * Fixed top-right, always visible. Opens the Study Hub. No visual badge for
 * the current mode — a status indicator would cut against the app's
 * no-gamification/no-status-chrome stance — but the aria-label reflects
 * it dynamically so screen-reader users aren't left without state info
 * that sighted users also don't get.
 */
export function StudyHubIcon({ mode, onOpen }: StudyHubIconProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Study hub. Currently: ${describeMode(mode)}`}
      className="fixed right-[calc(env(safe-area-inset-right)+8px)] top-[calc(env(safe-area-inset-top)+8px)] z-30 flex h-11 w-11 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber focus-visible:outline-offset-2"
    >
      <span aria-hidden="true" className="h-3 w-3 rounded-full bg-amber" />
    </button>
  );
}
