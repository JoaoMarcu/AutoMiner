use crate::error::{ManagerError, Result};
use serde::Serialize;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectionReport {
    pub game_dir: Option<String>,
    pub minecraft_found: bool,
    pub launcher_found: bool,
    pub version_1211: bool,
    pub fabric_installed: bool,
    pub fabric_api_installed: bool,
    pub autominer_installed: bool,
    pub config_found: bool,
    pub launcher_path: Option<String>,
}

pub fn default_game_dir() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    { dirs::config_dir().map(|p| p.join(".minecraft")) }
    #[cfg(not(target_os = "windows"))]
    { dirs::home_dir().map(|p| p.join(".minecraft")) }
}

pub fn validate_game_dir(path: &Path) -> Result<PathBuf> {
    if !path.is_dir() { return Err(ManagerError::MinecraftNotFound); }
    let looks_valid = path.join("versions").is_dir()
        || path.join("launcher_profiles.json").is_file()
        || path.join("launcher_profiles_microsoft_store.json").is_file();
    if !looks_valid { return Err(ManagerError::MinecraftNotFound); }
    path.canonicalize().map_err(Into::into)
}

fn has_matching_jar(dir: &Path, predicate: impl Fn(&str) -> bool) -> bool {
    std::fs::read_dir(dir).ok().into_iter().flatten().flatten().any(|entry| {
        entry.file_name().to_str().map(|n| predicate(&n.to_lowercase())).unwrap_or(false)
    })
}

pub fn detect(selected: Option<String>) -> DetectionReport {
    let candidate = selected.map(PathBuf::from).or_else(default_game_dir);
    let game = candidate.as_deref().and_then(|p| validate_game_dir(p).ok());
    let launcher = find_launcher();
    if let Some(ref root) = game {
        let mods = root.join("mods");
        let versions = root.join("versions");
        return DetectionReport {
            game_dir: Some(root.to_string_lossy().to_string()),
            minecraft_found: true,
            launcher_found: launcher.is_some(),
            version_1211: versions.join("1.21.1").is_dir(),
            fabric_installed: std::fs::read_dir(&versions).ok().into_iter().flatten().flatten().any(|e| e.file_name().to_string_lossy().contains("fabric-loader") && e.file_name().to_string_lossy().contains("1.21.1")),
            fabric_api_installed: has_matching_jar(&mods, |n| n.starts_with("fabric-api-") && n.ends_with(".jar")),
            autominer_installed: has_matching_jar(&mods, |n| n.starts_with("autominer-") && n.ends_with(".jar")),
            config_found: root.join("config/autominer.json").is_file(),
            launcher_path: launcher.map(|p| p.to_string_lossy().to_string()),
        };
    }
    DetectionReport { game_dir: None, minecraft_found: false, launcher_found: launcher.is_some(), version_1211: false, fabric_installed: false, fabric_api_installed: false, autominer_installed: false, config_found: false, launcher_path: launcher.map(|p| p.to_string_lossy().to_string()) }
}

pub fn find_launcher() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        let candidates = [
            dirs::data_dir().map(|p| p.join(".minecraft/MinecraftLauncher.exe")),
            std::env::var_os("ProgramFiles(x86)").map(PathBuf::from).map(|p| p.join("Minecraft Launcher/MinecraftLauncher.exe")),
            std::env::var_os("ProgramFiles").map(PathBuf::from).map(|p| p.join("Minecraft Launcher/MinecraftLauncher.exe")),
        ];
        candidates.into_iter().flatten().find(|p| p.is_file())
    }
    #[cfg(not(target_os = "windows"))]
    { None }
}
