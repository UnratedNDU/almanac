mod commands;
mod crypto;
mod hlc;
mod model;
mod recur;
mod store;
mod vault;

use std::sync::Mutex;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            let vault = vault::Vault::open(&dir.join("almanac.db"))?;
            app.manage(commands::AppState(Mutex::new(vault)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::vault_status,
            commands::create_account,
            commands::unlock,
            commands::unlock_with_recovery,
            commands::lock,
            commands::get_event,
            commands::save_event,
            commands::delete_event,
            commands::skip_occurrence,
            commands::list_occurrences,
            commands::list_categories,
            commands::save_category,
            commands::delete_category,
            commands::get_settings,
            commands::save_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}