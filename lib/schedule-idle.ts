/**
 * Run work off the critical path (idle when available, otherwise next macrotask).
 */
export function scheduleIdleWork(work: () => void): void {
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(() => work(), { timeout: 2_000 });
    return;
  }
  setTimeout(work, 0);
}
