import { describe, expect, it, vi } from 'vitest'
import { isUpdateMode, resolveUpdateMode } from '../shared/types'
import { useStore } from '../src/store/appStore'

describe('updateMode resolution and legacy migration', () => {
  it('reports the fork-disabled response without presenting an update error', async () => {
    vi.stubGlobal('window', { edge: { checkForUpdatesManual: async () => ({ status: 'disabled', version: '0.4.0' }) } })
    try {
      await useStore.getState().startManualCheck()
      expect(useStore.getState().manualCheckState).toEqual({ status: 'disabled', version: '0.4.0' })
      expect(useStore.getState().manualUpdateActive).toBe(false)
    } finally { vi.unstubAllGlobals(); useStore.getState().resetManualCheck() }
  })
  it('defaults to auto when nothing is stored', () => {
    expect(resolveUpdateMode({})).toBe('auto')
  })

  it('prefers a stored valid mode over the legacy boolean', () => {
    expect(resolveUpdateMode({ updateMode: 'notify', autoUpdates: true })).toBe('notify')
    expect(resolveUpdateMode({ updateMode: 'off', autoUpdates: true })).toBe('off')
    expect(resolveUpdateMode({ updateMode: 'auto', autoUpdates: false })).toBe('auto')
  })

  it('migrates legacy booleans: on stays auto, off becomes notify', () => {
    expect(resolveUpdateMode({ autoUpdates: true })).toBe('auto')
    expect(resolveUpdateMode({ autoUpdates: false })).toBe('notify')
  })

  it('falls back to the legacy boolean on corrupt mode values', () => {
    expect(resolveUpdateMode({ updateMode: 'sometimes' as never, autoUpdates: false })).toBe('notify')
    expect(resolveUpdateMode({ updateMode: '' as never })).toBe('auto')
  })

  it('validates mode values', () => {
    expect(isUpdateMode('auto')).toBe(true)
    expect(isUpdateMode('notify')).toBe(true)
    expect(isUpdateMode('off')).toBe(true)
    expect(isUpdateMode('sometimes')).toBe(false)
    expect(isUpdateMode(undefined)).toBe(false)
  })
})
