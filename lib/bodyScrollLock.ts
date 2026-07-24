/**
 * Reference-counted body-scroll lock. Needed once more than one overlay
 * (ActionSheet, TopicPicker) can independently mount and lock scroll — a
 * naive "hidden on open, reset to empty on close" in each would let the
 * second overlay's close handler yank the lock out from under the first
 * if they're ever open at the same time.
 */
let lockCount = 0;

export function lockBodyScroll(): void {
  lockCount += 1;
  document.body.style.overflow = "hidden";
}

export function unlockBodyScroll(): void {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = "";
  }
}
