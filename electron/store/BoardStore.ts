import { app, safeStorage } from 'electron'
import { closeSync, copyFileSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { BOARD_CARD_LIMIT, isBoardCard, validateBoardDraft, validateBoardPatch, type BoardCard, type BoardCommand, type BoardSnapshot } from '../../shared/board'

/** Saves acknowledge only after encryption, flush and atomic replacement succeed. */
export class BoardStore {
  private snapshot: BoardSnapshot | null = null
  private file(): string { return join(app.getPath('userData'), 'board-v1.json') }

  private decode(file: string): BoardCard[] {
    const envelope = JSON.parse(readFileSync(file, 'utf8'))
    if (envelope.version !== 1 || typeof envelope.payload !== 'string') throw new Error('Invalid envelope')
    const data = JSON.parse(safeStorage.decryptString(Buffer.from(envelope.payload, 'base64')))
    if (data.version !== 1 || !Array.isArray(data.cards) || data.cards.length > BOARD_CARD_LIMIT
      || !data.cards.every(isBoardCard) || new Set(data.cards.map((c: BoardCard) => c.id)).size !== data.cards.length) {
      throw new Error('Invalid board')
    }
    return data.cards
  }

  load(): BoardSnapshot {
    if (this.snapshot) return structuredClone(this.snapshot)
    const file = this.file()
    if (!safeStorage.isEncryptionAvailable()) {
      this.snapshot = { cards: [], problem: 'encryption' }
    } else if (!existsSync(file) && !existsSync(`${file}.bak`)) {
      this.snapshot = { cards: [] }
    } else {
      try {
        this.snapshot = { cards: this.decode(file) }
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code
        // Sharing/permission errors are not evidence of corruption. Never replace that file.
        if (code && code !== 'ENOENT') {
          this.snapshot = { cards: [], problem: 'read' }
        } else {
          try {
            const cards = this.decode(`${file}.bak`)
            if (existsSync(file)) copyFileSync(file, `${file}.unreadable-${Date.now()}.bak`)
            // Keep the valid backup until the next save; don't rotate the bad primary over it.
            this.snapshot = { cards, recovered: true }
          } catch {
            this.snapshot = { cards: [], problem: 'unreadable' }
          }
        }
      }
    }
    return structuredClone(this.snapshot)
  }

  execute(command: BoardCommand): BoardSnapshot {
    const current = this.load()
    if (current.problem) throw new Error('Board storage is locked; restart after restoring access')
    if (!command || typeof command !== 'object') throw new Error('Invalid board command')
    const cards = current.cards
    const now = Date.now()
    if (command.type === 'create') {
      if (cards.length >= BOARD_CARD_LIMIT) throw new Error('Board is full')
      const draft = validateBoardDraft(command.draft)
      cards.unshift({ ...draft, id: randomUUID(), pinned: false, completedAt: null, archivedAt: null, createdAt: now, updatedAt: now, revision: 1 })
    } else if (command.type === 'update') {
      if (typeof command.id !== 'string' || !Number.isSafeInteger(command.revision)) throw new Error('Invalid card identity')
      const index = cards.findIndex((c) => c.id === command.id)
      if (index < 0 || cards[index].revision !== command.revision) throw new Error('Card changed; reload before editing')
      const patch = validateBoardPatch(command.patch, cards[index].kind)
      cards[index] = { ...cards[index], ...patch, revision: cards[index].revision + 1, updatedAt: now }
    } else throw new Error('Unknown board command')

    if (!safeStorage.isEncryptionAvailable()) throw new Error('Encryption is unavailable')
    const encrypted = safeStorage.encryptString(JSON.stringify({ version: 1, cards }))
    const envelope = JSON.stringify({ version: 1, payload: encrypted.toString('base64') })
    const file = this.file()
    mkdirSync(app.getPath('userData'), { recursive: true })
    const fd = openSync(`${file}.tmp`, 'w', 0o600)
    try {
      writeFileSync(fd, envelope, 'utf8')
      fsyncSync(fd)
    } finally { closeSync(fd) }
    if (existsSync(file) && !current.recovered) copyFileSync(file, `${file}.bak`)
    renameSync(`${file}.tmp`, file)
    this.snapshot = { cards }
    return structuredClone(this.snapshot)
  }
}
