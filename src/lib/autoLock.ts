/** True once the user has been idle for `minutes`. A limit of zero or less disables locking. */
export function shouldLock(lastActivity: number, now: number, minutes: number): boolean {
  return minutes > 0 && now - lastActivity >= minutes * 60_000;
}