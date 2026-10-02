//! Thin Tauri wrappers over the vault. They are `async` so the Argon2 work in
//! `create_account` and `unlock` runs off the UI thread.

use std::sync::{Mutex, MutexGuard};

use serde::Serialize;
use tauri::State;

use crate::model::{Category, Event, Settings};
use crate::vault::{OccurrenceView, Vault, VaultError};

pub struct AppState(pub Mutex<Vault>);

type Res<T> = Result<T, VaultError>;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    pub initialized: bool,
    pub unlocked: bool,
}

fn vault<'a>(state: &'a State<'_, AppState>) -> MutexGuard<'a, Vault> {
    // A poisoned lock only means an earlier command panicked; the vault data itself is still valid.
    state.0.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
}

#[tauri::command]
pub async fn vault_status(state: State<'_, AppState>) -> Res<Status> {
    let v = vault(&state);
    Ok(Status { initialized: v.is_initialized(), unlocked: v.is_unlocked() })
}

/// Returns the recovery key.
#[tauri::command]
pub async fn create_account(state: State<'_, AppState>, password: String) -> Res<String> {
    vault(&state).create_account(&password)
}

#[tauri::command]
pub async fn unlock(state: State<'_, AppState>, password: String) -> Res<()> {
    vault(&state).unlock(&password)
}

#[tauri::command]
pub async fn unlock_with_recovery(state: State<'_, AppState>, recovery_key: String) -> Res<()> {
    vault(&state).unlock_with_recovery(&recovery_key)
}

#[tauri::command]
pub async fn lock(state: State<'_, AppState>) -> Res<()> {
    vault(&state).lock();
    Ok(())
}

#[tauri::command]
pub async fn get_event(state: State<'_, AppState>, id: String) -> Res<Event> {
    vault(&state).get_event(&id)
}

#[tauri::command]
pub async fn save_event(state: State<'_, AppState>, event: Event) -> Res<Event> {
    vault(&state).save_event(event)
}

#[tauri::command]
pub async fn delete_event(state: State<'_, AppState>, id: String) -> Res<()> {
    vault(&state).delete_event(&id)
}

#[tauri::command]
pub async fn skip_occurrence(state: State<'_, AppState>, id: String, start: String) -> Res<()> {
    vault(&state).skip_occurrence(&id, &start)
}

#[tauri::command]
pub async fn list_occurrences(state: State<'_, AppState>, from: String, to: String) -> Res<Vec<OccurrenceView>> {
    vault(&state).list_occurrences(&from, &to)
}

#[tauri::command]
pub async fn list_categories(state: State<'_, AppState>) -> Res<Vec<Category>> {
    vault(&state).list_categories()
}

#[tauri::command]
pub async fn save_category(state: State<'_, AppState>, category: Category) -> Res<Category> {
    vault(&state).save_category(category)
}

#[tauri::command]
pub async fn delete_category(state: State<'_, AppState>, id: String) -> Res<()> {
    vault(&state).delete_category(&id)
}

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Res<Settings> {
    vault(&state).get_settings()
}

#[tauri::command]
pub async fn save_settings(state: State<'_, AppState>, settings: Settings) -> Res<()> {
    vault(&state).save_settings(settings)
}