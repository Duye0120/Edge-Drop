import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

assert.equal(process.platform, 'win32', 'Package verification requires Windows')
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
const base = resolve('dist'), output = resolve('release-assets')
mkdirSync(output, { recursive: true })
const installer = `Edge-Drop-Tasks-Preview-${pkg.version}-windows-x64-setup.exe`
const archive = `Edge-Drop-Tasks-Preview-${pkg.version}-windows-x64.zip`
const exe = join(base, 'win-unpacked', 'Edge-Drop-Tasks-Preview.exe')
function machine(file) {
  const data = readFileSync(file)
  assert.equal(data.toString('ascii', 0, 2), 'MZ')
  const offset = data.readUInt32LE(0x3c)
  assert.equal(data.toString('ascii', offset, offset + 4), 'PE\u0000\u0000')
  return data.readUInt16LE(offset + 4)
}
assert.equal(machine(exe), 0x8664, 'Application PE must be x64')
assert([0x14c, 0x8664].includes(machine(join(base, installer))), 'Installer must be a Windows PE')
assert(!existsSync(join(base, 'win-unpacked', 'resources', 'app-update.yml')), 'No automatic update feed may ship')
// Synthetic upstream data must survive an actual packaged-Electron launch unchanged.
const legacy = join(process.env.APPDATA, 'edge-drop')
mkdirSync(legacy, { recursive: true })
const sentinel = join(legacy, 'preview-isolation-sentinel.txt')
writeFileSync(sentinel, 'upstream data must remain unchanged', { flag: 'wx' })
const reportFile = join(tmpdir(), `edge-drop-preview-self-check-${process.pid}.json`)
const child = spawnSync(exe, ['--release-self-check', '--release-report', reportFile], { timeout: 45000, encoding: 'utf8', windowsHide: true })
assert.equal(child.status, 0, `Packaged self-check failed: ${child.stderr || child.error || child.stdout}`)
const check = JSON.parse(readFileSync(reportFile, 'utf8'))
assert.equal(check.commit, commit)
assert.equal(check.version, pkg.version)
assert.equal(check.arch, 'x64')
assert.equal(check.name, 'edge-drop-tasks-preview')
assert.equal(check.userDataDirectory, 'edge-drop-tasks-preview')
assert.equal(check.updater, 'disabled')
assert.equal(readFileSync(sentinel, 'utf8'), 'upstream data must remain unchanged')
// Also check the ZIP can be expanded and contains the same executable and ASAR.
const extracted = join(tmpdir(), `edge-drop-preview-zip-${process.pid}`)
execFileSync('tar', ['-xf', join(base, archive), '-C', (() => { mkdirSync(extracted); return extracted })()], { timeout: 120000 })
async function sha(file) {
  const hash = createHash('sha256')
  for await (const block of createReadStream(file)) hash.update(block)
  return hash.digest('hex')
}
assert.equal(await sha(join(extracted, basename(exe))), await sha(exe))
assert.equal(await sha(join(extracted, 'resources', 'app.asar')), await sha(join(base, 'win-unpacked', 'resources', 'app.asar')))
const { copyFileSync, statSync } = await import('node:fs')
const files = []
for (const name of [installer, archive]) {
  copyFileSync(join(base, name), join(output, name))
  assert(statSync(join(output, name)).size > 10_000_000)
  files.push({ name, size: statSync(join(output, name)).size, sha256: await sha(join(output, name)) })
}
writeFileSync(join(output, 'package-self-check.json'), JSON.stringify(check, null, 2) + '\n')
const manifest = { version: pkg.version, tag: `v${pkg.version}`, commit, repository: process.env.GITHUB_REPOSITORY || 'Duye0120/Edge-Drop', channel: 'tasks-preview', platform: 'win32', arch: 'x64', runId: process.env.GITHUB_RUN_ID, signedByProject: false, upstreamDataUnchanged: true, desktopSmokeTest: false, files }
writeFileSync(join(output, 'release-manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
const sums = []
for (const name of readdirSync(output).sort()) sums.push(`${await sha(join(output, name))}  ${name}`)
writeFileSync(join(output, 'SHA256SUMS.txt'), sums.join('\n') + '\n')
console.log(JSON.stringify(manifest, null, 2))
