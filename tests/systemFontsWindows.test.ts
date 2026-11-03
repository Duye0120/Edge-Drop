import { describe, expect, it, vi } from 'vitest'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// Exercise the real read-only Windows command on CI, without starting Electron
// or the persistent clipboard PowerShell host. This does not exercise desktop UI.
vi.mock('../electron/main/powershell', () => ({
  getSystemPowerShellPath: () => join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
  getWritableCwd: () => tmpdir()
}))
import { getSystemFonts } from '../electron/main/systemFonts'
import { normalizeFontFamily } from '../shared/preferences'

describe.skipIf(process.platform !== 'win32')('Windows installed-font command', () => {
  it('returns installed local families from the actual PowerShell/.NET API', async () => {
    const fonts = await getSystemFonts()
    expect(fonts.length).toBeGreaterThan(0)
    expect(fonts.every((font) => normalizeFontFamily(font) === font)).toBe(true)
    expect(new Set(fonts).size).toBe(fonts.length)
  }, 15_000)
})
