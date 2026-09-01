use crate::{download, error::{ManagerError, Result}, paths::safe_file_name};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
struct GithubRelease { tag_name: String, body: Option<String>, html_url: String, assets: Vec<GithubAsset> }
#[derive(Debug, Deserialize)]
struct GithubAsset { name: String, browser_download_url: String }

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModRelease { pub version: String, pub jar_name: String, pub jar_url: String, pub sha256: Option<String>, pub changelog: Option<String>, pub release_url: String }

pub fn repository() -> Result<String> {
    let repo = option_env!("AUTOMINER_GITHUB_REPO").unwrap_or("JoaoMarcu/AutoMiner").trim();
    let mut parts = repo.split('/');
    let valid = parts.next().is_some_and(|p| !p.is_empty())
        && parts.next().is_some_and(|p| !p.is_empty())
        && parts.next().is_none();
    valid.then(|| repo.to_string()).ok_or(ManagerError::RepositoryNotConfigured)
}

pub async fn latest_mod_release() -> Result<ModRelease> {
    let repo = repository()?;
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
    let asset = checksum_asset.ok_or_else(|| ManagerError::Invalid("Release sem checksum SHA-256".into()))?;
    let bytes = download::download_verified(&asset.browser_download_url, None).await?;
    let text = String::from_utf8(bytes).map_err(|_| ManagerError::Invalid("Checksum inválido".into()))?;
    let sha256 = text.split_whitespace().next().filter(|value| value.len() == 64 && value.chars().all(|c| c.is_ascii_hexdigit())).map(str::to_string)
        .ok_or_else(|| ManagerError::Invalid("Checksum SHA-256 malformado".into()))?;
    Ok(ModRelease { version, jar_name: jar.name.clone(), jar_url: jar.browser_download_url.clone(), sha256: Some(sha256), changelog: release.body, release_url: release.html_url })
}
