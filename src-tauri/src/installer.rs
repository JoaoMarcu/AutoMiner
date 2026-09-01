use crate::{backups, download, error::{ManagerError, Result}, minecraft, releases};
use serde::Serialize;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallResult {
    pub mod_version: String,
    pub mod_path: String,
    pub mods_dir: String,
    pub backup_created: bool,
}

fn find_installed_mod(mods: &Path) -> Option<PathBuf> {
    std::fs::read_dir(mods).ok()?.flatten().map(|entry| entry.path()).find(|path| {
        path.file_name().and_then(|name| name.to_str())
            .is_some_and(|name| name.to_lowercase().starts_with("autominer-") && name.to_lowercase().ends_with(".jar"))
    })
}

pub async fn install_all(game_dir: &str) -> Result<InstallResult> {
    let game = minecraft::validate_game_dir(Path::new(game_dir))?;
    let report = minecraft::detect(Some(game.to_string_lossy().into()));
    if !report.version_1211 {
        return Err(ManagerError::Invalid("Minecraft 1.21.1 não foi detectado nessa instalação".into()));
    }
    if !report.fabric_installed {
        return Err(ManagerError::Invalid("Instale o Fabric Loader para Minecraft 1.21.1 antes de instalar o AutoMiner".into()));
    }
    if !report.fabric_api_installed {
        return Err(ManagerError::Invalid("Instale o Fabric API na pasta de mods antes de instalar o AutoMiner".into()));
    }

    let mods = minecraft::resolve_mods_dir(&game);
    std::fs::create_dir_all(&mods)?;
    let release = releases::latest_mod_release().await?;
    let mod_bytes = download::download_verified(&release.jar_url, release.sha256.as_deref()).await?;
    if !mod_bytes.starts_with(b"PK") {
        return Err(ManagerError::Invalid("O asset do AutoMiner não é um JAR válido".into()));
    }

    let existing = find_installed_mod(&mods);
    let backup_created = if let Some(ref path) = existing { backups::create(&game, path)?.is_some() } else { false };
    backups::remove_autominer_jars(&mods)?;
    let mod_dest = mods.join(&release.jar_name);
    download::write_atomic(&mod_dest, &mod_bytes)?;

    Ok(InstallResult {
        mod_version: release.version,
        mod_path: mod_dest.to_string_lossy().into(),
        mods_dir: mods.to_string_lossy().into(),
        backup_created,
    })
}

pub fn uninstall(game_dir: &str, remove_config: bool) -> Result<()> {
    let game = minecraft::validate_game_dir(Path::new(game_dir))?;
    backups::remove_autominer_jars(&minecraft::resolve_mods_dir(&game))?;
    if remove_config {
        let config_path = crate::config::path(&game);
        if config_path.is_file() { std::fs::remove_file(config_path)?; }
    }
    Ok(())
}
