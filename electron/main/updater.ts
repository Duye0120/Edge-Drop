import { app } from 'electron'
import { isStoreBuild } from './config'

export interface CachedUpdateInfo {
  hasUpdate: boolean
  latestVersion: string
  downloaded: boolean
  downloadProgress?: { percent: number; bytesPerSecond?: number; transferred?: number; total?: number }
}

/**
 * This fork has no release/update channel. Never initialize electron-updater,
 * query upstream releases, download or install an upstream binary, even when
 * an older profile has updateMode=auto. Re-enable only with a fork-owned feed.
 */
export function getCachedUpdateState(): CachedUpdateInfo | null { return null }
export function clearCachedUpdateState(): void { /* no update state in this fork */ }
export function quitAndInstallUpdate(): void { /* deliberately disabled */ }
export function syncAutoUpdaterState(): void { /* deliberately disabled */ }
export function triggerBackgroundCheck(_delayMs = 3000): void { /* deliberately disabled */ }
export async function startUpdateDownload(): Promise<void> { /* deliberately disabled */ }
export function initAutoUpdater(): void { /* deliberately disabled */ }
export async function checkForUpdatesManual(): Promise<{ status: string; version?: string; error?: string }> {
  return isStoreBuild()
    ? { status: 'up-to-date', version: app.getVersion() }
    : { status: 'disabled', version: app.getVersion() }
}
