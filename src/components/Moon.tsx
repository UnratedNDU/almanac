import { useId } from "react";

const RADIUS = 46;

interface MoonProps {
  /** Lit fraction, 0 (new moon) to 1 (full moon). Omit it for a gentle looping wax. */
  lit?: number;
  size?: number;
}

/** A waxing moon drawn as a lit disc with a shadow disc sliding off it, so progress only moves a transform. */
export function Moon({ lit, size = 112 }: MoonProps) {
  const maskId = useId();
  const looping = lit === undefined;
  const shift = looping ? 0 : -2 * RADIUS * Math.min(1, Math.max(0, lit));
  return (
    <svg className={looping ? "moon moon--loop" : "moon"} viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <defs>
        <mask id={maskId}>
          <rect width="100" height="100" fill="black" />
          <circle cx="50" cy="50" r={RADIUS} fill="white" />
          <circle
            className="moon__shadow"
            cx="50"
            cy="50"
            r={RADIUS}
            fill="black"
            style={looping ? undefined : { transform: `translateX(${shift}px)` }}
          />
        </mask>
      </defs>
      <circle className="moon__dark" cx="50" cy="50" r={RADIUS} />
      <circle className="moon__lit" cx="50" cy="50" r={RADIUS} mask={`url(#${maskId})`} />
    </svg>
  );
}