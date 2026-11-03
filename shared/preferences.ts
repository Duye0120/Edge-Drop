import type { Settings } from './types'

export const DEFAULT_UI_FONT_STACK = '"Plus Jakarta Sans", "Segoe UI", "Microsoft YaHei UI", "Microsoft JhengHei UI", sans-serif'

/** One local family name, never a CSS declaration, URL or downloadable font. */
export function normalizeFontFamily(value: unknown): string {
  if (typeof value !== 'string') return ''
  const name = value.trim().normalize('NFC')
  return name.length <= 120 && !/[\u0000-\u001f\u007f-\u009f\u2028\u2029;{}<>]/.test(name) ? name : ''
}

export function uiFontStack(value: unknown): string {
  const family = normalizeFontFamily(value)
  const quoted = family.replace(/[\\"]/g, '\\$&')
  return family ? `"${quoted}", ${DEFAULT_UI_FONT_STACK}` : DEFAULT_UI_FONT_STACK
}

export function normalizeFontList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map(normalizeFontFamily).filter(Boolean))].slice(0, 3000).sort((a, b) => a.localeCompare(b))
}

export function hoverOpeningEnabled(settings: Pick<Settings, 'gameMode' | 'hoverActivation'>): boolean {
  return settings.gameMode !== true && settings.hoverActivation !== false
}

export function suppressAutomaticOpen(settings: Pick<Settings, 'gameMode' | 'suppressInFullscreen'>, fullscreen: boolean): boolean {
  return settings.gameMode === true || (settings.suppressInFullscreen && fullscreen)
}

/** Game mode permits explicitly opened panels; automatic fullscreen protection keeps its existing behavior otherwise. */
export function closeForDetectedFullscreen(settings: Pick<Settings, 'gameMode' | 'suppressInFullscreen' | 'hoverActivation'>): boolean {
  return !settings.gameMode && settings.suppressInFullscreen && settings.hoverActivation !== false
}

const en = {
  gameMode: 'Game mode',
  gameDesc: 'Hide the edge bar and pause automatic opening, including drag activation and copy hints. Use {shortcut} or the tray to open the panel and turn this off. Clipboard capture continues.',
  gameStatus: 'Game mode is on · automatic opening paused',
  fontTitle: 'Interface font', fontDesc: 'Choose an installed system font or enter a local font family. Code keeps its monospace font.',
  defaultFont: 'Default font', customFont: 'Enter a font name…', fontName: 'Local font family', applyFont: 'Apply font', resetFont: 'Reset font',
  fontLoading: 'Loading system fonts…', fontUnavailable: 'System fonts could not be listed. You can still enter a local font family.',
  fontFallback: 'If this font is unavailable or lacks a character, the default fonts are used.',
  fontMissing: 'This name is not in the system list. Unavailable fonts fall back to the defaults.',
  invalidFont: 'Enter a local font family, up to 120 characters, without control characters or CSS declarations.',
  fontSaveError: 'The font setting could not be saved. Try again.',
  fontPreview: 'Font preview · 汉字 Aa 0123 · Ελληνικά العربية',
} as const
type PreferenceStrings = { [K in keyof typeof en]: string }
const zh: PreferenceStrings = {
  gameMode: '游戏模式',
  gameDesc: '隐藏边缘条，暂停悬停、拖入唤出和复制提示。仍可用 {shortcut} 或托盘主动打开面板并关闭此模式。剪贴板记录继续运行。',
  gameStatus: '游戏模式已开启 · 已暂停自动唤出',
  fontTitle: '界面字体', fontDesc: '选择已安装的系统字体，或输入本机字体名称。代码仍使用等宽字体。',
  defaultFont: '默认字体', customFont: '手动输入字体名称…', fontName: '本机字体名称', applyFont: '应用字体', resetFont: '恢复默认字体',
  fontLoading: '正在读取系统字体…', fontUnavailable: '暂时无法列出系统字体，仍可手动输入本机字体名称。',
  fontFallback: '字体不可用或缺少某个字符时，会自动使用默认字体补足。',
  fontMissing: '系统列表中没有此名称；字体不可用时会自动回退到默认字体。',
  invalidFont: '请输入不超过 120 个字符的本机字体名称，不要包含控制字符或 CSS 样式。',
  fontSaveError: '字体设置未能保存，请重试。',
  fontPreview: '字体预览 · 汉字 Aa 0123 · Ελληνικά العربية',
}
const zhTW: PreferenceStrings = {
  gameMode: '遊戲模式',
  gameDesc: '隱藏邊緣列，暫停懸停、拖入喚出和複製提示。仍可用 {shortcut} 或系統匣主動開啟面板並關閉此模式。剪貼簿記錄繼續執行。',
  gameStatus: '遊戲模式已開啟 · 已暫停自動喚出',
  fontTitle: '介面字型', fontDesc: '選擇已安裝的系統字型，或輸入本機字型名稱。程式碼仍使用等寬字型。',
  defaultFont: '預設字型', customFont: '手動輸入字型名稱…', fontName: '本機字型名稱', applyFont: '套用字型', resetFont: '還原預設字型',
  fontLoading: '正在讀取系統字型…', fontUnavailable: '暫時無法列出系統字型，仍可手動輸入本機字型名稱。',
  fontFallback: '字型無法使用或缺少某個字元時，會自動使用預設字型補足。',
  fontMissing: '系統清單中沒有此名稱；字型無法使用時會自動使用預設字型。',
  invalidFont: '請輸入不超過 120 個字元的本機字型名稱，不要包含控制字元或 CSS 樣式。',
  fontSaveError: '無法儲存字型設定，請重試。',
  fontPreview: '字型預覽 · 漢字 Aa 0123 · Ελληνικά العربية',
}

export function preferenceStrings(language: string): PreferenceStrings {
  const locale = language.toLowerCase()
  if (/^zh-(tw|hk|hant)/.test(locale)) return zhTW
  return locale.startsWith('zh') ? zh : en
}
