#!/usr/bin/env node
/**
 * scripts/setup.mjs — installer NARA Studio.
 *
 * Dijalankan otomatis oleh `npm install` (postinstall) dan bisa dipanggil
 * manual: `npm run setup`.
 *
 * Yang dikerjakan:
 *   1. Cek Node & Python.
 *   2. Buat .venv bila belum ada, lalu pasang dependensi Python (Edge-TTS, g4f).
 *   3. Unduh paket skill pihak ketiga HANYA bila belum ada, supaya clone repo
 *      tetap ringan:
 *        - ui-ux-pro-max      -> 7 skill desain
 *        - huashu-art-motion  -> 1 skill tata bahasa visual
 *        - google-data-agent-kit -> 20 skill data/GCP
 *      Unduhan memakai `git clone` bila Git ada, kalau tidak jatuh ke unduhan
 *      tarball GitHub + `tar` (tanpa Git pun tetap jalan).
 *   4. Cerminkan skills/ ke .agents/skills/ (dua root yang dibaca agen & kantor).
 *   5. Siapkan ~/.agent-office/engine.json (deepseek) dan office.config.json.
 *   6. Tulis skills/.nara-skills.lock.json (asal + commit setiap paket).
 *   7. Verifikasi: setiap skill wajib punya SKILL.md, laporkan yang hilang.
 *
 * Flag:
 *   --check          hanya melaporkan, tidak mengubah apa pun
 *   --update-skills  paksa unduh ulang paket skill ke versi terbaru
 *   --full           --update-skills + unduh Chromium Remotion sekarang
 *   --only <pack>    batasi unduhan ke satu paket (mis. --only ui-ux-pro-max)
 *   --no-python      lewati pembuatan .venv & pemasangan dependensi Python
 *   --with-browser   unduh Chromium Remotion sekarang (default: saat render pertama)
 *   --strict         keluar dengan kode 1 bila ada skill wajib yang hilang
 *   --quiet          ringkas, untuk postinstall
 *
 * Di lingkungan CI (`CI=true`) unduhan skill pihak ketiga dan pemasangan
 * dependensi Python dilewati supaya `npm ci` tetap cepat; skill yang sudah ada
 * tetap diverifikasi. Paksa unduh dengan `--update-skills` atau `--full`.
 *
 * Installer ini tidak pernah menggagalkan `npm install`: kegagalan langkah
 * opsional dilaporkan sebagai peringatan, bukan error.
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// Root = folder proyek tempat script ini berada (bukan cwd pemanggil).
const SCRIPT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = fs.existsSync(path.join(SCRIPT_ROOT, 'package.json')) ? SCRIPT_ROOT : process.cwd()
const ARGS = new Set(process.argv.slice(2))
const CHECK = ARGS.has('--check')
const FULL = ARGS.has('--full')
const UPDATE = ARGS.has('--update-skills') || FULL
const WITH_BROWSER = ARGS.has('--with-browser') || FULL
const STRICT = ARGS.has('--strict')
const QUIET = ARGS.has('--quiet')
const NO_PYTHON = ARGS.has('--no-python')
// Di CI (GitHub Actions dll) jangan tarik ±80 MB skill + pip install tiap run.
// `npm run setup:update` / `--full` tetap memaksa unduhan.
const SKIP_HEAVY = Boolean(process.env.CI) && !UPDATE
const onlyIndex = process.argv.indexOf('--only')
const ONLY = onlyIndex > -1 ? String(process.argv[onlyIndex + 1] || '') : ''

const results = []
const ok = (label, detail = '') => results.push({ status: 'ok', label, detail })
const warn = (label, detail = '') => results.push({ status: 'warn', label, detail })
const skip = (label, detail = '') => results.push({ status: 'skip', label, detail })

function log(msg) {
  if (!QUIET) console.log(msg)
}

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { cwd: ROOT, stdio: 'pipe', encoding: 'utf8', ...opts })
}

function exists(p) {
  return fs.existsSync(p)
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function hasCommand(cmd, args = ['--version']) {
  try {
    run(cmd, args)
    return true
  } catch {
    return false
  }
}

/* ------------------------------------------------------------------ */
/* 1. Runtime                                                          */
/* ------------------------------------------------------------------ */
function checkNode() {
  const major = Number(process.versions.node.split('.')[0])
  if (major >= 20) ok('Node.js', `v${process.versions.node}`)
  else warn('Node.js', `v${process.versions.node} — butuh 20+ (https://nodejs.org)`)
}

