import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ network: vi.fn(), updaterLoaded: vi.fn(), settings: vi.fn() }))
vi.mock('electron', () => ({
  app: { getVersion: () => '0.4.0', isPackaged: true, getAppPath: () => 'C:/mock/app' },
  net: { request: mocks.network, fetch: mocks.network }
}))
vi.mock('electron-updater', () => { mocks.updaterLoaded(); throw new Error('Fork must not load electron-updater') })
vi.mock('../electron/store/settings', () => ({ getSettings: mocks.settings }))
import { checkForUpdatesManual, clearCachedUpdateState, getCachedUpdateState, initAutoUpdater,
  quitAndInstallUpdate, startUpdateDownload, syncAutoUpdaterState, triggerBackgroundCheck } from '../electron/main/updater'

beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks() })
afterEach(() => { vi.useRealTimers(); delete process.env.APP_BUILD_TARGET })

describe('fork update isolation for every entry point', () => {
  it.each(['github', 'store'])('%s does not initialize, check, download or install a release', async (target) => {
    process.env.APP_BUILD_TARGET = target
    // Legacy user profiles must not reactivate the removed updater.
    mocks.settings.mockReturnValue({ updateMode: 'auto', autoUpdates: true })
    initAutoUpdater()
    syncAutoUpdaterState()
    triggerBackgroundCheck(0)
    triggerBackgroundCheck()
    await startUpdateDownload()
    quitAndInstallUpdate()
    clearCachedUpdateState()
    expect(getCachedUpdateState()).toBeNull()
    expect(await checkForUpdatesManual()).toEqual({ status: target === 'store' ? 'up-to-date' : 'disabled', version: '0.4.0' })
    await vi.runAllTimersAsync()
    expect(mocks.network).not.toHaveBeenCalled()
    expect(mocks.updaterLoaded).not.toHaveBeenCalled()
    expect(mocks.settings).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })
})
