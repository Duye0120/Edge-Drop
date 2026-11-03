import { app } from 'electron'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { APP_IDENTITY } from '../../shared/identity'

/** Run before importing the application, whose modules may read saved settings. */
export function configurePreviewIdentity(): void {
  app.setName(APP_IDENTITY.packageName)
  const data = join(app.getPath('appData'), APP_IDENTITY.dataDirectory)
  const session = join(data, 'session')
  mkdirSync(session, { recursive: true })
  app.setPath('userData', data)
  app.setPath('sessionData', session)
}
