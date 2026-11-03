import { afterEach, describe, expect, it, vi } from 'vitest'
import { boardStrings, formatBoardDate } from '../src/i18n/board'
import { LANGUAGES } from '../src/i18n/translations'
import { useStore } from '../src/store/appStore'

const originalLanguage = useStore.getState().settings.language
afterEach(() => {
  vi.unstubAllGlobals()
  useStore.setState((state) => ({ settings: { ...state.settings, language: originalLanguage } }))
})

describe('personal cards follow the application language', () => {
  it.each(['zh-CN', 'zh-TW'])('%s covers every new control, hint and error without falling back to English', (locale) => {
    const strings = boardStrings(locale)
    expect(Object.keys(strings).sort()).toEqual(Object.keys(boardStrings('en')).sort())
    for (const [key, value] of Object.entries(strings)) {
      expect(value.trim(), key).not.toBe('')
      expect(value, key).toMatch(/[\u3400-\u9fff]/)
    }
  })
  it('keeps simplified and traditional Chinese distinct, including action and accessibility labels', () => {
    expect(boardStrings('zh-CN')).toMatchObject({ board: '待办与备忘', search: '搜索卡片…', save: '保存卡片', pickTime: '选择日期和时间' })
    expect(boardStrings('zh-TW')).toMatchObject({ board: '待辦與備忘', search: '搜尋卡片…', save: '儲存卡片', pickTime: '選擇日期和時間' })
    expect(boardStrings('zh-HK')).toEqual(boardStrings('zh-TW'))
  })
  it('resolves a traditional-Chinese system locale consistently with the main process', () => {
    vi.stubGlobal('window', { navigator: { language: 'zh-Hant-TW' } })
    expect(boardStrings('system').save).toBe('儲存卡片')
  })
  it('changes strings and date formats with the app setting, independently of the host locale', () => {
    const time = new Date(2026, 10, 6, 15, 30).getTime()
    useStore.setState((state) => ({ settings: { ...state.settings, language: 'zh-CN' } }))
    expect(boardStrings().save).toBe('保存卡片')
    expect(formatBoardDate(time)).toMatch(/2026年11月6日.*15:30/)
    expect(formatBoardDate(time)).not.toMatch(/Nov|AM|PM/)
    useStore.setState((state) => ({ settings: { ...state.settings, language: 'en' } }))
    expect(boardStrings().save).toBe('Save card')
    expect(formatBoardDate(time)).toMatch(/Nov.*6.*2026.*15:30/)
  })
  it('keeps every existing app language usable and retains English fallback for new non-Chinese controls', () => {
    for (const { code } of LANGUAGES) {
      expect(() => formatBoardDate(Date.now(), code), code).not.toThrow()
      expect(boardStrings(code).save.length, code).toBeGreaterThan(0)
    }
    expect(boardStrings('fr').save).toBe('Save card')
  })
})
