import { app, nativeImage } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { createRequire } from 'node:module'
import { APP_IDENTITY } from '../../shared/identity'
import { checkForUpdatesManual } from './updater'

export async function runReleaseSelfCheck(): Promise<void> {
  const reportIndex = process.argv.indexOf('--release-report')
  const reportFile = reportIndex >= 0 ? process.argv[reportIndex + 1] : undefined
  if (!reportFile || !app.isPackaged) throw new Error('A packaged app and a new report path are required')
  const root = app.getAppPath()
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('Expected Windows x64')
  if (pkg.name !== APP_IDENTITY.packageName || pkg.releaseChannel !== APP_IDENTITY.channel || pkg.previewAppId !== APP_IDENTITY.appId || !/^[a-f0-9]{40}$/.test(pkg.buildCommit)) throw new Error('Invalid preview provenance')
  const data = app.getPath('userData')
  if (basename(data) !== APP_IDENTITY.dataDirectory || basename(app.getPath('sessionData')) !== 'session') throw new Error('Profile isolation failed')
  for (const file of ['out/renderer/index.html', 'out/preload/index.cjs']) {
    if (!existsSync(join(root, file))) throw new Error(`Missing packaged entry: ${file}`)
  }
  if (nativeImage.createFromPath(join(root, 'resources', 'icon.png')).isEmpty()) throw new Error('Packaged icon could not be loaded')
  if (!existsSync(join(process.resourcesPath, 'emoji', '64', '1f600.png'))) throw new Error('Missing emoji assets')
  const require = createRequire(import.meta.url)
  const koffi = require('koffi') as { load: (path: string) => unknown }
  koffi.load('user32.dll')
  const { Resvg } = require('@resvg/resvg-js') as typeof import('@resvg/resvg-js')
  const png = new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="white"/></svg>').render().asPng()
  if (!png.length) throw new Error('Packaged SVG native module failed')
  const update = await checkForUpdatesManual()
  if (update.status !== 'disabled') throw new Error('Preview updater is not disabled')
  writeFileSync(reportFile, JSON.stringify({
    name: pkg.name, productName: APP_IDENTITY.productName, version: app.getVersion(),
    channel: pkg.releaseChannel, commit: pkg.buildCommit, appId: APP_IDENTITY.appId,
    platform: process.platform, arch: process.arch, electron: process.versions.electron,
    userDataDirectory: basename(data), sessionDataDirectory: basename(app.getPath('sessionData')),
    updater: update.status, nativeModules: ['koffi', '@resvg/resvg-js'],
    renderer: true, preload: true, icon: true, emoji: true,
    desktopSmokeTest: false
  }, null, 2) + '\n', { flag: 'wx' })
}
