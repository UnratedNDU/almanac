import type { CalendarEvent, EventDraft, EventKind } from "../types";
import { buildRrule, defaultsForKind, parseRrule, type RecurrenceForm } from "./recurrenceForm";

export interface EventForm {
  title: string;
  notes: string;
  kind: EventKind;
  allDay: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  color: string;
  /** Empty means no category. */
  categoryId: string;
  recurrence: RecurrenceForm;
  /** The plain event's all-day flag and repeat rule, kept while another kind is chosen so coming back restores them. */
  plain?: Pick<EventForm, "allDay" | "recurrence">;
}

const DEFAULT_HOUR = 9;
const pad = (n: number) => String(n).padStart(2, "0");

/** One hour after `time`, never past the end of the day. */
function plusOneHour(time: string): string {
  const hour = Number(time.slice(0, 2));
  return hour >= 23 ? "23:59" : `${pad(hour + 1)}${time.slice(2)}`;
}

export function formForNew(date: string, hour: number = DEFAULT_HOUR): EventForm {
  const start = Math.min(23, Math.max(0, hour));
  const startTime = `${pad(start)}:00`;
  return {
    title: "", notes: "", kind: "event", allDay: false,
    startDate: date, startTime, endDate: date, endTime: plusOneHour(startTime),
    color: "", categoryId: "", recurrence: parseRrule(null),
  };
}

export function formFromEvent(ev: CalendarEvent): EventForm {
  const startDate = ev.start.slice(0, 10);
  const startTime = ev.allDay ? "09:00" : ev.start.slice(11, 16);
  return {
    title: ev.title, notes: ev.notes, kind: ev.kind, allDay: ev.allDay,
    startDate, startTime,
    endDate: ev.end ? ev.end.slice(0, 10) : startDate,
    endTime: ev.end && !ev.allDay ? ev.end.slice(11, 16) : plusOneHour(startTime),
    color: ev.color, categoryId: ev.categoryId ?? "", recurrence: parseRrule(ev.rrule),
  };
}

/** Applies what choosing `kind` implies for the other fields; going back to "event" restores what it had. */
export function switchKind(form: EventForm, kind: EventKind): EventForm {
  if (kind === form.kind) return form;
  const { plain, ...rest } = form;
  if (kind === "event") return { ...rest, kind, ...(plain ?? { allDay: false, recurrence: parseRrule(null) }) };
  const defaults = defaultsForKind(kind);
  return {
    ...rest,
    kind,
    plain: form.kind === "event" ? { allDay: form.allDay, recurrence: form.recurrence } : plain,
    allDay: defaults.allDay ?? form.allDay,
    recurrence: defaults.freq === undefined ? form.recurrence : { ...form.recurrence, freq: defaults.freq, unsupported: false },
  };
}

export type FormErrors = { title?: "titleRequired"; start?: "startRequired"; end?: "endBeforeStart" };

export type DraftResult =
  | { ok: true; draft: EventDraft }
  | { ok: false; errors: FormErrors };

/** Validates the form and builds what the vault stores. `base` is the event being edited, if any. */
export function draftFromForm(form: EventForm, base?: CalendarEvent): DraftResult {
  const errors: FormErrors = {};
  const title = form.title.trim();
  if (!title) errors.title = "titleRequired";

  // A birthday is one date that repeats every year; its only extra is an optional celebration time that day.
  const birthday = form.kind === "birthday";
  const endDate = birthday ? form.startDate : form.endDate;
  const recurrence = birthday ? parseRrule("FREQ=YEARLY") : form.recurrence;

  if (!form.startDate || (!form.allDay && !form.startTime)) errors.start = "startRequired";
  const start = form.allDay ? form.startDate : `${form.startDate}T${form.startTime}`;
  let end: string | null;
  if (form.allDay) end = endDate > form.startDate ? endDate : null;
  else end = endDate && form.endTime ? `${endDate}T${form.endTime}` : null;
  const endsBefore = form.allDay ? Boolean(endDate) && endDate < form.startDate : end !== null && end < start;
  if (endsBefore) errors.end = "endBeforeStart";
  if (errors.title || errors.start || errors.end) return { ok: false, errors };

  const keepStoredRule = recurrence.unsupported && recurrence.freq === "NONE";
  return {
    ok: true,
    draft: {
      ...base,
      id: base?.id,
      title,
      notes: form.notes,
      kind: form.kind,
      allDay: form.allDay,
      start,
      end,
      color: form.color,
      categoryId: form.categoryId || null,
      rrule: keepStoredRule ? (base?.rrule ?? null) : buildRrule(recurrence),
      exdates: base?.exdates ?? [],
    },
  };
}