const RELEASE = /^v?(\d+)\.(\d+)\.(\d+)$/;

/** `[major, minor, patch]` of a plain release version such as `0.3.0` or `v0.3.0`; null for anything else. */
export function parseVersion(text: string): [number, number, number] | null {
  const match = RELEASE.exec(text);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

/** True when `candidate` is a later release than `current`. Anything that is not a plain version is never newer. */
export function isNewer(candidate: string, current: string): boolean {
  const a = parseVersion(candidate);
  const b = parseVersion(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}
