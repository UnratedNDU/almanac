import { isNewer, parseVersion } from "./version";

export interface ChangelogEntry {
  version: string;
  /** `YYYY-MM-DD`, when the heading has one. */
  date: string | null;
  /** The Markdown under the version heading. */
  body: string;
}

const HEADING = /^## \[([^\]]+)\](?: - (\d{4}-\d{2}-\d{2}))?\s*$/;

/** The released versions of a Keep a Changelog file, in file order (newest first). Unreleased and empty sections are skipped. */
export function parseChangelog(text: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  let current: { version: string; date: string | null; lines: string[] } | null = null;
  const close = () => {
    const body = current?.lines.join("\n").trim();
    if (current && body) entries.push({ version: current.version, date: current.date, body });
  };
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("## ")) {
      close();
      const match = HEADING.exec(line);
      current = match && parseVersion(match[1]) ? { version: match[1], date: match[2] ?? null, lines: [] } : null;
    } else current?.lines.push(line);
  }
  close();
  return entries;
}

/** The entries newer than `previous`; every entry when there is none. */
export function entriesSince(entries: ChangelogEntry[], previous: string | null): ChangelogEntry[] {
  return previous === null ? entries : entries.filter((entry) => isNewer(entry.version, previous));
}
