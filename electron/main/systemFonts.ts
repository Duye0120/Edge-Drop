import { execFile } from 'node:child_process'
import { getSystemPowerShellPath, getWritableCwd } from './powershell'
import { normalizeFontList } from '../../shared/preferences'

const FONT_SCRIPT = "[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new(); Add-Type -AssemblyName System.Drawing; $f=New-Object System.Drawing.Text.InstalledFontCollection; try { @($f.Families | ForEach-Object { $_.Name }) | ConvertTo-Json -Compress } finally { $f.Dispose() }"
let cached: Promise<string[]> | null = null

/** Read local font metadata only, once per process. No user text enters a command. */
export function getSystemFonts(): Promise<string[]> {
  if (cached) return cached
  cached = new Promise((resolve) => {
    if (process.platform !== 'win32' && process.platform !== 'linux') { resolve([]); return }
    const windows = process.platform === 'win32'
    execFile(windows ? getSystemPowerShellPath() : 'fc-list', windows
      ? ['-NoProfile', '-NonInteractive', '-Command', FONT_SCRIPT]
      : ['--format', '%{family}\n'],
    { encoding: 'utf8', windowsHide: true, timeout: 5000, maxBuffer: 512 * 1024, ...(windows ? { cwd: getWritableCwd() } : {}) }, (error, stdout) => {
      if (error) { resolve([]); return }
      try {
        const names = windows ? JSON.parse(stdout.replace(/^\uFEFF/, '').trim()) : stdout.split(/\r?\n/).flatMap((line) => line.split(','))
        resolve(normalizeFontList(typeof names === 'string' ? [names] : names))
      } catch { resolve([]) }
    })
  })
  return cached
}
