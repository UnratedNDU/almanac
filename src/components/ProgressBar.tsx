interface ProgressBarProps {
  /** 0 to 1. Omit it when the amount of work is unknown. */
  value?: number;
  label: string;
}

export function ProgressBar({ value, label }: ProgressBarProps) {
  const known = value !== undefined;
  const clamped = known ? Math.min(1, Math.max(0, value)) : 0;
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={known ? Math.round(clamped * 100) : undefined}
    >
      <div
        className={known ? "progress__fill" : "progress__fill progress__fill--loop"}
        style={known ? { transform: `scaleX(${clamped})` } : undefined}
      />
    </div>
  );
}