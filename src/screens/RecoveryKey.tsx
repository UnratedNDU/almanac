import { useState } from "react";
import { t } from "../i18n/es";

interface RecoveryKeyProps {
  recoveryKey: string;
  onDone: () => void;
}

// 13 groups: 7 + 6 reads more evenly than 4 + 4 + 4 + 1.
const GROUPS_PER_ROW = 7;

export function RecoveryKey({ recoveryKey, onDone }: RecoveryKeyProps) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const groups = recoveryKey.split("-");
  const rows = Array.from({ length: Math.ceil(groups.length / GROUPS_PER_ROW) }, (_, i) =>
    groups.slice(i * GROUPS_PER_ROW, (i + 1) * GROUPS_PER_ROW),
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(recoveryKey);
      setCopied(true);
    } catch {
      // Clipboard access can be refused; the key stays selectable on screen.
    }
  }

  return (
    <main className="auth">
      <section className="auth__panel auth__panel--wide">
        <h1>{t.auth.recoveryTitle}</h1>
        <p className="auth__intro">{t.auth.recoveryIntro}</p>
        <p className="auth__intro">{t.auth.recoveryWarning}</p>
        <p className="recovery" translate="no" aria-label={t.auth.recoveryKey}>
          {rows.map((row, i) => (
            <span key={i} className="recovery__row">
              {row.map((group, j) => (
                <span key={j}>{group}</span>
              ))}
            </span>
          ))}
        </p>
        <div className="auth__actions">
          <button type="button" className="btn" onClick={copy}>
            {copied ? t.auth.copied : t.auth.copy}
          </button>
        </div>
        <p className="sr-only" aria-live="polite">
          {copied ? t.auth.copied : ""}
        </p>
        <label className="check">
          <input type="checkbox" checked={saved} onChange={(event) => setSaved(event.target.checked)} />
          <span>{t.auth.saved}</span>
        </label>
        <button type="button" className="btn btn--primary" disabled={!saved} onClick={onDone}>
          {t.auth.continue}
        </button>
      </section>
    </main>
  );
}