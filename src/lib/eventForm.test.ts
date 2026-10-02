import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "../types";
import { draftFromForm, formForNew, formFromEvent, switchKind, type EventForm } from "./eventForm";
import { parseRrule } from "./recurrenceForm";

const filled = (patch: Partial<EventForm> = {}): EventForm => ({ ...formForNew("2026-08-20", 9), title: "Dentist", ...patch });

describe("switchKind", () => {
  it("applies the defaults of the chosen kind", () => {
    const birthday = switchKind(filled(), "birthday");
    expect(birthday).toMatchObject({ kind: "birthday", allDay: true });
    expect(birthday.recurrence.freq).toBe("YEARLY");
    expect(switchKind(filled(), "special")).toMatchObject({ kind: "special", allDay: true });
  });

  it("returns to a plain event exactly as it was, so the editor is not left dirty", () => {
    const weekly = filled({ recurrence: parseRrule("FREQ=WEEKLY;BYDAY=TH") });
    const back = switchKind(switchKind(weekly, "birthday"), "event");
    expect(JSON.stringify(back)).toBe(JSON.stringify(weekly));
  });

  it("goes back to a timed, non-repeating event when there was no plain event to restore", () => {
    const stored = filled({ kind: "birthday", allDay: true, recurrence: parseRrule("FREQ=YEARLY") });
    expect(switchKind(stored, "event")).toMatchObject({ kind: "event", allDay: false, recurrence: { freq: "NONE" } });
  });

  it("keeps the plain event through several kind changes", () => {
    const form = filled({ allDay: false });
    const back = switchKind(switchKind(switchKind(form, "birthday"), "anniversary"), "event");
    expect(back).toMatchObject({ kind: "event", allDay: false, recurrence: { freq: "NONE" } });
  });
});

describe("draftFromForm for a birthday", () => {
  const birthday = (patch: Partial<EventForm> = {}) => filled({ kind: "birthday", allDay: true, endDate: "2026-09-30", ...patch });

  it("is one all-day date that repeats every year, whatever the stale end date and repeat settings say", () => {
    const form = birthday({ recurrence: parseRrule("FREQ=WEEKLY;INTERVAL=2;BYDAY=TH") });
    expect(draftFromForm(form)).toMatchObject({ ok: true, draft: { start: "2026-08-20", end: null, allDay: true, rrule: "FREQ=YEARLY" } });
  });

  it("can have an optional celebration with a start and an end time on the same day", () => {
    const form = birthday({ allDay: false, startTime: "13:00", endTime: "16:00" });
    expect(draftFromForm(form)).toMatchObject({ ok: true, draft: { start: "2026-08-20T13:00", end: "2026-08-20T16:00", allDay: false, rrule: "FREQ=YEARLY" } });
  });

  it("allows a celebration without an end time", () => {
    const form = birthday({ allDay: false, startTime: "13:00", endTime: "" });
    expect(draftFromForm(form)).toMatchObject({ ok: true, draft: { start: "2026-08-20T13:00", end: null } });
  });

  it("rejects a celebration that ends before it starts", () => {
    expect(draftFromForm(birthday({ allDay: false, startTime: "16:00", endTime: "13:00" }))).toEqual({ ok: false, errors: { end: "endBeforeStart" } });
  });
});

describe("formForNew", () => {
  it("starts at the given hour and lasts one hour", () => {
    const form = formForNew("2026-08-20", 14);
    expect(form).toMatchObject({ startDate: "2026-08-20", startTime: "14:00", endDate: "2026-08-20", endTime: "15:00", allDay: false });
  });

  it("defaults to 09:00 and never runs past the end of the day", () => {
    expect(formForNew("2026-08-20").startTime).toBe("09:00");
    expect(formForNew("2026-08-20", 23).endTime).toBe("23:59");
  });
});

