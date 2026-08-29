import type { AutoMinerConfig, Telemetry } from "./autominer-types"

const BASE = "http://127.0.0.1:8765/api"

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } })
  if (!response.ok) throw new Error(`AutoMiner API: ${response.status}`)
  return response.json() as Promise<T>
}

export const autoMinerApi = {
  status: () => request<Telemetry>("/status"),
  config: () => request<AutoMinerConfig>("/config"),
  saveConfig: (config: AutoMinerConfig) => request<AutoMinerConfig>("/config", { method: "PUT", body: JSON.stringify(config) }),
  command: (command: "start" | "pause" | "resume" | "stop" | "reload") => request<Telemetry>(`/commands/${command}`, { method: "POST" }),
  eventsUrl: `${BASE}/events`,
}
