use crate::{download::write_atomic, error::{ManagerError, Result}};
use serde_json::{json, Value};
use std::path::{Path, PathBuf};

pub fn path(game: &Path) -> PathBuf { game.join("config/autominer.json") }

pub fn defaults() -> Value {
    json!({
      "schemaVersion": 2,
      "enabledBlocks": [
        {"id":"minecraft:lapis_ore","enabled":true,"priority":8},
        {"id":"minecraft:deepslate_lapis_ore","enabled":true,"priority":8},
        {"id":"minecraft:emerald_ore","enabled":true,"priority":9},
        {"id":"minecraft:deepslate_emerald_ore","enabled":true,"priority":9},
        {"id":"minecraft:diamond_ore","enabled":true,"priority":10},
        {"id":"minecraft:deepslate_diamond_ore","enabled":true,"priority":10},
        {"id":"minecraft:lapis_block","enabled":true,"priority":5},
        {"id":"minecraft:emerald_block","enabled":true,"priority":6},
        {"id":"minecraft:diamond_block","enabled":true,"priority":7}
      ],
      "movement":{"forward":true,"sprint":true,"sideMovement":false,"baseSpeed":1.0,"lateralRange":3,"verticalUp":2,"verticalDown":2,"searchDistance":6},
      "camera":{"yawSpeed":6.0,"pitchSpeed":5.0,"smoothing":0.82,"horizontalLimit":75.0,"verticalLimit":60.0,"variation":0.7},
      "randomness":{"enabled":true,"amount":0.35,"targetNoise":0.12,"timingNoise":0.08,"historyPenalty":1.8},
      "mining":{"breakDelayMs":120,"retargetDelayMs":180,"requireTool":true,"autoJump":true,"jumpCooldownMs":900},
      "advanced":{"hud":true,"apiPort":8765,"historySize":8}
    })
}

pub fn validate(value: &Value) -> Result<()> {
    let obj = value.as_object().ok_or_else(|| ManagerError::Invalid("Configuração deve ser um objeto".into()))?;
    let port = obj.get("advanced").and_then(|v| v.get("apiPort")).and_then(Value::as_u64).unwrap_or(8765);
    if !(1024..=65535).contains(&port) { return Err(ManagerError::Invalid("Porta fora do intervalo permitido".into())); }
    let blocks = obj.get("enabledBlocks").and_then(Value::as_array).ok_or_else(|| ManagerError::Invalid("Lista de blocos ausente".into()))?;
    if blocks.is_empty() || blocks.len() > 64 { return Err(ManagerError::Invalid("Quantidade de blocos inválida".into())); }
    for block in blocks {
        let id = block.get("id").and_then(Value::as_str).unwrap_or("");
        if !id.starts_with("minecraft:") || id.len() > 128 { return Err(ManagerError::Invalid("ID de bloco inválido".into())); }
    }
    Ok(())
}

pub fn load(game: &Path) -> Result<Value> {
    let p = path(game);
    if !p.is_file() { return Ok(defaults()); }
    let mut value: Value = serde_json::from_slice(&std::fs::read(p)?).map_err(|e| ManagerError::Invalid(e.to_string()))?;
    if value.get("schemaVersion").is_none() { value["schemaVersion"] = json!(2); }
    validate(&value)?;
    Ok(value)
}

pub fn save(game: &Path, value: &Value) -> Result<()> {
    validate(value)?;
    let bytes = serde_json::to_vec_pretty(value).map_err(|e| ManagerError::Invalid(e.to_string()))?;
    write_atomic(&path(game), &bytes)
}
