// Mirrors the serde models in src-tauri/src/model.rs and vault.rs (camelCase over the wire).

export type EventKind = "event" | "birthday" | "anniversary" | "special";

export type ThemeId = "system" | "light" | "dark" | "midnight" | "forest" | "sunset" | "paper";

export type Density = "comfortable" | "compact";

/** Dates are floating local time: `YYYY-MM-DD` when `allDay`, otherwise `YYYY-MM-DDTHH:MM`. */
export interface CalendarEvent {
  id: string;
  title: string;
  notes: string;
  start: string;
  end: string | null;
  allDay: boolean;
  color: string;
  categoryId: string | null;
  kind: EventKind;
  /** RFC 5545 rule body without the `RRULE:` prefix, e.g. `FREQ=YEARLY`. */
  rrule: string | null;
  /** Skipped occurrences, in the same format as `start`. */
  exdates: string[];
  reminderMinutes: number | null;
}

/** What the UI sends when saving: the vault fills any missing field and assigns the id. */
export type EventDraft = Partial<CalendarEvent> & Pick<CalendarEvent, "title" | "start">;

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Settings {
  theme: ThemeId;
  /** Hex color, or empty to use the theme's own accent. */
  accent: string;
  density: Density;
  fontScale: number;
  /** 0 = Sunday .. 6 = Saturday. */
  weekStart: number;
  autoLockMinutes: number;
  showMoon: boolean;
}

export interface OccurrenceView {
  eventId: string;
  start: string;
  end: string | null;
  recurring: boolean;
  title: string;
  color: string;
  kind: EventKind;
  allDay: boolean;
  categoryId: string | null;
}

export interface VaultStatus {
  initialized: boolean;
  unlocked: boolean;
}

export type ApiErrorCode =
  | "locked"
  | "badPassword"
  | "badRecoveryKey"
  | "weakPassword"
  | "alreadyInitialized"
  | "notInitialized"
  | "notFound"
  | "invalidEvent"
  | "corrupt"
  | "internal";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
}