export type MinerState = "STOPPED" | "RUNNING" | "PAUSED" | "SEARCHING" | "AIMING" | "MINING" | "RECOVERING" | "ERROR"

export interface BlockRule { id: string; enabled: boolean; priority: number }
export interface AutoMinerConfig {
  enabledBlocks: BlockRule[]
  movement: { sprint: boolean; baseSpeed: number; lateralRange: number; verticalUp: number; verticalDown: number; searchDistance: number }
  camera: { yawSpeed: number; pitchSpeed: number; smoothing: number; horizontalLimit: number; verticalLimit: number; variation: number }
  randomness: { enabled: boolean; targetNoise: number; timingNoise: number; historyPenalty: number }
  mining: { breakDelayMs: number; retargetDelayMs: number; requireTool: boolean; autoJump: boolean; jumpCooldownMs: number }
  advanced: { hud: boolean; apiPort: number; historySize: number }
}
export interface Vec3 { x: number; y: number; z: number }
export interface Telemetry {
  state: MinerState; online: boolean; blocksBroken: number; activeSeconds: number; speed: number
  player: Vec3; camera: { yaw: number; pitch: number }; target: ({ id: string; position: Vec3; distance: number } | null)
  history: Array<{ id: string; position: Vec3 }>; lastError?: string
}

export const DEFAULT_CONFIG: AutoMinerConfig = {
  enabledBlocks: [
    ["minecraft:coal_ore", 6], ["minecraft:iron_ore", 7], ["minecraft:copper_ore", 4],
    ["minecraft:gold_ore", 8], ["minecraft:redstone_ore", 5], ["minecraft:lapis_ore", 6],
    ["minecraft:diamond_ore", 10], ["minecraft:emerald_ore", 10], ["minecraft:deepslate_diamond_ore", 10],
  ].map(([id, priority]) => ({ id: String(id), enabled: true, priority: Number(priority) })),
  movement: { sprint: true, baseSpeed: 1, lateralRange: 4, verticalUp: 3, verticalDown: 2, searchDistance: 6 },
  camera: { yawSpeed: 6, pitchSpeed: 5, smoothing: 0.82, horizontalLimit: 75, verticalLimit: 60, variation: 0.7 },
  randomness: { enabled: true, targetNoise: 0.12, timingNoise: 0.08, historyPenalty: 1.8 },
  mining: { breakDelayMs: 120, retargetDelayMs: 180, requireTool: true, autoJump: true, jumpCooldownMs: 900 },
  advanced: { hud: true, apiPort: 8765, historySize: 12 },
}

export const OFFLINE_TELEMETRY: Telemetry = { state: "STOPPED", online: false, blocksBroken: 0, activeSeconds: 0, speed: 0, player: { x: 0, y: 0, z: 0 }, camera: { yaw: 0, pitch: 0 }, target: null, history: [] }
