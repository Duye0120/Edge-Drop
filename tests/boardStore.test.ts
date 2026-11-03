import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { BOARD_CARD_LIMIT } from '../shared/board'

const runtime = vi.hoisted(() => ({ dir: '', available: true, key: 'profile-1', failEncrypt: false, failRename: false, failFlush: false, denyRead: false }))
vi.mock('electron', () => ({
  app: { getPath: () => runtime.dir },
  safeStorage: {
    isEncryptionAvailable: () => runtime.available,
    encryptString: (text: string) => {
      if (runtime.failEncrypt) throw new Error('Encryption failed')
      return Buffer.from(`${runtime.key}:${Buffer.from(text).toString('base64')}`)
    },
    decryptString: (bytes: Buffer) => {
      const prefix = `${runtime.key}:`
      if (!bytes.toString().startsWith(prefix)) throw new Error('Different profile')
      return Buffer.from(bytes.toString().slice(prefix.length), 'base64').toString()
    }
  }
}))
vi.mock('node:fs', async (importOriginal) => {
  const fs = await importOriginal<typeof import('node:fs')>()
  return { ...fs,
    fsyncSync: (fd: number) => {
      if (runtime.failFlush) throw Object.assign(new Error('Disk full'), { code: 'ENOSPC' })
      return fs.fsyncSync(fd)
    },
    renameSync: (...args: Parameters<typeof fs.renameSync>) => {
      if (runtime.failRename) throw Object.assign(new Error('Disk full'), { code: 'ENOSPC' })
      return fs.renameSync(...args)
    },
    readFileSync: (...args: Parameters<typeof fs.readFileSync>) => {
      if (runtime.denyRead && String(args[0]).endsWith('board-v1.json')) throw Object.assign(new Error('Access denied'), { code: 'EACCES' })
      return fs.readFileSync(...args)
    }
  }
})
import { BoardStore } from '../electron/store/BoardStore'
const file = () => join(runtime.dir, 'board-v1.json')
const create = (store: BoardStore, text = 'private task', kind: 'todo' | 'memo' = 'todo') =>
  store.execute({ type: 'create', draft: { kind, text, dueAt: null } })

beforeEach(() => {
  runtime.dir = mkdtempSync(join(tmpdir(), 'edge-board-'))
  Object.assign(runtime, { available: true, key: 'profile-1', failEncrypt: false, failRename: false, failFlush: false, denyRead: false })
})
afterEach(() => rmSync(runtime.dir, { recursive: true, force: true }))

