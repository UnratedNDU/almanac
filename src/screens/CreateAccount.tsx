import { useRef, useState, type FormEvent } from "react";
import { api, asApiError } from "../api";
import { Moon } from "../components/Moon";
import { ProgressBar } from "../components/ProgressBar";
import { TextField } from "../components/TextField";
import { errorMessage, t } from "../i18n/es";
import { passwordProblems, passwordScore } from "../lib/password";
import { useStalled } from "../lib/useStalled";

interface CreateAccountProps {
  onCreated: (recoveryKey: string) => void;
}

interface Errors {
  password?: string;
  confirm?: string;
  form?: string;
}

export function CreateAccount({ onCreated }: CreateAccountProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const stalled = useStalled(pending);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const score = passwordScore(password);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const problems = passwordProblems(password, confirm);
    if (problems.length > 0) {
      setErrors(Object.fromEntries(problems.map((p) => [p.field, t.auth.errors[p.code]])));
      (problems[0].field === "password" ? passwordRef : confirmRef).current?.focus();
      return;
    }
    setErrors({});
    setPending(true);
    try {
      onCreated(await api.createAccount(password));
    } catch (error) {
      setErrors({ form: errorMessage(asApiError(error)) });
      setPending(false);
      passwordRef.current?.focus();
    }
  }

  return (
    <main className="auth">
      <form className="auth__panel" onSubmit={submit} noValidate>
        <Moon lit={pending ? undefined : 0.35} size={56} />
        <h1>{t.auth.createTitle}</h1>
        <p className="auth__intro">{t.auth.createIntro}</p>
        <TextField
          label={t.auth.password}
          name="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          hint={t.auth.passwordHint}
          error={errors.password}
          reveal
          disabled={pending}
          inputRef={passwordRef}
        />
        {password && (
          <div className="strength">
            <ProgressBar value={score / 4} label={t.auth.strength[score]} />
            <span>{t.auth.strength[score]}</span>
          </div>
        )}
        <TextField
          label={t.auth.confirm}
          name="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
          error={errors.confirm}
          disabled={pending}
          inputRef={confirmRef}
        />
        <p className="auth__error" aria-live="polite">
          {errors.form}
        </p>
        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? t.auth.creating : t.auth.create}
        </button>
        {pending && (
          <div className="auth__progress">
            <ProgressBar label={t.auth.creating} />
            <p aria-live="polite">{stalled ? t.loading.slow : t.auth.preparing}</p>
          </div>
        )}
      </form>
    </main>
  );
}