function findPython() {
  const venvWin = path.join(ROOT, '.venv', 'Scripts', 'python.exe')
  const venvPosix = path.join(ROOT, '.venv', 'bin', 'python')
  if (exists(venvWin)) return { exe: venvWin, venv: true, prefix: [] }
  if (exists(venvPosix)) return { exe: venvPosix, venv: true, prefix: [] }
  const candidates = [
    { exe: 'python', prefix: [] },
    { exe: 'python3', prefix: [] },
    { exe: 'py', prefix: ['-3'] },
  ]
  for (const candidate of candidates) {
    try {
      run(candidate.exe, [...candidate.prefix, '--version'])
      return { ...candidate, venv: false }
    } catch {}
  }
  return null
}

function ensureVenv(python) {
  if (!python) {
    warn('Python', 'tidak ditemukan — VO/chat AI tidak jalan. Pasang Python 3.10+ lalu ulangi setup')
    return null
  }
  if (python.venv) return python.exe
  if (CHECK) {
    skip('Virtualenv', 'belum ada (.venv)')
    return null
  }
  log('··· Membuat .venv ···')
  try {
    run(python.exe, [...python.prefix, '-m', 'venv', '.venv'])
    const win = path.join(ROOT, '.venv', 'Scripts', 'python.exe')
    return exists(win) ? win : path.join(ROOT, '.venv', 'bin', 'python')
  } catch (err) {
    warn('Virtualenv', `gagal dibuat: ${String(err.message).split('\n')[0]}`)
    return null
  }
}

function ensurePythonDeps(venvPython) {
  if (!venvPython) return
  const probe = 'import edge_tts, g4f; print("ok")'
  try {
    run(venvPython, ['-c', probe])
    ok('Dependensi Python', 'edge-tts + g4f sudah terpasang')
    return
  } catch {}
  if (CHECK) {
    warn('Dependensi Python', 'belum lengkap — jalankan npm run setup')
    return
  }
  log('··· Memasang edge-tts + g4f (unduh dari PyPI) ···')
  try {
    run(venvPython, ['-m', 'pip', 'install', '--upgrade', 'pip'])
    run(venvPython, ['-m', 'pip', 'install', 'edge-tts', 'g4f'], { stdio: 'inherit' })
    ok('Dependensi Python', 'edge-tts + g4f terpasang')
  } catch (err) {
    warn('Dependensi Python', `gagal memasang: ${String(err.message).split('\n')[0]}`)
  }
}

/* ------------------------------------------------------------------ */
/* 2. Paket skill pihak ketiga (diunduh, tidak di-commit)              */
/* ------------------------------------------------------------------ */
const SKILL_PACKS = [
  {
    id: 'ui-ux-pro-max',
    repo: 'https://github.com/nextlevelbuilder/ui-ux-pro-max-skill',
    // skill-nya berada di .claude/skills/* di dalam repo
    from: '.claude/skills',
    members: ['ui-ux-pro-max'],
    drop: ['assets/showcase'],
  },
  {
    id: 'huashu-art-motion',
    repo: 'https://github.com/alchaincyf/huashu-art-motion',
    // repo ini sendiri adalah skill-nya
    from: '.',
    members: ['.'],
    drop: ['.git', 'assets/showcase', 'scripts/engine/lib'],
  },
]

// Skill yang disimpan langsung di repo (di-commit) — harus selalu ada.
const BUNDLED_SKILLS = [
  'audio-sync',
  'bang-motion',
  'nara-director',
  'nara-motion',
  'remotion',
  'remotion-coder',
  'render-qa',
  'skill-repair',
]

// Wajib ada supaya studio bisa produksi video.
const MANDATORY_SKILLS = ['bang-motion', 'remotion', 'huashu-art-motion', 'nara-director', 'audio-sync', 'render-qa']

const LOCK_PATH = path.join(ROOT, 'skills', '.nara-skills.lock.json')

function packTargets(pack) {
  return pack.members.map((member) => (member === '.' ? pack.id : member))
}

function readLock() {
  try {
    const parsed = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'))
    if (parsed && typeof parsed === 'object' && parsed.packs) return parsed
  } catch {}
  return { packages: undefined, packs: {} }
}

