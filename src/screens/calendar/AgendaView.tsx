import { useMemo, type CSSProperties } from "react";
import { KindIcon } from "../../components/KindIcon";
import { t } from "../../i18n/es";
import { eventColor } from "../../lib/colors";
import { addDays, fromIsoDate, groupByDay, toIsoDate } from "../../lib/dates";
import { clock, dayLong } from "../../lib/format";
import type { ViewProps } from "./types";

export const AGENDA_DAYS = 60;

export function AgendaView({ occurrences, categories, cursor, loadingFirst, onOpen, onCreate }: ViewProps) {
  const days = useMemo(() => Array.from({ length: AGENDA_DAYS }, (_, i) => toIsoDate(addDays(cursor, i))), [cursor]);
  const byDay = useMemo(() => groupByDay(occurrences, days), [occurrences, days]);
  const busy = days.filter((day) => (byDay.get(day)?.length ?? 0) > 0);

  if (busy.length === 0 && !loadingFirst) {
    return (
      <div className="agenda agenda--empty">
        <p>{t.cal.emptyAgenda}</p>
        <button type="button" className="btn btn--primary" onClick={() => onCreate(days[0])}>
          {t.cal.createFirst}
        </button>
      </div>
    );
  }

  return (
    <div className="agenda" aria-busy={loadingFirst}>
      {busy.map((day) => (
        <section key={day} className="agenda__day">
          <h2>{dayLong(fromIsoDate(day))}</h2>
          <ul>
            {(byDay.get(day) ?? []).map((o, i) => (
              <li key={`${o.eventId}:${o.start}:${i}`}>
                <button
                  type="button"
                  className="agenda__item"
                  style={{ "--c": eventColor(o, categories) } as CSSProperties}
                  onClick={() => onOpen(o)}
                >
                  <span className="agenda__time">{o.allDay ? t.cal.allDay : clock(o.start)}</span>
                  <span className="agenda__title">
                    <KindIcon kind={o.kind} />
                    {o.title || t.cal.untitled}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}