import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { api, asApiError } from "../../api";
import { ProgressBar } from "../../components/ProgressBar";
import { Sheet } from "../../components/Sheet";
import { Skeleton } from "../../components/Skeleton";
import { TextField } from "../../components/TextField";
import { errorMessage, t } from "../../i18n/es";
import { EVENT_COLORS } from "../../lib/colors";
import { draftFromForm, formForNew, formFromEvent, type EventForm } from "../../lib/eventForm";
import { defaultsForKind } from "../../lib/recurrenceForm";
import { useLoader } from "../../lib/useLoader";
import { useStalled } from "../../lib/useStalled";
import type { CalendarEvent, Category, EventKind } from "../../types";
import { RecurrenceFields } from "./RecurrenceFields";

export type EditorTarget =
  | { mode: "new"; date: string; hour?: number }
  | { mode: "edit"; eventId: string; occurrenceStart: string };

interface EventEditorProps {
  target: EditorTarget;
  categories: Category[];
  onClose: () => void;
  /** Called after any change that the views must reload. */
  onSaved: () => void;
}

const KINDS: EventKind[] = ["event", "birthday", "anniversary", "special"];

function Labeled({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      <span className="field__error" aria-live="polite">
        {error}
      </span>
    </label>
  );
}

export function EventEditor({ target, categories, onClose, onSaved }: EventEditorProps) {
  const isNew = target.mode === "new";
  const loader = useLoader<CalendarEvent | null>(
    () => (target.mode === "edit" ? api.getEvent(target.eventId) : Promise.resolve(null)),
    [target],
  );
  const base = loader.state.status === "ready" ? loader.state.data : null;
  const [form, setForm] = useState<EventForm | null>(target.mode === "new" ? formForNew(target.date, target.hour) : null);
  const [errors, setErrors] = useState<{ title?: string; start?: string; end?: string }>({});
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState<"saving" | "removing" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const stalled = useStalled(busy !== null);
  const [discarding, setDiscarding] = useState(false);
  const initial = useRef<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loader.state.status === "ready" && loader.state.data) setForm(formFromEvent(loader.state.data));
  }, [loader.state]);

  // Focus the title on desktop once the form is there; on touch screens it would pop the keyboard up unasked.
  const hasForm = form !== null;
  useEffect(() => {
    if (hasForm && window.matchMedia("(pointer: fine)").matches) titleRef.current?.focus();
  }, [hasForm]);

  const update = (changes: Partial<EventForm>) => setForm((current) => (current ? { ...current, ...changes } : current));

  // Remember the form as first shown, to know whether closing would lose edits.
  useEffect(() => {
    if (form && initial.current === null) initial.current = JSON.stringify(form);
  }, [form]);
  const dirty = form !== null && initial.current !== null && JSON.stringify(form) !== initial.current;

  function requestClose() {
    if (dirty && busy === null) setDiscarding(true);
    else onClose();
  }

  function pickKind(kind: EventKind) {
    const defaults = defaultsForKind(kind);
    setForm((current) =>
      current
        ? {
            ...current,
            kind,
            allDay: defaults.allDay ?? current.allDay,
            recurrence:
              defaults.freq !== undefined ? { ...current.recurrence, freq: defaults.freq, unsupported: false } : current.recurrence,
          }
        : current,
    );
  }

  async function run(kind: "saving" | "removing", action: () => Promise<unknown>) {
    setFormError(undefined);
    setBusy(kind);
    try {
      await action();
      onSaved();
    } catch (caught) {
      setFormError(errorMessage(asApiError(caught)));
      setBusy(null);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form || busy) return;
    const result = draftFromForm(form, base ?? undefined);
    if (!result.ok) {
      setErrors({
        title: result.errors.title && t.editor.errors.titleRequired,
        start: result.errors.start && t.editor.errors.startRequired,
        end: result.errors.end && t.editor.errors.endBeforeStart,
      });
      if (result.errors.title) titleRef.current?.focus();
      return;
    }
    setErrors({});
    void run("saving", () => api.saveEvent(result.draft));
  }

  const eventId = target.mode === "edit" ? target.eventId : null;
  const recurring = Boolean(base?.rrule);

  const footer = (
    <>
      {!isNew &&
        (confirming ? (
          <div className="sheet__confirm" role="group" aria-label={t.editor.removeConfirm}>
            <span>{t.editor.removeConfirm}</span>
            <button type="button" className="btn btn--danger" disabled={busy !== null} onClick={() => eventId && void run("removing", () => api.deleteEvent(eventId))}>
              {busy === "removing" ? t.editor.removing : t.editor.removeYes}
            </button>
            <button type="button" className="btn" disabled={busy !== null} onClick={() => setConfirming(false)}>
              {t.editor.removeNo}
            </button>
          </div>
        ) : (
          <div className="sheet__left">
            <button type="button" className="btn btn--danger-ghost" disabled={busy !== null || !form} onClick={() => setConfirming(true)}>
              {t.editor.remove}
            </button>
            {recurring && target.mode === "edit" && (
              <button
                type="button"
                className="btn"
                disabled={busy !== null}
                onClick={() => void run("saving", () => api.skipOccurrence(target.eventId, target.occurrenceStart))}
              >
                {t.editor.skip}
              </button>
            )}
          </div>
        ))}
      <div className="sheet__right">
        <button type="button" className="btn" onClick={requestClose}>
          {t.editor.cancel}
        </button>
        <button type="submit" className="btn btn--primary" disabled={busy !== null || !form}>
          {busy === "saving" ? t.editor.saving : t.editor.save}
        </button>
      </div>
    </>
  );

  const discardFooter = (
    <div className="sheet__confirm" role="group" aria-label={t.editor.discard}>
      <span>{t.editor.discard}</span>
      <button type="button" className="btn btn--danger" onClick={onClose}>
        {t.editor.discardYes}
      </button>
      <button type="button" className="btn" onClick={() => setDiscarding(false)}>
        {t.editor.discardNo}
      </button>
    </div>
  );
  return (
    <Sheet title={isNew ? t.editor.newTitle : t.editor.editTitle} onClose={onClose} onRequestClose={requestClose} onSubmit={submit} footer={discarding ? discardFooter : footer}>
      {!form ? (
        loader.state.status === "error" ? (
          <div className="stack">
            <p className="auth__error">{errorMessage(asApiError(loader.state.error))}</p>
            <button type="button" className="btn" onClick={loader.retry}>
              {t.loading.retry}
            </button>
          </div>
        ) : (
          <div className="stack" aria-busy="true">
            <p className="sr-only" role="status">
              {t.editor.loading}
            </p>
            <Skeleton height="2.75rem" />
            <Skeleton height="2.75rem" />
            <Skeleton height="2.75rem" width="60%" />
          </div>
        )
      ) : (
        <>
          <TextField
            label={t.editor.title}
            name="title"
            autoComplete="off"
            placeholder={t.editor.titlePlaceholder}
            value={form.title}
            onChange={(title) => update({ title })}
            error={errors.title}
            disabled={busy !== null}
            inputRef={titleRef}
          />

          <fieldset className="seg seg--wide">
            <legend className="sr-only">{t.editor.kind}</legend>
            {KINDS.map((kind) => (
              <label key={kind} className="seg__opt">
                <input type="radio" name="kind" value={kind} checked={form.kind === kind} disabled={busy !== null} onChange={() => pickKind(kind)} />
                <span>{t.kinds[kind]}</span>
              </label>
            ))}
          </fieldset>

          <label className="check">
            <input type="checkbox" checked={form.allDay} disabled={busy !== null} onChange={(event) => update({ allDay: event.target.checked })} />
            <span>{t.editor.allDay}</span>
          </label>

          <fieldset className="when">
            <legend className="field__label">{t.editor.startLabel}</legend>
            <div className="row2">
              <Labeled label={t.editor.date} error={errors.start}>
                <input className="field__input" type="date" name="start-date" autoComplete="off" value={form.startDate} disabled={busy !== null} onChange={(e) => update({ startDate: e.target.value })} />
              </Labeled>
              {!form.allDay && (
                <Labeled label={t.editor.time}>
                  <input className="field__input" type="time" name="start-time" autoComplete="off" value={form.startTime} disabled={busy !== null} onChange={(e) => update({ startTime: e.target.value })} />
                </Labeled>
              )}
            </div>
          </fieldset>

          <fieldset className="when">
            <legend className="field__label">{t.editor.endLabel}</legend>
            <div className="row2">
              <Labeled label={t.editor.date} error={errors.end}>
                <input className="field__input" type="date" name="end-date" autoComplete="off" value={form.endDate} min={form.startDate} disabled={busy !== null} onChange={(e) => update({ endDate: e.target.value })} />
              </Labeled>
              {!form.allDay && (
                <Labeled label={t.editor.time}>
                  <input className="field__input" type="time" name="end-time" autoComplete="off" value={form.endTime} disabled={busy !== null} onChange={(e) => update({ endTime: e.target.value })} />
                </Labeled>
              )}
            </div>
          </fieldset>

          <RecurrenceFields value={form.recurrence} onChange={(recurrence) => update({ recurrence })} startDate={form.startDate} disabled={busy !== null} />
          {recurring && <p className="field__hint">{t.editor.seriesNote}</p>}

          <fieldset className="swatches">
            <legend className="field__label">{t.editor.color}</legend>
            <label className="swatch">
              <input type="radio" name="color" value="" checked={form.color === ""} onChange={() => update({ color: "" })} />
              <span className="swatch__dot swatch__dot--auto" />
              <span className="sr-only">{t.editor.colorAuto}</span>
            </label>
            {EVENT_COLORS.map((color) => (
              <label key={color} className="swatch" style={{ "--c": color } as CSSProperties}>
                <input type="radio" name="color" value={color} checked={form.color === color} onChange={() => update({ color })} />
                <span className="swatch__dot" />
                <span className="sr-only">{t.colors[color]}</span>
              </label>
            ))}
          </fieldset>

          {categories.length > 0 && (
            <Labeled label={t.editor.category}>
              <select className="field__input" name="category" value={form.categoryId} disabled={busy !== null} onChange={(e) => update({ categoryId: e.target.value })}>
                <option value="">{t.editor.noCategory}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Labeled>
          )}

          <Labeled label={t.editor.notes}>
            <textarea className="field__input field__input--area" name="notes" rows={4} value={form.notes} disabled={busy !== null} onChange={(e) => update({ notes: e.target.value })} />
          </Labeled>

          <p className="auth__error" aria-live="polite">
            {formError}
          </p>
          {busy !== null && (
            <div className="auth__progress">
              <ProgressBar label={busy === "saving" ? t.editor.saving : t.editor.removing} />
              {stalled && <p aria-live="polite">{t.loading.slow}</p>}
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}