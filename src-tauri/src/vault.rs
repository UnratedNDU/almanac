//! The vault ties crypto, storage and recurrence together: one account, one random data key (DEK)
//! wrapped twice (by the password-derived key and by the recovery key), and every record sealed with the DEK.
//! This layer knows nothing about Tauri, so it is fully unit-tested.

use std::path::Path;

use data_encoding::HEXLOWER;
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use zeroize::Zeroizing;

use crate::crypto::{self, CryptoError, KdfParams, KEY_LEN};
use crate::hlc::Hlc;
use crate::model::{Category, Event, EventKind, Settings};
use crate::recur::{self, RecurError};
use crate::store::{Record, Store, StoreError};

pub const MIN_PASSWORD_CHARS: usize = 10;

const KIND_EVENT: &str = "event";
const KIND_CATEGORY: &str = "category";
const KIND_SETTINGS: &str = "settings";
const SETTINGS_ID: &str = "settings";

#[derive(Debug, thiserror::Error)]
pub enum VaultError {
    #[error("the vault is locked")]
    Locked,
    #[error("wrong password")]
    BadPassword,
    #[error("wrong recovery key")]
    BadRecoveryKey,
    #[error("the password must have at least {MIN_PASSWORD_CHARS} characters")]
    WeakPassword,
    #[error("an account already exists")]
    AlreadyInitialized,
    #[error("no account has been created yet")]
    NotInitialized,
    #[error("not found")]
    NotFound,
    #[error("invalid event: {0}")]
    InvalidEvent(#[from] RecurError),
    #[error("stored data is corrupt")]
    Corrupt,
    #[error(transparent)]
    Crypto(#[from] CryptoError),
    #[error(transparent)]
    Store(#[from] StoreError),
}

impl VaultError {
    /// Stable machine-readable code for the UI.
    pub fn code(&self) -> &'static str {
        match self {
            Self::Locked => "locked",
            Self::BadPassword => "badPassword",
            Self::BadRecoveryKey => "badRecoveryKey",
            Self::WeakPassword => "weakPassword",
            Self::AlreadyInitialized => "alreadyInitialized",
            Self::NotInitialized => "notInitialized",
            Self::NotFound => "notFound",
            Self::InvalidEvent(_) => "invalidEvent",
            Self::Corrupt => "corrupt",
            Self::Crypto(_) | Self::Store(_) => "internal",
        }
    }
}

impl Serialize for VaultError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serde_json::json!({ "code": self.code(), "message": self.to_string() }).serialize(serializer)
    }
}

/// One visible occurrence plus the event fields the calendar needs to draw it.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OccurrenceView {
    pub event_id: String,
    pub start: String,
    pub end: Option<String>,
    pub recurring: bool,
    pub title: String,
    pub color: String,
    pub kind: EventKind,
    pub all_day: bool,
    pub category_id: Option<String>,
}

pub struct Vault {
    store: Store,
    kdf: KdfParams,
    hlc: Hlc,
    dek: Option<Zeroizing<[u8; KEY_LEN]>>,
}

fn kdf_to_bytes(k: &KdfParams) -> [u8; 12] {
    let mut out = [0u8; 12];
    out[0..4].copy_from_slice(&k.m_kib.to_le_bytes());
    out[4..8].copy_from_slice(&k.t.to_le_bytes());
    out[8..12].copy_from_slice(&k.p.to_le_bytes());
    out
}

fn kdf_from_bytes(b: &[u8]) -> Option<KdfParams> {
    let b: [u8; 12] = b.try_into().ok()?;
    let word = |i: usize| u32::from_le_bytes([b[i], b[i + 1], b[i + 2], b[i + 3]]);
    Some(KdfParams { m_kib: word(0), t: word(4), p: word(8) })
}

fn key_from(bytes: &[u8]) -> Result<Zeroizing<[u8; KEY_LEN]>, VaultError> {
    let key: [u8; KEY_LEN] = bytes.try_into().map_err(|_| VaultError::Corrupt)?;
    Ok(Zeroizing::new(key))
}

impl Vault {
    pub fn open(path: &Path) -> Result<Vault, VaultError> {
        Self::new(Store::open(path)?, KdfParams::default())
    }

    /// `kdf` applies to accounts created through this vault; existing accounts keep their stored parameters.
    pub fn new(store: Store, kdf: KdfParams) -> Result<Vault, VaultError> {
        let node = match store.get_meta("node")? {
            Some(bytes) => String::from_utf8(bytes).map_err(|_| VaultError::Corrupt)?,
            None => {
                let node = HEXLOWER.encode(&crypto::random_key()[..4]);
                store.set_meta("node", node.as_bytes())?;
                node
            }
        };
        Ok(Vault { store, kdf, hlc: Hlc::new(&node), dek: None })
    }

