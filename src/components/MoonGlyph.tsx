import { t } from "../i18n/es";
import type { PrincipalPhase } from "../lib/moon";

/** A 14px moon for the day a principal phase begins. */
export function MoonGlyph({ phase }: { phase: PrincipalPhase }) {
  const label = t.moon[phase];
  return (
    <svg className="moonglyph" viewBox="0 0 16 16" width="14" height="14" role="img" aria-label={label}>
      <title>{label}</title>
      <circle className="moonglyph__ring" cx="8" cy="8" r="6.2" />
      {phase === "full" && <circle className="moonglyph__fill" cx="8" cy="8" r="6.2" />}
      {phase === "first" && <path className="moonglyph__fill" d="M8 1.8a6.2 6.2 0 0 1 0 12.4z" />}
      {phase === "last" && <path className="moonglyph__fill" d="M8 1.8a6.2 6.2 0 0 0 0 12.4z" />}
    </svg>
  );
}