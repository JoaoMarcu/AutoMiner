use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum ManagerError {
    #[error("Diretório do Minecraft não encontrado")]
    MinecraftNotFound,
    #[error("Caminho inválido ou fora do escopo permitido")]
    InvalidPath,
    #[error("Falha de rede: {0}")]
    Network(String),
    #[error("Verificação de integridade falhou (checksum)")]
    Checksum,
    #[error("Nenhuma release válida encontrada")]
    NoRelease,
    #[error("Repositório do AutoMiner ainda não configurado")]
    RepositoryNotConfigured,
    #[error("Operação de arquivo falhou: {0}")]
    Io(String),
    #[error("Dados inválidos: {0}")]
    Invalid(String),
}

impl From<std::io::Error> for ManagerError {
    fn from(e: std::io::Error) -> Self { ManagerError::Io(e.to_string()) }
}
impl From<reqwest::Error> for ManagerError {
    fn from(e: reqwest::Error) -> Self { ManagerError::Network(e.to_string()) }
}

impl Serialize for ManagerError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}

pub type Result<T> = std::result::Result<T, ManagerError>;