    pub fn is_initialized(&self) -> bool {
        matches!(self.store.get_meta("wrap_rk"), Ok(Some(_)))
    }

    pub fn is_unlocked(&self) -> bool {
        self.dek.is_some()
    }

    /// Creates the account and unlocks it. Returns the recovery key, which is shown to the user once.
    pub fn create_account(&mut self, password: &str) -> Result<String, VaultError> {
        if self.is_initialized() {
            return Err(VaultError::AlreadyInitialized);
        }
        if password.chars().count() < MIN_PASSWORD_CHARS {
            return Err(VaultError::WeakPassword);
        }
        let salt = crypto::new_salt();
        let keys = crypto::derive_password_keys(password, &salt, &self.kdf)?;
        let dek = Zeroizing::new(crypto::random_key());
        let recovery = Zeroizing::new(crypto::random_key());
        self.store.set_meta("kdf", &kdf_to_bytes(&self.kdf))?;
        self.store.set_meta("salt", &salt)?;
        self.store.set_meta("wrap_pw", &crypto::seal(&keys.kek, dek.as_slice()))?;
        // Written last: its presence marks the account as complete.
        self.store.set_meta("wrap_rk", &crypto::seal(&recovery, dek.as_slice()))?;
        self.dek = Some(dek);
        Ok(crypto::format_recovery_key(&recovery))
    }

    pub fn unlock(&mut self, password: &str) -> Result<(), VaultError> {
        self.require_account()?;
        let salt: [u8; crypto::SALT_LEN] = self.meta("salt")?.try_into().map_err(|_| VaultError::Corrupt)?;
        let kdf = kdf_from_bytes(&self.meta("kdf")?).ok_or(VaultError::Corrupt)?;
        let keys = crypto::derive_password_keys(password, &salt, &kdf)?;
        let dek = Zeroizing::new(
            crypto::open(&keys.kek, &self.meta("wrap_pw")?).map_err(|_| VaultError::BadPassword)?,
        );
        self.dek = Some(key_from(&dek)?);
        Ok(())
    }

    pub fn unlock_with_recovery(&mut self, recovery_key: &str) -> Result<(), VaultError> {
        self.require_account()?;
        let recovery = Zeroizing::new(
            crypto::parse_recovery_key(recovery_key).map_err(|_| VaultError::BadRecoveryKey)?,
        );
        let dek = Zeroizing::new(
            crypto::open(&recovery, &self.meta("wrap_rk")?).map_err(|_| VaultError::BadRecoveryKey)?,
        );
        self.dek = Some(key_from(&dek)?);
        Ok(())
    }

    pub fn lock(&mut self) {
        self.dek = None;
    }

    pub fn get_event(&self, id: &str) -> Result<Event, VaultError> {
        self.read_json(&self.live_record(id, KIND_EVENT)?)
    }

    /// Assigns an id to new events. Returns the stored event.
    pub fn save_event(&mut self, mut ev: Event) -> Result<Event, VaultError> {
        self.dek()?;
        if ev.id.is_empty() {
            ev.id = uuid::Uuid::now_v7().to_string();
        }
        // Expanding a one-day range is the cheapest full validation of start, end and rule.
        recur::expand(&ev, "1970-01-01", "1970-01-02")?;
        self.put_json(KIND_EVENT, &ev.id, &ev)?;
        Ok(ev)
    }

    pub fn delete_event(&mut self, id: &str) -> Result<(), VaultError> {
        let record = self.live_record(id, KIND_EVENT)?;
        self.tombstone(record)
    }

    /// Hides one occurrence of a series by adding it to the event's `exdates`.
    pub fn skip_occurrence(&mut self, id: &str, start: &str) -> Result<(), VaultError> {
        let mut ev = self.get_event(id)?;
        if !ev.exdates.iter().any(|d| d == start) {
            ev.exdates.push(start.to_owned());
            self.save_event(ev)?;
        }
        Ok(())
    }

