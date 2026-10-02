import { useCallback, useEffect, useMemo, useState } from "react";
import { api, asApiError } from "../../api";
import { Icon } from "../../components/Icon";
import { ProgressBar } from "../../components/ProgressBar";
import { Splash } from "../../components/Splash";
import { errorMessage, t } from "../../i18n/es";
import { toIsoDate, weekDays } from "../../lib/dates";
import { useShortcuts } from "../../state/useShortcuts";
import { useOccurrences } from "../../state/useOccurrences";
import { useStartup, type Startup } from "../../state/useStartup";
import { useAutoLock } from "../../state/useAutoLock";
import { useTheme } from "../../theme/useTheme";
import type { Category, OccurrenceView, Settings } from "../../types";
import { SettingsPanel } from "../SettingsPanel";
import { AgendaView } from "./AgendaView";
import { EventEditor, type EditorTarget } from "./EventEditor";
import { MonthView } from "./MonthView";
import { moveCursor, rangeFor, titleFor } from "./range";
import { TimeGrid } from "./TimeGrid";
import type { View, ViewProps } from "./types";
import "./calendar.css";

const VIEWS: View[] = ["month", "week", "day", "agenda"];

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

/** Loads settings and categories behind the moon splash, then shows the calendar. */
export function CalendarShell({ onLock }: { onLock: () => void }) {
  const startup = useStartup();
  if (startup.state.status !== "ready") {
    return (
      <Splash
        label={startup.label}
        progress={startup.progress}
        stalled={startup.stalled}
        error={startup.state.status === "error" ? errorMessage(asApiError(startup.state.error)) : undefined}
        onRetry={startup.retry}
      />
    );
  }
  return <Calendar initial={startup.state.data} onLock={onLock} />;
}

function Calendar({ initial, onLock }: { initial: Startup; onLock: () => void }) {
  const [settings, setSettings] = useState<Settings>(initial.settings);
  const [categories, setCategories] = useState<Category[]>(initial.categories);
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(startOfToday);
  const [version, setVersion] = useState(0);
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saveError, setSaveError] = useState<string>();

  useTheme(settings);
  useAutoLock(settings.autoLockMinutes, onLock);

  const { from, to } = useMemo(() => rangeFor(view, cursor, settings.weekStart), [view, cursor, settings.weekStart]);
  const { data, loading, error } = useOccurrences(from, to, version);
  useEffect(() => {
    if (error?.code === "locked") onLock();
  }, [error, onLock]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const go = useCallback((direction: 1 | -1) => setCursor((c) => moveCursor(view, c, direction)), [view]);
  const openNew = useCallback((date: string, hour?: number) => setEditor({ mode: "new", date, hour }), []);
  const openOccurrence = useCallback(
    (o: OccurrenceView) => setEditor({ mode: "edit", eventId: o.eventId, occurrenceStart: o.start }),
    [],
  );
  const pickDay = useCallback((date: Date) => {
    setCursor(date);
    setView("day");
  }, []);

  function changeSettings(next: Settings) {
    setSettings(next);
    setSaveError(undefined);
    api.saveSettings(next).catch((caught) => setSaveError(errorMessage(asApiError(caught))));
  }

  useShortcuts(
    {
      t: () => setCursor(startOfToday()),
      arrowleft: () => go(-1),
      arrowright: () => go(1),
      m: () => setView("month"),
      s: () => setView("week"),
      d: () => setView("day"),
      a: () => setView("agenda"),
      n: () => openNew(toIsoDate(cursor)),
    },
    editor === null && !settingsOpen,
  );

  const days = useMemo(() => weekDays(cursor, settings.weekStart), [cursor, settings.weekStart]);
  const common: ViewProps = {
    occurrences: data ?? [],
    categories,
    settings,
    cursor,
    loadingFirst: data === null && !error,
    onOpen: openOccurrence,
    onCreate: openNew,
    onPickDay: pickDay,
  };
  const failure = saveError ?? (error && error.code !== "locked" ? error.message : undefined);

  return (
    <div className="cal">
      <a className="skip" href="#main">
        {t.cal.skipLink}
      </a>
      <header className="cal__bar">
        <h1 className="cal__title">{titleFor(view, cursor, settings.weekStart)}</h1>
        <div className="cal__nav">
          <button type="button" className="icon-btn" aria-label={t.cal.previous} onClick={() => go(-1)}>
            <Icon name="chevronLeft" />
          </button>
          <button type="button" className="icon-btn" aria-label={t.cal.next} onClick={() => go(1)}>
            <Icon name="chevronRight" />
          </button>
          <button type="button" className="btn" onClick={() => setCursor(startOfToday())}>
            {t.cal.today}
          </button>
        </div>
        <div className="cal__actions">
          <div className="seg" role="group" aria-label={t.cal.viewLabel}>
            {VIEWS.map((v) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>
                {t.cal.views[v]}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn--primary cal__new" onClick={() => openNew(toIsoDate(cursor))}>
            <Icon name="plus" size={18} />
            <span>{t.cal.newEvent}</span>
          </button>
          <button type="button" className="icon-btn" aria-label={t.cal.settings} onClick={() => setSettingsOpen(true)}>
            <Icon name="sliders" />
          </button>
          <button type="button" className="icon-btn" aria-label={t.cal.lock} onClick={onLock}>
            <Icon name="lock" />
          </button>
        </div>
      </header>

      <main className="cal__main" id="main" tabIndex={-1}>
        {loading && data !== null && (
          <div className="cal__progress">
            <ProgressBar label={t.cal.loadingEvents} />
          </div>
        )}
        {failure && (
          <div className="cal__banner" role="alert">
            <span>{failure}</span>
            <button type="button" className="btn" onClick={reload}>
              {t.loading.retry}
            </button>
          </div>
        )}
        {view === "month" && <MonthView {...common} />}
        {view === "week" && <TimeGrid {...common} days={days} />}
        {view === "day" && <TimeGrid {...common} days={[cursor]} />}
        {view === "agenda" && <AgendaView {...common} />}
      </main>

      {editor && (
        <EventEditor
          key={editor.mode === "edit" ? `${editor.eventId}:${editor.occurrenceStart}` : `new:${editor.date}:${editor.hour ?? ""}`}
          target={editor}
          categories={categories}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            reload();
          }}
        />
      )}
      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          categories={categories}
          onSettings={changeSettings}
          onCategories={(next) => {
            setCategories(next);
            reload();
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}