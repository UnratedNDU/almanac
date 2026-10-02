import { useMemo } from "react";
import { MoonGlyph } from "../../components/MoonGlyph";
import { Skeleton } from "../../components/Skeleton";
import { t } from "../../i18n/es";
import { eventColor } from "../../lib/colors";
import { groupByDay, monthGrid, toIsoDate } from "../../lib/dates";
import { dayLong, monthYear, weekdayLabels } from "../../lib/format";
import { principalPhase } from "../../lib/moon";
import { useMediaQuery } from "../../lib/useMediaQuery";
import { EventPill } from "./EventPill";
import type { ViewProps } from "./types";

export function MonthView({ occurrences, categories, settings, cursor, loadingFirst, onOpen, onCreate, onPickDay }: ViewProps) {
  const narrow = useMediaQuery("(max-width: 640px)");
  const grid = useMemo(() => monthGrid(cursor.getFullYear(), cursor.getMonth(), settings.weekStart), [cursor, settings.weekStart]);
  const days = useMemo(() => grid.map(toIsoDate), [grid]);
  const byDay = useMemo(() => groupByDay(occurrences, days), [occurrences, days]);
  const todayIso = toIsoDate(new Date());
  const maxPills = settings.density === "compact" ? 4 : 3;
  const weeks = Array.from({ length: 6 }, (_, w) => grid.slice(w * 7, w * 7 + 7));

  return (
    <div className="month" role="grid" aria-label={monthYear(cursor)} aria-busy={loadingFirst}>
      <div className="month__head" role="row">
        {weekdayLabels(settings.weekStart, narrow ? "narrow" : "short").map((label, i) => (
          <div key={i} role="columnheader">
            {label}
          </div>
        ))}
      </div>
      <div className="month__body">
        {weeks.map((week, w) => (
          <div key={w} className="month__week" role="row">
            {week.map((date) => {
              const iso = toIsoDate(date);
              const items = byDay.get(iso) ?? [];
              const outside = date.getMonth() !== cursor.getMonth();
              const moon = settings.showMoon ? principalPhase(date) : null;
              const hidden = Math.max(0, items.length - maxPills);
              const classes = ["day", outside && "day--outside", iso === todayIso && "day--today"].filter(Boolean).join(" ");
              return (
                <div key={iso} role="gridcell" className={classes}>
                  <div className="day__top">
                    <button
                      type="button"
                      className="day__num"
                      aria-label={dayLong(date)}
                      aria-current={iso === todayIso ? "date" : undefined}
                      onClick={() => onPickDay(date)}
                    >
                      {date.getDate()}
                    </button>
                    {moon && <MoonGlyph phase={moon} />}
                    <button
                      type="button"
                      className="day__add"
                      aria-label={`${t.cal.newOn} ${dayLong(date)}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onCreate(iso);
                      }}
                    >
                      +
                    </button>
                  </div>
                  {loadingFirst && !outside ? (
                    <div className="day__events">
                      <Skeleton height="1.1rem" />
                      <Skeleton height="1.1rem" width="70%" />
                    </div>
                  ) : (
                    <>
                      <ul className="day__events">
                        {items.slice(0, maxPills).map((o, i) => (
                          <li key={`${o.eventId}:${o.start}:${i}`}>
                            <EventPill occurrence={o} color={eventColor(o, categories)} onOpen={onOpen} />
                          </li>
                        ))}
                      </ul>
                      {hidden > 0 && (
                        <button
                          type="button"
                          className="day__more"
                          onClick={(event) => {
                            event.stopPropagation();
                            onPickDay(date);
                          }}
                        >
                          {t.cal.more(hidden)}
                        </button>
                      )}
                      <div className="day__dots" aria-hidden="true">
                        {items.slice(0, 4).map((o, i) => (
                          <span key={i} className="dot" style={{ background: eventColor(o, categories) }} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}