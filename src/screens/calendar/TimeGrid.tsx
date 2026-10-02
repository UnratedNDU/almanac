import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { t } from "../../i18n/es";
import { eventColor } from "../../lib/colors";
import { groupByDay, toIsoDate } from "../../lib/dates";
import { clock, hourLabel, minutesOfDay } from "../../lib/format";
import { layoutOverlaps } from "../../lib/layout";
import type { OccurrenceView } from "../../types";
import { EventPill } from "./EventPill";
import type { ViewProps } from "./types";

const HOURS = 24;
const MIN_BLOCK_MINUTES = 30;

/** Visible minutes of a timed occurrence on one day (it may start earlier or end later). */
function minutesOnDay(o: OccurrenceView, iso: string): { start: number; end: number } {
  const start = o.start.slice(0, 10) === iso ? minutesOfDay(o.start) : 0;
  const end = o.end ? (o.end.slice(0, 10) === iso ? minutesOfDay(o.end) : HOURS * 60) : start + MIN_BLOCK_MINUTES;
  return { start, end: Math.max(end, start + MIN_BLOCK_MINUTES) };
}

function blocksFor(list: OccurrenceView[], iso: string) {
  const items = list
    .filter((o) => !o.allDay)
    .map((o) => {
      const { start, end } = minutesOnDay(o, iso);
      return { id: `${o.eventId}:${o.start}`, occurrence: o, startMin: start, endMin: end };
    });
  const byId = new Map(items.map((item) => [item.id, item]));
  return layoutOverlaps(items).map((placed) => ({ ...placed, item: byId.get(placed.id)! }));
}

/** Week and day views: all-day events on top, timed events on an hour grid. */
export function TimeGrid({ days, occurrences, categories, onOpen, onCreate, onPickDay }: ViewProps & { days: Date[] }) {
  const isos = useMemo(() => days.map(toIsoDate), [days]);
  const byDay = useMemo(() => groupByDay(occurrences, isos), [occurrences, isos]);
  const [now, setNow] = useState(() => new Date());
  const scroller = useRef<HTMLDivElement>(null);
  const todayIso = toIsoDate(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const weekday = useMemo(() => new Intl.DateTimeFormat("es", { weekday: "short" }), []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Open near the start of the working day instead of at midnight.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = (el.scrollHeight * 6.5) / HOURS;
  }, [isos[0]]);

  return (
    <div className="tg" style={{ "--cols": days.length } as CSSProperties}>
      <div className="tg__scroll" ref={scroller}>
        <div className="tg__inner">
          <div className="tg__sticky">
            <div className="tg__row">
              <div />
              {days.map((day, i) => (
                <button
                  key={isos[i]}
                  type="button"
                  className={isos[i] === todayIso ? "tg__dayhead tg__dayhead--today" : "tg__dayhead"}
                  onClick={() => onPickDay(day)}
                >
                  <span className="tg__wd">{weekday.format(day)}</span>
                  <span className="tg__dn">{day.getDate()}</span>
                </button>
              ))}
            </div>
            <div className="tg__row tg__row--allday">
              <div className="tg__gutter-label">{t.cal.allDay}</div>
              {isos.map((iso) => (
                <ul key={iso} className="tg__allday">
                  {(byDay.get(iso) ?? [])
                    .filter((o) => o.allDay)
                    .map((o, i) => (
                      <li key={`${o.eventId}:${o.start}:${i}`}>
                        <EventPill occurrence={o} color={eventColor(o, categories)} onOpen={onOpen} />
                      </li>
                    ))}
                </ul>
              ))}
            </div>
          </div>

          <div className="tg__body">
            <div className="tg__hours" aria-hidden="true">
              {Array.from({ length: HOURS }, (_, h) => (
                <div key={h} className="tg__hour">
                  {h > 0 && <span>{hourLabel(h)}</span>}
                </div>
              ))}
            </div>
            {isos.map((iso) => (
              <div
                key={iso}
                className="tg__col"
                onClick={(event) => {
                  if (event.target !== event.currentTarget) return;
                  const box = event.currentTarget.getBoundingClientRect();
                  onCreate(iso, Math.floor(((event.clientY - box.top) / box.height) * HOURS));
                }}
              >
                {blocksFor(byDay.get(iso) ?? [], iso).map(({ id, col, cols, item }) => {
                  const o = item.occurrence;
                  const title = o.title || t.cal.untitled;
                  return (
                    <button
                      key={id}
                      type="button"
                      className={item.endMin - item.startMin <= MIN_BLOCK_MINUTES ? "block block--short" : "block"}
                      title={`${clock(o.start)} – ${title}`}
                      style={
                        {
                          "--c": eventColor(o, categories),
                          top: `calc(var(--hour) * ${item.startMin / 60})`,
                          height: `calc(var(--hour) * ${(item.endMin - item.startMin) / 60})`,
                          left: `calc(${(col / cols) * 100}% + 2px)`,
                          width: `calc(${100 / cols}% - 4px)`,
                        } as CSSProperties
                      }
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpen(o);
                      }}
                    >
                      <span className="block__time">{clock(o.start)}</span>
                      <span className="block__title">{title}</span>
                    </button>
                  );
                })}
                {iso === todayIso && (
                  <div className="tg__now" aria-hidden="true" style={{ top: `calc(var(--hour) * ${nowMinutes / 60})` }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}