describe('encrypted board persistence independent of history', () => {
  it('round-trips text, types and lifecycle state after a restart', () => {
    const store = new BoardStore()
    const first = create(store).cards[0]
    const result = store.execute({ type: 'update', id: first.id, revision: 1, patch: { pinned: true, dueAt: 123, completedAt: 456, archivedAt: 789 } })
    expect(result.cards[0]).toMatchObject({ pinned: true, dueAt: 123, completedAt: 456, archivedAt: 789, revision: 2 })
    create(store, '备忘', 'memo')
    expect(new BoardStore().load()).toEqual(store.load())
    expect(readFileSync(file(), 'utf8')).not.toContain('private task')
    expect(readFileSync(`${file()}.bak`, 'utf8')).not.toContain('private task')
  })
  it('does not read, overwrite or depend on clipboard history or its cleanup', () => {
    const history = join(runtime.dir, 'items.json')
    writeFileSync(history, 'clipboard history')
    const store = new BoardStore()
    create(store)
    expect(readFileSync(history, 'utf8')).toBe('clipboard history')
    rmSync(history)
    mkdirSync(join(runtime.dir, 'temp'))
    rmSync(join(runtime.dir, 'temp'), { recursive: true })
    expect(new BoardStore().load().cards).toHaveLength(1)
  })
  it('returns copies that cannot mutate stored state', () => {
    const store = new BoardStore()
    const result = create(store)
    result.cards[0].text = 'tampered'
    store.load().cards.length = 0
    expect(store.load().cards[0].text).toBe('private task')
  })
  it('rejects stale revisions, missing cards and invalid commands without writing', () => {
    const store = new BoardStore()
    const card = create(store).cards[0]
    const bytes = readFileSync(file())
    for (const command of [{ type: 'delete', id: card.id }, { type: 'update', id: card.id, revision: 0, patch: { text: 'stale' } },
      { type: 'update', id: 'missing', revision: 1, patch: { pinned: true } },
      { type: 'update', id: card.id, revision: 1, patch: { kind: 'memo' } }, null]) {
      expect(() => store.execute(command as never)).toThrow()
      expect(readFileSync(file())).toEqual(bytes)
    }
  })
  it.each(['encrypt', 'flush', 'rename'])('acknowledges no changes when %s fails; retry remains possible', (failure) => {
    const store = new BoardStore()
    const original = create(store)
    const bytes = readFileSync(file())
    runtime.failEncrypt = failure === 'encrypt'
    runtime.failRename = failure === 'rename'
    runtime.failFlush = failure === 'flush'
    expect(() => create(store, 'unsaved')).toThrow()
    expect(store.load()).toEqual(original)
    expect(readFileSync(file())).toEqual(bytes)
    runtime.failEncrypt = runtime.failRename = runtime.failFlush = false
    expect(create(store, 'retry').cards).toHaveLength(2)
    expect(new BoardStore().load()).toEqual(store.load())
  })
  it('never writes without encryption, including loss of encryption during a session', () => {
    const store = new BoardStore()
    create(store)
    const bytes = readFileSync(file())
    runtime.available = false
    expect(() => create(store)).toThrow()
    expect(new BoardStore().load().problem).toBe('encryption')
    expect(readFileSync(file())).toEqual(bytes)
  })
  it('recovers the last valid backup and preserves corruption before the next save', () => {
    const store = new BoardStore()
    create(store, 'first')
    create(store, 'second')
    writeFileSync(file(), 'broken primary')
    const recovered = new BoardStore()
    expect(recovered.load()).toMatchObject({ cards: [{ text: 'first' }], recovered: true })
    expect(readdirSync(runtime.dir).filter((f) => f.includes('.unreadable-'))).toHaveLength(1)
    create(recovered, 'third')
    expect(new BoardStore().load().cards.map((c) => c.text)).toEqual(['third', 'first'])
    rmSync(file())
    expect(new BoardStore().load().cards.map((c) => c.text)).toEqual(['first'])
  })
  it('does not overwrite an unreadable primary when permission is denied, even with a valid backup', () => {
    const store = new BoardStore()
    create(store); create(store, 'second')
    const bytes = readFileSync(file())
    runtime.denyRead = true
    const locked = new BoardStore()
    expect(locked.load().problem).toBe('read')
    expect(() => create(locked)).toThrow()
    runtime.denyRead = false
    expect(readFileSync(file())).toEqual(bytes)
  })
  it('locks changed-profile data and damaged files without replacing either copy', () => {
    const store = new BoardStore()
    create(store); create(store, 'second')
    const bytes = readFileSync(file())
    const backup = readFileSync(`${file()}.bak`)
    runtime.key = 'other-profile'
    const locked = new BoardStore()
    expect(locked.load().problem).toBe('unreadable')
    expect(() => create(locked)).toThrow()
    expect(readFileSync(file())).toEqual(bytes)
    expect(readFileSync(`${file()}.bak`)).toEqual(backup)
    runtime.key = 'profile-1'
    expect(new BoardStore().load().cards).toHaveLength(2)
  })
  it('rejects invalid schema, duplicate IDs and excessive saved cards', () => {
    const store = new BoardStore()
    const card = create(store).cards[0]
    for (const cards of [[{ ...card, revision: 0 }], [card, card], Array(BOARD_CARD_LIMIT + 1).fill(card)]) {
      const payload = Buffer.from(`profile-1:${Buffer.from(JSON.stringify({ version: 1, cards })).toString('base64')}`).toString('base64')
      writeFileSync(file(), JSON.stringify({ version: 1, payload }))
      expect(new BoardStore().load().problem).toBe('unreadable')
    }
    expect(existsSync(`${file()}.bak`)).toBe(false)
  })
})
