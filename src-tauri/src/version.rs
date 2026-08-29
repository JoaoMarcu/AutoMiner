use semver::Version;

#[derive(Debug, PartialEq, serde::Serialize)]
pub enum UpdateStatus { NotInstalled, UpToDate, UpdateAvailable, Newer }

/// Normaliza uma tag como "v1.2.3" para "1.2.3".
pub fn normalize(tag: &str) -> String {
    tag.trim().trim_start_matches(['v', 'V']).to_string()
}

pub fn parse(tag: &str) -> Option<Version> {
    Version::parse(&normalize(tag)).ok()
}

pub fn compare(installed: Option<&str>, remote: &str) -> UpdateStatus {
    let remote_v = match parse(remote) { Some(v) => v, None => return UpdateStatus::UpdateAvailable };
    match installed.and_then(parse) {
        None => UpdateStatus::NotInstalled,
        Some(local) if local < remote_v => UpdateStatus::UpdateAvailable,
        Some(local) if local > remote_v => UpdateStatus::Newer,
        Some(_) => UpdateStatus::UpToDate,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn detects_states() {
        assert_eq!(compare(None, "1.0.0"), UpdateStatus::NotInstalled);
        assert_eq!(compare(Some("1.0.0"), "1.0.0"), UpdateStatus::UpToDate);
        assert_eq!(compare(Some("1.0.0"), "v1.1.0"), UpdateStatus::UpdateAvailable);
        assert_eq!(compare(Some("2.0.0"), "1.9.9"), UpdateStatus::Newer);
    }
    #[test]
    fn normalizes_prefix() {
        assert_eq!(normalize("v1.2.3"), "1.2.3");
        assert_eq!(normalize(" V2.0.0 "), "2.0.0");
    }
}
