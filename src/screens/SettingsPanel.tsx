import { useState, type CSSProperties } from "react";
import { api, asApiError } from "../api";
import { Sheet } from "../components/Sheet";
import { TextField } from "../components/TextField";
import { errorMessage, t } from "../i18n/es";
import { EVENT_COLORS } from "../lib/colors";
import { FONT_SCALE_RANGE, resolveTheme } from "../theme/applyTheme";
import { PRESETS, PRESET_IDS, type PresetId } from "../theme/presets";
import type { Category, Density, Settings, ThemeId } from "../types";

interface SettingsPanelProps {
  settings: Settings;
  categories: Category[];
  onSettings: (next: Settings) => void;
  onCategories: (next: Category[]) => void;
  onClose: () => void;
}

const THEME_IDS: ThemeId[] = ["system", ...PRESET_IDS];
const LOCK_OPTIONS = [0, 1, 5, 15, 30, 60];
const WEEK_STARTS = [1, 0, 6];
const DENSITIES: Density[] = ["comfortable", "compact"];

function themeLabel(id: ThemeId) {
  return id === "system" ? t.settings.themeSystem : PRESETS[id].label;
}

/** A tiny sample of a theme: its background, a surface and its accent. */
function ThemeSample({ id }: { id: PresetId }) {
  const { bg, surface, accent } = PRESETS[id].tokens;
  return (
    <span className="mini" style={{ "--p-bg": bg, "--p-surface": surface, "--p-accent": accent } as CSSProperties}>
      <i className="p-surface" />
      <i className="p-accent" />
    </span>
  );
}
export function SettingsPanel({ settings, categories, onSettings, onCategories, onClose }: SettingsPanelProps) {
  const [error, setError] = useState<string>();
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(EVENT_COLORS[0]);
  const set = (changes: Partial<Settings>) => onSettings({ ...settings, ...changes });
  const themeAccent = PRESETS[resolveTheme(settings.theme, window.matchMedia("(prefers-color-scheme: dark)").matches)].tokens.accent;

  async function changeCategories(action: () => Promise<unknown>) {
    try {
      await action();
      onCategories(await api.listCategories());
      setError(undefined);
    } catch (caught) {
      setError(errorMessage(asApiError(caught)));
    }
  }

  async function addCategory() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await changeCategories(() => api.saveCategory({ name: trimmed, color }));
    setName("");
  }

  return (
    <Sheet title={t.settings.title} onClose={onClose}>
      <section className="set-section">
        <h3>{t.settings.appearance}</h3>

        <fieldset className="themes">
          <legend className="field__label">{t.settings.theme}</legend>
          {THEME_IDS.map((id) => (
            <label key={id} className="theme-card">
              <input type="radio" name="theme" value={id} checked={settings.theme === id} onChange={() => set({ theme: id })} />
              <span className="theme-card__preview">
                {id === "system" ? (
                  <>
                    <ThemeSample id="light" />
                    <ThemeSample id="dark" />
                  </>
                ) : (
                  <ThemeSample id={id} />
                )}
              </span>
              <span>{themeLabel(id)}</span>
            </label>
          ))}
        </fieldset>

        <fieldset className="swatches">
          <legend className="field__label">{t.settings.accent}</legend>
          <label className="swatch" style={{ "--c": themeAccent } as CSSProperties}>
            <input type="radio" name="accent" value="" checked={settings.accent === ""} onChange={() => set({ accent: "" })} />
            <span className="swatch__dot swatch__dot--auto" />
            <span className="sr-only">{t.settings.accentTheme}</span>
          </label>
          {EVENT_COLORS.map((hex) => (
            <label key={hex} className="swatch" style={{ "--c": hex } as CSSProperties}>
              <input type="radio" name="accent" value={hex} checked={settings.accent === hex} onChange={() => set({ accent: hex })} />
              <span className="swatch__dot" />
              <span className="sr-only">{t.colors[hex]}</span>
            </label>
          ))}
          <label className="swatch swatch--picker">
            <input
              type="color"
              aria-label={t.settings.accentCustom}
              value={settings.accent || themeAccent}
              onChange={(event) => set({ accent: event.target.value })}
            />
          </label>
        </fieldset>

        <fieldset className="seg">
          <legend className="sr-only">{t.settings.density}</legend>
          {DENSITIES.map((density) => (
            <label key={density} className="seg__opt">
              <input type="radio" name="density" value={density} checked={settings.density === density} onChange={() => set({ density })} />
              <span>{t.settings.densities[density]}</span>
            </label>
          ))}
        </fieldset>

        <div className="field">
          <label htmlFor="font-scale" className="field__label">
            {t.settings.fontSize} <output>{Math.round(settings.fontScale * 100)}&nbsp;%</output>
          </label>
          <input
            id="font-scale"
            className="range"
            type="range"
            min={FONT_SCALE_RANGE.min}
            max={FONT_SCALE_RANGE.max}
            step={0.05}
            value={settings.fontScale}
            onChange={(event) => set({ fontScale: Number(event.target.value) })}
          />
        </div>
      </section>

      <section className="set-section">
        <h3>{t.settings.calendar}</h3>
        <div className="field">
          <label htmlFor="week-start" className="field__label">
            {t.settings.weekStart}
          </label>
          <select id="week-start" className="field__input" value={settings.weekStart} onChange={(event) => set({ weekStart: Number(event.target.value) })}>
            {WEEK_STARTS.map((day) => (
              <option key={day} value={day}>
                {t.settings.weekStarts[day]}
              </option>
            ))}
          </select>
        </div>
        <label className="check">
          <input type="checkbox" checked={settings.showMoon} onChange={(event) => set({ showMoon: event.target.checked })} />
          <span>{t.settings.moon}</span>
        </label>
      </section>

      <section className="set-section">
        <h3>{t.settings.privacy}</h3>
        <div className="field">
          <label htmlFor="auto-lock" className="field__label">
            {t.settings.autoLock}
          </label>
          <select id="auto-lock" className="field__input" value={settings.autoLockMinutes} onChange={(event) => set({ autoLockMinutes: Number(event.target.value) })}>
            {LOCK_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes === 0 ? t.settings.never : t.settings.minutes(minutes)}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="set-section">
        <h3>{t.settings.categories}</h3>
        {categories.length === 0 ? (
          <p className="field__hint">{t.settings.noCategories}</p>
        ) : (
          <ul className="cat-list">
            {categories.map((category) => (
              <li key={category.id} className="cat">
                <span className="cat__dot" style={{ background: category.color }} aria-hidden="true" />
                <span className="cat__name">{category.name}</span>
                <button
                  type="button"
                  className="btn btn--danger-ghost"
                  aria-label={`${t.settings.removeCategory}: ${category.name}`}
                  onClick={() => void changeCategories(() => api.deleteCategory(category.id))}
                >
                  {t.editor.remove}
                </button>
              </li>
            ))}
          </ul>
        )}
        <TextField label={t.settings.categoryName} name="category-name" autoComplete="off" value={name} onChange={setName} />
        <fieldset className="swatches">
          <legend className="sr-only">{t.editor.color}</legend>
          {EVENT_COLORS.map((hex) => (
            <label key={hex} className="swatch" style={{ "--c": hex } as CSSProperties}>
              <input type="radio" name="category-color" value={hex} checked={color === hex} onChange={() => setColor(hex)} />
              <span className="swatch__dot" />
              <span className="sr-only">{t.colors[hex]}</span>
            </label>
          ))}
        </fieldset>
        <div>
          <button type="button" className="btn" disabled={!name.trim()} onClick={() => void addCategory()}>
            {t.settings.addCategory}
          </button>
        </div>
        <p className="auth__error" aria-live="polite">
          {error}
        </p>
      </section>

      <section className="set-section set-section--last">
        <h3>{t.settings.shortcuts}</h3>
        <dl className="shortcuts">
          {t.settings.shortcutList.map(([keys, action]) => (
            <div key={keys}>
              <dt>
                <kbd>{keys}</kbd>
              </dt>
              <dd>{action}</dd>
            </div>
          ))}
        </dl>
      </section>
    </Sheet>
  );
}