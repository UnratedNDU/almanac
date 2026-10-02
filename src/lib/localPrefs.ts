import { isNewer } from "./version";

/** Per-device preferences kept outside the vault. Storage can be blocked or full, so every access is guarded. */
export function readPref(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writePref(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // The preference is simply not remembered.
  }
}

const SEEN_KEY = "almanac.lastSeenVersion";

/**
 * Remembers that `current` has run on this device. Returns the older version that ran before, which means the app was just
 * updated; returns null on a first run, on the same version, and on a downgrade.
 */
export function markVersionSeen(current: string): string | null {
  const previous = readPref(SEEN_KEY);
  writePref(SEEN_KEY, current);
  return previous !== null && isNewer(current, previous) ? previous : null;
}