    // ponytail: decrypts every event per query. Fine up to ~50k events; add an in-memory cache when measured.
    pub fn list_occurrences(&self, from: &str, to: &str) -> Result<Vec<OccurrenceView>, VaultError> {
        let mut out = Vec::new();
        for ev in self.read_all::<Event>(KIND_EVENT)? {
            let occurrences = match recur::expand(&ev, from, to) {
                Ok(occurrences) => occurrences,
                Err(e) => {
                    eprintln!("skipping event {}: {e}", ev.id);
                    continue;
                }
            };
            out.extend(occurrences.into_iter().map(|o| OccurrenceView {
                event_id: o.event_id,
                start: o.start,
                end: o.end,
                recurring: o.recurring,
                title: ev.title.clone(),
                color: ev.color.clone(),
                kind: ev.kind,
                all_day: ev.all_day,
                category_id: ev.category_id.clone(),
            }));
        }
        out.sort_by(|a, b| a.start.cmp(&b.start).then_with(|| a.title.cmp(&b.title)));
        Ok(out)
    }

    pub fn list_categories(&self) -> Result<Vec<Category>, VaultError> {
        let mut cats = self.read_all::<Category>(KIND_CATEGORY)?;
        cats.sort_by(|a, b| a.name.cmp(&b.name));
        Ok(cats)
    }

    pub fn save_category(&mut self, mut cat: Category) -> Result<Category, VaultError> {
        if cat.id.is_empty() {
            cat.id = uuid::Uuid::now_v7().to_string();
        }
        self.put_json(KIND_CATEGORY, &cat.id, &cat)?;
        Ok(cat)
    }

    pub fn delete_category(&mut self, id: &str) -> Result<(), VaultError> {
        let record = self.live_record(id, KIND_CATEGORY)?;
        self.tombstone(record)
    }

    pub fn get_settings(&self) -> Result<Settings, VaultError> {
        self.dek()?;
        match self.store.get_record(SETTINGS_ID)?.filter(|r| r.kind == KIND_SETTINGS && !r.deleted) {
            Some(record) => self.read_json(&record),
            None => Ok(Settings::default()),
        }
    }

    pub fn save_settings(&mut self, settings: Settings) -> Result<(), VaultError> {
        self.put_json(KIND_SETTINGS, SETTINGS_ID, &settings)
    }

    fn require_account(&self) -> Result<(), VaultError> {
        if self.is_initialized() {
            Ok(())
        } else {
            Err(VaultError::NotInitialized)
        }
    }

    fn meta(&self, key: &str) -> Result<Vec<u8>, VaultError> {
        self.store.get_meta(key)?.ok_or(VaultError::Corrupt)
    }

    fn dek(&self) -> Result<&[u8; KEY_LEN], VaultError> {
        self.dek.as_deref().ok_or(VaultError::Locked)
    }

    /// A stored, non-deleted record of the given kind.
    fn live_record(&self, id: &str, kind: &str) -> Result<Record, VaultError> {
        self.dek()?;
        self.store
            .get_record(id)?
            .filter(|r| r.kind == kind && !r.deleted)
            .ok_or(VaultError::NotFound)
    }

    fn read_json<T: DeserializeOwned>(&self, record: &Record) -> Result<T, VaultError> {
        let plain = Zeroizing::new(crypto::open(self.dek()?, &record.blob)?);
        serde_json::from_slice(&plain).map_err(|_| VaultError::Corrupt)
    }

    /// Every readable, non-deleted record of a kind. An unreadable one is skipped so a single
    /// damaged record cannot lock the user out of the whole calendar.
    fn read_all<T: DeserializeOwned>(&self, kind: &str) -> Result<Vec<T>, VaultError> {
        self.dek()?;
        let mut out = Vec::new();
        for record in self.store.list_records(kind)?.iter().filter(|r| !r.deleted) {
            match self.read_json(record) {
                Ok(value) => out.push(value),
                Err(e) => eprintln!("skipping unreadable {kind} {}: {e}", record.id),
            }
        }
        Ok(out)
    }

    fn put_json<T: Serialize>(&mut self, kind: &str, id: &str, value: &T) -> Result<(), VaultError> {
        let json = Zeroizing::new(serde_json::to_vec(value).map_err(|_| VaultError::Corrupt)?);
        let blob = crypto::seal(self.dek()?, &json);
        let hlc = self.hlc.now();
        self.store.put_record(&Record {
            id: id.to_owned(),
            kind: kind.to_owned(),
            hlc,
            deleted: false,
            blob,
            dirty: true,
        })?;
        Ok(())
    }

    /// Deletion is a marked record so it can propagate to other devices.
    fn tombstone(&mut self, record: Record) -> Result<(), VaultError> {
        let hlc = self.hlc.now();
        self.store.put_record(&Record { hlc, deleted: true, blob: Vec::new(), dirty: true, ..record })?;
        Ok(())
    }
}
#[cfg(test)]
mod tests {
    use super::*;

