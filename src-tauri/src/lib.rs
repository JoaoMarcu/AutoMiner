mod backups;
mod config;
mod download;
mod error;
mod installer;
mod minecraft;
mod paths;
mod releases;
mod version;

use error::{ManagerError, Result};
use serde_json::Value;
use std::path::Path;

#[tauri::command]
fn detect_minecraft(game_dir: Option<String>) -> minecraft::DetectionReport {
    minecraft::detect(game_dir)
}

#[tauri::command]
async fn install_all(game_dir: String) -> Result<installer::InstallResult> {
    installer::install_all(&game_dir).await
}

#[tauri::command]
async fn check_release() -> Result<releases::ModRelease> {
    releases::latest_mod_release().await
}

#[tauri::command]
fn load_config(game_dir: String) -> Result<Value> {
    let game = minecraft::validate_game_dir(Path::new(&game_dir))?;
    config::load(&game)
}

#[tauri::command]
fn save_config(game_dir: String, config_value: Value) -> Result<()> {
    let game = minecraft::validate_game_dir(Path::new(&game_dir))?;
    config::save(&game, &config_value)
}

#[tauri::command]
fn reset_config(game_dir: String) -> Result<Value> {
    let game = minecraft::validate_game_dir(Path::new(&game_dir))?;
    let value = config::defaults();
    config::save(&game, &value)?;
    Ok(value)
}

#[tauri::command]
fn list_backups(game_dir: String) -> Result<Vec<backups::BackupInfo>> {
    let game = minecraft::validate_game_dir(Path::new(&game_dir))?;
    backups::list(&game)
}

#[tauri::command]
fn restore_backup(game_dir: String, backup_name: String) -> Result<()> {
    let game = minecraft::validate_game_dir(Path::new(&game_dir))?;
    backups::restore(&game, &backup_name)
}

#[tauri::command]
fn uninstall_mod(game_dir: String, remove_config: bool) -> Result<()> {
    installer::uninstall(&game_dir, remove_config)
}

#[tauri::command]
fn open_launcher() -> Result<()> {
    if let Some(path) = minecraft::find_launcher() {
        let extension = path.extension().and_then(|ext| ext.to_str()).unwrap_or_default().to_lowercase();
        let spawned = if extension == "jar" {
            std::process::Command::new("java").args(["-jar"]).arg(&path).spawn()
        } else if extension == "app" {
            std::process::Command::new("open").arg(&path).spawn()
        } else {
            std::process::Command::new(&path).spawn()
        };
        spawned.map_err(|e| ManagerError::Io(e.to_string()))?;
        return Ok(());
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer.exe").arg("minecraft://").spawn().map_err(|e| ManagerError::Io(e.to_string()))?;
        return Ok(());
    }
    #[cfg(not(target_os = "windows"))]
    { Err(ManagerError::Invalid("Nenhum launcher (Minecraft Launcher ou TLauncher) foi encontrado.".into())) }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            detect_minecraft, install_all, check_release,
            load_config, save_config, reset_config, list_backups,
            restore_backup, uninstall_mod, open_launcher
        ])
        .run(tauri::generate_context!())
        .expect("erro ao executar AutoMiner Manager");
}
