use crate::error::{ManagerError, Result};
use serde::Serialize;
use std::{path::{Path, PathBuf}, time::{SystemTime, UNIX_EPOCH}};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupInfo { pub name: String, pub path: String, pub created_at: u64, pub size: u64 }

pub fn backup_dir(game: &Path) -> PathBuf { game.join("autominer-backups") }

pub fn create(game: &Path, source: &Path) -> Result<Option<BackupInfo>> {
    if !source.is_file() { return Ok(None); }
    let stamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
    let dir = backup_dir(game);
    std::fs::create_dir_all(&dir)?;
    let name = format!("AutoMiner-{stamp}.jar");
    let dest = dir.join(&name);
    std::fs::copy(source, &dest)?;
    Ok(Some(BackupInfo { name, path: dest.to_string_lossy().into(), created_at: stamp, size: dest.metadata()?.len() }))
}

pub fn list(game: &Path) -> Result<Vec<BackupInfo>> {
    let dir = backup_dir(game);
    if !dir.is_dir() { return Ok(vec![]); }
    let mut result = vec![];
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with("AutoMiner-") && name.ends_with(".jar") {
            let meta = entry.metadata()?;
            let created_at = meta.modified().unwrap_or(SystemTime::UNIX_EPOCH).duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
            result.push(BackupInfo { name, path: entry.path().to_string_lossy().into(), created_at, size: meta.len() });
        }
    }
    result.sort_by_key(|b| std::cmp::Reverse(b.created_at));
    Ok(result)
}

pub fn restore(game: &Path, backup_name: &str) -> Result<()> {
    let safe = crate::paths::safe_file_name(backup_name)?;
    let source = backup_dir(game).join(safe);
    if !source.is_file() { return Err(ManagerError::Invalid("Backup não encontrado".into())); }
    let mods = crate::minecraft::resolve_mods_dir(game);
    std::fs::create_dir_all(&mods)?;
    remove_autominer_jars(&mods)?;
    std::fs::copy(source, mods.join("AutoMiner-restored.jar"))?;
    Ok(())
}

pub fn remove_autominer_jars(mods: &Path) -> Result<()> {
    if !mods.is_dir() { return Ok(()); }
    for entry in std::fs::read_dir(mods)? {
        let entry = entry?;
        let name = entry.file_name().to_string_lossy().to_lowercase();
        if name.starts_with("autominer-") && name.ends_with(".jar") { std::fs::remove_file(entry.path())?; }
    }
    Ok(())
}
