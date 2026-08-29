use crate::error::{ManagerError, Result};
use sha2::{Digest, Sha256, Sha512};
use std::path::Path;

pub fn client() -> reqwest::Client {
    reqwest::Client::builder()
        .user_agent("AutoMiner-Manager/1.0")
        .build()
        .expect("client")
}

pub fn sha256_hex(bytes: &[u8]) -> String {
    let mut h = Sha256::new();
    h.update(bytes);
    hex::encode(h.finalize())
}

pub fn verify_sha512(bytes: &[u8], expected: &str) -> Result<()> {
    let mut h = Sha512::new();
    h.update(bytes);
    if hex::encode(h.finalize()).eq_ignore_ascii_case(expected) { Ok(()) } else { Err(ManagerError::Checksum) }
}

/// Baixa uma URL para bytes, valida tamanho e (quando fornecido) o checksum SHA-256.
pub async fn download_verified(url: &str, expected_sha256: Option<&str>) -> Result<Vec<u8>> {
    let parsed = url::Url::parse(url).map_err(|_| ManagerError::Invalid("URL inválida".into()))?;
    if parsed.scheme() != "https" {
        return Err(ManagerError::Invalid("Apenas HTTPS é permitido".into()));
    }
    let resp = client().get(url).send().await?;
    if !resp.status().is_success() {
        return Err(ManagerError::Network(format!("HTTP {}", resp.status())));
    }
    let bytes = resp.bytes().await?.to_vec();
    if bytes.is_empty() {
        return Err(ManagerError::Invalid("Arquivo vazio".into()));
    }
    if let Some(expected) = expected_sha256 {
        if !expected.is_empty() && sha256_hex(&bytes).to_lowercase() != expected.to_lowercase() {
            return Err(ManagerError::Checksum);
        }
    }
    Ok(bytes)
}

/// Escrita atômica: grava em `.tmp` e renomeia sobre o destino final.
pub fn write_atomic(dest: &Path, bytes: &[u8]) -> Result<()> {
    if let Some(parent) = dest.parent() { std::fs::create_dir_all(parent)?; }
    let tmp = dest.with_extension("tmp");
    std::fs::write(&tmp, bytes)?;
    std::fs::rename(&tmp, dest)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn hashes_known_value() {
        assert_eq!(sha256_hex(b""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    }
    #[test]
    fn atomic_write_roundtrip() {
        let dir = tempfile::tempdir().unwrap();
        let dest = dir.path().join("out.bin");
        write_atomic(&dest, b"hello").unwrap();
        assert_eq!(std::fs::read(&dest).unwrap(), b"hello");
    }
}
