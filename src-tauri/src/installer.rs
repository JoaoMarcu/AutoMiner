use crate::{backups, config, download, error::{ManagerError, Result}, minecraft, releases};
use serde::Serialize;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallResult { pub mod_version: String, pub mod_path: String, pub fabric_api_path: String, pub backup_created: bool }

fn find_installed_mod(mods: &Path) -> Option<PathBuf> {
    std::fs::read_dir(mods).ok()?.flatten().map(|e| e.path()).find(|p| {
        p.file_name().and_then(|n| n.to_str()).map(|n| n.to_lowercase().starts_with("autominer-") && n.ends_with(".jar")).unwrap_or(false)
    })
}

pub async fn install_all(game_dir: &str) -> Result<InstallResult> {
    let game = minecraft::validate_game_dir(Path::new(game_dir))?;
    let mods = game.join("mods");
    std::fs::create_dir_all(&mods)?;

    let release = releases::latest_mod_release().await?;
    let mod_bytes = download::download_verified(&release.jar_url, release.sha256.as_deref()).await?;
    if !mod_bytes.starts_with(b"PK") { return Err(ManagerError::Invalid("O asset do mod não é um JAR válido".into())); }

    let existing = find_installed_mod(&mods);
    let backup_created = if let Some(ref path) = existing { backups::create(&game, path)?.is_some() } else { false };
    let (api_name, api_url, api_sha512) = releases::latest_fabric_api().await?;
    let api_bytes = download::download_verified(&api_url, None).await?;
    if let Some(expected) = api_sha512.as_deref() { download::verify_sha512(&api_bytes, expected)?; }
    if !api_bytes.starts_with(b"PK") { return Err(ManagerError::Invalid("Fabric API inválida".into())); }

    // Só modifica a instalação depois que todos os downloads foram validados.
    backups::remove_autominer_jars(&mods)?;
    let mod_dest = mods.join(&release.jar_name);
    download::write_atomic(&mod_dest, &mod_bytes)?;
    let api_dest = mods.join(api_name);
    download::write_atomic(&api_dest, &api_bytes)?;
    if !config::path(&game).is_file() { config::save(&game, &config::defaults())?; }

    Ok(InstallResult { mod_version: release.version, mod_path: mod_dest.to_string_lossy().into(), fabric_api_path: api_dest.to_string_lossy().into(), backup_created })
}

pub fn uninstall(game_dir: &str, remove_config: bool) -> Result<()> {
    let game = minecraft::validate_game_dir(Path::new(game_dir))?;
    backups::remove_autominer_jars(&game.join("mods"))?;
    if remove_config {
        let config_path = config::path(&game);
        if config_path.is_file() { std::fs::remove_file(config_path)?; }
    }
    Ok(())
}
