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
    pub minecraft_version: Option<String>,
    pub fabric_loader_version: Option<String>,
    pub fabric_api_version: Option<String>,
    pub autominer_version: Option<String>,
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

fn matching_jar_version(dir: &Path, prefix: &str) -> (bool, Option<String>) {
    let entry = std::fs::read_dir(dir).ok().into_iter().flatten().flatten().find(|entry| {
        entry.file_name().to_str().map(|name| {
            let lower = name.to_lowercase(); lower.starts_with(prefix) && lower.ends_with(".jar")
        }).unwrap_or(false)
    });
    let version = entry.as_ref().and_then(|entry| entry.file_name().to_str().map(str::to_string)).and_then(|name| {
        name.strip_suffix(".jar").and_then(|stem| stem.strip_prefix(prefix)).filter(|value| !value.is_empty()).map(str::to_string)
    });
    (entry.is_some(), version)
}

fn fabric_loader_version(versions: &Path) -> Option<String> {
    std::fs::read_dir(versions).ok()?.flatten().filter_map(|entry| entry.file_name().to_str().map(str::to_string)).find_map(|name| {
        let rest = name.strip_prefix("fabric-loader-")?;
        let (loader, game) = rest.split_once("-1.21.1")?;
        (!loader.is_empty() && game.is_empty()).then(|| loader.to_string())
    })
}

pub fn detect(selected: Option<String>) -> DetectionReport {
    let candidate = selected.map(PathBuf::from).or_else(default_game_dir);
    let game = candidate.as_deref().and_then(|p| validate_game_dir(p).ok());
    let launcher = find_launcher();
    if let Some(ref root) = game {
        let mods = root.join("mods");
        let versions = root.join("versions");
        let minecraft_version = versions.join("1.21.1").is_dir().then(|| "1.21.1".to_string());
        let fabric_loader_version = fabric_loader_version(&versions);
        let (fabric_api_installed, fabric_api_version) = matching_jar_version(&mods, "fabric-api-");
        let (autominer_installed, autominer_version) = matching_jar_version(&mods, "autominer-");
        return DetectionReport {
            game_dir: Some(root.to_string_lossy().to_string()), minecraft_found: true, launcher_found: launcher.is_some(),
            version_1211: minecraft_version.is_some(), fabric_installed: fabric_loader_version.is_some(), fabric_api_installed,
            autominer_installed, config_found: root.join("config/autominer.json").is_file(),
            launcher_path: launcher.map(|p| p.to_string_lossy().to_string()), minecraft_version, fabric_loader_version,
            fabric_api_version, autominer_version,
        };
    }
    DetectionReport { game_dir: None, minecraft_found: false, launcher_found: launcher.is_some(), version_1211: false, fabric_installed: false, fabric_api_installed: false, autominer_installed: false, config_found: false, launcher_path: launcher.map(|p| p.to_string_lossy().to_string()), minecraft_version: None, fabric_loader_version: None, fabric_api_version: None, autominer_version: None }
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
