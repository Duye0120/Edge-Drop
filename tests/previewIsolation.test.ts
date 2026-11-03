import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import { APP_IDENTITY } from '../shared/identity'

const electron = vi.hoisted(() => ({ appData: '', paths: new Map<string, string>(), setName: vi.fn() }))
vi.mock('electron', () => ({ app: {
  setName: electron.setName,
  getPath: (name: string) => name === 'appData' ? electron.appData : electron.paths.get(name),
  setPath: (name: string, value: string) => electron.paths.set(name, value)
} }))
import { configurePreviewIdentity } from '../electron/main/identity'

const dirs: string[] = []
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }) })

describe('preview release isolation', () => {
  it('selects a separate profile and browser session without migrating or modifying upstream data', () => {
    electron.appData = mkdtempSync(join(tmpdir(), 'edge-drop-profile-test-'))
    dirs.push(electron.appData)
    const original = join(electron.appData, 'edge-drop')
    mkdirSync(original)
    const saved = new Map([
      ['settings.json', '{"launchAtLogin":true,"toggleHotkey":"Alt+C"}'],
      ['history.json', '[{"text":"private clipboard"}]'],
      ['board.json', '{"notes":["original notes"]}']
    ])
    for (const [name, content] of saved) writeFileSync(join(original, name), content)
    configurePreviewIdentity()
    configurePreviewIdentity() // Reinitializing must also be safe.
    expect(electron.setName).toHaveBeenCalledWith(APP_IDENTITY.packageName)
    expect(electron.paths.get('userData')).toBe(join(electron.appData, APP_IDENTITY.dataDirectory))
    expect(electron.paths.get('sessionData')).toBe(join(electron.appData, APP_IDENTITY.dataDirectory, 'session'))
    for (const [name, content] of saved) expect(readFileSync(join(original, name), 'utf8')).toBe(content)
    expect(APP_IDENTITY.dataDirectory).not.toBe('edge-drop')
  })

  it('ships an independent installer identity and no update feed or upstream cleanup', () => {
    const require = createRequire(import.meta.url)
    const config = require('../electron-builder.preview.cjs')
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
    expect(pkg.name).toBe(APP_IDENTITY.packageName)
    expect(config.appId).toBe(APP_IDENTITY.appId)
    expect(config.productName).toBe(APP_IDENTITY.productName)
    expect(config.win.executableName).toBe(APP_IDENTITY.executableName)
    expect(config.publish).toBeNull()
    expect(config.extraMetadata.releaseChannel).toBe(APP_IDENTITY.channel)
    expect(config.extraMetadata.previewAppId).toBe(APP_IDENTITY.appId)
    expect(config.extraMetadata.buildCommit).toMatch(/^[a-f0-9]{40}$/)
    expect(config.nsis.deleteAppDataOnUninstall).toBe(false)
    expect(config.nsis.runAfterFinish).toBe(false)
    expect(config.nsis.shortcutName).toBe(APP_IDENTITY.productName)
    expect(config.extraResources).toEqual([{ from: 'node_modules/emoji-datasource-twitter/img/twitter/64', to: 'emoji/64' }])
    expect(config.win.target).toEqual([{ target: 'nsis', arch: ['x64'] }, { target: 'zip', arch: ['x64'] }])
  })
})
