// Development only: lets `npm run dev` work in a plain browser. It keeps data in memory, has no
// encryption and understands just enough recurrence to draw a believable calendar.
import type { ApiErrorCode, CalendarEvent, Category, OccurrenceView, Settings } from "../types";

const fail = (code: ApiErrorCode, message: string) => Promise.reject({ code, message });
// `?delay=8000` in the URL slows every call, to inspect loading states.
const extra = Number(new URLSearchParams(location.search).get("delay")) || 0;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms + extra));

let password: string | null = null;
let unlocked = false;
let counter = 0;
const events = new Map<string, CalendarEvent>();
const categories = new Map<string, Category>();
let settings: Settings = {
  theme: "system", accent: "", density: "comfortable", fontScale: 1, weekStart: 1, autoLockMinutes: 5, showMoon: true,
};

const pad = (n: number) => String(n).padStart(2, "0");
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string) =>
  new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10), +(s.slice(11, 13) || 0), +(s.slice(14, 16) || 0));
const format = (d: Date, allDay: boolean) => (allDay ? isoDate(d) : `${isoDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes());

function newEvent(partial: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: "", title: "", notes: "", start: "", end: null, allDay: false, color: "", categoryId: null,
    kind: "event", rrule: null, exdates: [], reminderMinutes: null, ...partial,
  };
}

function seed() {
  const today = new Date();
  const day = (offset: number) => isoDate(addDays(today, offset));
  const monday = addDays(today, -((today.getDay() + 6) % 7));
  const samples: Partial<CalendarEvent>[] = [
    { title: "Cumpleaños de Ana", start: `1990${day(3).slice(4)}`, allDay: true, kind: "birthday", rrule: "FREQ=YEARLY", color: "#d9529c" },
    { title: "Reunión de equipo", start: `${isoDate(monday)}T10:00`, end: `${isoDate(monday)}T10:45`, rrule: "FREQ=WEEKLY;BYDAY=MO,WE", color: "#5b7cfa" },
    { title: "Dentista", start: `${day(5)}T16:00`, end: `${day(5)}T17:00`, color: "#14a3a3" },
    { title: "Vacaciones en la playa", start: day(10), end: day(13), allDay: true, color: "#f08a24" },
    { title: "Aniversario", start: `2018${day(-4).slice(4)}`, allDay: true, kind: "anniversary", rrule: "FREQ=YEARLY", color: "#e5484d" },
    { title: "Gimnasio", start: `${day(1)}T07:00`, end: `${day(1)}T08:00`, rrule: "FREQ=DAILY;INTERVAL=2", color: "#2fa36b" },
    { title: "Almuerzo con Marta", start: `${day(0)}T13:00`, end: `${day(0)}T14:30`, color: "#e0b400" },
    { title: "Llamada con el banco", start: `${day(0)}T13:30`, end: `${day(0)}T14:00`, color: "#8e5bd9" },
    { title: "Revisión de proyecto", start: `${day(0)}T14:00`, end: `${day(0)}T15:00`, color: "#5b7cfa" },
    { title: "Pago del alquiler", start: day(2), allDay: true, kind: "special", rrule: "FREQ=MONTHLY", color: "#e5484d" },
  ];
  for (const sample of samples) {
    const ev = newEvent({ ...sample, id: `mock-${++counter}` });
    events.set(ev.id, ev);
  }
}

/** Starts of a series in order, enough for the dev calendar (daily, weekly, monthly, yearly with the usual limits). */
function* seriesStarts(ev: CalendarEvent): Generator<Date> {
  const first = parse(ev.start);
  if (!ev.rrule) {
    yield first;
    return;
  }
  const rule = Object.fromEntries(ev.rrule.split(";").map((part) => part.split("="))) as Record<string, string>;
  const interval = Number(rule.INTERVAL ?? 1);
  const limit = rule.COUNT ? Number(rule.COUNT) : Infinity;
  const until = rule.UNTIL ? parse(`${rule.UNTIL.slice(0, 4)}-${rule.UNTIL.slice(4, 6)}-${rule.UNTIL.slice(6, 8)}`) : null;
  const weekdays = rule.BYDAY?.split(",");
  const codes = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
  let produced = 0;
  for (let i = 0; i < 4000; i++) {
    let candidate: Date | null = null;
    if (rule.FREQ === "DAILY") candidate = addDays(first, i * interval);
    else if (rule.FREQ === "WEEKLY" && weekdays) {
      const d = addDays(first, i);
      candidate = weekdays.includes(codes[d.getDay()]) ? d : null;
    } else if (rule.FREQ === "WEEKLY") candidate = addDays(first, 7 * i * interval);
    else if (rule.FREQ === "MONTHLY") {
      const d = new Date(first.getFullYear(), first.getMonth() + i * interval, first.getDate(), first.getHours(), first.getMinutes());
      candidate = d.getDate() === first.getDate() ? d : null;
    } else if (rule.FREQ === "YEARLY") {
      const d = new Date(first.getFullYear() + i * interval, first.getMonth(), first.getDate(), first.getHours(), first.getMinutes());
      candidate = d.getDate() === first.getDate() ? d : null;
    }
    if (!candidate) continue;
    if (until && candidate > addDays(until, 1)) return;
    if (produced++ >= limit) return;
    yield candidate;
  }
}

function occurrences(from: string, to: string): OccurrenceView[] {
  const rangeStart = parse(from);
  const rangeEnd = parse(to);
  const out: OccurrenceView[] = [];
  for (const ev of events.values()) {
    const first = parse(ev.start);
    const lastEnd = ev.end ? parse(ev.end) : first;
    const span = Math.max(
      (ev.allDay ? addDays(lastEnd, 1).getTime() : lastEnd.getTime()) - first.getTime(),
      ev.allDay ? 86_400_000 : 60_000,
    );
    for (const s of seriesStarts(ev)) {
      if (s >= rangeEnd) break;
      if (s.getTime() + span <= rangeStart.getTime() || ev.exdates.includes(format(s, ev.allDay))) continue;
      const e = new Date(s.getTime() + span);
      const lastDay = addDays(e, -1);
      out.push({
        eventId: ev.id, start: format(s, ev.allDay),
        end: ev.allDay ? (isoDate(lastDay) > isoDate(s) ? isoDate(lastDay) : null) : ev.end ? format(e, false) : null,
        recurring: ev.rrule !== null, title: ev.title, color: ev.color, kind: ev.kind, allDay: ev.allDay, categoryId: ev.categoryId,
      });
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
}

export async function mockInvoke(command: string, args: Record<string, unknown> = {}): Promise<unknown> {
  await delay(command === "unlock" || command === "create_account" ? 900 : 250);
  if (!["vault_status", "create_account", "unlock", "unlock_with_recovery"].includes(command) && !unlocked) {
    return fail("locked", "Almanac está bloqueado.");
  }
  switch (command) {
    case "vault_status":
      return { initialized: password !== null, unlocked };
    case "create_account":
      if (String(args.password).length < 10) return fail("weakPassword", "La contraseña es demasiado corta.");
      password = String(args.password);
      unlocked = true;
      seed();
      return "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ23-4567-ABCD-EFGH-IJKL-MNOP-QRST";
    case "unlock":
      if (args.password !== password) return fail("badPassword", "Contraseña incorrecta.");
      unlocked = true;
      return undefined;
    case "unlock_with_recovery":
      unlocked = true;
      return undefined;
    case "lock":
      unlocked = false;
      return undefined;
    case "get_settings":
      return settings;
    case "save_settings":
      settings = args.settings as Settings;
      return undefined;
    case "list_categories":
      return [...categories.values()].sort((a, b) => a.name.localeCompare(b.name));
    case "save_category": {
      const cat = { id: "", color: "", ...(args.category as Partial<Category>) } as Category;
      cat.id ||= `mock-${++counter}`;
      categories.set(cat.id, cat);
      return cat;
    }
    case "delete_category":
      categories.delete(String(args.id));
      return undefined;
    case "list_occurrences":
      return occurrences(String(args.from), String(args.to));
    case "get_event": {
      const ev = events.get(String(args.id));
      return ev ?? fail("notFound", "No encontrado.");
    }
    case "save_event": {
      const ev = newEvent(args.event as Partial<CalendarEvent>);
      if (!/^\d{4}-\d{2}-\d{2}/.test(ev.start)) return fail("invalidEvent", "Fecha no válida.");
      ev.id ||= `mock-${++counter}`;
      events.set(ev.id, ev);
      return ev;
    }
    case "delete_event":
      return events.delete(String(args.id)) ? undefined : fail("notFound", "No encontrado.");
    case "skip_occurrence": {
      const ev = events.get(String(args.id));
      if (!ev) return fail("notFound", "No encontrado.");
      if (!ev.exdates.includes(String(args.start))) ev.exdates.push(String(args.start));
      return undefined;
    }
    default:
      return fail("internal", `mock: ${command} not implemented`);
  }
}