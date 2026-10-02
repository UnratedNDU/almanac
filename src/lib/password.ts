/** Must match MIN_PASSWORD_CHARS in src-tauri/src/vault.rs. */
export const MIN_PASSWORD_LENGTH = 10;

export interface PasswordProblem {
  field: "password" | "confirm";
  code: "tooShort" | "mismatch";
}

// Rust counts Unicode scalar values, so count code points here, not UTF-16 units.
const length = (text: string) => Array.from(text).length;

/** Problems in the order the form should focus them: password first, then confirmation. */
export function passwordProblems(password: string, confirm: string): PasswordProblem[] {
  const problems: PasswordProblem[] = [];
  if (length(password) < MIN_PASSWORD_LENGTH) problems.push({ field: "password", code: "tooShort" });
  if (password !== confirm) problems.push({ field: "confirm", code: "mismatch" });
  return problems;
}

const LEVELS = [10, 12, 16, 20];

/** 0 below the minimum length, then one step per length level. Length is what matters most for a passphrase. */
export function passwordScore(password: string): 0 | 1 | 2 | 3 | 4 {
  const n = length(password);
  return LEVELS.filter((min) => n >= min).length as 0 | 1 | 2 | 3 | 4;
}