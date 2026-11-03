/** The fork's preview must never share installation or profile identity with upstream. */
export const APP_IDENTITY = {
  packageName: 'edge-drop-tasks-preview',
  productName: 'Edge-Drop Tasks Preview',
  appId: 'com.duye0120.edgedrop.tasks.preview',
  executableName: 'Edge-Drop-Tasks-Preview',
  dataDirectory: 'edge-drop-tasks-preview',
  loginItemName: 'Edge-Drop Tasks Preview',
  defaultHotkey: 'Alt+Shift+C',
  channel: 'tasks-preview'
} as const
