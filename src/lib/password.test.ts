import { describe, expect, it } from "vitest";
import { MIN_PASSWORD_LENGTH, passwordProblems, passwordScore } from "./password";

describe("passwordProblems", () => {
  it("accepts a long enough password that matches its confirmation", () => {
    expect(passwordProblems("correct horse battery", "correct horse battery")).toEqual([]);
  });

  it("reports a short password on the password field", () => {
    expect(passwordProblems("short", "short")).toEqual([{ field: "password", code: "tooShort" }]);
  });

  it("reports a mismatch on the confirmation field", () => {
    expect(passwordProblems("correct horse battery", "correct horse batterx")).toEqual([
      { field: "confirm", code: "mismatch" },
    ]);
  });

  it("reports both problems, password first, so focus lands on the first one", () => {
    expect(passwordProblems("short", "other").map((p) => p.field)).toEqual(["password", "confirm"]);
  });

  it("counts characters like the Rust side, not UTF-16 units", () => {
    // Nine astral characters are 18 UTF-16 units but only 9 characters.
    expect(passwordProblems("😀".repeat(9), "😀".repeat(9)).map((p) => p.code)).toEqual(["tooShort"]);
    expect(passwordProblems("😀".repeat(MIN_PASSWORD_LENGTH), "😀".repeat(MIN_PASSWORD_LENGTH))).toEqual([]);
  });
});

describe("passwordScore", () => {
  it("grows with length: none below the minimum, then four steps", () => {
    expect(passwordScore("")).toBe(0);
    expect(passwordScore("x".repeat(MIN_PASSWORD_LENGTH - 1))).toBe(0);
    expect(passwordScore("x".repeat(10))).toBe(1);
    expect(passwordScore("x".repeat(12))).toBe(2);
    expect(passwordScore("x".repeat(16))).toBe(3);
    expect(passwordScore("x".repeat(20))).toBe(4);
    expect(passwordScore("x".repeat(60))).toBe(4);
  });
});