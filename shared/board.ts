/** Personal cards are independent of clipboard history and its retention limits. */
export const BOARD_TEXT_MAX = 20_000
export const BOARD_CARD_LIMIT = 10_000

export interface BoardCard {
  id: string
  kind: 'todo' | 'memo'
  text: string
  dueAt: number | null
  pinned: boolean
  completedAt: number | null
  archivedAt: number | null
  createdAt: number
  updatedAt: number
  revision: number
}
export type BoardDraft = Pick<BoardCard, 'kind' | 'text' | 'dueAt'>
export type BoardPatch = Partial<Pick<BoardCard, 'text' | 'dueAt' | 'pinned' | 'completedAt' | 'archivedAt'>>
export type BoardCommand =
  | { type: 'create'; draft: BoardDraft }
  | { type: 'update'; id: string; revision: number; patch: BoardPatch }
export interface BoardSnapshot {
  cards: BoardCard[]
  problem?: 'unreadable' | 'encryption' | 'read'
  recovered?: boolean
}

const timestamp = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 8_640_000_000_000_000
const optionalTime = (value: unknown): value is number | null => value === null || timestamp(value)

export function validateBoardDraft(value: unknown): BoardDraft {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid card')
  const v = value as BoardDraft
  if (v.kind !== 'todo' && v.kind !== 'memo') throw new Error('Invalid card kind')
  if (typeof v.text !== 'string' || !v.text.trim() || v.text.length > BOARD_TEXT_MAX) throw new Error('Invalid card text')
  if (!optionalTime(v.dueAt)) throw new Error('Invalid card time')
  return { kind: v.kind, text: v.text.trim(), dueAt: v.dueAt }
}

export function validateBoardPatch(value: unknown, kind: BoardCard['kind']): BoardPatch {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid card change')
  const v = value as Record<string, unknown>
  const patch: BoardPatch = {}
  for (const key of Object.keys(v)) {
    switch (key) {
      case 'text':
        if (typeof v.text !== 'string' || !v.text.trim() || v.text.length > BOARD_TEXT_MAX) throw new Error('Invalid card text')
        patch.text = v.text.trim()
        break
      case 'dueAt':
      case 'completedAt':
      case 'archivedAt':
        if (!optionalTime(v[key])) throw new Error('Invalid card time')
        if (key === 'completedAt' && kind === 'memo' && v[key] !== null) throw new Error('Memos cannot be completed')
        patch[key] = v[key]
        break
      case 'pinned':
        if (typeof v.pinned !== 'boolean') throw new Error('Invalid pin state')
        patch.pinned = v.pinned
        break
      default: throw new Error('Unknown card field')
    }
  }
  if (!Object.keys(patch).length) throw new Error('Empty card change')
  return patch
}

export function isBoardCard(value: unknown): value is BoardCard {
  if (!value || typeof value !== 'object') return false
  const c = value as BoardCard
  try {
    validateBoardDraft(c)
    return typeof c.id === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(c.id)
      && typeof c.pinned === 'boolean' && optionalTime(c.completedAt) && optionalTime(c.archivedAt)
      && (c.kind !== 'memo' || c.completedAt === null)
      && timestamp(c.createdAt) && timestamp(c.updatedAt)
      && Number.isSafeInteger(c.revision) && c.revision > 0
  } catch { return false }
}

export type BoardView = 'all' | 'today' | 'upcoming' | 'archive'
export type BoardGroup = 'pinned' | 'past' | 'today' | 'upcoming' | 'untimed' | 'completed' | 'archive'
export const BOARD_GROUPS: BoardGroup[] = ['pinned', 'past', 'today', 'upcoming', 'untimed', 'completed', 'archive']

/** Use local calendar days rather than 24-hour arithmetic (DST days vary). */
export function selectBoardCards(cards: BoardCard[], view: BoardView, query: string, now: number): Map<BoardGroup, BoardCard[]> {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  const needle = query.trim().toLocaleLowerCase()
  const groups = new Map<BoardGroup, BoardCard[]>(BOARD_GROUPS.map((g) => [g, []]))
  for (const card of cards) {
    if ((card.archivedAt !== null) !== (view === 'archive')) continue
    if (needle && !card.text.toLocaleLowerCase().includes(needle)) continue
    if (view === 'today' && (card.completedAt !== null || card.dueAt === null || card.dueAt < start.getTime() || card.dueAt >= end.getTime())) continue
    if (view === 'upcoming' && (card.completedAt !== null || card.dueAt === null || card.dueAt < end.getTime())) continue
    const group: BoardGroup = view === 'archive' ? 'archive'
      : card.completedAt !== null ? 'completed'
      : card.pinned ? 'pinned'
      : card.dueAt === null ? 'untimed'
      : card.dueAt <= now ? 'past'
      : card.dueAt < end.getTime() ? 'today' : 'upcoming'
    groups.get(group)!.push(card)
  }
  for (const list of groups.values()) {
    list.sort((a, b) => (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity) || b.updatedAt - a.updatedAt)
  }
  return groups
}

export function localDateTimeInput(time: number | null): string {
  if (time === null) return ''
  const date = new Date(time)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${String(date.getFullYear()).padStart(4, '0')}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
