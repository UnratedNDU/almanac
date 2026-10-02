import type { Category } from "../types";
import { parseHex } from "./color";

export const EVENT_COLORS = ["#5b7cfa", "#e5484d", "#f08a24", "#e0b400", "#2fa36b", "#14a3a3", "#8e5bd9", "#d9529c"] as const;

const FALLBACK = "var(--accent)";

/** The event's own color, else its category's, else the accent. Only hex values reach the stylesheet. */
export function eventColor(item: { color: string; categoryId: string | null }, categories: Category[]): string {
  const own = item.color || categories.find((c) => c.id === item.categoryId)?.color || "";
  return parseHex(own) ? own : FALLBACK;
}