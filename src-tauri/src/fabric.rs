use crate::{download, error::{ManagerError, Result}, minecraft};
use serde::Deserialize;
use std::{path::Path, process::Stdio};

#[derive(Deserialize)]
struct InstallerVersion { version: String, stable: bool }

pub async fn install(game_dir: &str) -> Result<String> {
    let game = minecraft::validate_game_dir(Path::new(game_dir))?;
    let installers: Vec<InstallerVersion> = download::client()
        .get("https://meta.fabricmc.net/v2/versions/installer")
        .send().await?.error_for_status()?.json().await?;
    let installer = installers.iter().find(|v| v.stable).or_else(|| installers.first()).ok_or(ManagerError::NoRelease)?;
    let url = format!("https://maven.fabricmc.net/net/fabricmc/fabric-installer/{0}/fabric-installer-{0}.jar", installer.version);
    let bytes = download::download_verified(&url, None).await?;
    if !bytes.starts_with(b"PK") { return Err(ManagerError::Invalid("Instalador Fabric inválido".into())); }
    let temp = std::env::temp_dir().join(format!("fabric-installer-{}.jar", installer.version));
    download::write_atomic(&temp, &bytes)?;
    let status = tokio::process::Command::new("java")
        .args(["-jar", temp.to_str().ok_or(ManagerError::InvalidPath)?, "client", "-mcversion", "1.21.1", "-dir", game.to_str().ok_or(ManagerError::InvalidPath)?, "-noprofile"])
        .stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::piped()).status().await
        .map_err(|e| ManagerError::Invalid(format!("Java 21 não encontrado: {e}")))?;
    let _ = std::fs::remove_file(temp);
    if !status.success() { return Err(ManagerError::Invalid("Instalador Fabric retornou erro".into())); }
    Ok(installer.version.clone())
}
