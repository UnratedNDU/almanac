import { describe, expect, it } from "vitest";
import { buildRrule, defaultsForKind, parseRrule, type RecurrenceForm } from "./recurrenceForm";

const form = (patch: Partial<RecurrenceForm>): RecurrenceForm => ({
  freq: "NONE", interval: 1, byDay: [], extra: "", unsupported: false, ...patch,
});

describe("buildRrule", () => {
  it("returns null when the event does not repeat", () => {
    expect(buildRrule(form({}))).toBeNull();
  });

  it("builds the simple frequencies", () => {
    expect(buildRrule(form({ freq: "YEARLY" }))).toBe("FREQ=YEARLY");
    expect(buildRrule(form({ freq: "DAILY", interval: 2 }))).toBe("FREQ=DAILY;INTERVAL=2");
    expect(buildRrule(form({ freq: "MONTHLY", interval: 1 }))).toBe("FREQ=MONTHLY");
  });

  it("orders weekdays from Monday and only uses them for weekly rules", () => {
    expect(buildRrule(form({ freq: "WEEKLY", byDay: ["WE", "MO"] }))).toBe("FREQ=WEEKLY;BYDAY=MO,WE");
    expect(buildRrule(form({ freq: "DAILY", byDay: ["MO"] }))).toBe("FREQ=DAILY");
  });

  it("ends by date in UTC form, or after a count; a date wins over a count", () => {
    expect(buildRrule(form({ freq: "WEEKLY", until: "2026-12-31" }))).toBe("FREQ=WEEKLY;UNTIL=20261231T235959Z");
    expect(buildRrule(form({ freq: "DAILY", count: 5 }))).toBe("FREQ=DAILY;COUNT=5");
    expect(buildRrule(form({ freq: "DAILY", count: 5, until: "2026-12-31" }))).toBe("FREQ=DAILY;UNTIL=20261231T235959Z");
  });

  it("ignores nonsense intervals and counts", () => {
    expect(buildRrule(form({ freq: "DAILY", interval: 0 }))).toBe("FREQ=DAILY");
    expect(buildRrule(form({ freq: "DAILY", count: 0 }))).toBe("FREQ=DAILY");
  });

  it("keeps rule parts the form cannot edit", () => {
    expect(buildRrule(form({ freq: "MONTHLY", extra: "BYMONTHDAY=15" }))).toBe("FREQ=MONTHLY;BYMONTHDAY=15");
  });
});

describe("parseRrule", () => {
  it("treats a missing rule as not repeating", () => {
    expect(parseRrule(null)).toEqual(form({}));
    expect(parseRrule("")).toEqual(form({}));
  });

  it.each([
    "FREQ=YEARLY",
    "FREQ=DAILY;INTERVAL=3",
    "FREQ=WEEKLY;BYDAY=MO,WE",
    "FREQ=WEEKLY;UNTIL=20261231T235959Z",
    "FREQ=DAILY;COUNT=5",
    "FREQ=MONTHLY;BYMONTHDAY=15",
  ])("round-trips %s", (rule) => {
    expect(buildRrule(parseRrule(rule))).toBe(rule);
  });

  it("reads the end date back as an iso date", () => {
    expect(parseRrule("FREQ=WEEKLY;UNTIL=20261231T235959Z").until).toBe("2026-12-31");
  });

  it("marks frequencies the form cannot edit as unsupported", () => {
    const parsed = parseRrule("FREQ=HOURLY");
    expect(parsed.unsupported).toBe(true);
    expect(parsed.freq).toBe("NONE");
  });
});

describe("defaultsForKind", () => {
  it("makes birthdays and anniversaries all-day and yearly", () => {
    expect(defaultsForKind("birthday")).toEqual({ allDay: true, freq: "YEARLY" });
    expect(defaultsForKind("anniversary")).toEqual({ allDay: true, freq: "YEARLY" });
  });

  it("makes special days all-day without repeating, and events untouched", () => {
    expect(defaultsForKind("special")).toEqual({ allDay: true, freq: "NONE" });
    expect(defaultsForKind("event")).toEqual({});
  });
});