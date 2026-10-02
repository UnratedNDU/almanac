import { useMemo } from "react";
import { Notes } from "../components/Notes";
import { Sheet } from "../components/Sheet";
import changelogText from "../../CHANGELOG.md?raw";
import { t } from "../i18n/es";
import { APP_VERSION } from "../lib/appVersion";
import { entriesSince, parseChangelog } from "../lib/changelog";
import { fromIsoDate } from "../lib/dates";
import { dateMedium } from "../lib/format";
import { openExternal } from "../lib/openExternal";

const CHANGELOG = parseChangelog(changelogText);

interface WhatsNewProps {
  /** The version the user had before updating; every version is listed when null. */
  since: string | null;
  onClose: () => void;
}

/** The change log bundled with the app: it opens by itself after an update and from Settings. */
export function WhatsNewSheet({ since, onClose }: WhatsNewProps) {
  const entries = useMemo(() => entriesSince(CHANGELOG, since), [since]);
  return (
    <Sheet
      title={t.updates.newsTitle}
      onClose={onClose}
      footer={
        <div className="sheet__right">
          <button type="button" className="btn btn--primary" onClick={onClose}>
            {t.updates.close}
          </button>
        </div>
      }
    >
      {since !== null && <p>{t.updates.updatedTo(APP_VERSION)}</p>}
      {entries.map((entry) => (
        <article key={entry.version} className="release">
          <header className="release__head">
            <h3>{entry.version}</h3>
            {entry.version === APP_VERSION && <span className="badge">{t.updates.installed}</span>}
            {entry.date && <time dateTime={entry.date}>{dateMedium(fromIsoDate(entry.date))}</time>}
          </header>
          <Notes markdown={entry.body} />
        </article>
      ))}
    </Sheet>
  );
}

interface UpdateSheetProps {
  version: string;
  notes: string;
  url: string;
  onLater: () => void;
  onClose: () => void;
}

/** A newer release is out: its notes, and a button that opens the download page in the browser. */
export function UpdateSheet({ version, notes, url, onLater, onClose }: UpdateSheetProps) {
  return (
    <Sheet
      title={t.updates.sheetTitle(version)}
      onClose={onClose}
      footer={
        <>
          <p className="field__hint">{t.updates.downloadHint}</p>
          <div className="sheet__right">
            <button type="button" className="btn" onClick={onLater}>
              {t.updates.later}
            </button>
            <button type="button" className="btn btn--primary" onClick={() => void openExternal(url)}>
              {t.updates.download}
            </button>
          </div>
        </>
      }
    >
      {notes.trim() ? <Notes markdown={notes} /> : <p className="field__hint">{t.updates.noNotes}</p>}
    </Sheet>
  );
}
