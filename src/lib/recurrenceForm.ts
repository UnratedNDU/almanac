import type { EventKind } from "../types";

export type Freq = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export interface RecurrenceForm {
  freq: Freq;
  interval: number;
  /** Two-letter weekday codes; used by weekly rules only. */
  byDay: string[];
  /** `YYYY-MM-DD`. */
  until?: string;
  count?: number;
  /** Rule parts the form cannot edit (for example `BYMONTHDAY=15`), kept so editing never loses them. */
  extra: string;
  /** The stored rule uses a frequency the form cannot show; keep the rule as is unless the user picks a frequency. */
  unsupported: boolean;
}

export const WEEKDAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;

const FREQS = new Set(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]);
const PLAIN_DAY = /^(MO|TU|WE|TH|FR|SA|SU)$/;

/** The RFC 5545 rule body for the form, or null when the event does not repeat. */
export function buildRrule(form: RecurrenceForm): string | null {
  if (form.freq === "NONE") return null;
  const parts = [`FREQ=${form.freq}`];
  if (form.interval > 1) parts.push(`INTERVAL=${Math.floor(form.interval)}`);
  if (form.freq === "WEEKLY" && form.byDay.length > 0) {
    parts.push(`BYDAY=${WEEKDAYS.filter((day) => form.byDay.includes(day)).join(",")}`);
  }
  // UNTIL is written in UTC form because the engine reads every start as UTC.
  if (form.until) parts.push(`UNTIL=${form.until.replace(/-/g, "")}T235959Z`);
  else if (form.count && form.count > 0) parts.push(`COUNT=${Math.floor(form.count)}`);
  if (form.extra) parts.push(form.extra);
  return parts.join(";");
}

export function parseRrule(rule: string | null): RecurrenceForm {
  const form: RecurrenceForm = { freq: "NONE", interval: 1, byDay: [], extra: "", unsupported: false };
  if (!rule) return form;
  const extra: string[] = [];
  for (const part of rule.split(";")) {
    const [key, value = ""] = part.split("=");
    switch (key) {
      case "FREQ":
        if (FREQS.has(value)) form.freq = value as Freq;
        else form.unsupported = true;
        break;
      case "INTERVAL":
        form.interval = Math.max(1, parseInt(value, 10) || 1);
        break;
      case "BYDAY":
        form.byDay = value.split(",").filter(Boolean);
        break;
      case "COUNT":
        form.count = parseInt(value, 10) || undefined;
        break;
      case "UNTIL": {
        const match = /^(\d{4})(\d{2})(\d{2})/.exec(value);
        if (match) form.until = `${match[1]}-${match[2]}-${match[3]}`;
        break;
      }
      default:
        if (part) extra.push(part);
    }
  }
  // Weekday lists only make sense on weekly rules here; anything else (like "1MO") is kept verbatim.
  if (form.byDay.length > 0 && (form.freq !== "WEEKLY" || !form.byDay.every((day) => PLAIN_DAY.test(day)))) {
    extra.push(`BYDAY=${form.byDay.join(",")}`);
    form.byDay = [];
  }
  form.extra = extra.join(";");
  return form;
}

/** What choosing a kind in the editor implies for the other fields. */
export function defaultsForKind(kind: EventKind): { allDay?: boolean; freq?: Freq } {
  switch (kind) {
    case "birthday":
    case "anniversary":
      return { allDay: true, freq: "YEARLY" };
    case "special":
      return { allDay: true, freq: "NONE" };
    default:
      return {};
  }
}