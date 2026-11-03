import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { BOARD_TEXT_MAX, localDateTimeInput, selectBoardCards, type BoardCard, type BoardDraft, type BoardPatch, type BoardSnapshot, type BoardView } from '../../shared/board'
import { edge } from '../lib/edge'
import { acquireKeyboard, releaseKeyboard } from '../lib/keyboardFocus'
import { useStore } from '../store/appStore'
import { getResolvedLanguage } from '../i18n'
import { boardStrings, formatBoardDate, type BoardStrings } from '../i18n/board'
import { CheckIcon, ChevronDownIcon, ClockIcon, CloseIcon, NoteIcon, PinIcon, SearchIcon } from './icons'
import '../styles/board.css'

type Editor = { card: BoardCard | null; kind: BoardDraft['kind']; text: string; time: string }
type Undo = { card: BoardCard; revision: number; patch: BoardPatch; message: keyof BoardStrings }

export function BoardPanel({ active, horizontal }: { active: boolean; horizontal: boolean }) {
  const language = useStore((s) => s.settings.language)
  const open = useStore((s) => s.open)
  const demo = useStore((s) => s.demo)
  const s = useMemo(() => boardStrings(language), [language])
  const locale = getResolvedLanguage(language)
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
  const timePicker = useRef<HTMLInputElement>(null)
  const timeHintId = useId()
  const errorId = useId()
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
  const latestCard = editor?.card ? snapshot?.cards.find((c) => c.id === editor.card!.id) : null
  const conflict = !!editor?.card && !!latestCard && latestCard.revision !== editor.card.revision

  const begin = (card: BoardCard | null) => {
    setError('')
    setEditor({ card, kind: card?.kind ?? 'todo', text: card?.text ?? '', time: localDateTimeInput(card?.dueAt ?? null) })
    void acquireKeyboard('board').then(() => {
      if (active && useStore.getState().open) textInput.current?.focus()
    })
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
      setError(editor ? s.saveError : s.actionError)
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
      const message = 'archivedAt' in patch ? (patch.archivedAt === null ? 'restored' : 'archived')
        : 'completedAt' in patch ? (patch.completedAt === null ? 'reopenedAction' : 'completedAction') : 'changed'
      setUndo({ card, revision: saved.revision, patch: previous, message })
    } else setUndo(null)
  }

  const save = async () => {
    if (!editor || !editor.text.trim() || busyRef.current || conflict) return
    const dueAt = editor.time ? new Date(editor.time).getTime() : null
    if (dueAt !== null && (!Number.isFinite(dueAt) || localDateTimeInput(dueAt) !== editor.time)) {
      setError(s.invalidTime); return
    }
    const result = await execute(editor.card
      ? { type: 'update', id: editor.card.id, revision: editor.card.revision, patch: { text: editor.text, dueAt } }
      : { type: 'create', draft: { kind: editor.kind, text: editor.text, dueAt } })
    if (result) {
      setEditor(null); setUndo(null); setView('all'); setQuery(''); setNow(Date.now())
      setCollapsed((previous) => ({ ...previous, past: false }))
      window.requestAnimationFrame(() => root.current?.querySelector('.board-main')?.scrollTo({ top: 0, left: 0 }))
      releaseKeyboard('board')
    }
  }

  const formatTime = (card: BoardCard) => card.dueAt === null ? s.untimed
    : `${card.kind === 'todo' ? s.due : s.review} · ${formatBoardDate(card.dueAt, language)}`
  const parsedTime = editor?.time ? new Date(editor.time).getTime() : NaN
  const pickerValue = Number.isFinite(parsedTime) && localDateTimeInput(parsedTime) === editor?.time ? editor.time : ''

  return (
    <div ref={root} lang={locale} className={`board-panel${horizontal ? ' board-horizontal' : ''}`} style={{ display: active ? 'flex' : 'none' }}
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
        <div className="board-views settings-tab-bar" role="group" aria-label={s.views}>
          {(['all', 'today', 'upcoming', 'archive'] as const).map((v) => (
            <button key={v} type="button" className={`settings-tab-btn${view === v ? ' active' : ''}`} aria-pressed={view === v} onClick={() => setView(v)}>{s[v]}</button>
          ))}
        </div>
        <div className={`board-search search${query ? ' has-query' : ''}`}>
          <SearchIcon className="search-icon" width={14} height={14} />
          <input aria-label={s.search} placeholder={s.search} value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); if (query) setQuery(''); else e.currentTarget.blur() } }} />
          <button type="button" className="search-clear" aria-label={s.clear} title={s.clear} aria-hidden={!query} tabIndex={-1}
            onPointerDown={(e) => e.preventDefault()} onMouseDown={(e) => e.preventDefault()} onClick={() => setQuery('')}><CloseIcon width={10} height={10} weight="bold" /></button>
        </div>
        <button type="button" className="pill board-add" disabled={disabled || !!editor} onClick={() => begin(null)}>＋ {s.add}</button>
      </div>

      <div className="board-main">
        {error && <p id={errorId} className="board-notice board-error" role="alert">{error}</p>}
        {snapshot?.problem && <p className="board-notice board-error" role="alert">{s.locked}</p>}
        {snapshot?.recovered && <p className="board-notice" role="status">{s.recovered}</p>}
        {loadingError && <p className="board-notice" role="alert">{s.loadError} <button type="button" onClick={() => void load()}>{s.retry}</button></p>}
        {!snapshot && !loadingError && <p className="board-empty">{s.loading}</p>}
        {editor && (
          <form className="board-editor" aria-busy={busy} onSubmit={(e) => { e.preventDefault(); void save() }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { e.stopPropagation(); if (!busy) { setEditor(null); setError(''); releaseKeyboard('board') } }
            }}>
            <div className="board-kind">
              <div className="setting-pills" role="group" aria-label={s.cardKind}>
                {(['todo', 'memo'] as const).map((kind) => <button key={kind} type="button" className={`pill${editor.kind === kind ? ' active' : ''}`} aria-pressed={editor.kind === kind}
                  disabled={!!editor.card || busy} onClick={() => setEditor({ ...editor, kind })}>{s[kind]}</button>)}
              </div>
              <span>{s.draft}</span>
            </div>
            <textarea ref={textInput} aria-label={s.text} placeholder={s.placeholder} value={editor.text} maxLength={BOARD_TEXT_MAX}
              rows={3} disabled={busy} onChange={(e) => setEditor({ ...editor, text: e.target.value })}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); void save() }
              }} />
            {conflict && latestCard && <div className="board-notice" role="alert">
              <p>{s.conflict}</p>
              <button type="button" disabled={busy} onClick={() => { setEditor({ ...editor, card: latestCard }); setError('') }}>{s.keepDraft}</button>
              {' · '}<button type="button" disabled={busy} onClick={() => begin(latestCard)}>{s.useSaved}</button>
            </div>}
            <label className="board-time-label">{s.time}
              <input aria-label={s.time} aria-invalid={error === s.invalidTime} aria-describedby={`${timeHintId}${error === s.invalidTime ? ` ${errorId}` : ''}`} type="text" placeholder={s.timePlaceholder} value={editor.time.replace('T', ' ')} disabled={busy}
                onChange={(e) => setEditor({ ...editor, time: e.target.value.replace(' ', 'T') })} />
            </label>
            <div className="board-time-tools">
              <input ref={timePicker} className="board-native-time" aria-hidden="true" tabIndex={-1} type="datetime-local" lang={locale} value={pickerValue} disabled={busy}
                onChange={(e) => setEditor({ ...editor, time: e.target.value })} />
              <button type="button" className="flyout-text-btn" aria-label={s.pickTime} disabled={busy} onClick={() => {
                try { timePicker.current!.showPicker() } catch { setError(s.pickerUnavailable) }
              }}><ClockIcon width={13} height={13} />{s.pickTime}</button>
            </div>
            <p id={timeHintId} className="board-time-hint">{s.timeHint}</p>
            {editor.time ? <button className="board-remove-time" type="button" disabled={busy} onClick={() => setEditor({ ...editor, time: '' })}>{s.removeTime}</button>
              : <p className="board-time-hint">{s.noTime}</p>}
            <div className="board-editor-actions">
              <button type="button" className="pill" disabled={busy} onClick={() => { setEditor(null); setError(''); releaseKeyboard('board') }}>{s.cancel}</button>
              <button type="submit" className="pill active board-save" disabled={disabled || conflict || !editor.text.trim()}>{busy ? s.saving : s.save}</button>
            </div>
          </form>
        )}
        {snapshot && !snapshot.problem && !count && !editor && <div className="board-empty empty" role="status"><div className="empty-text">
          <p className="title">{query ? s.noResults : view === 'archive' ? s.emptyArchive : view !== 'all' ? s.noResults : s.emptyTitle}</p>
          <p className="hint">{query || view !== 'all' ? s.noResultsHint : s.empty}</p>
        </div></div>}
        <div className="board-groups">
          {[...groups].map(([group, cards]) => cards.length ? (
            <section key={group} className={`board-group board-group-${group}`}>
              <button type="button" className="board-group-title" aria-expanded={!!query || !collapsed[group]}
                onClick={() => setCollapsed({ ...collapsed, [group]: !collapsed[group] })}>
                <ChevronDownIcon width={12} height={12} style={{ transform: !query && collapsed[group] ? 'rotate(-90deg)' : undefined }} />
                <span>{s[group]}</span><span className="board-count">{cards.length}</span>
              </button>
              {(query || !collapsed[group]) && cards.map((card) => (
                <article key={card.id} className={`item board-card${card.pinned ? ' pinned' : ''}${card.completedAt !== null ? ' is-complete' : ''}${card.dueAt !== null && card.dueAt <= now && card.completedAt === null ? ' is-due' : ''}`}>
                  <div className="board-card-content">
                    {card.kind === 'todo' ? <button type="button" className="board-check" aria-label={card.completedAt === null ? s.complete : s.reopen}
                      aria-pressed={card.completedAt !== null} disabled={disabled || card.archivedAt !== null}
                      onClick={() => void update(card, { completedAt: card.completedAt === null ? Date.now() : null }, true)}>
                      {card.completedAt !== null && <CheckIcon width={12} height={12} />}
                    </button> : <NoteIcon className="board-memo-icon" width={15} height={15} />}
                    <p>{card.text}</p>
                  </div>
                  <div className="board-card-time">{formatTime(card)}</div>
                  <div className="board-card-footer">
                    <span className="board-card-kind">{s[card.kind]}</span>
                    <div className="board-card-actions actions-pill">
                    {card.archivedAt === null ? <>
                      <button type="button" className={`act${card.pinned ? ' active' : ''}`} aria-label={card.pinned ? s.unpin : s.pin} title={card.pinned ? s.unpin : s.pin}
                        aria-pressed={card.pinned} disabled={disabled} onClick={() => void update(card, { pinned: !card.pinned })}><PinIcon width={13} height={13} weight={card.pinned ? 'fill' : 'bold'} /></button>
                      <button type="button" className="flyout-text-btn" disabled={disabled || !!editor} onClick={() => begin(card)}>{s.edit}</button>
                      <button type="button" className="flyout-text-btn" disabled={disabled} onClick={() => void update(card, { archivedAt: Date.now() }, true)}>{s.archiveCard}</button>
                    </> : <button type="button" className="flyout-text-btn" disabled={disabled} onClick={() => void update(card, { archivedAt: null }, true)}>{s.restore}</button>}
                    </div>
                  </div>
                </article>
              ))}
            </section>
          ) : null)}
        </div>
      </div>
      {undo && <div className="board-undo toast" role="status"><span>{s[undo.message]}</span>
        <button type="button" disabled={disabled} onClick={async () => {
          const result = await execute({ type: 'update', id: undo.card.id, revision: undo.revision, patch: undo.patch })
          if (result) setUndo(null)
        }}>{s.undo}</button></div>}
    </div>
  )
}
