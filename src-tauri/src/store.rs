//! SQLite persistence: a `meta` key/value table and one generic `records` table.
//! Record blobs are opaque here (the vault seals them), which is also what gets synced.

use std::path::Path;

use rusqlite::{params, Connection, OptionalExtension, Row};

#[derive(Debug, thiserror::Error)]
#[error("storage error: {0}")]
pub struct StoreError(#[from] rusqlite::Error);

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Record {
    pub id: String,
    pub kind: String,
    pub hlc: String,
    pub deleted: bool,
    pub blob: Vec<u8>,
    /// True while the change has not been pushed to the server.
    pub dirty: bool,
}

const SCHEMA: &str = "
    CREATE TABLE IF NOT EXISTS meta (
        key   TEXT PRIMARY KEY,
        value BLOB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS records (
        id      TEXT PRIMARY KEY,
        kind    TEXT NOT NULL,
        hlc     TEXT NOT NULL,
        deleted INTEGER NOT NULL DEFAULT 0,
        blob    BLOB NOT NULL,
        dirty   INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS records_kind ON records (kind);
    CREATE INDEX IF NOT EXISTS records_dirty ON records (dirty) WHERE dirty = 1;
";

const COLUMNS: &str = "id, kind, hlc, deleted, blob, dirty";

fn from_row(row: &Row) -> rusqlite::Result<Record> {
    Ok(Record {
        id: row.get(0)?,
        kind: row.get(1)?,
        hlc: row.get(2)?,
        deleted: row.get(3)?,
        blob: row.get(4)?,
        dirty: row.get(5)?,
    })
}

pub struct Store {
    conn: Connection,
}

impl Store {
    pub fn open(path: &Path) -> Result<Store, StoreError> {
        let conn = Connection::open(path)?;
        conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;")?;
        Self::init(conn)
    }

    pub fn open_memory() -> Result<Store, StoreError> {
        Self::init(Connection::open_in_memory()?)
    }

    fn init(conn: Connection) -> Result<Store, StoreError> {
        conn.execute_batch(SCHEMA)?;
        Ok(Store { conn })
    }

    pub fn get_meta(&self, key: &str) -> Result<Option<Vec<u8>>, StoreError> {
        Ok(self
            .conn
            .query_row("SELECT value FROM meta WHERE key = ?1", [key], |row| row.get(0))
            .optional()?)
    }

    pub fn set_meta(&self, key: &str, value: &[u8]) -> Result<(), StoreError> {
        self.conn.execute(
            "INSERT INTO meta (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, value],
        )?;
        Ok(())
    }

    /// Last-writer-wins upsert: returns `false` (and changes nothing) unless `r.hlc` is newer than the stored one.
    pub fn put_record(&self, r: &Record) -> Result<bool, StoreError> {
        let changed = self.conn.execute(
            "INSERT INTO records (id, kind, hlc, deleted, blob, dirty)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(id) DO UPDATE SET
                 kind = excluded.kind, hlc = excluded.hlc, deleted = excluded.deleted,
                 blob = excluded.blob, dirty = excluded.dirty
             WHERE excluded.hlc > records.hlc",
            params![r.id, r.kind, r.hlc, r.deleted, r.blob, r.dirty],
        )?;
        Ok(changed > 0)
    }

    /// Includes tombstones (`deleted = true`).
    pub fn list_records(&self, kind: &str) -> Result<Vec<Record>, StoreError> {
        let mut stmt = self.conn.prepare(&format!("SELECT {COLUMNS} FROM records WHERE kind = ?1 ORDER BY id"))?;
        let rows = stmt.query_map([kind], from_row)?;
        Ok(rows.collect::<Result<_, _>>()?)
    }

    pub fn dirty_records(&self) -> Result<Vec<Record>, StoreError> {
        let mut stmt = self.conn.prepare(&format!("SELECT {COLUMNS} FROM records WHERE dirty = 1 ORDER BY hlc"))?;
        let rows = stmt.query_map([], from_row)?;
        Ok(rows.collect::<Result<_, _>>()?)
    }

    /// Clears `dirty` only if the stored stamp still matches, so a newer local edit stays queued.
    pub fn mark_clean(&self, id: &str, hlc: &str) -> Result<(), StoreError> {
        self.conn.execute("UPDATE records SET dirty = 0 WHERE id = ?1 AND hlc = ?2", params![id, hlc])?;
        Ok(())
    }
}
#[cfg(test)]
mod tests {
    use super::*;

    fn rec(id: &str, kind: &str, hlc: &str) -> Record {
        Record { id: id.into(), kind: kind.into(), hlc: hlc.into(), deleted: false, blob: vec![1, 2, 3], dirty: true }
    }

    #[test]
    fn meta_roundtrip() {
        let s = Store::open_memory().unwrap();
        assert_eq!(s.get_meta("salt").unwrap(), None);
        s.set_meta("salt", b"abc").unwrap();
        s.set_meta("salt", b"xyz").unwrap();
        assert_eq!(s.get_meta("salt").unwrap(), Some(b"xyz".to_vec()));
    }

    #[test]
    fn put_then_list_by_kind() {
        let s = Store::open_memory().unwrap();
        assert!(s.put_record(&rec("e1", "event", "0001")).unwrap());
        assert!(s.put_record(&rec("c1", "category", "0002")).unwrap());
        let events = s.list_records("event").unwrap();
        assert_eq!(events, vec![rec("e1", "event", "0001")]);
    }

    #[test]
    fn older_hlc_is_ignored_newer_wins() {
        let s = Store::open_memory().unwrap();
        s.put_record(&rec("e1", "event", "0005")).unwrap();
        let mut older = rec("e1", "event", "0003");
        older.blob = vec![9];
        assert!(!s.put_record(&older).unwrap());
        assert_eq!(s.list_records("event").unwrap()[0].blob, vec![1, 2, 3]);
        let mut newer = rec("e1", "event", "0007");
        newer.blob = vec![7];
        assert!(s.put_record(&newer).unwrap());
        assert_eq!(s.list_records("event").unwrap()[0].blob, vec![7]);
    }

    #[test]
    fn same_hlc_is_idempotent() {
        let s = Store::open_memory().unwrap();
        assert!(s.put_record(&rec("e1", "event", "0005")).unwrap());
        assert!(!s.put_record(&rec("e1", "event", "0005")).unwrap());
    }

    #[test]
    fn tombstones_are_listed() {
        let s = Store::open_memory().unwrap();
        let mut gone = rec("e1", "event", "0001");
        gone.deleted = true;
        s.put_record(&gone).unwrap();
        assert!(s.list_records("event").unwrap()[0].deleted);
    }

    #[test]
    fn dirty_records_only_dirty() {
        let s = Store::open_memory().unwrap();
        let mut clean = rec("e1", "event", "0001");
        clean.dirty = false;
        s.put_record(&clean).unwrap();
        s.put_record(&rec("e2", "event", "0002")).unwrap();
        let dirty = s.dirty_records().unwrap();
        assert_eq!(dirty.len(), 1);
        assert_eq!(dirty[0].id, "e2");
    }

    #[test]
    fn mark_clean_requires_matching_hlc() {
        let s = Store::open_memory().unwrap();
        s.put_record(&rec("e1", "event", "0002")).unwrap();
        s.mark_clean("e1", "0001").unwrap(); // stale ack: edit made after the push
        assert_eq!(s.dirty_records().unwrap().len(), 1);
        s.mark_clean("e1", "0002").unwrap();
        assert!(s.dirty_records().unwrap().is_empty());
    }

    #[test]
    fn persists_across_reopen() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("vault.db");
        {
            let s = Store::open(&path).unwrap();
            s.set_meta("k", b"v").unwrap();
            s.put_record(&rec("e1", "event", "0001")).unwrap();
        }
        let s = Store::open(&path).unwrap();
        assert_eq!(s.get_meta("k").unwrap(), Some(b"v".to_vec()));
        assert_eq!(s.list_records("event").unwrap().len(), 1);
    }
}