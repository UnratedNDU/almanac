/** After this long without finishing, a loading screen offers a retry instead of looking frozen. */
export const STALL_MS = 10_000;

export function isStalled(startedAt: number, now: number, limitMs: number = STALL_MS): boolean {
  return now - startedAt >= limitMs;
}