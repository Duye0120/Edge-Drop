import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BOARD_TEXT_MAX, localDateTimeInput, selectBoardCards, type BoardCard, type BoardDraft, type BoardPatch, type BoardSnapshot, type BoardView } from '../../shared/board'
import { edge } from '../lib/edge'
import { acquireKeyboard, releaseKeyboard } from '../lib/keyboardFocus'
import { useStore } from '../store/appStore'
import { boardStrings } from '../i18n/board'
import { CheckIcon, ChevronDownIcon, NoteIcon, PinIcon, SearchIcon } from './icons'
import '../styles/board.css'

type Editor = { card: BoardCard | null; kind: BoardDraft['kind']; text: string; time: string }
type Undo = { card: BoardCard; revision: number; patch: BoardPatch }

export function BoardPanel({ active, horizontal }: { active: boolean; horizontal: boolean }) {
  const language = useStore((s) => s.settings.language)
  const open = useStore((s) => s.open)
  const demo = useStore((s) => s.demo)
  const s = useMemo(() => boardStrings(), [language])
  const [snapshot, setSnapshot] = useState<BoardSnapshot | null>(null)
  const [view, setView] = useState<BoardView>('all')
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<Editor | null>(null)
  const [error, setError] = useState('')
  const [loadingError, setLoadingError] = useState(false)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [undo, setUndo] = useState<Undo | null>(null)
  const [now, setNow] = useState(Date.now())
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ past: true, completed: true })
  const root = useRef<HTMLDivElement>(null)
  const textInput = useRef<HTMLTextAreaElement>(null)
  const generation = useRef(0)

  const load = useCallback(async () => {
    const token = ++generation.current
    setLoadingError(false)
    try {
      const result = await edge.loadBoard()
      if (token === generation.current) setSnapshot(result)
    } catch { if (token === generation.current) setLoadingError(true) }
  }, [])

  useEffect(() => {
    if (demo) return
    const off = edge.onBoardChanged((result) => {
      generation.current++
      setSnapshot(result)
    })
    void load()
    return () => { generation.current++; off(); releaseKeyboard('board') }
  }, [load, demo])

  useEffect(() => {
    if (!active || !open) { releaseKeyboard('board'); return }
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(timer)
  }, [active, open])

  // Native date pickers may extend beyond the blade. Hold it while the editor is open.
  useEffect(() => {
    useStore.setState({ boardEditing: !!editor && active && open })
    return () => { useStore.setState({ boardEditing: false }) }
  }, [editor, active, open])

  const groups = useMemo(() => selectBoardCards(snapshot?.cards ?? [], view, query, now), [snapshot, view, query, now])
  const count = [...groups.values()].reduce((sum, cards) => sum + cards.length, 0)
  const disabled = busy || !snapshot || !!snapshot.problem

  const begin = (card: BoardCard | null) => {
    setError('')
    setEditor({ card, kind: card?.kind ?? 'todo', text: card?.text ?? '', time: localDateTimeInput(card?.dueAt ?? null) })
    void acquireKeyboard('board').then(() => textInput.current?.focus())
  }

  const execute = async (command: Parameters<typeof edge.executeBoard>[0]) => {
    if (busyRef.current) return null
    busyRef.current = true
    setBusy(true)
    setError('')
    try {
      const result = await edge.executeBoard(command)
      setSnapshot(result)
      return result
    } catch {
      setError(s.saveError)
      // A stale revision may have caused rejection. Keep the draft and fetch current cards.
      void load()
      return null
    } finally { busyRef.current = false; setBusy(false) }
  }

  const update = async (card: BoardCard, patch: BoardPatch, reversible = false) => {
    const result = await execute({ type: 'update', id: card.id, revision: card.revision, patch })
    if (!result) return
    const saved = result.cards.find((c) => c.id === card.id)!
    if (reversible) {
      const previous: BoardPatch = {}
      for (const key of Object.keys(patch) as Array<keyof BoardPatch>) Object.assign(previous, { [key]: card[key] })
      setUndo({ card, revision: saved.revision, patch: previous })
    } else setUndo(null)
  }

  const save = async () => {
    if (!editor || !editor.text.trim() || busyRef.current) return
    const dueAt = editor.time ? new Date(editor.time).getTime() : null
    if (dueAt !== null && (!Number.isFinite(dueAt) || localDateTimeInput(dueAt) !== editor.time)) {
      setError(s.invalidTime); return
    }
    const result = await execute(editor.card
      ? { type: 'update', id: editor.card.id, revision: editor.card.revision, patch: { text: editor.text, dueAt } }
      : { type: 'create', draft: { kind: editor.kind, text: editor.text, dueAt } })
    if (result) { setEditor(null); setUndo(null); releaseKeyboard('board') }
  }

  const formatTime = (card: BoardCard) => card.dueAt === null ? s.untimed
    : `${card.kind === 'todo' ? s.due : s.review} · ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(card.dueAt)}`

  return (
    <div ref={root} className={`board-panel${horizontal ? ' board-horizontal' : ''}`} style={{ display: active ? 'flex' : 'none' }}
      onPointerDownCapture={(e) => {
        const target = e.target as HTMLElement
        if (target.matches('input, textarea, select')) {
          void acquireKeyboard('board').then(() => { if (active && useStore.getState().open && target.isConnected) target.focus() })
        }
      }}
      onFocusCapture={(e) => { if ((e.target as HTMLElement).matches('input, textarea, select')) void acquireKeyboard('board') }}
      onBlurCapture={(e) => { if (!root.current?.contains(e.relatedTarget as Node)) releaseKeyboard('board') }}
    >
      <div className="board-toolbar">
        <div className="board-views" role="group" aria-label={s.board}>
          {(['all', 'today', 'upcoming', 'archive'] as const).map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>{s[v]}</button>
          ))}
        </div>
        <div className="board-search">
          <SearchIcon width={13} height={13} />
          <input aria-label={s.search} placeholder={s.search} value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); if (query) setQuery(''); else e.currentTarget.blur() } }} />
          {query && <button type="button" aria-label={s.clear} onClick={() => setQuery('')}>×</button>}
        </div>
        <button type="button" className="board-add" disabled={disabled} onClick={() => begin(null)}>＋ {s.add}</button>
      </div>

      <div className="board-main">
        {error && <p className="board-notice board-error" role="alert">{error}</p>}
        {snapshot?.problem && <p className="board-notice board-error" role="alert">{s.locked}</p>}
        {snapshot?.recovered && <p className="board-notice" role="status">{s.recovered}</p>}
        {loadingError && <p className="board-notice" role="alert">{s.loadError} <button type="button" onClick={() => void load()}>{s.retry}</button></p>}
        {!snapshot && !loadingError && <p className="board-empty">{s.loading}</p>}
        {editor && (
          <form className="board-editor" onSubmit={(e) => { e.preventDefault(); void save() }}>
            <div className="board-kind" role="group" aria-label={s.add}>
              {(['todo', 'memo'] as const).map((kind) => <button key={kind} type="button" aria-pressed={editor.kind === kind}
                disabled={!!editor.card || busy} onClick={() => setEditor({ ...editor, kind })}>{s[kind]}</button>)}
              <span>{s.draft}</span>
            </div>
            <textarea ref={textInput} aria-label={s.text} placeholder={s.placeholder} value={editor.text} maxLength={BOARD_TEXT_MAX}
              rows={3} disabled={busy} onChange={(e) => setEditor({ ...editor, text: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { e.stopPropagation(); setEditor(null); releaseKeyboard('board') }
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); void save() }
              }} />
            <label>{s.time}<input type="datetime-local" value={editor.time} disabled={busy}
              onChange={(e) => setEditor({ ...editor, time: e.target.value })} /></label>
            {editor.time ? <button className="board-remove-time" type="button" disabled={busy} onClick={() => setEditor({ ...editor, time: '' })}>{s.removeTime}</button>
              : <p className="board-time-hint">{s.noTime}</p>}
            <div className="board-editor-actions">
              <button type="button" disabled={busy} onClick={() => { setEditor(null); setError(''); releaseKeyboard('board') }}>{s.cancel}</button>
              <button type="submit" className="board-save" disabled={disabled || !editor.text.trim()}>{busy ? '…' : s.save}</button>
            </div>
          </form>
        )}
        {snapshot && !snapshot.problem && !count && !editor && <p className="board-empty">{query || view !== 'all' ? s.noResults : s.empty}</p>}
        <div className="board-groups">
          {[...groups].map(([group, cards]) => cards.length ? (
            <section key={group} className={`board-group board-group-${group}`}>
              <button type="button" className="board-group-title" aria-expanded={!!query || !collapsed[group]}
                onClick={() => setCollapsed({ ...collapsed, [group]: !collapsed[group] })}>
                <ChevronDownIcon width={12} height={12} style={{ transform: !query && collapsed[group] ? 'rotate(-90deg)' : undefined }} />
                <span>{s[group]}</span><span className="board-count">{cards.length}</span>
              </button>
              {(query || !collapsed[group]) && cards.map((card) => (
                <article key={card.id} className={`board-card${card.completedAt !== null ? ' is-complete' : ''}${card.dueAt !== null && card.dueAt <= now && card.completedAt === null ? ' is-due' : ''}`}>
                  <div className="board-card-content">
                    {card.kind === 'todo' ? <button type="button" className="board-check" aria-label={card.completedAt === null ? s.complete : s.reopen}
                      aria-pressed={card.completedAt !== null} disabled={disabled || card.archivedAt !== null}
                      onClick={() => void update(card, { completedAt: card.completedAt === null ? Date.now() : null }, true)}>
                      {card.completedAt !== null && <CheckIcon width={12} height={12} />}
                    </button> : <NoteIcon className="board-memo-icon" width={15} height={15} />}
                    <p>{card.text}</p>
                  </div>
                  <div className="board-card-time">{formatTime(card)}</div>
                  <div className="board-card-actions">
                    <span className="board-card-kind">{s[card.kind]}</span>
                    {card.archivedAt === null ? <>
                      <button type="button" aria-label={card.pinned ? s.unpin : s.pin} title={card.pinned ? s.unpin : s.pin}
                        aria-pressed={card.pinned} disabled={disabled} onClick={() => void update(card, { pinned: !card.pinned })}><PinIcon width={13} height={13} /></button>
                      <button type="button" disabled={disabled} onClick={() => begin(card)}>{s.edit}</button>
                      <button type="button" disabled={disabled} onClick={() => void update(card, { archivedAt: Date.now() }, true)}>{s.archiveCard}</button>
                    </> : <button type="button" disabled={disabled} onClick={() => void update(card, { archivedAt: null }, true)}>{s.restore}</button>}
                  </div>
                </article>
              ))}
            </section>
          ) : null)}
        </div>
      </div>
      {undo && <div className="board-undo" role="status"><span>{undo.patch.archivedAt === null ? s.archived : s.changed}</span>
        <button type="button" disabled={disabled} onClick={async () => {
          const result = await execute({ type: 'update', id: undo.card.id, revision: undo.revision, patch: undo.patch })
          if (result) setUndo(null)
        }}>{s.undo}</button></div>}
    </div>
  )
}
