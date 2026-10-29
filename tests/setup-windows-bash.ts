/**
 * Windows test bootstrap: give the suite the POSIX toolchain it assumes.
 *
 * Most of this repo's tests drive the shell scripts that ship with it
 * (hooks/install-hooks.sh, hooks/agent-tracker.sh, hooks/status-line.sh,
 * scripts/*.sh) by spawning `bash <script>`. Those scripts call `python3`, and
 * a few tests spawn `sleep` directly. On a clean Windows box none of the three
 * is on PATH: Git for Windows ships a real bash.exe but does not export it, and
 * `python3` is only the Microsoft Store stub that prints "Python was not found".
 *
 * This file fixes the environment for the whole worker process:
 *
 *   1. Git's `bin` is prepended to PATH so `bash` resolves to a real bash.exe.
 *   2. Git's `usr/bin` is appended, which provides `sleep`, `test`, `expr`,
 *      `wc`, … without shadowing Windows' own find/sort/link at the front.
 *   3. `python3` and `python` wrappers are generated in a temp directory and
 *      prepended, pointing at a real CPython (never the Store stub).
 *
 * It is a no-op on Linux and macOS, and every step is skipped when the tool is
 * already resolvable, so CI (ubuntu-latest) is unaffected.
 *
 * Overrides: NARA_BASH_DIR (Git installation) and NARA_PYTHON (interpreter).
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'

function commandOnPath(name: string): string | null {
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    if (!dir) continue
    const candidate = join(dir, name)
    if (existsSync(candidate)) return candidate
  }
  return null
}

/** Is this `python.exe` the Microsoft Store placeholder instead of CPython? */
function isStoreStub(exe: string): boolean {
  if (/\\WindowsApps\\/i.test(exe)) return true
  try {
    // The stub is a ~0-byte reparse point; a real interpreter is megabytes.
    return readFileSync(exe).length < 100 * 1024
  } catch {
    return true
  }
}

function findPython(): string | null {
  if (process.env.NARA_PYTHON) return process.env.NARA_PYTHON
  const roots = [
    join(process.env.LOCALAPPDATA ?? '', 'Programs', 'Python'),
    join(process.env.ProgramFiles ?? 'C:/Program Files', 'Python'),
    join(process.env['ProgramFiles(x86)'] ?? 'C:/Program Files (x86)', 'Python'),
    'C:/Python315',
    'C:/Python314',
    'C:/Python313',
    'C:/Python312',
  ].filter(Boolean)

  const candidates: string[] = []
  for (const root of roots) {
    if (!existsSync(root)) continue
    for (const entry of readdirSync(root)) {
      // Python315/, Launcher/ (no python.exe), etc.
      if (!/^Python3\d+$/i.test(entry)) continue
      candidates.push(join(root, entry, 'python.exe'))
    }
    // C:/Python312 style roots already point at the install
    candidates.push(join(root, 'python.exe'))
  }

  return candidates.find((exe) => existsSync(exe) && !isStoreStub(exe)) ?? null
}

if (process.platform === 'win32') {
  // 1. bash
  if (!commandOnPath('bash.exe')) {
    const candidates = [
      process.env.NARA_BASH_DIR,
      'C:/Program Files/Git/bin',
      'C:/Program Files/Git/usr/bin',
      'C:/Program Files (x86)/Git/bin',
      join(process.env.LOCALAPPDATA ?? '', 'Programs/Git/bin'),
    ].filter((dir): dir is string => Boolean(dir))

    const gitBin = candidates.find((dir) => existsSync(join(dir, 'bash.exe')))
    if (gitBin) {
      process.env.PATH = `${gitBin}${delimiter}${process.env.PATH ?? ''}`
      // 2. coreutils (sleep, expr, …) — appended so Windows' own tools still win
      const usrBin = join(gitBin, '..', 'usr', 'bin')
      if (existsSync(join(usrBin, 'sleep.exe'))) {
        process.env.PATH = `${process.env.PATH}${delimiter}${usrBin}`
      }
    } else {
      console.warn(
        '[tests] bash.exe not found — install Git for Windows or set NARA_BASH_DIR. ' +
          'Shell-driven tests will fail with ENOENT.'
      )
    }
  }

  // 3. python3 / python
  if (!commandOnPath('python3.exe') && !commandOnPath('python3')) {
    const python = findPython()
    if (python) {
      const shimDir = join(tmpdir(), 'nara-test-bin')
      mkdirSync(shimDir, { recursive: true })
      // Cygwin/MSYS runs extensionless files that start with `#!`, and converts
      // the POSIX paths in argv back to Windows paths for the native exe.
      const exe = python.replace(/\\/g, '/')
      for (const name of ['python3', 'python']) {
        const shim = join(shimDir, name)
        const body = `#!/bin/sh\nexec "${exe}" "$@"\n`
        if (!existsSync(shim) || readFileSync(shim, 'utf8') !== body) writeFileSync(shim, body)
      }
      process.env.PATH = `${shimDir}${delimiter}${process.env.PATH ?? ''}`
      process.env.NARA_PYTHON_BIN = python
    } else {
      console.warn(
        '[tests] no CPython found — install Python 3 or set NARA_PYTHON. ' +
          'Hook and status-line tests will fail.'
      )
    }
  }
}
