use crate::error::{ManagerError, Result};
use serde::Serialize;
use serde_json::Value;
use std::path::{Path, PathBuf};

const GAME_VERSION: &str = "1.21.1";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectionReport {
    pub game_dir: Option<String>,
    pub mods_dir: Option<String>,
    pub minecraft_found: bool,
    pub minecraft_running: bool,
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

fn normalized_candidate(path: &Path) -> PathBuf {
    if path.file_name().and_then(|name| name.to_str()).is_some_and(|name| name.eq_ignore_ascii_case("mods")) {
        path.parent().unwrap_or(path).to_path_buf()
    } else {
        path.to_path_buf()
    }
}

pub fn validate_game_dir(path: &Path) -> Result<PathBuf> {
    let candidate = normalized_candidate(path);
    if !candidate.is_dir() { return Err(ManagerError::MinecraftNotFound); }
    let versions = candidate.join("versions");
    let has_target_version = versions.join(GAME_VERSION).is_dir() || fabric_loader_version(&versions).is_some();
    let has_instance_metadata = candidate.join("instance.cfg").is_file()
        || candidate.join("minecraftinstance.json").is_file()
        || candidate.join("launcher_profiles.json").is_file()
        || candidate.join("launcher_profiles_microsoft_store.json").is_file();
    let has_game_structure = versions.is_dir() || candidate.join("libraries").is_dir() || candidate.join("mods").is_dir();
    if !has_target_version && !(has_instance_metadata && has_game_structure) {
        return Err(ManagerError::Invalid(format!("A pasta selecionada não contém uma instalação ou instância Minecraft {GAME_VERSION}")));
    }
    candidate.canonicalize().map_err(Into::into)
}

fn matching_jar_version(dir: &Path, prefix: &str) -> (bool, Option<String>) {
    let mut entries = std::fs::read_dir(dir).ok().into_iter().flatten().flatten()
        .filter_map(|entry| entry.file_name().to_str().map(str::to_string).map(|name| (name, entry.path())))
        .filter(|(name, path)| name.to_lowercase().starts_with(prefix) && name.to_lowercase().ends_with(".jar") && path.is_file())
        .collect::<Vec<_>>();
    entries.sort_by(|a, b| a.0.cmp(&b.0));
    let name = entries.last().map(|(name, _)| name.clone());
    let version = name.as_deref().and_then(|name| name.strip_suffix(".jar")).and_then(|stem| {
        let lower = stem.to_lowercase();
        lower.strip_prefix(prefix).map(str::to_string)
    }).filter(|value| !value.is_empty());
    (name.is_some(), version)
}

fn fabric_loader_version(versions: &Path) -> Option<String> {
    std::fs::read_dir(versions).ok()?.flatten().filter_map(|entry| entry.file_name().to_str().map(str::to_string)).find_map(|name| {
        let rest = name.strip_prefix("fabric-loader-")?;
        let (loader, game) = rest.split_once(&format!("-{GAME_VERSION}"))?;
        (!loader.is_empty() && game.is_empty()).then(|| loader.to_string())
    })
}

fn is_target_version_id(id: &str) -> bool { id.contains(GAME_VERSION) && id.to_lowercase().contains("fabric") }

fn vanilla_profile_dirs(root: &Path) -> Vec<PathBuf> {
    ["launcher_profiles.json", "launcher_profiles_microsoft_store.json"].into_iter()
        .filter_map(|name| std::fs::read(root.join(name)).ok())
        .filter_map(|bytes| serde_json::from_slice::<Value>(&bytes).ok())
        .filter_map(|json| json.get("profiles").and_then(Value::as_object).cloned())
        .flat_map(|profiles| profiles.into_values())
        .filter(|profile| profile.get("lastVersionId").and_then(Value::as_str).is_some_and(is_target_version_id))
        .filter_map(|profile| profile.get("gameDir").and_then(Value::as_str).map(PathBuf::from))
        .collect()
}

fn tlauncher_profile_dirs(root: &Path) -> Vec<PathBuf> {
    std::fs::read(root.join("tlauncher_profiles.json")).ok()
        .and_then(|bytes| serde_json::from_slice::<Value>(&bytes).ok())
        .map(|json| {
            json.get("profiles").and_then(Value::as_object).into_iter().flatten()
                .flat_map(|(_, profiles)| profiles.as_object().into_iter().flatten())
                .flat_map(|(_, profile)| profile.as_object().cloned())
                .filter(|profile| profile.get("lastVersionId").and_then(Value::as_str).is_some_and(is_target_version_id))
                .filter_map(|profile| profile.get("gameDir").and_then(Value::as_str).map(PathBuf::from))
                .collect::<Vec<_>>()
        })
        .unwrap_or_default()
}

fn profile_game_dirs(root: &Path) -> Vec<PathBuf> {
    let mut dirs = vanilla_profile_dirs(root);
    dirs.extend(tlauncher_profile_dirs(root));
    dirs.into_iter().filter(|path| path.is_dir()).collect()
}

pub fn resolve_mods_dir(game: &Path) -> PathBuf {
    profile_game_dirs(game).into_iter().next().map(|dir| dir.join("mods"))
        .unwrap_or_else(|| game.join("mods"))
}

#[cfg(target_os = "windows")]
fn minecraft_running(game: Option<&Path>) -> bool {
    let output = std::process::Command::new("powershell.exe")
        .args(["-NoProfile", "-NonInteractive", "-Command", "Get-CimInstance Win32_Process | Where-Object { $_.Name -match '^java(w)?\\.exe$' } | Select-Object -ExpandProperty CommandLine"])
        .output();
    let Ok(output) = output else { return false; };
    let commands = String::from_utf8_lossy(&output.stdout).to_lowercase();
    let minecraft = commands.contains("net.minecraft.client.main.main")
        || commands.contains("--versiontype fabric")
        || commands.contains("fabric-loader")
        || commands.contains("tlauncher");
    if !minecraft { return false; }
    game.and_then(Path::to_str).map(|path| commands.contains(&path.to_lowercase())).unwrap_or(true)
}

#[cfg(not(target_os = "windows"))]
fn minecraft_running(_game: Option<&Path>) -> bool { false }

pub fn detect(selected: Option<String>) -> DetectionReport {
    let candidate = selected.map(PathBuf::from).or_else(default_game_dir);
    let game = candidate.as_deref().and_then(|path| validate_game_dir(path).ok());
    let launcher = find_launcher();
    let running = minecraft_running(game.as_deref());
    if let Some(ref root) = game {
        let mods = resolve_mods_dir(root);
        let versions = root.join("versions");
        let fabric_loader_version = fabric_loader_version(&versions);
        let version_1211 = versions.join(GAME_VERSION).is_dir() || fabric_loader_version.is_some();
        let (fabric_api_installed, fabric_api_version) = matching_jar_version(&mods, "fabric-api-");
        let (autominer_installed, autominer_version) = matching_jar_version(&mods, "autominer-");
        return DetectionReport {
            game_dir: Some(root.to_string_lossy().into()), mods_dir: Some(mods.to_string_lossy().into()), minecraft_found: true,
            minecraft_running: running, launcher_found: launcher.is_some(), version_1211, fabric_installed: fabric_loader_version.is_some(),
            fabric_api_installed, autominer_installed, config_found: root.join("config/autominer.json").is_file(),
            launcher_path: launcher.map(|path| path.to_string_lossy().into()),
            minecraft_version: version_1211.then(|| GAME_VERSION.to_string()), fabric_loader_version, fabric_api_version, autominer_version,
        };
    }
    DetectionReport { game_dir: None, mods_dir: None, minecraft_found: false, minecraft_running: running, launcher_found: launcher.is_some(), version_1211: false, fabric_installed: false, fabric_api_installed: false, autominer_installed: false, config_found: false, launcher_path: launcher.map(|path| path.to_string_lossy().into()), minecraft_version: None, fabric_loader_version: None, fabric_api_version: None, autominer_version: None }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn is_target_version_id_requires_fabric_and_game_version() {
        assert!(is_target_version_id("fabric-loader-0.15.11-1.21.1"));
        assert!(!is_target_version_id("1.21.1"));
        assert!(!is_target_version_id("fabric-loader-0.15.11-1.20.1"));
    }

    #[test]
    fn matching_jar_version_picks_lexicographically_last_name() {
        // matching_jar_version orders file names as plain strings (not semver-aware),
        // so it picks whichever name sorts last alphabetically.
        let dir = tempdir().unwrap();
        fs::write(dir.path().join("fabric-api-0.95.0.jar"), b"").unwrap();
        fs::write(dir.path().join("fabric-api-0.99.0.jar"), b"").unwrap();
        fs::write(dir.path().join("not-a-mod.txt"), b"").unwrap();
        let (found, version) = matching_jar_version(dir.path(), "fabric-api-");
        assert!(found);
        assert_eq!(version.as_deref(), Some("0.99.0"));
    }

    #[test]
    fn matching_jar_version_none_when_absent() {
        let dir = tempdir().unwrap();
        let (found, version) = matching_jar_version(dir.path(), "autominer-");
        assert!(!found);
        assert!(version.is_none());
    }

    #[test]
    fn fabric_loader_version_detects_matching_folder() {
        let dir = tempdir().unwrap();
        fs::create_dir_all(dir.path().join(format!("fabric-loader-0.15.11-{GAME_VERSION}"))).unwrap();
        fs::create_dir_all(dir.path().join("1.20.4")).unwrap();
        assert_eq!(fabric_loader_version(dir.path()).as_deref(), Some("0.15.11"));
    }

    #[test]
    fn fabric_loader_version_none_without_match() {
        let dir = tempdir().unwrap();
        fs::create_dir_all(dir.path().join("1.20.4")).unwrap();
        assert!(fabric_loader_version(dir.path()).is_none());
    }

    #[test]
    fn validate_game_dir_accepts_direct_version_install() {
        let dir = tempdir().unwrap();
        fs::create_dir_all(dir.path().join("versions").join(GAME_VERSION)).unwrap();
        assert!(validate_game_dir(dir.path()).is_ok());
    }

    #[test]
    fn validate_game_dir_accepts_mods_subfolder_as_alias() {
        let dir = tempdir().unwrap();
        fs::create_dir_all(dir.path().join("versions").join(GAME_VERSION)).unwrap();
        let mods = dir.path().join("mods");
        fs::create_dir_all(&mods).unwrap();
        assert!(validate_game_dir(&mods).is_ok());
    }

    #[test]
    fn validate_game_dir_rejects_unrelated_folder() {
        let dir = tempdir().unwrap();
        assert!(validate_game_dir(dir.path()).is_err());
    }

    #[test]
    fn tlauncher_profile_dirs_parses_nested_profiles() {
        let root = tempdir().unwrap();
        let instance = tempdir().unwrap();
        let json = serde_json::json!({
            "profiles": {
                "group1": {
                    "profileA": {
                        "lastVersionId": format!("fabric-loader-0.15.11-{GAME_VERSION}"),
                        "gameDir": instance.path().to_string_lossy()
                    }
                }
            }
        });
        fs::write(root.path().join("tlauncher_profiles.json"), serde_json::to_vec(&json).unwrap()).unwrap();
        let dirs = tlauncher_profile_dirs(root.path());
        assert_eq!(dirs.len(), 1);
        assert_eq!(dirs[0], instance.path());
    }

    #[test]
    fn tlauncher_profile_dirs_empty_when_file_missing() {
        let root = tempdir().unwrap();
        assert!(tlauncher_profile_dirs(root.path()).is_empty());
    }

    #[test]
    fn resolve_mods_dir_falls_back_to_game_mods() {
        let dir = tempdir().unwrap();
        assert_eq!(resolve_mods_dir(dir.path()), dir.path().join("mods"));
    }
}

pub fn find_launcher() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        let candidates = [
            dirs::data_dir().map(|p| p.join(".minecraft/MinecraftLauncher.exe")),
            std::env::var_os("ProgramFiles(x86)").map(PathBuf::from).map(|p| p.join("Minecraft Launcher/MinecraftLauncher.exe")),
            std::env::var_os("ProgramFiles").map(PathBuf::from).map(|p| p.join("Minecraft Launcher/MinecraftLauncher.exe")),
            std::env::var_os("ProgramFiles(x86)").map(PathBuf::from).map(|p| p.join("TLauncher/TLauncher.exe")),
            std::env::var_os("ProgramFiles").map(PathBuf::from).map(|p| p.join("TLauncher/TLauncher.exe")),
            dirs::data_local_dir().map(|p| p.join("TLauncher/TLauncher.exe")),
            dirs::home_dir().map(|p| p.join("AppData/Local/TLauncher/TLauncher.exe")),
            dirs::desktop_dir().map(|p| p.join("TLauncher.exe")),
        ];
        candidates.into_iter().flatten().find(|p| p.is_file())
    }
    #[cfg(target_os = "macos")]
    {
        let candidates = [
            Some(PathBuf::from("/Applications/TLauncher.app")),
            dirs::home_dir().map(|p| p.join("Applications/TLauncher.app")),
        ];
        candidates.into_iter().flatten().find(|p| p.exists())
    }
    #[cfg(target_os = "linux")]
    {
        let candidates = [
            dirs::home_dir().map(|p| p.join(".local/share/TLauncher/TLauncher.jar")),
            dirs::home_dir().map(|p| p.join("TLauncher.jar")),
            Some(PathBuf::from("/opt/TLauncher/TLauncher.jar")),
        ];
        candidates.into_iter().flatten().find(|p| p.is_file())
    }
}