function writeLock(lock) {
  delete lock.packages
  lock.updatedAt = new Date().toISOString()
  fs.mkdirSync(path.dirname(LOCK_PATH), { recursive: true })
  fs.writeFileSync(LOCK_PATH, `${JSON.stringify(lock, null, 2)}\n`, 'utf8')
}

function copyFiltered(src, dest, drop = []) {
  fs.mkdirSync(dest, { recursive: true })
  fs.cpSync(src, dest, {
    recursive: true,
    filter: (source) => {
      const rel = path.relative(src, source).split(path.sep).join('/')
      if (!rel) return true
      return !drop.some((d) => rel === d || rel.startsWith(`${d}/`))
    },
  })
}

async function fetchTarball(pack, dest) {
  const match = pack.repo.match(/github\.com[/:]([^/]+)\/([^/.]+)/i)
  if (!match) throw new Error('bukan repo GitHub')
  const [, owner, name] = match
  const tmpRoot = path.join(ROOT, '.skills-tmp')
  const archive = path.join(tmpRoot, `${pack.id}.tar.gz`)
  const extract = path.join(tmpRoot, `${pack.id}-extract`)
  fs.mkdirSync(tmpRoot, { recursive: true })

  let lastErr = null
  for (const ref of ['refs/heads/main', 'refs/heads/master']) {
    const url = `https://codeload.github.com/${owner}/${name}/tar.gz/${ref}`
    try {
      const res = await fetch(url, { redirect: 'follow' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      fs.writeFileSync(archive, Buffer.from(await res.arrayBuffer()))
      fs.rmSync(extract, { recursive: true, force: true })
      fs.mkdirSync(extract, { recursive: true })
      execFileSync('tar', ['-xzf', archive, '-C', extract], { stdio: 'pipe' })
      const [top] = fs
        .readdirSync(extract, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
      if (!top) throw new Error('arsip kosong')
      fs.rmSync(dest, { recursive: true, force: true })
      fs.cpSync(path.join(extract, top.name), dest, { recursive: true })
      return { root: dest, commit: '', via: 'tarball' }
    } catch (err) {
      lastErr = err
    } finally {
      fs.rmSync(archive, { force: true })
      fs.rmSync(extract, { recursive: true, force: true })
    }
  }
  throw lastErr ?? new Error('unduhan gagal')
}

async function fetchRepo(pack, dest) {
  fs.rmSync(dest, { recursive: true, force: true })
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  const problems = []

  if (hasCommand('git', ['--version'])) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        run('git', ['clone', '--depth', '1', '--quiet', pack.repo, dest])
        let commit = ''
        try {
          commit = run('git', ['rev-parse', '--short', 'HEAD'], { cwd: dest }).trim()
        } catch {}
        return { root: dest, commit, via: 'git' }
      } catch (err) {
        problems.push(String(err.message).split('\n')[0])
        fs.rmSync(dest, { recursive: true, force: true })
        fs.mkdirSync(path.dirname(dest), { recursive: true })
        if (attempt === 1) sleep(1200)
      }
    }
  } else {
    problems.push('git tidak tersedia')
  }

  try {
    return await fetchTarball(pack, dest)
  } catch (err) {
    problems.push(String(err.message).split('\n')[0])
    return { error: problems.filter(Boolean).join(' | ') }
  }
}

