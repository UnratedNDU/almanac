import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, asApiError } from "../api";
import { Moon } from "../components/Moon";
import { ProgressBar } from "../components/ProgressBar";
import { TextField } from "../components/TextField";
import { errorMessage, t } from "../i18n/es";
import { useStalled } from "../lib/useStalled";

type Mode = "password" | "recovery";

interface UnlockProps {
  onUnlocked: () => void;
}

export function Unlock({ onUnlocked }: UnlockProps) {
  const [mode, setMode] = useState<Mode>("password");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const stalled = useStalled(pending);
  const inputRef = useRef<HTMLInputElement>(null);
  const usingPassword = mode === "password";

  // Focus the only field on desktop; on touch screens it would pop the keyboard up unasked.
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) inputRef.current?.focus();
  }, [mode]);

  function switchMode() {
    setMode(usingPassword ? "recovery" : "password");
    setSecret("");
    setError(undefined);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!secret.trim()) {
      setError(usingPassword ? t.auth.errors.passwordRequired : t.auth.errors.recoveryRequired);
      inputRef.current?.focus();
      return;
    }
    setError(undefined);
    setPending(true);
    try {
      await (usingPassword ? api.unlock(secret) : api.unlockWithRecovery(secret));
      onUnlocked();
    } catch (caught) {
      setError(errorMessage(asApiError(caught)));
      setPending(false);
      inputRef.current?.focus();
    }
  }

  return (
    <main className="auth">
      <form className="auth__panel" onSubmit={submit} noValidate>
        <Moon lit={pending ? undefined : 0.35} size={56} />
        <h1>{t.auth.unlockTitle}</h1>
        <p className="auth__intro">{usingPassword ? t.auth.unlockIntro : t.auth.unlockRecoveryIntro}</p>
        {usingPassword ? (
          <TextField
            label={t.auth.password}
            name="current-password"
            type="password"
            autoComplete="current-password"
            value={secret}
            onChange={setSecret}
            error={error}
            reveal
            disabled={pending}
            inputRef={inputRef}
          />
        ) : (
          <TextField
            label={t.auth.recoveryKey}
            name="recovery-key"
            autoComplete="off"
            spellCheck={false}
            placeholder={t.auth.recoveryKeyPlaceholder}
            value={secret}
            onChange={setSecret}
            error={error}
            disabled={pending}
            inputRef={inputRef}
          />
        )}
        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? t.loading.openingData : usingPassword ? t.auth.unlock : t.auth.unlockWithKey}
        </button>
        {pending && (
          <div className="auth__progress">
            <ProgressBar label={t.loading.openingData} />
            <p aria-live="polite">{stalled ? t.loading.slow : t.loading.openingData}</p>
          </div>
        )}
        <button type="button" className="link-btn" onClick={switchMode} disabled={pending}>
          {usingPassword ? t.auth.useRecovery : t.auth.usePassword}
        </button>
      </form>
    </main>
  );
}