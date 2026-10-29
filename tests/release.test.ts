/**
 * Tagged releases. .github/workflows/release.yml builds the desktop installers
 * on a `v*` tag and uploads them to a draft GitHub release, from the `build`
 * section of package.json. These checks keep the workflow, that section and
 * electron/after-pack.cjs in step with each other.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8')

const pkg = JSON.parse(read('package.json'))
const build = pkg.build
const workflow = read('.github/workflows/release.yml').replace(/\r\n/g, '\n')

describe('the electron-builder configuration a release is built from', () => {
  it('names every installer Agent-Office-<version>-<os>-<arch>.<ext>', () => {
    expect(build.artifactName).toBe('Agent-Office-${version}-${os}-${arch}.${ext}')
  })

  it('publishes to a GitHub draft, in the repository package.json names', () => {
    expect(build.publish).toEqual({ provider: 'github', releaseType: 'draft' })
    expect(pkg.repository.url).toMatch(/^https:\/\/github\.com\/carissadarmafissaleha\/nara-studio-virtual(\.git)?$/)
  })

  it('builds macOS as one dmg per architecture, never universal â€” after-pack.cjs refuses that', () => {
    expect(build.mac.target).toEqual([{ target: 'dmg', arch: ['arm64', 'x64'] }])
    expect(read('electron/after-pack.cjs')).toMatch(/archName === 'universal'/)
  })

  it('builds an NSIS installer that asks where to install on Windows, and an AppImage on Linux', () => {
    expect(build.win.target).toEqual(['nsis'])
    expect(build.nsis).toMatchObject({ oneClick: false, allowToChangeInstallationDirectory: true })
    expect(build.linux.target).toEqual(['AppImage'])
  })
})

describe('.github/workflows/release.yml', () => {
  it('runs on v* tags and by hand, with a token that may create the release, one run per ref at a time', () => {
    expect(workflow).toMatch(/^on:\n  push:\n    tags: \['v\*'\]\n  workflow_dispatch:/m)
    expect(workflow).toMatch(/^permissions:\n  contents: write/m)
    expect(workflow).toMatch(/^concurrency:\n  group: release-\$\{\{ github\.ref \}\}/m)
  })

  it('builds on all three runners, unsigned, and uploads to the draft', () => {
    for (const os of ['macos-latest', 'windows-latest', 'ubuntu-latest']) {
      expect(workflow).toContain(`os: ${os}`)
    }
    expect(workflow).toContain('npx electron-builder ${{ matrix.args }} --publish always')
    expect(workflow).toContain('GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}')
    expect(workflow).toContain('CSC_IDENTITY_AUTO_DISCOVERY: false')
  })

  it('ships the default boss: the example office.config.json is never copied in', () => {
    expect(workflow).not.toMatch(/cp office\.config\.example\.json/)
  })
})