async function installPack(pack, lock) {
  const targets = packTargets(pack)
  const missing = targets.filter((skill) => !exists(path.join(ROOT, 'skills', skill, 'SKILL.md')))
  if (!missing.length && !UPDATE) {
    ok(`Skill ${pack.id}`, `${targets.length} skill sudah ada (pakai npm run setup:update untuk versi terbaru)`)
    return
  }
  if (CHECK) {
    warn(`Skill ${pack.id}`, `${missing.length}/${targets.length} skill belum ada — akan diunduh saat setup`)
    return
  }
  if (SKIP_HEAVY) {
    skip(
      `Skill ${pack.id}`,
      `${targets.length - missing.length}/${targets.length} skill ada — unduhan dilewati di CI (pakai npm run setup:update untuk memaksa)`
    )
    return
  }

  const tmp = path.join(ROOT, '.skills-tmp', pack.id)
  log(`··· Mengunduh ${pack.id} dari GitHub ···`)
  let fetched
  try {
    fetched = await fetchRepo(pack, tmp)
  } catch (err) {
    fetched = { error: String(err.message).split('\n')[0] }
  }

  if (!fetched || fetched.error) {
    warn(
      `Skill ${pack.id}`,
      `unduhan gagal (offline?): ${fetched?.error || 'tidak diketahui'}${missing.length ? ` — ${missing.length} skill belum ada` : ''}`
    )
    fs.rmSync(path.join(ROOT, '.skills-tmp'), { recursive: true, force: true })
    return
  }

  let copied = 0
  const absent = []
  try {
    for (const member of pack.members) {
      const source = member === '.' ? path.join(fetched.root, pack.from) : path.join(fetched.root, pack.from, member)
      const dest = member === '.' ? path.join(ROOT, 'skills', pack.id) : path.join(ROOT, 'skills', member)
      if (!exists(source)) {
        absent.push(member)
        continue
      }
      fs.rmSync(dest, { recursive: true, force: true })
      copyFiltered(source, dest, pack.drop)
      copied += 1
    }
    lock.packs[pack.id] = {
      repo: pack.repo,
      via: fetched.via,
      commit: fetched.commit || null,
      installedAt: new Date().toISOString(),
    }
    writeLock(lock)
    const source = fetched.via === 'git' && fetched.commit ? ` @ ${fetched.commit}` : ' (tarball)'
    if (absent.length) {
      warn(`Skill ${pack.id}`, `${copied} skill dipasang${source}, ${absent.length} tidak ada di repo: ${absent.join(', ')}`)
    } else {
      ok(`Skill ${pack.id}`, `${copied} skill ${UPDATE ? 'diperbarui' : 'terunduh'}${source}`)
    }
  } catch (err) {
    warn(`Skill ${pack.id}`, `gagal memasang: ${String(err.message).split('\n')[0]}`)
  } finally {
    fs.rmSync(path.join(ROOT, '.skills-tmp'), { recursive: true, force: true })
  }
}

/* ------------------------------------------------------------------ */
/* 3. Cermin skills/ -> .agents/skills/                                */
/* ------------------------------------------------------------------ */
function signature(dir) {
  let files = 0
  let bytes = 0
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.isFile()) {
        files += 1
        try {
          bytes += fs.statSync(full).size
        } catch {}
      }
    }
  }
  walk(dir)
  return `${files}:${bytes}`
}

function mirrorSkills() {
  const src = path.join(ROOT, 'skills')
  if (!exists(src)) {
    warn('Skills', 'folder skills/ tidak ada')
    return
  }
  const destRoot = path.join(ROOT, '.agents', 'skills')
  let copied = 0
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const from = path.join(src, entry.name)
    const to = path.join(destRoot, entry.name)
    if (exists(to) && signature(from) === signature(to)) continue
    if (CHECK) {
      warn('Skills mirror', `${entry.name} belum sinkron di .agents/skills`)
      continue
    }
    try {
      fs.rmSync(to, { recursive: true, force: true })
      fs.cpSync(from, to, { recursive: true })
      copied += 1
    } catch (err) {
      warn('Skills mirror', `${entry.name}: ${String(err.message).split('\n')[0]}`)
    }
  }
  if (!CHECK) ok('Skills mirror', copied ? `${copied} skill disalin ke .agents/skills` : 'sudah sinkron')
}

/* ------------------------------------------------------------------ */
/* 4. Verifikasi skill wajib                                           */
/* ------------------------------------------------------------------ */
function verifySkills() {
  // Di CI paket pihak ketiga sengaja tidak diunduh: cukup skill yang ikut repo.
  const expected = SKIP_HEAVY
    ? [...BUNDLED_SKILLS]
    : [...BUNDLED_SKILLS, ...SKILL_PACKS.flatMap((pack) => packTargets(pack))]
  const missing = expected.filter((skill) => !exists(path.join(ROOT, 'skills', skill, 'SKILL.md')))
  const missingMandatory = missing.filter((skill) => MANDATORY_SKILLS.includes(skill))
  if (!missing.length) {
    ok('Verifikasi skill', `${expected.length} skill lengkap dengan SKILL.md`)
  } else if (CHECK) {
    warn('Verifikasi skill', `${missing.length} belum ada: ${missing.join(', ')}`)
  } else if (missingMandatory.length) {
    warn('Verifikasi skill', `wajib tapi hilang: ${missingMandatory.join(', ')}`)
  } else {
    warn('Verifikasi skill', `${missing.length} skill opsional belum ada: ${missing.join(', ')}`)
  }
  return { missing, missingMandatory }
}

