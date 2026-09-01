export type MinerState = "STOPPED" | "RUNNING" | "PAUSED" | "SEARCHING" | "AIMING" | "MINING" | "RECOVERING" | "ERROR"

export interface BlockRule { id: string; enabled: boolean }
export interface AutoMinerConfig {
  schemaVersion: number
  enabledBlocks: BlockRule[]
  movement: { forward: boolean; sprint: boolean; sideMovement: boolean; baseSpeed: number; lateralRange: number; verticalUp: number; verticalDown: number; searchDistance: number }
  camera: { yawSpeed: number; pitchSpeed: number; smoothing: number; horizontalLimit: number; verticalLimit: number; variation: number }
  randomness: { enabled: boolean; amount: number; targetNoise: number; timingNoise: number; historyPenalty: number }
  mining: { breakDelayMs: number; retargetDelayMs: number; requireTool: boolean; autoJump: boolean; jumpCooldownMs: number }
  advanced: { hud: boolean; apiPort: number; historySize: number }
}
export interface Vec3 { x: number; y: number; z: number }
export interface Telemetry {
  state: MinerState | null; online: boolean; blocksBroken: number | null; activeSeconds: number | null; speed: number | null
  player: Vec3 | null; camera: { yaw: number; pitch: number } | null; target: ({ id: string; position: Vec3; distance: number } | null)
  history: Array<{ id: string; position: Vec3 }>; lastError?: string
}

export const DEFAULT_CONFIG: AutoMinerConfig = {
  schemaVersion: 2,
  enabledBlocks: [
    "minecraft:lapis_ore", "minecraft:deepslate_lapis_ore", "minecraft:emerald_ore",
    "minecraft:deepslate_emerald_ore", "minecraft:diamond_ore", "minecraft:deepslate_diamond_ore",
    "minecraft:lapis_block", "minecraft:emerald_block", "minecraft:diamond_block",
  ].map((id) => ({ id, enabled: true })),
  movement: { forward: true, sprint: true, sideMovement: false, baseSpeed: 1, lateralRange: 3, verticalUp: 2, verticalDown: 2, searchDistance: 6 },
  camera: { yawSpeed: 6, pitchSpeed: 5, smoothing: 0.82, horizontalLimit: 75, verticalLimit: 60, variation: 0.7 },
  randomness: { enabled: true, amount: 0.35, targetNoise: 0.12, timingNoise: 0.08, historyPenalty: 1.8 },
  mining: { breakDelayMs: 120, retargetDelayMs: 180, requireTool: true, autoJump: true, jumpCooldownMs: 900 },
  advanced: { hud: true, apiPort: 8765, historySize: 8 },
}

export const OFFLINE_TELEMETRY: Telemetry = { state: null, online: false, blocksBroken: null, activeSeconds: null, speed: null, player: null, camera: null, target: null, history: [] }
