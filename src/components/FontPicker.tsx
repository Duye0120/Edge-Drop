import { useEffect, useRef, useState } from 'react'
import { normalizeFontFamily, normalizeFontList, preferenceStrings, uiFontStack } from '../../shared/preferences'
import { useTranslation } from '../i18n'
import { edge } from '../lib/edge'
import { acquireKeyboard, releaseKeyboard } from '../lib/keyboardFocus'
import { useStore } from '../store/appStore'
import '../styles/preferences.css'

export function FontPicker() {
  const { resolvedLang } = useTranslation()
  const s = preferenceStrings(resolvedLang)
  const selected = useStore((state) => state.settings.uiFontFamily ?? '')
  const open = useStore((state) => state.open)
  const [fonts, setFonts] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [custom, setCustom] = useState(false)
  const [draft, setDraft] = useState(selected)
  const [invalid, setInvalid] = useState(false)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => { setDraft(selected); setInvalid(false) }, [selected])
  useEffect(() => {
    let alive = true
    Promise.resolve(edge.getSystemFonts()).then((list) => { if (alive) setFonts(normalizeFontList(list)) }).catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false; releaseKeyboard('font-preference'); useStore.setState({ preferencesEditing: false }) }
  }, [])
  useEffect(() => { if (!open) { releaseKeyboard('font-preference'); useStore.setState({ preferencesEditing: false }) } }, [open])
  const known = fonts.includes(selected)
  const manual = custom || (!!selected && !known)
  const apply = async (name: string) => {
    const family = normalizeFontFamily(name)
    if (name.trim() && !family) { setInvalid(true); return }
    setInvalid(false)
    setFailed(false)
    setBusy(true)
    try { await useStore.getState().patchSettings({ uiFontFamily: family }) } catch { setFailed(true) } finally { setBusy(false) }
  }
  return <div ref={root} className="font-picker"
    onPointerDownCapture={(event) => {
      const target = event.target as HTMLElement
      if (target.matches('input, select')) void acquireKeyboard('font-preference').then(() => {
        if (useStore.getState().open && target.isConnected) target.focus()
      })
    }}
    onFocusCapture={() => { void acquireKeyboard('font-preference'); useStore.setState({ preferencesEditing: true }) }}
    onBlurCapture={(event) => {
      if (!root.current?.contains(event.relatedTarget as Node)) { releaseKeyboard('font-preference'); useStore.setState({ preferencesEditing: false }) }
    }}>
    <select aria-label={s.fontTitle} disabled={busy} value={manual ? 'custom' : selected ? `font:${selected}` : ''} onChange={(event) => {
      if (event.target.value === 'custom') { setCustom(true); return }
      setCustom(false)
      void apply(event.target.value ? event.target.value.slice(5) : '')
    }}>
      <option value="">{s.defaultFont}</option>
      {fonts.map((font) => <option key={font} value={`font:${font}`}>{font}</option>)}
      <option value="custom">{s.customFont}</option>
    </select>
    {manual && <div className="font-custom">
      <input aria-label={s.fontName} aria-invalid={invalid} value={draft} maxLength={120} placeholder={s.fontName} disabled={busy}
        onChange={(event) => { setDraft(event.target.value); setInvalid(false) }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') { event.preventDefault(); void apply(draft) }
          if (event.key === 'Escape') { event.stopPropagation(); setDraft(selected); setInvalid(false); event.currentTarget.blur() }
        }} />
      <button type="button" className="pill active" disabled={busy} onClick={() => void apply(draft)}>{s.applyFont}</button>
    </div>}
    {invalid && <p className="font-error" role="alert">{s.invalidFont}</p>}
    {failed && <p className="font-error" role="alert">{s.fontSaveError}</p>}
    {loading ? <p role="status">{s.fontLoading}</p> : !fonts.length ? <p role="status">{s.fontUnavailable}</p> : null}
    <p className="font-preview" style={{ fontFamily: uiFontStack(selected) }}>{s.fontPreview}</p>
    <p>{selected && !known && !loading ? s.fontMissing : s.fontFallback}</p>
    {selected && <button type="button" className="flyout-text-btn" disabled={busy} onClick={() => { setCustom(false); void apply('') }}>{s.resetFont}</button>}
  </div>
}
