import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ execFile: vi.fn() }))
vi.mock('node:child_process', () => ({ execFile: mocks.execFile }))
vi.mock('../electron/main/powershell', () => ({ getSystemPowerShellPath: () => 'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe', getWritableCwd: () => 'C:/Temp' }))
beforeEach(() => { vi.resetModules(); mocks.execFile.mockReset() })
afterEach(() => vi.restoreAllMocks())

describe('read-only system font enumeration', () => {
  it('lists Unicode Windows families once with bounded execution and constant command text', async () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('win32')
    mocks.execFile.mockImplementation((_exe, _args, _options, done) => done(null, '\uFEFF["微软雅黑","Segoe UI","Segoe UI", "bad;css"]'))
    const { getSystemFonts } = await import('../electron/main/systemFonts')
    const [first, second] = await Promise.all([getSystemFonts(), getSystemFonts()])
    expect(first).toEqual(['Segoe UI', '微软雅黑'])
    expect(second).toEqual(first)
    expect(mocks.execFile).toHaveBeenCalledTimes(1)
    const [exe, args, options] = mocks.execFile.mock.calls[0]
    expect(exe).toContain('System32/WindowsPowerShell')
    expect(args).toContain('-NonInteractive')
    expect(args.at(-1)).toContain('InstalledFontCollection')
    expect(options).toMatchObject({ windowsHide: true, timeout: 5000, maxBuffer: 512 * 1024, encoding: 'utf8' })
    expect(options.shell).toBeUndefined()
  })
  it.each(['error', 'invalid', 'single'])('handles %s output without breaking the settings UI', async (kind) => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('win32')
    mocks.execFile.mockImplementation((_exe, _args, _options, done) => done(kind === 'error' ? new Error('unavailable') : null, kind === 'single' ? '"微軟正黑體"' : 'not JSON'))
    const { getSystemFonts } = await import('../electron/main/systemFonts')
    expect(await getSystemFonts()).toEqual(kind === 'single' ? ['微軟正黑體'] : [])
  })
  it('supports the cloud fontconfig list without a shell or network', async () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('linux')
    mocks.execFile.mockImplementation((_exe, _args, _options, done) => done(null, 'Noto Sans,Noto Sans Regular\n微软雅黑\n'))
    const { getSystemFonts } = await import('../electron/main/systemFonts')
    expect(await getSystemFonts()).toEqual(['Noto Sans', 'Noto Sans Regular', '微软雅黑'])
    expect(mocks.execFile.mock.calls[0][0]).toBe('fc-list')
  })
})
