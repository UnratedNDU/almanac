import type { EventKind } from "../types";

const SHAPES: Record<Exclude<EventKind, "event">, string> = {
  birthday: "M2.5 7h11v7h-11zM1.5 4.5h13V7h-13zM8 4.5V14M8 4.5C6.2 1.8 3.8 2.8 5 4.5M8 4.5c1.8-2.7 4.2-1.7 3 0",
  anniversary: "M8 13.5S2 9.8 2 6a3 3 0 0 1 6-.8A3 3 0 0 1 14 6c0 3.8-6 7.5-6 7.5z",
  special: "M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z",
};

/** A small marker for birthdays, anniversaries and special dates; plain events have none. */
export function KindIcon({ kind }: { kind: EventKind }) {
  if (kind === "event") return null;
  return (
    <svg
      className="kind-icon"
      viewBox="0 0 16 16"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d={SHAPES[kind]} />
    </svg>
  );
}