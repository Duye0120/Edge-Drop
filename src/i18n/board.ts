import { getResolvedLanguage } from './index'

const en = {
  board: 'Tasks & notes', clipboard: 'Clipboard', all: 'All', today: 'Today', upcoming: 'Upcoming', archive: 'Archive',
  pinned: 'Pinned', past: 'Due / to review', untimed: 'Always here', completed: 'Completed',
  todo: 'Task', memo: 'Note', add: 'New card', save: 'Save card', cancel: 'Cancel', edit: 'Edit',
  text: 'Card text', placeholder: 'Write or paste something to remember…', search: 'Search cards…', clear: 'Clear search',
  time: 'Optional time', noTime: 'No time · stays until you archive it', removeTime: 'Remove time',
  due: 'Due', review: 'Review', complete: 'Complete task', reopen: 'Reopen task', pin: 'Pin', unpin: 'Unpin',
  archiveCard: 'Archive card', restore: 'Restore', undo: 'Undo', archived: 'Card archived', changed: 'Card saved',
  empty: 'Keep a task or a thought here.', noResults: 'No matching cards in this view.', loading: 'Loading cards…',
  loadError: 'Cards could not be loaded. Try again.', retry: 'Retry',
  saveError: 'Could not save. Your draft is still here. Check disk access, then retry.',
  locked: 'Saved cards cannot be read or decrypted. Files are preserved. Restore access to this Windows profile, then restart the app.',
  recovered: 'Recovered the last backup. The unreadable file was preserved; the latest change may be missing.',
  invalidTime: 'Choose a valid local date and time, or remove the time.', draft: 'Draft · save to keep',
  disabledUpdates: 'Automatic updates are disabled in this custom version.',
} as const
type BoardStrings = { [K in keyof typeof en]: string }
const zh: BoardStrings = {
  board: '待办与备忘', clipboard: '剪贴板', all: '全部', today: '今天', upcoming: '即将到来', archive: '归档',
  pinned: '固定', past: '已到期 / 待回看', untimed: '无时间 · 常驻', completed: '已完成',
  todo: '待办', memo: '备忘', add: '新建卡片', save: '保存卡片', cancel: '取消', edit: '编辑',
  text: '卡片内容', placeholder: '写下或粘贴一件事、一点想法…', search: '搜索卡片…', clear: '清除搜索',
  time: '可选时间', noTime: '不设时间，常驻直到你归档', removeTime: '移除时间',
  due: '截止', review: '回看', complete: '完成待办', reopen: '重新打开待办', pin: '固定', unpin: '取消固定',
  archiveCard: '归档卡片', restore: '恢复', undo: '撤销', archived: '卡片已归档', changed: '卡片已保存',
  empty: '把待办和想记住的事放在这里。', noResults: '当前视图没有匹配的卡片。', loading: '正在读取卡片…',
  loadError: '卡片读取失败，请重试。', retry: '重试',
  saveError: '未能保存，草稿仍在。请检查磁盘访问权限后重试。',
  locked: '无法读取或解密已保存卡片，原文件已保留。请恢复此 Windows 用户的访问权限后重启应用。',
  recovered: '已从上次备份恢复，无法读取的原文件已保留；最近一次更改可能缺失。',
  invalidTime: '请选择有效的本地日期和时间，或移除时间。', draft: '草稿 · 保存后保留',
  disabledUpdates: '此定制版已禁用自动更新。',
}

/** New personal-card UI supports Chinese and English; other app languages fall back to English. */
export function boardStrings(): BoardStrings {
  return getResolvedLanguage().startsWith('zh') ? zh : en
}
