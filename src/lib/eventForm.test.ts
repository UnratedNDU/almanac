import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "../types";
import { draftFromForm, formForNew, formFromEvent, type EventForm } from "./eventForm";
import { parseRrule } from "./recurrenceForm";

const filled = (patch: Partial<EventForm> = {}): EventForm => ({ ...formForNew("2026-08-20", 9), title: "Dentist", ...patch });

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