/* ------------------------------------------------------------------ */
/* 5. Konfigurasi runtime di luar repo                                 */
/* ------------------------------------------------------------------ */
function ensureOfficeConfig() {
  const home = process.env.AGENT_OFFICE_HOME || path.join(os.homedir(), '.agent-office')
  const enginePath = path.join(home, 'engine.json')
  const configPath = path.join(ROOT, 'office.config.json')

  if (!exists(configPath) && exists(path.join(ROOT, 'office.config.example.json'))) {
    if (CHECK) warn('office.config.json', 'belum ada — akan disalin dari contoh')
    else {
      fs.copyFileSync(path.join(ROOT, 'office.config.example.json'), configPath)
      ok('office.config.json', 'dibuat dari contoh')
    }
  }

  if (exists(enginePath)) {
    ok('engine.json', enginePath)
  } else if (CHECK) {
    warn('engine.json', 'belum ada — akan dibuat (deepseek)')
  } else {
    fs.mkdirSync(home, { recursive: true })
    fs.writeFileSync(
      enginePath,
      JSON.stringify(
        {
          active: 'deepseek',
          targets: {
            deepseek: { url: '' },
            opencode: { command: 'buat-video', delivery: 'queue', title: 'Studio Produksi NARA' },
            claude: { command: 'claude', args: ['-p', '{text}'] },
            chatgpt: { command: 'codex', args: ['exec', '{text}'] },
          },
        },
        null,
        2
      ),
      'utf8'
    )
    ok('engine.json', 'dibuat (active: deepseek)')
  }
}

/* ------------------------------------------------------------------ */
/* 6. Browser Remotion (opsional)                                      */
/* ------------------------------------------------------------------ */
function ensureBrowser() {
  if (!WITH_BROWSER) {
    skip('Browser Remotion', 'diunduh otomatis saat render pertama (atau npm run setup:full)')
    return
  }
  if (CHECK) {
    warn('Browser Remotion', 'belum dipastikan (--with-browser)')
    return
  }
  log('··· Menyiapkan Chromium Remotion ···')
  try {
    execFileSync('npx', ['remotion', 'browser', 'ensure'], { cwd: ROOT, stdio: 'inherit', shell: true })
    ok('Browser Remotion', 'siap')
  } catch (err) {
    warn('Browser Remotion', `gagal: ${String(err.message).split('\n')[0]}`)
  }
}

/* ------------------------------------------------------------------ */

checkNode()
if (!hasCommand('git', ['--version'])) warn('Git', 'tidak ditemukan — unduhan skill memakai tarball GitHub')

const python = NO_PYTHON || SKIP_HEAVY ? null : findPython()
const venvPython = NO_PYTHON || SKIP_HEAVY ? null : CHECK ? python?.exe : ensureVenv(python)
if (SKIP_HEAVY) skip('Dependensi Python', 'dilewati di CI (edge-tts + g4f dipasang saat install lokal)')
else if (NO_PYTHON) skip('Dependensi Python', 'dilewati (--no-python)')
else ensurePythonDeps(venvPython)

const lock = readLock()
for (const pack of SKILL_PACKS) {
  if (ONLY && pack.id !== ONLY) continue
  await installPack(pack, lock)
}
// Dicerminkan setelah paket diunduh supaya .agents/skills ikut lengkap.
mirrorSkills()
const verification = verifySkills()
ensureOfficeConfig()
ensureBrowser()

const icon = { ok: '✓', warn: '!', skip: '·' }
const warnings = results.filter((r) => r.status === 'warn')

if (QUIET) {
  console.log(`NARA setup: ${results.length - warnings.length} siap, ${warnings.length} peringatan (jalankan npm run setup:check untuk detail)`)
} else {
  console.log('\nNARA Studio — ringkasan setup\n')
  for (const r of results) {
    console.log(`  ${icon[r.status]} ${r.label}${r.detail ? ` — ${r.detail}` : ''}`)
  }
  console.log(
    warnings.length
      ? `\n${warnings.length} hal perlu perhatian. Jalankan \`npm run setup\` untuk melengkapinya.`
      : '\nSemua siap. Jalankan `npm run dev:office-agy` atau `npm run dev:office-ds` lalu buka http://localhost:3333/'
  )
}

if (STRICT && verification.missing.length) {
  console.error(`\nSkill belum lengkap: ${verification.missing.join(', ')}`)
  process.exitCode = 1
}
