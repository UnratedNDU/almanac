import { useId, useState, type Ref } from "react";
import { t } from "../i18n/es";

interface TextFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "password";
  autoComplete?: string;
  hint?: string;
  error?: string;
  placeholder?: string;
  spellCheck?: boolean;
  /** Adds a show/hide button; only meaningful for `type="password"`. */
  reveal?: boolean;
  disabled?: boolean;
  inputRef?: Ref<HTMLInputElement>;
}

export function TextField({
  label,
  name,
  value,
  onChange,
  type = "text",
  autoComplete,
  hint,
  error,
  placeholder,
  spellCheck,
  reveal,
  disabled,
  inputRef,
}: TextFieldProps) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const describedBy = [hint ? `${id}-hint` : "", `${id}-error`].filter(Boolean).join(" ");
  return (
    <div className="field">
      <label htmlFor={id} className="field__label">
        {label}
      </label>
      <div className={reveal ? "field__control field__control--reveal" : "field__control"}>
        <input
          id={id}
          ref={inputRef}
          name={name}
          className="field__input"
          type={reveal && shown ? "text" : type}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={spellCheck}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
        {reveal && (
          <button type="button" className="field__reveal" aria-pressed={shown} onClick={() => setShown(!shown)}>
            {shown ? t.common.hide : t.common.show}
          </button>
        )}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="field__hint">
          {hint}
        </p>
      )}
      <p id={`${id}-error`} className="field__error" aria-live="polite">
        {error}
      </p>
    </div>
  );
}