    const FAST: KdfParams = KdfParams { m_kib: 8, t: 1, p: 1 };
    const PASSWORD: &str = "correct horse battery";

    fn vault() -> Vault {
        Vault::new(Store::open_memory().unwrap(), FAST).unwrap()
    }

    /// Returns an unlocked vault and the recovery key.
    fn with_account() -> (Vault, String) {
        let mut v = vault();
        let key = v.create_account(PASSWORD).unwrap();
        (v, key)
    }

    fn event(title: &str, start: &str) -> Event {
        Event { title: title.into(), start: start.into(), all_day: start.len() == 10, ..Event::default() }
    }

    fn titles(occ: &[OccurrenceView]) -> Vec<&str> {
        occ.iter().map(|o| o.title.as_str()).collect()
    }

    #[test]
    fn create_rejects_short_password() {
        let mut v = vault();
        assert!(matches!(v.create_account("short"), Err(VaultError::WeakPassword)));
        assert!(!v.is_initialized());
    }

    #[test]
    fn create_returns_recovery_key_and_second_create_fails() {
        let (mut v, key) = with_account();
        assert!(crypto::parse_recovery_key(&key).is_ok());
        assert!(v.is_initialized() && v.is_unlocked());
        assert!(matches!(v.create_account(PASSWORD), Err(VaultError::AlreadyInitialized)));
    }

    #[test]
    fn unlock_before_any_account_is_not_initialized() {
        let mut v = vault();
        assert!(matches!(v.unlock(PASSWORD), Err(VaultError::NotInitialized)));
        assert!(matches!(v.unlock_with_recovery("AAAA"), Err(VaultError::NotInitialized)));
    }

    #[test]
    fn locked_vault_rejects_operations() {
        let (mut v, _) = with_account();
        v.lock();
        assert!(!v.is_unlocked());
        assert!(matches!(v.save_event(event("x", "2026-08-20")), Err(VaultError::Locked)));
        assert!(matches!(v.list_occurrences("2026-08-01", "2026-09-01"), Err(VaultError::Locked)));
        assert!(matches!(v.get_settings(), Err(VaultError::Locked)));
        assert!(matches!(v.list_categories(), Err(VaultError::Locked)));
    }

    #[test]
    fn wrong_password_is_bad_password_and_right_one_unlocks() {
        let (mut v, _) = with_account();
        v.lock();
        assert!(matches!(v.unlock("wrong password!!"), Err(VaultError::BadPassword)));
        assert!(!v.is_unlocked());
        v.unlock(PASSWORD).unwrap();
        assert!(v.is_unlocked());
    }

    #[test]
    fn unlock_with_recovery_key_works() {
        let (mut v, key) = with_account();
        v.lock();
        let other = crypto::format_recovery_key(&crypto::random_key());
        assert!(matches!(v.unlock_with_recovery(&other), Err(VaultError::BadRecoveryKey)));
        assert!(matches!(v.unlock_with_recovery("not a key"), Err(VaultError::BadRecoveryKey)));
        v.unlock_with_recovery(&key.to_lowercase()).unwrap();
        assert!(v.is_unlocked());
    }

    #[test]
    fn saved_event_blob_does_not_contain_plaintext_title() {
        let (mut v, _) = with_account();
        let saved = v.save_event(event("SecretDentistVisit", "2026-08-20T09:00")).unwrap();
        let raw = v.store.get_record(&saved.id).unwrap().unwrap();
        let needle = b"SecretDentistVisit";
        assert!(!raw.blob.windows(needle.len()).any(|w| w == needle));
    }

    #[test]
    fn event_roundtrip_assigns_id() {
        let (mut v, _) = with_account();
        let saved = v.save_event(event("Dentist", "2026-08-20T09:00")).unwrap();
        assert!(!saved.id.is_empty());
        assert_eq!(v.get_event(&saved.id).unwrap(), saved);
        let mut edited = saved.clone();
        edited.title = "Dentist (moved)".into();
        v.save_event(edited.clone()).unwrap();
        assert_eq!(v.get_event(&saved.id).unwrap(), edited);
        assert!(matches!(v.get_event("missing"), Err(VaultError::NotFound)));
    }

    #[test]
    fn save_event_rejects_invalid_dates_and_rules() {
        let (mut v, _) = with_account();
        assert!(matches!(v.save_event(event("x", "garbage")), Err(VaultError::InvalidEvent(_))));
        let mut bad_rule = event("x", "2026-08-20");
        bad_rule.rrule = Some("FREQ=NOPE".into());
        assert!(matches!(v.save_event(bad_rule), Err(VaultError::InvalidEvent(_))));
    }

