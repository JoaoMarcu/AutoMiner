'use client'

import { invoke } from '@tauri-apps/api/core'

export interface DetectionReport {
  gameDir: string | null
  modsDir: string | null
  minecraftFound: boolean
  minecraftRunning: boolean
  launcherFound: boolean
  version1211: boolean
  fabricInstalled: boolean
  fabricApiInstalled: boolean
  autominerInstalled: boolean
  configFound: boolean
  launcherPath: string | null
  minecraftVersion: string | null
  fabricLoaderVersion: string | null
  fabricApiVersion: string | null
  autominerVersion: string | null
}

export interface ModRelease { version: string; jarName: string; jarUrl: string; sha256?: string; changelog?: string; releaseUrl: string }
export interface InstallResult { modVersion: string; modPath: string; modsDir: string; backupCreated: boolean }
export interface BackupInfo { name: string; path: string; createdAt: number; size: number }

export const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

async function call<T>(command: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!isTauri()) throw new Error('Este recurso está disponível no AutoMiner Manager para Windows.')
  return invoke<T>(command, args)
}

export const managerApi = {
  detect: (gameDir?: string) => call<DetectionReport>('detect_minecraft', { gameDir: gameDir || null }),
  installAll: (gameDir: string) => call<InstallResult>('install_all', { gameDir }),
  checkRelease: () => call<ModRelease>('check_release'),
  loadConfig: (gameDir: string) => call<unknown>('load_config', { gameDir }),
  saveConfig: (gameDir: string, configValue: unknown) => call<void>('save_config', { gameDir, configValue }),
  resetConfig: (gameDir: string) => call<unknown>('reset_config', { gameDir }),
  listBackups: (gameDir: string) => call<BackupInfo[]>('list_backups', { gameDir }),
  restoreBackup: (gameDir: string, backupName: string) => call<void>('restore_backup', { gameDir, backupName }),
  uninstall: (gameDir: string, removeConfig = false) => call<void>('uninstall_mod', { gameDir, removeConfig }),
  openLauncher: () => call<void>('open_launcher'),
}
