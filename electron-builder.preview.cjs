const { execFileSync } = require('node:child_process')
const pkg = require('./package.json')
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error('An immutable source commit is required')
module.exports = {
  ...pkg.build,
  productName: 'Edge-Drop Tasks Preview',
  appId: 'com.duye0120.edgedrop.tasks.preview',
  buildVersion: '0.4.0.1',
  publish: null,
  extraMetadata: {
    name: 'edge-drop-tasks-preview',
    buildTarget: 'github',
    releaseChannel: 'tasks-preview',
    previewAppId: 'com.duye0120.edgedrop.tasks.preview',
    buildCommit: commit
  },
  extraResources: [{ from: 'node_modules/emoji-datasource-twitter/img/twitter/64', to: 'emoji/64' }],
  win: {
    ...pkg.build.win,
    executableName: 'Edge-Drop-Tasks-Preview',
    target: [{ target: 'nsis', arch: ['x64'] }, { target: 'zip', arch: ['x64'] }],
    signExecutable: false,
    artifactName: 'Edge-Drop-Tasks-Preview-${version}-windows-${arch}.${ext}'
  },
  nsis: {
    ...pkg.build.nsis,
    shortcutName: 'Edge-Drop Tasks Preview',
    allowToChangeInstallationDirectory: false,
    deleteAppDataOnUninstall: false,
    runAfterFinish: false,
    artifactName: 'Edge-Drop-Tasks-Preview-${version}-windows-${arch}-setup.${ext}'
  }
}
