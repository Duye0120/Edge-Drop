import { app } from 'electron'
import { configurePreviewIdentity } from './identity'

configurePreviewIdentity()

if (process.argv.includes('--release-self-check')) {
  // Packaging checks use the real packaged Electron and native modules without
  // starting clipboard capture, startup registration, a window, or the tray.
  app.disableHardwareAcceleration()
  void app.whenReady().then(async () => {
    try {
      const { runReleaseSelfCheck } = await import('./releaseCheck')
      await runReleaseSelfCheck()
      app.exit(0)
    } catch (error) { console.error(error); app.exit(1) }
  })
} else {
  void import('./index')
}
