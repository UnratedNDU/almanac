import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "../../components/Icon";
import { t } from "../../i18n/es";
import { addMonths } from "../../lib/dates";
import { monthLabels } from "../../lib/format";

const MONTHS = monthLabels();

interface MonthPickerProps {
  /** What the current view is called, for example "Octubre de 2026". */
  title: string;
  cursor: Date;
  onPick: (date: Date) => void;
}

/** The view title as a button that opens a year and month grid, to jump far without paging month by month. */
export function MonthPicker({ title, cursor, onPick }: MonthPickerProps) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [year, setYear] = useState(cursor.getFullYear());

  // The native popover handles light dismiss, Escape and focus return; the grid only has to start on the cursor's year,
  // with the keyboard on the current month.
  useEffect(() => {
    const element = panel.current;
    const onToggle = (event: Event) => {
      if ((event as ToggleEvent).newState !== "open") return;
      setYear(cursor.getFullYear());
      element?.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus();
    };
    element?.addEventListener("toggle", onToggle);
    return () => element?.removeEventListener("toggle", onToggle);
  }, [cursor]);

  function pick(month: number) {
    onPick(addMonths(cursor, (year - cursor.getFullYear()) * 12 + (month - cursor.getMonth())));
    panel.current?.hidePopover();
  }

  const today = new Date();
  return (
    <div className="cal__title">
      <h1>
        <button type="button" className="cal__titlebtn" popoverTarget={id} aria-label={`${title}. ${t.cal.pickMonth}`}>
          <span>{title}</span>
          <Icon name="chevronDown" size={18} />
        </button>
      </h1>
      <div
        ref={panel}
        id={id}
        popover="auto"
        className="monthpick"
        role="dialog"
        aria-label={t.cal.pickMonth}
        // The calendar's single-key shortcuts (arrows, T, M...) must not act while the picker has the keyboard.
        onKeyDown={(event) => event.stopPropagation()}
      >
        <div className="monthpick__year">
          <button type="button" className="icon-btn" aria-label={t.cal.previousYear} onClick={() => setYear((y) => y - 1)}>
            <Icon name="chevronLeft" />
          </button>
          <span className="monthpick__yearnum" aria-live="polite">
            {year}
          </span>
          <button type="button" className="icon-btn" aria-label={t.cal.nextYear} onClick={() => setYear((y) => y + 1)}>
            <Icon name="chevronRight" />
          </button>
        </div>
        <div className="monthpick__grid">
          {MONTHS.map((label, month) => (
            <button
              key={month}
              type="button"
              className="monthpick__month"
              aria-pressed={year === cursor.getFullYear() && month === cursor.getMonth()}
              aria-current={year === today.getFullYear() && month === today.getMonth() ? "date" : undefined}
              onClick={() => pick(month)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
