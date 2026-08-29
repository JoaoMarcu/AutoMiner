use crate::error::{ManagerError, Result};
use std::path::{Path, PathBuf};

/// Garante que `child` está contido dentro de `root` após canonicalização.
/// Impede path traversal em nomes de arquivo vindos de fontes remotas.
pub fn ensure_within(root: &Path, child: &Path) -> Result<PathBuf> {
    let root_c = root.canonicalize().map_err(|_| ManagerError::InvalidPath)?;
    // O filho pode ainda não existir; canonicaliza o pai e reanexa o nome final.
    let parent = child.parent().ok_or(ManagerError::InvalidPath)?;
    let name = child.file_name().ok_or(ManagerError::InvalidPath)?;
    let parent_c = parent.canonicalize().map_err(|_| ManagerError::InvalidPath)?;
    let full = parent_c.join(name);
    if full.starts_with(&root_c) { Ok(full) } else { Err(ManagerError::InvalidPath) }
}

/// Rejeita nomes de arquivo com separadores, componentes relativos ou caracteres perigosos.
pub fn safe_file_name(name: &str) -> Result<String> {
    let trimmed = name.trim();
    if trimmed.is_empty()
        || trimmed.contains('/')
        || trimmed.contains('\\')
        || trimmed.contains("..")
        || trimmed.contains(':')
        || trimmed.contains('\0')
    {
        return Err(ManagerError::InvalidPath);
    }
    Ok(trimmed.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_traversal_names() {
        assert!(safe_file_name("../evil.jar").is_err());
        assert!(safe_file_name("a/b.jar").is_err());
        assert!(safe_file_name("c:\\x.jar").is_err());
        assert!(safe_file_name("AutoMiner-1.0.0.jar").is_ok());
    }

    #[test]
    fn ensure_within_blocks_escape() {
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path().join("mods");
        std::fs::create_dir_all(&root).unwrap();
        let ok = root.join("AutoMiner.jar");
        assert!(ensure_within(&root, &ok).is_ok());
        let escape = dir.path().join("outside.jar");
        assert!(ensure_within(&root, &escape).is_err());
    }
}
