use crate::{download, error::{ManagerError, Result}, paths::safe_file_name};
use serde::{Deserialize, Serialize};

const FALLBACK_REPO: &str = "AutoMinerDev/AutoMiner";

#[derive(Debug, Deserialize)]
struct GithubRelease { tag_name: String, assets: Vec<GithubAsset> }
#[derive(Debug, Deserialize)]
struct GithubAsset { name: String, browser_download_url: String }

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModRelease { pub version: String, pub jar_name: String, pub jar_url: String, pub sha256: Option<String> }

pub fn repository() -> String {
    option_env!("AUTOMINER_GITHUB_REPO").unwrap_or(FALLBACK_REPO).to_string()
}

pub async fn latest_mod_release() -> Result<ModRelease> {
    let repo = repository();
    let url = format!("https://api.github.com/repos/{repo}/releases/latest");
    let release: GithubRelease = download::client().get(url).send().await?.error_for_status()?.json().await?;
    let version = crate::version::normalize(&release.tag_name);
    let prefix = format!("autominer-{version}").to_lowercase();
    let jar = release.assets.iter().find(|a| a.name.to_lowercase() == format!("{prefix}.jar")).ok_or(ManagerError::NoRelease)?;
    safe_file_name(&jar.name)?;
    let checksum_asset = release.assets.iter().find(|a| {
        let n = a.name.to_lowercase();
        n == format!("{prefix}.jar.sha256") || n == format!("{prefix}.sha256")
    });
    let sha256 = if let Some(asset) = checksum_asset {
        let bytes = download::download_verified(&asset.browser_download_url, None).await?;
        let text = String::from_utf8(bytes).map_err(|_| ManagerError::Invalid("Checksum inválido".into()))?;
        text.split_whitespace().next().map(str::to_string)
    } else { None };
    Ok(ModRelease { version, jar_name: jar.name.clone(), jar_url: jar.browser_download_url.clone(), sha256 })
}

#[derive(Debug, Deserialize)]
struct ModrinthVersion { files: Vec<ModrinthFile> }
#[derive(Debug, Deserialize)]
struct ModrinthFile { url: String, filename: String, primary: bool, hashes: ModrinthHashes }
#[derive(Debug, Deserialize)]
struct ModrinthHashes { sha512: Option<String>, sha1: Option<String> }

pub async fn latest_fabric_api() -> Result<(String, String)> {
    let url = "https://api.modrinth.com/v2/project/P7dR8mSH/version?loaders=%5B%22fabric%22%5D&game_versions=%5B%221.21.1%22%5D";
    let versions: Vec<ModrinthVersion> = download::client().get(url).send().await?.error_for_status()?.json().await?;
    let file = versions.first().and_then(|v| v.files.iter().find(|f| f.primary).or_else(|| v.files.first())).ok_or(ManagerError::NoRelease)?;
    let _available_hash = file.hashes.sha512.as_ref().or(file.hashes.sha1.as_ref());
    safe_file_name(&file.filename)?;
    Ok((file.filename.clone(), file.url.clone()))
}
