import { invoke } from "@tauri-apps/api/core";
import type {
  ApiError,
  CalendarEvent,
  Category,
  EventDraft,
  OccurrenceView,
  Settings,
  VaultStatus,
} from "./types";

type Args = Record<string, unknown>;

async function call<T>(command: string, args?: Args): Promise<T> {
  // Outside Tauri (plain `npm run dev` in a browser) a small in-memory backend stands in. It is dropped from release builds.
  if (import.meta.env.DEV && !("__TAURI_INTERNALS__" in window)) {
    const { mockInvoke } = await import("./dev/mockBackend");
    return mockInvoke(command, args) as Promise<T>;
  }
  return invoke<T>(command, args);
}

/** One typed function per Tauri command (see src-tauri/src/commands.rs). */
export const api = {
  status: () => call<VaultStatus>("vault_status"),
  /** Resolves with the recovery key, shown to the user once. */
  createAccount: (password: string) => call<string>("create_account", { password }),
  unlock: (password: string) => call<void>("unlock", { password }),
  unlockWithRecovery: (recoveryKey: string) => call<void>("unlock_with_recovery", { recoveryKey }),
  lock: () => call<void>("lock"),
  getEvent: (id: string) => call<CalendarEvent>("get_event", { id }),
  saveEvent: (event: EventDraft) => call<CalendarEvent>("save_event", { event }),
  deleteEvent: (id: string) => call<void>("delete_event", { id }),
  skipOccurrence: (id: string, start: string) => call<void>("skip_occurrence", { id, start }),
  listOccurrences: (from: string, to: string) => call<OccurrenceView[]>("list_occurrences", { from, to }),
  listCategories: () => call<Category[]>("list_categories"),
  saveCategory: (category: Partial<Category> & Pick<Category, "name">) => call<Category>("save_category", { category }),
  deleteCategory: (id: string) => call<void>("delete_category", { id }),
  getSettings: () => call<Settings>("get_settings"),
  saveSettings: (settings: Settings) => call<void>("save_settings", { settings }),
};

/** Errors from Rust arrive as `{ code, message }`; anything else is wrapped as an internal error. */
export function asApiError(error: unknown): ApiError {
  if (typeof error === "object" && error !== null && "code" in error && "message" in error) {
    return error as ApiError;
  }
  return { code: "internal", message: error instanceof Error ? error.message : String(error) };
}