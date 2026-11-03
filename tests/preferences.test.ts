import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DEFAULT_SETTINGS } from '../shared/types'
import { closeForDetectedFullscreen, DEFAULT_UI_FONT_STACK, hoverOpeningEnabled, normalizeFontFamily, normalizeFontList, preferenceStrings, suppressAutomaticOpen, uiFontStack } from '../shared/preferences'
import { useStore } from '../src/store/appStore'

const paths = vi.hoisted(() => ({ file: '' }))
vi.mock('../electron/store/paths', () => ({ PATHS: { settingsFile: () => paths.file } }))
import { loadSettings, resetSettingsCache, saveSettings } from '../electron/store/settings'

describe('manual game mode and fullscreen protection', () => {
  it.each([false, true])('game mode suppresses automatic activity regardless of fullscreen protection=%s', (protect) => {
    const settings = { ...DEFAULT_SETTINGS, gameMode: true, suppressInFullscreen: protect, hoverActivation: true }
    expect(hoverOpeningEnabled(settings)).toBe(false)
    expect(suppressAutomaticOpen(settings, false)).toBe(true)
    expect(suppressAutomaticOpen(settings, true)).toBe(true)
    expect(closeForDetectedFullscreen(settings)).toBe(false)
  })
  it('turning game mode off preserves the existing hover and fullscreen choices', () => {
    const enabled = { ...DEFAULT_SETTINGS, gameMode: false }
    expect(hoverOpeningEnabled(enabled)).toBe(true)
    expect(suppressAutomaticOpen(enabled, false)).toBe(false)
    expect(suppressAutomaticOpen(enabled, true)).toBe(true)
    expect(closeForDetectedFullscreen(enabled)).toBe(true)
    expect(hoverOpeningEnabled({ ...enabled, hoverActivation: false })).toBe(false)
    expect(closeForDetectedFullscreen({ ...enabled, hoverActivation: false })).toBe(false)
    expect(suppressAutomaticOpen({ ...enabled, suppressInFullscreen: false }, true)).toBe(false)
    expect(hoverOpeningEnabled({})).toBe(true)
  })
  it('keeps explicit opening available and suppresses copy flare without changing clipboard items', () => {
    const before = useStore.getState()
    try {
      useStore.setState({ settings: { ...DEFAULT_SETTINGS, gameMode: true }, copyFlareActive: false })
      useStore.getState().setOpen(true)
      expect(useStore.getState().open).toBe(true)
      useStore.getState().triggerCopyFlare()
      expect(useStore.getState().copyFlareActive).toBe(false)
      expect(useStore.getState().items).toEqual(before.items)
    } finally { useStore.setState(before) }
  })
})

describe('local UI font names and safe fallback', () => {
  it.each(['Microsoft YaHei UI', '微软雅黑', '微軟正黑體', 'Noto Sans Ελληνικά', 'خط عربي', 'O\'Reilly Font', 'Font "Quoted"'])('keeps international family %s as one CSS string with defaults', (name) => {
    expect(normalizeFontFamily(` ${name} `)).toBe(name)
    expect(uiFontStack(name)).toContain(DEFAULT_UI_FONT_STACK)
    expect(uiFontStack(name)).toMatch(/^"/)
  })
  it.each([null, 4, 'x'.repeat(121), 'Font; background: url(https://example.com)', 'Font\nname', '<style>', 'A\u0000B'])('rejects invalid name %# and uses the default stack', (value) => {
    expect(normalizeFontFamily(value)).toBe('')
    expect(uiFontStack(value)).toBe(DEFAULT_UI_FONT_STACK)
  })
  it('quotes punctuation and retains default fonts for an absent family or missing glyphs', () => {
    expect(uiFontStack('Not installed 字体')).toBe(`"Not installed 字体", ${DEFAULT_UI_FONT_STACK}`)
    expect(uiFontStack('Font "Quoted"')).toContain('"Font \\"Quoted\\""')
    expect(normalizeFontList(['Noto Sans', '', null, '微软雅黑', 'Noto Sans', 'bad;css'])).toEqual(['Noto Sans', '微软雅黑'])
    expect(normalizeFontList({})).toEqual([])
  })
  it.each(['zh-CN', 'zh-TW'])('%s translates game and font settings, hints and errors', (language) => {
    const strings = preferenceStrings(language)
    expect(Object.keys(strings)).toEqual(Object.keys(preferenceStrings('en')))
    for (const [key, value] of Object.entries(strings)) expect(value, key).toMatch(/[\u3400-\u9fff]/)
    expect(strings.gameDesc).toContain('{shortcut}')
  })
})

describe('game mode and custom font persistence', () => {
  let dir: string
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'ed-preferences-')); paths.file = join(dir, 'settings.json'); resetSettingsCache() })
  afterEach(() => { resetSettingsCache(); rmSync(dir, { recursive: true, force: true }) })
  it('survives reload, retains other preferences and leaves clipboard/board files untouched', () => {
    const board = join(dir, 'board-v1.json'), history = join(dir, 'items.json')
    writeFileSync(board, 'encrypted board'); writeFileSync(history, 'encrypted clipboard')
    saveSettings({ gameMode: true, uiFontFamily: '微软雅黑', hoverActivation: false, suppressInFullscreen: false, language: 'zh-CN' })
    resetSettingsCache()
    expect(loadSettings()).toMatchObject({ gameMode: true, uiFontFamily: '微软雅黑', hoverActivation: false, suppressInFullscreen: false, language: 'zh-CN' })
    saveSettings({ gameMode: false, uiFontFamily: '' })
    resetSettingsCache()
    expect(loadSettings()).toMatchObject({ gameMode: false, uiFontFamily: '', hoverActivation: false, suppressInFullscreen: false })
    expect(readFileSync(board, 'utf8')).toBe('encrypted board')
    expect(readFileSync(history, 'utf8')).toBe('encrypted clipboard')
  })
  it('defaults old profiles and sanitizes invalid persisted values', () => {
    writeFileSync(paths.file, JSON.stringify({ gameMode: 'yes', uiFontFamily: 'A; color: red', historyLimit: 100 }))
    expect(loadSettings()).toMatchObject({ gameMode: false, uiFontFamily: '', historyLimit: 100 })
  })
})
