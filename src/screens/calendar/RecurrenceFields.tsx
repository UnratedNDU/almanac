import { useId } from "react";
import { t } from "../../i18n/es";
import { fromIsoDate } from "../../lib/dates";
import { weekdayLabels } from "../../lib/format";
import { WEEKDAYS, type Freq, type RecurrenceForm } from "../../lib/recurrenceForm";

interface RecurrenceFieldsProps {
  value: RecurrenceForm;
  onChange: (next: RecurrenceForm) => void;
  startDate: string;
  disabled?: boolean;
}

const FREQS: Freq[] = ["NONE", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"];
// Monday first, the same order as WEEKDAYS.
const LONG = weekdayLabels(1, "long");
const NARROW = weekdayLabels(1, "narrow");

type EndKind = "never" | "until" | "count";

export function RecurrenceFields({ value, onChange, startDate, disabled }: RecurrenceFieldsProps) {
  const id = useId();
  const patch = (changes: Partial<RecurrenceForm>) => onChange({ ...value, ...changes });
  const endKind: EndKind = value.until ? "until" : value.count ? "count" : "never";

  function setFreq(freq: Freq) {
    const startDay = WEEKDAYS[(fromIsoDate(startDate || "2000-01-03").getDay() + 6) % 7];
    patch({ freq, unsupported: false, byDay: freq === "WEEKLY" && value.byDay.length === 0 ? [startDay] : value.byDay });
  }

  function setEnd(kind: EndKind) {
    if (kind === "never") patch({ until: undefined, count: undefined });
    else if (kind === "until") patch({ until: value.until ?? startDate, count: undefined });
    else patch({ count: value.count ?? 10, until: undefined });
  }

  function toggleDay(code: string) {
    patch({ byDay: value.byDay.includes(code) ? value.byDay.filter((d) => d !== code) : [...value.byDay, code] });
  }

  const repeating = value.freq !== "NONE";
  return (
    <div className="recurrence">
      <div className="field">
        <label htmlFor={`${id}-freq`} className="field__label">
          {t.editor.repeat}
        </label>
        <select
          id={`${id}-freq`}
          className="field__input"
          value={value.freq}
          disabled={disabled}
          onChange={(event) => setFreq(event.target.value as Freq)}
        >
          {FREQS.map((freq) => (
            <option key={freq} value={freq}>
              {t.editor.repeats[freq]}
            </option>
          ))}
        </select>
        {value.unsupported && <p className="field__hint">{t.editor.customRule}</p>}
      </div>

      {repeating && (
        <>
          <div className="row2 row2--inline">
            <label htmlFor={`${id}-interval`} className="field__label">
              {t.editor.every}
            </label>
            <div className="inline">
              <input
                id={`${id}-interval`}
                className="field__input field__input--short"
                type="number"
                min={1}
                max={99}
                name="interval"
                autoComplete="off"
                inputMode="numeric"
                value={value.interval}
                disabled={disabled}
                onChange={(event) => patch({ interval: Math.max(1, Number(event.target.value) || 1) })}
              />
              <span>{t.editor.units[value.freq as Exclude<Freq, "NONE">][value.interval === 1 ? 0 : 1]}</span>
            </div>
          </div>

          {value.freq === "WEEKLY" && (
            <fieldset className="weekdays">
              <legend className="field__label">{t.editor.onDays}</legend>
              {WEEKDAYS.map((code, i) => (
                <button
                  key={code}
                  type="button"
                  className="weekday"
                  aria-pressed={value.byDay.includes(code)}
                  aria-label={LONG[i]}
                  disabled={disabled}
                  onClick={() => toggleDay(code)}
                >
                  {NARROW[i]}
                </button>
              ))}
            </fieldset>
          )}

          <div className="row2 row2--inline">
            <label htmlFor={`${id}-end`} className="field__label">
              {t.editor.recurrenceEnd}
            </label>
            <div className="inline">
              <select
                id={`${id}-end`}
                className="field__input"
                value={endKind}
                disabled={disabled}
                onChange={(event) => setEnd(event.target.value as EndKind)}
              >
                {(Object.keys(t.editor.recurrenceEnds) as EndKind[]).map((kind) => (
                  <option key={kind} value={kind}>
                    {t.editor.recurrenceEnds[kind]}
                  </option>
                ))}
              </select>
              {endKind === "until" && (
                <input
                  className="field__input"
                  type="date"
                  name="until"
                  autoComplete="off"
                  aria-label={t.editor.recurrenceEnds.until}
                  value={value.until ?? ""}
                  min={startDate}
                  disabled={disabled}
                  onChange={(event) => patch({ until: event.target.value || undefined })}
                />
              )}
              {endKind === "count" && (
                <>
                  <input
                    className="field__input field__input--short"
                    type="number"
                    min={1}
                    max={999}
                    name="count"
                    autoComplete="off"
                    inputMode="numeric"
                    aria-label={t.editor.recurrenceEnds.count}
                    value={value.count ?? 1}
                    disabled={disabled}
                    onChange={(event) => patch({ count: Math.max(1, Number(event.target.value) || 1) })}
                  />
                  <span>{t.editor.times}</span>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}