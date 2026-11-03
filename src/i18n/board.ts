import { getResolvedLanguage } from './index'

const en = {
  board: 'Tasks & notes', clipboard: 'Clipboard', panelModes: 'Panel content', views: 'Card views', cardKind: 'Card type',
  all: 'All', today: 'Today', upcoming: 'Upcoming', archive: 'Archive',
  pinned: 'Pinned', past: 'Due / to review', untimed: 'No time set', completed: 'Completed',
  todo: 'Task', memo: 'Note', add: 'New card', save: 'Save card', saving: 'Saving…', cancel: 'Cancel', edit: 'Edit',
  text: 'Card text', placeholder: 'Write or paste something to remember…', search: 'Search cards…', clear: 'Clear search',
  time: 'Optional time', timePlaceholder: 'YYYY-MM-DD HH:mm', timeHint: 'Local time, for example 2026-11-06 15:30.',
  pickTime: 'Choose date and time', pickerUnavailable: 'The date picker is unavailable. Enter the local date and time in the field.',
  noTime: 'No time set. This card stays until you archive it.', removeTime: 'Remove time',
  due: 'Due', review: 'Review', complete: 'Complete task', reopen: 'Reopen task', pin: 'Pin', unpin: 'Unpin',
  archiveCard: 'Archive card', restore: 'Restore', undo: 'Undo', archived: 'Card archived', restored: 'Card restored',
  completedAction: 'Task completed', reopenedAction: 'Task reopened', changed: 'Card saved',
  emptyTitle: 'No cards yet', empty: 'Add a task or a note. A time is optional.', emptyArchive: 'No archived cards',
  noResults: 'No matching cards in this view.', noResultsHint: 'Try another search or view.', loading: 'Loading cards…',
  loadError: 'Cards could not be loaded. Try again.', retry: 'Retry',
  saveError: 'Could not save. Your draft is still in the editor. Check disk space and access, then retry.',
  actionError: 'The change was not saved. Check disk space and access, then retry.',
  locked: 'Saved cards cannot be read or decrypted. Files are preserved. Restore access to this Windows profile, then restart the app.',
  recovered: 'Recovered the last backup. The unreadable file was preserved; the latest change may be missing.',
  invalidTime: 'Enter a valid local date and time, for example 2026-11-06 15:30, or remove the time.', draft: 'Draft · save to keep',
  disabledUpdates: 'In-app updates are disabled in this custom version.',
  conflict: 'This card changed while you were editing. Choose whether to keep your draft or load the saved version before saving.',
  keepDraft: 'Keep my draft', useSaved: 'Use saved card',
} as const
export type BoardStrings = { [K in keyof typeof en]: string }
const zh: BoardStrings = {
  board: '待办与备忘', clipboard: '剪贴板', panelModes: '面板内容', views: '卡片视图', cardKind: '卡片类型',
  all: '全部', today: '今天', upcoming: '即将到来', archive: '归档',
  pinned: '已固定', past: '已到期 / 待回看', untimed: '未设时间', completed: '已完成',
  todo: '待办', memo: '备忘', add: '新建卡片', save: '保存卡片', saving: '正在保存…', cancel: '取消', edit: '编辑',
  text: '卡片内容', placeholder: '写下或粘贴一件事、一点想法…', search: '搜索卡片…', clear: '清除搜索',
  time: '可选时间', timePlaceholder: '年-月-日 时:分', timeHint: '按本地时间填写，例如 2026-11-06 15:30。',
  pickTime: '选择日期和时间', pickerUnavailable: '暂时无法打开日期选择器，请直接在输入框中填写本地日期和时间。',
  noTime: '不设时间，卡片会一直保留，直到你归档。', removeTime: '移除时间',
  due: '截止', review: '回看', complete: '完成待办', reopen: '重新打开待办', pin: '固定', unpin: '取消固定',
  archiveCard: '归档卡片', restore: '恢复', undo: '撤销', archived: '卡片已归档', restored: '卡片已恢复',
  completedAction: '待办已完成', reopenedAction: '待办已重新打开', changed: '卡片已保存',
  emptyTitle: '这里还没有卡片', empty: '新建待办或备忘；不设时间也会一直保留。', emptyArchive: '还没有归档卡片',
  noResults: '当前视图没有匹配的卡片。', noResultsHint: '试试其他关键词或视图。', loading: '正在读取卡片…',
  loadError: '卡片读取失败，请重试。', retry: '重试',
  saveError: '未能保存，内容仍保留在编辑器中。请检查存储空间和访问权限后重试。',
  actionError: '操作未保存，请检查存储空间和访问权限后重试。',
  locked: '无法读取或解密已保存卡片，原文件已保留。请恢复此 Windows 用户的访问权限后重启应用。',
  recovered: '已从上次备份恢复，无法读取的原文件已保留；最近一次更改可能缺失。',
  invalidTime: '请填写有效的本地日期和时间，例如 2026-11-06 15:30，或移除时间。', draft: '草稿 · 保存后保留',
  disabledUpdates: '此定制版已停用应用内更新。',
  conflict: '卡片在编辑期间发生了变化。请先选择保留草稿，或载入已保存的版本，再保存。',
  keepDraft: '保留当前草稿', useSaved: '使用已保存版本',
}
const zhTW: BoardStrings = {
  board: '待辦與備忘', clipboard: '剪貼簿', panelModes: '面板內容', views: '卡片檢視', cardKind: '卡片類型',
  all: '全部', today: '今天', upcoming: '即將到來', archive: '封存',
  pinned: '已釘選', past: '已到期 / 待回顧', untimed: '未設時間', completed: '已完成',
  todo: '待辦', memo: '備忘', add: '新增卡片', save: '儲存卡片', saving: '正在儲存…', cancel: '取消', edit: '編輯',
  text: '卡片內容', placeholder: '寫下或貼上一件事、一點想法…', search: '搜尋卡片…', clear: '清除搜尋',
  time: '選填時間', timePlaceholder: '年-月-日 時:分', timeHint: '依本地時間填寫，例如 2026-11-06 15:30。',
  pickTime: '選擇日期和時間', pickerUnavailable: '暫時無法開啟日期選擇器，請直接在輸入框中填寫本地日期和時間。',
  noTime: '不設時間，卡片會一直保留，直到你封存。', removeTime: '移除時間',
  due: '截止', review: '回顧', complete: '完成待辦', reopen: '重新開啟待辦', pin: '釘選', unpin: '取消釘選',
  archiveCard: '封存卡片', restore: '還原', undo: '復原', archived: '卡片已封存', restored: '卡片已還原',
  completedAction: '待辦已完成', reopenedAction: '待辦已重新開啟', changed: '卡片已儲存',
  emptyTitle: '這裡還沒有卡片', empty: '新增待辦或備忘；不設時間也會一直保留。', emptyArchive: '還沒有封存卡片',
  noResults: '目前檢視沒有符合的卡片。', noResultsHint: '試試其他關鍵字或檢視。', loading: '正在讀取卡片…',
  loadError: '卡片讀取失敗，請重試。', retry: '重試',
  saveError: '無法儲存，內容仍保留在編輯器中。請檢查儲存空間和存取權限後重試。',
  actionError: '操作尚未儲存，請檢查儲存空間和存取權限後重試。',
  locked: '無法讀取或解密已儲存卡片，原檔案已保留。請恢復此 Windows 使用者的存取權限後重新啟動應用程式。',
  recovered: '已從上次備份還原，無法讀取的原檔案已保留；最近一次變更可能遺失。',
  invalidTime: '請填寫有效的本地日期和時間，例如 2026-11-06 15:30，或移除時間。', draft: '草稿 · 儲存後保留',
  disabledUpdates: '此自訂版本已停用應用程式內更新。',
  conflict: '卡片在編輯期間發生了變更。請先選擇保留草稿，或載入已儲存的版本，再儲存。',
  keepDraft: '保留目前草稿', useSaved: '使用已儲存版本',
}

/** Chinese uses the selected writing system; other new-card UI falls back to English. */
export function boardStrings(language = getResolvedLanguage()): BoardStrings {
  const locale = getResolvedLanguage(language).toLowerCase()
  if (/^zh-(tw|hk|hant)/.test(locale)) return zhTW
  return locale.startsWith('zh') ? zh : en
}

const dateFormats = new Map<string, Intl.DateTimeFormat>()
/** Follow the application's language even when the OS/browser uses another locale. */
export function formatBoardDate(time: number, language = getResolvedLanguage()): string {
  const locale = getResolvedLanguage(language)
  let format = dateFormats.get(locale)
  if (!format) {
    format = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    dateFormats.set(locale, format)
  }
  return format.format(time)
}
