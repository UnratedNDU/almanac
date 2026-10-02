export type PrincipalPhase = "new" | "first" | "full" | "last";

const PHASES: PrincipalPhase[] = ["new", "first", "full", "last"];
const SYNODIC_DAYS = 29.530588853;
const DAY_MS = 86_400_000;
/** A known new moon: 2000-01-06 18:14 UTC. */
const NEW_MOON_EPOCH = Date.UTC(2000, 0, 6, 18, 14);

const cycles = (ms: number) => (ms - NEW_MOON_EPOCH) / (SYNODIC_DAYS * DAY_MS);

/**
 * The principal phase that begins during this local calendar day, if any.
 * ponytail: mean-phase maths, within about a day of the astronomical event; use an ephemeris if exact times matter.
 */
export function principalPhase(day: Date): PrincipalPhase | null {
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const end = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1).getTime();
  const before = Math.floor(cycles(start) * 4);
  const after = Math.floor(cycles(end) * 4);
  return after > before ? PHASES[((after % 4) + 4) % 4] : null;
}