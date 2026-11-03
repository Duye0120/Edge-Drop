import { afterEach, describe, expect, it, vi } from 'vitest'
import { BOARD_TEXT_MAX, isBoardCard, localDateTimeInput, selectBoardCards, validateBoardDraft, validateBoardPatch, type BoardCard } from '../shared/board'

const now = new Date(2026, 10, 3, 12).getTime()
const card = (patch: Partial<BoardCard> = {}): BoardCard => ({
  id: 'card-1', kind: 'todo', text: 'Remember 中文', dueAt: null, pinned: false,
  completedAt: null, archivedAt: null, createdAt: now, updatedAt: now, revision: 1, ...patch
})
afterEach(() => vi.unstubAllEnvs())

describe('personal card input boundaries', () => {
  it('trims text, keeps an optional time, and strips unrelated draft fields', () => {
    expect(validateBoardDraft({ kind: 'memo', text: '  idea\n中文  ', dueAt: null, pinned: true }))
      .toEqual({ kind: 'memo', text: 'idea\n中文', dueAt: null })
  })
  it.each([null, [], {}, { kind: 'image', text: 'x', dueAt: null },
    { kind: 'todo', text: '  ', dueAt: null }, { kind: 'todo', text: 'x'.repeat(BOARD_TEXT_MAX + 1), dueAt: null },
    ...[undefined, NaN, Infinity, -1, 1.5, 8_640_000_000_000_001].map((dueAt) => ({ kind: 'todo', text: 'x', dueAt }))
  ])('rejects malformed draft %#', (value) => {
    expect(() => validateBoardDraft(value)).toThrow()
  })
  it('limits patches to mutable fields and disallows completing a memo', () => {
    expect(validateBoardPatch({ text: ' hi ', dueAt: null, pinned: true }, 'memo')).toEqual({ text: 'hi', dueAt: null, pinned: true })
    for (const patch of [{}, [], { id: 'other' }, { revision: 5 }, { pinned: 1 }, { completedAt: now }]) {
      expect(() => validateBoardPatch(patch, 'memo')).toThrow()
    }
    expect(validateBoardPatch({ completedAt: now, archivedAt: now }, 'todo')).toEqual({ completedAt: now, archivedAt: now })
  })
  it('validates saved identities and revisions as well as content', () => {
    expect(isBoardCard(card())).toBe(true)
    for (const patch of [{ id: '../file' }, { revision: 0 }, { revision: 1.5 }, { createdAt: -1 }, { kind: 'memo' as const, completedAt: now }]) {
      expect(isBoardCard(card(patch))).toBe(false)
    }
  })
})

describe('views, search and local calendar boundaries', () => {
  const cards = [card({ id: 'untimed' }), card({ id: 'pin', pinned: true, dueAt: now - 1 }),
    card({ id: 'past', dueAt: now - 1 }), card({ id: 'today', dueAt: now + 60_000 }),
    card({ id: 'tomorrow', dueAt: new Date(2026, 10, 4).getTime() }),
    card({ id: 'done', completedAt: now, pinned: true }), card({ id: 'archived', archivedAt: now })]
  const ids = (view: Parameters<typeof selectBoardCards>[1], query = '') =>
    [...selectBoardCards(cards, view, query, now).values()].flat().map((c) => c.id)
  it('groups pin, due, today, future, untimed and completed with archive separate', () => {
    expect(ids('all')).toEqual(['pin', 'past', 'today', 'tomorrow', 'untimed', 'done'])
    expect(ids('archive')).toEqual(['archived'])
    expect(ids('today')).toEqual(['pin', 'past', 'today'])
    expect(ids('upcoming')).toEqual(['tomorrow'])
    expect(ids('all', '  REMEMBER 中文  ')).toHaveLength(6)
    expect(ids('all', 'missing')).toEqual([])
  })
  it('never changes input order and sorts undated cards by latest edit', () => {
    const input = [card({ id: 'a', updatedAt: now - 1 }), card({ id: 'b' })]
    expect(selectBoardCards(input, 'all', '', now).get('untimed')!.map((c) => c.id)).toEqual(['b', 'a'])
    expect(input.map((c) => c.id)).toEqual(['a', 'b'])
  })
  it('uses the next local midnight across the 25-hour DST transition', () => {
    const originalZone = process.env.TZ ?? Intl.DateTimeFormat().resolvedOptions().timeZone
    vi.stubEnv('TZ', 'America/New_York')
    try {
      const day = new Date('2026-11-01T12:00:00-05:00').getTime()
      const list = [card({ id: 'late', dueAt: new Date('2026-11-01T23:30:00-05:00').getTime() }),
        card({ id: 'next', dueAt: new Date('2026-11-02T00:00:00-05:00').getTime() })]
      expect([...selectBoardCards(list, 'today', '', day).values()].flat().map((c) => c.id)).toEqual(['late'])
      expect([...selectBoardCards(list, 'upcoming', '', day).values()].flat().map((c) => c.id)).toEqual(['next'])
    } finally {
      // Windows does not reset its runtime timezone when TZ is deleted.
      // Restore the actual zone before unstubbing the original environment.
      process.env.TZ = originalZone
    }
  })
  it('formats local input without converting to UTC', () => {
    expect(localDateTimeInput(null)).toBe('')
    expect(localDateTimeInput(now)).toBe('2026-11-03T12:00')
  })
})