describe("draftFromForm", () => {
  it("builds a timed event with start and end", () => {
    const result = draftFromForm(filled());
    expect(result).toMatchObject({ ok: true, draft: { title: "Dentist", start: "2026-08-20T09:00", end: "2026-08-20T10:00", allDay: false, rrule: null } });
  });

  it("builds an all-day event with no end when it lasts one day, and an inclusive end otherwise", () => {
    const one = draftFromForm(filled({ allDay: true }));
    expect(one).toMatchObject({ ok: true, draft: { start: "2026-08-20", end: null, allDay: true } });
    const many = draftFromForm(filled({ allDay: true, endDate: "2026-08-22" }));
    expect(many).toMatchObject({ ok: true, draft: { start: "2026-08-20", end: "2026-08-22" } });
  });

  it("trims the title and requires one", () => {
    expect(draftFromForm(filled({ title: "  Gym  " }))).toMatchObject({ ok: true, draft: { title: "Gym" } });
    expect(draftFromForm(filled({ title: "   " }))).toEqual({ ok: false, errors: { title: "titleRequired" } });
  });

  it("rejects an end before the start, timed or all-day", () => {
    expect(draftFromForm(filled({ endTime: "08:00" }))).toEqual({ ok: false, errors: { end: "endBeforeStart" } });
    expect(draftFromForm(filled({ allDay: true, endDate: "2026-08-19" }))).toEqual({ ok: false, errors: { end: "endBeforeStart" } });
  });

  it("requires a start date, and a start time for timed events", () => {
    expect(draftFromForm(filled({ startDate: "" }))).toMatchObject({ ok: false, errors: { start: "startRequired" } });
    expect(draftFromForm(filled({ startTime: "" }))).toMatchObject({ ok: false, errors: { start: "startRequired" } });
    expect(draftFromForm(filled({ allDay: true, startTime: "" }))).toMatchObject({ ok: true });
  });

  it("reports every problem at once", () => {
    expect(draftFromForm(filled({ title: "", endTime: "08:00" }))).toEqual({
      ok: false,
      errors: { title: "titleRequired", end: "endBeforeStart" },
    });
  });

  it("writes the recurrence and maps an empty category to null", () => {
    const form = filled({ categoryId: "", recurrence: { ...parseRrule("FREQ=YEARLY") } });
    expect(draftFromForm(form)).toMatchObject({ ok: true, draft: { rrule: "FREQ=YEARLY", categoryId: null } });
  });

  it("keeps a rule the form cannot show unless the user picked a frequency", () => {
    const base = { id: "e1", rrule: "FREQ=HOURLY;COUNT=3", exdates: [] } as unknown as CalendarEvent;
    const form = filled({ recurrence: parseRrule("FREQ=HOURLY;COUNT=3") });
    expect(draftFromForm(form, base)).toMatchObject({ ok: true, draft: { rrule: "FREQ=HOURLY;COUNT=3" } });
  });

  it("keeps the id, exdates and untouched fields of the event being edited", () => {
    const base = { id: "e1", exdates: ["2026-08-27T09:00"], reminderMinutes: 15 } as unknown as CalendarEvent;
    expect(draftFromForm(filled(), base)).toMatchObject({
      ok: true,
      draft: { id: "e1", exdates: ["2026-08-27T09:00"], reminderMinutes: 15 },
    });
  });
});

describe("formFromEvent", () => {
  const event: CalendarEvent = {
    id: "e1", title: "Gym", notes: "Bring towel", start: "2026-08-20T07:30", end: "2026-08-20T08:30", allDay: false,
    color: "#2fa36b", categoryId: "c1", kind: "event", rrule: "FREQ=WEEKLY;BYDAY=TH", exdates: [], reminderMinutes: null,
  };

  it("fills the form from the event", () => {
    expect(formFromEvent(event)).toMatchObject({
      title: "Gym", notes: "Bring towel", startDate: "2026-08-20", startTime: "07:30", endDate: "2026-08-20", endTime: "08:30",
      color: "#2fa36b", categoryId: "c1",
    });
  });

  it("round-trips back to the same event fields", () => {
    const result = draftFromForm(formFromEvent(event), event);
    expect(result).toMatchObject({ ok: true, draft: { start: event.start, end: event.end, rrule: event.rrule, title: "Gym", color: "#2fa36b", categoryId: "c1" } });
  });

  it("shows an all-day event without a time", () => {
    const form = formFromEvent({ ...event, allDay: true, start: "2026-08-20", end: null });
    expect(form).toMatchObject({ allDay: true, startDate: "2026-08-20", endDate: "2026-08-20" });
  });
});