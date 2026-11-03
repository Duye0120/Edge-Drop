import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream, mkdtempSync, readFileSync, readdirSync, writeFileSync, appendFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const repo = process.env.GITHUB_REPOSITORY
assert.equal(repo, 'Duye0120/Edge-Drop', 'Only the user fork may receive this prerelease')
const directory = resolve('release-assets')
const manifest = JSON.parse(readFileSync(join(directory, 'release-manifest.json'), 'utf8'))
const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const tag = `v${pkg.version}`
assert.equal(process.env.GITHUB_REF, `refs/tags/${tag}`)
assert.equal(execFileSync('git', ['rev-parse', `refs/tags/${tag}^{commit}`], { encoding: 'utf8' }).trim(), head)
assert.equal(manifest.commit, head)
assert.equal(manifest.repository, repo)
assert.equal(manifest.version, pkg.version)
assert.equal(manifest.arch, 'x64')
assert.equal(manifest.channel, 'tasks-preview')
execFileSync('git', ['merge-base', '--is-ancestor', 'ff178ebfd9529bbd3ce369c74fab12a75c101de8', head])
const selfCheck = JSON.parse(readFileSync(join(directory, 'package-self-check.json'), 'utf8'))
assert.equal(selfCheck.commit, head)
assert.equal(selfCheck.version, pkg.version)
assert.equal(selfCheck.updater, 'disabled')
assert.equal(selfCheck.userDataDirectory, 'edge-drop-tasks-preview')
const allowed = [`Edge-Drop-Tasks-Preview-${pkg.version}-windows-x64-setup.exe`, `Edge-Drop-Tasks-Preview-${pkg.version}-windows-x64.zip`, 'release-manifest.json', 'package-self-check.json', 'SHA256SUMS.txt'].sort()
assert.deepEqual(readdirSync(directory).sort(), allowed)
const expected = new Map(readFileSync(join(directory, 'SHA256SUMS.txt'), 'utf8').trim().split('\n').map((line) => {
  const match = /^([a-f0-9]{64})  (.+)$/.exec(line)
  assert(match && match[2] === basename(match[2]) && allowed.includes(match[2]))
  return [match[2], match[1]]
}))
async function sha(file) { const hash = createHash('sha256'); for await (const part of createReadStream(file)) hash.update(part); return hash.digest('hex') }
for (const file of allowed.filter((name) => name !== 'SHA256SUMS.txt')) assert.equal(await sha(join(directory, file)), expected.get(file), file)
for (const file of manifest.files) assert.equal(expected.get(file.name), file.sha256)
const gh = (args) => execFileSync('gh', [...args, '--repo', repo], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const marker = `<!-- edge-drop-preview:${process.env.GITHUB_RUN_ID}:${head} -->`
const previous = spawnSync('gh', ['release', 'view', tag, '--repo', repo, '--json', 'isDraft,body'], { encoding: 'utf8' })
if (previous.status === 0) {
  const release = JSON.parse(previous.stdout)
  assert(release.isDraft && release.body.includes(marker), 'Refusing to replace a published or unrelated release')
} else {
  assert(/release not found|not found/i.test(previous.stderr), `Cannot determine existing release: ${previous.stderr}`)
  const notes = readFileSync('RELEASE_NOTES_PREVIEW.md', 'utf8').replaceAll('{{VERSION}}', pkg.version).replaceAll('{{COMMIT}}', head) + `\n${marker}\n`
  const file = join(tmpdir(), 'edge-drop-preview-release-notes.md')
  writeFileSync(file, notes)
  gh(['release', 'create', tag, '--verify-tag', '--target', head, '--draft', '--prerelease', '--latest=false', '--title', `Edge-Drop Tasks Preview ${pkg.version} — Windows x64 测试版`, '--notes-file', file])
}
let release = JSON.parse(gh(['release', 'view', tag, '--json', 'assets,isDraft']))
assert(release.isDraft)
for (const asset of release.assets) assert(allowed.includes(asset.name), `Unexpected draft asset: ${asset.name}`)
for (const name of allowed) {
  if (!release.assets.some((asset) => asset.name === name)) gh(['release', 'upload', tag, join(directory, name)])
}
// Verify uploaded bytes before publishing the draft. No overwrite/clobber is used.
const downloaded = mkdtempSync(join(tmpdir(), 'edge-preview-upload-'))
gh(['release', 'download', tag, '--dir', downloaded])
assert.deepEqual(readdirSync(downloaded).sort(), allowed)
for (const name of allowed) assert.equal(await sha(join(downloaded, name)), await sha(join(directory, name)), name)
gh(['release', 'edit', tag, '--draft=false', '--prerelease', '--latest=false', '--verify-tag'])
release = JSON.parse(gh(['release', 'view', tag, '--json', 'url,tagName,isDraft,isPrerelease,assets']))
assert(!release.isDraft && release.isPrerelease && release.tagName === tag)
assert.deepEqual(release.assets.map((asset) => asset.name).sort(), allowed)
// The fork is public. Check unauthenticated browser download URLs and their full hashes.
for (const name of allowed) {
  const url = `https://github.com/${repo}/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(name)}`
  let response
  for (let attempt = 0; attempt < 4; attempt++) {
    response = await fetch(url)
    if (response.ok) break
    await response.body?.cancel()
    if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 2000))
  }
  assert(response?.ok && response.body, `Public download failed: ${name} (${response.status})`)
  const hash = createHash('sha256')
  for await (const part of response.body) hash.update(part)
  assert.equal(hash.digest('hex'), await sha(join(directory, name)), name)
}
console.log(JSON.stringify({ url: release.url, tag, commit: head, prerelease: true, publicDownloadsVerified: allowed }, null, 2))
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Published test prerelease\n\n[${tag}](${release.url})\n\nSource: \`${head}\`\n\nAll ${allowed.length} public assets downloaded and matched SHA-256.\n`)
