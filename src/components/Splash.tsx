import { t } from "../i18n/es";
import { Moon } from "./Moon";
import { ProgressBar } from "./ProgressBar";

interface SplashProps {
  label: string;
  /** 0 to 1 when known; omit it for an open-ended wait. */
  progress?: number;
  stalled?: boolean;
  error?: string;
  onRetry?: () => void;
}

/** Full-screen loading view: the moon waxes as real steps finish, and a slow load says so instead of looking frozen. */
export function Splash({ label, progress, stalled, error, onRetry }: SplashProps) {
  return (
    <main className="splash">
      <Moon lit={progress} />
      <h1 className="splash__name" translate="no">{t.appName}</h1>
      <p className="splash__status" role="status">
        {label}
      </p>
      <ProgressBar value={progress} label={label} />
      {(stalled || error) && (
        <div className="splash__help">
          <p>{error ?? t.loading.slow}</p>
          {onRetry && (
            <button type="button" className="btn" onClick={onRetry}>
              {t.loading.retry}
            </button>
          )}
        </div>
      )}
    </main>
  );
}