    #[test]
    fn delete_creates_tombstone_and_hides_event() {
        let (mut v, _) = with_account();
        let saved = v.save_event(event("Gone", "2026-08-20")).unwrap();
        v.delete_event(&saved.id).unwrap();
        assert!(matches!(v.get_event(&saved.id), Err(VaultError::NotFound)));
        assert!(v.list_occurrences("2026-08-01", "2026-09-01").unwrap().is_empty());
        assert!(v.store.get_record(&saved.id).unwrap().unwrap().deleted);
        assert!(matches!(v.delete_event(&saved.id), Err(VaultError::NotFound)));
    }

    #[test]
    fn list_occurrences_merges_recurring_and_single_sorted() {
        let (mut v, _) = with_account();
        let mut birthday = event("Ana", "1990-03-14");
        birthday.rrule = Some("FREQ=YEARLY".into());
        birthday.kind = EventKind::Birthday;
        v.save_event(birthday).unwrap();
        v.save_event(event("Lunch", "2026-03-14T13:00")).unwrap();
        v.save_event(event("Early", "2026-03-02T08:00")).unwrap();
        v.save_event(event("April", "2026-04-02T08:00")).unwrap();
        let march = v.list_occurrences("2026-03-01", "2026-04-01").unwrap();
        assert_eq!(titles(&march), vec!["Early", "Ana", "Lunch"]);
        assert!(march[1].recurring && march[1].kind == EventKind::Birthday && march[1].all_day);
    }

    #[test]
    fn skip_occurrence_adds_exdate_once() {
        let (mut v, _) = with_account();
        let mut weekly = event("Gym", "2026-08-03T10:00");
        weekly.rrule = Some("FREQ=WEEKLY".into());
        let saved = v.save_event(weekly).unwrap();
        v.skip_occurrence(&saved.id, "2026-08-10T10:00").unwrap();
        v.skip_occurrence(&saved.id, "2026-08-10T10:00").unwrap();
        let starts: Vec<String> =
            v.list_occurrences("2026-08-03", "2026-08-25").unwrap().into_iter().map(|o| o.start).collect();
        assert_eq!(starts, vec!["2026-08-03T10:00", "2026-08-17T10:00", "2026-08-24T10:00"]);
        assert_eq!(v.get_event(&saved.id).unwrap().exdates, vec!["2026-08-10T10:00"]);
    }

    #[test]
    fn categories_roundtrip_sorted_and_deletable() {
        let (mut v, _) = with_account();
        let work = v.save_category(Category { name: "Work".into(), color: "#00f".into(), ..Category::default() }).unwrap();
        v.save_category(Category { name: "Family".into(), color: "#f00".into(), ..Category::default() }).unwrap();
        assert!(!work.id.is_empty());
        let names: Vec<String> = v.list_categories().unwrap().into_iter().map(|c| c.name).collect();
        assert_eq!(names, vec!["Family", "Work"]);
        v.delete_category(&work.id).unwrap();
        assert_eq!(v.list_categories().unwrap().len(), 1);
    }

    #[test]
    fn settings_default_then_persist() {
        let (mut v, _) = with_account();
        assert_eq!(v.get_settings().unwrap(), Settings::default());
        let changed = Settings { theme: "forest".into(), week_start: 0, ..Settings::default() };
        v.save_settings(changed.clone()).unwrap();
        assert_eq!(v.get_settings().unwrap(), changed);
    }

    #[test]
    fn saved_records_are_dirty() {
        let (mut v, _) = with_account();
        let saved = v.save_event(event("Sync me", "2026-08-20")).unwrap();
        assert!(v.store.dirty_records().unwrap().iter().any(|r| r.id == saved.id));
    }

    #[test]
    fn data_survives_lock_and_a_new_session_on_disk() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("vault.db");
        {
            let mut v = Vault::new(Store::open(&path).unwrap(), FAST).unwrap();
            v.create_account(PASSWORD).unwrap();
            v.save_event(event("Persistent", "2026-08-20")).unwrap();
        }
        let mut v = Vault::new(Store::open(&path).unwrap(), FAST).unwrap();
        assert!(v.is_initialized() && !v.is_unlocked());
        v.unlock(PASSWORD).unwrap();
        assert_eq!(titles(&v.list_occurrences("2026-08-01", "2026-09-01").unwrap()), vec!["Persistent"]);
    }
}