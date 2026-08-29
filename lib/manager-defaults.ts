import type { DetectionReport } from './tauri-manager'

export const EMPTY_DETECTION: DetectionReport = {
  gameDir: null,
  minecraftFound: false,
  launcherFound: false,
  version1211: false,
  fabricInstalled: false,
  fabricApiInstalled: false,
  autominerInstalled: false,
  configFound: false,
  launcherPath: null,
  minecraftVersion: null,
  fabricLoaderVersion: null,
  fabricApiVersion: null,
  autominerVersion: null,
}
