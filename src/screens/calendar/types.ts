import type { Category, OccurrenceView, Settings } from "../../types";

export type View = "month" | "week" | "day" | "agenda";

export interface ViewProps {
  occurrences: OccurrenceView[];
  categories: Category[];
  settings: Settings;
  cursor: Date;
  /** True until the first data arrives. */
  loadingFirst: boolean;
  onOpen: (occurrence: OccurrenceView) => void;
  /** Starts a new event on `date` (`YYYY-MM-DD`), optionally at `hour`. */
  onCreate: (date: string, hour?: number) => void;
  /** Jumps to the day view of `date`. */
  onPickDay: (date: Date) => void;
}