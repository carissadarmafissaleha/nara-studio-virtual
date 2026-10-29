/**
 * Pipeline order lintas-mesin: routing lane, klaim/serah-terima, dan wake.
 *
 * Semua state di direktori sementara (AGENT_OFFICE_HOME), jadi tidak menyentuh
 * ~/.agent-office asli maupun antrean produksi.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const HOME = path.join(os.tmpdir(), `nara-pipeline-${process.pid}`)
const WORK = path.join(HOME, 'workspace')

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

const setEngine = (active) => {
  fs.writeFileSync(
    path.join(HOME, 'engine.json'),
    JSON.stringify({ active, targets: { deepseek: { url: '' }, antigravity: {}, opencode: {} } }, null, 2),
    'utf8',
  )
}

const runNode = (script, args = [], timeout = 6000) =>
  new Promise((resolve) => {
    execFile(
      process.execPath,
      [path.join(ROOT, script), ...args],
      { cwd: ROOT, env: { ...process.env, AGENT_OFFICE_HOME: HOME }, timeout },
      (err, stdout, stderr) => resolve({ err, stdout, stderr, killed: Boolean(err?.killed) }),
    )
  })

/** Modul engine-command membaca AGENT_OFFICE_HOME saat di-import. */
async function loadDispatcher() {
  vi.resetModules()
  process.env.AGENT_OFFICE_HOME = HOME
  return import('../scripts/engine-command.mjs')
}

beforeAll(() => {
  fs.rmSync(HOME, { recursive: true, force: true })
  for (const dir of ['engine-inbox', 'agy-inbox', 'opencode-inbox']) {
    fs.mkdirSync(path.join(HOME, dir), { recursive: true })
  }
  fs.mkdirSync(path.join(WORK, 'naskah'), { recursive: true })
})

afterAll(() => {
  fs.rmSync(HOME, { recursive: true, force: true })
})

beforeEach(() => {
  // Setiap test mulai dari antrean kosong, supaya order dari test sebelumnya
  // tidak ikut membangunkan watcher (itu yang membuat hasilnya bergantung urutan).
  for (const dir of ['engine-inbox', 'agy-inbox', 'opencode-inbox']) {
    fs.rmSync(path.join(HOME, dir), { recursive: true, force: true })
    fs.mkdirSync(path.join(HOME, dir), { recursive: true })
  }
  for (const file of fs.readdirSync(HOME)) {
    if (file.startsWith('wake-heartbeat') || file.startsWith('listener-heartbeat')) {
      fs.rmSync(path.join(HOME, file), { force: true })
    }
  }
  fs.rmSync(path.join(WORK, 'naskah'), { recursive: true, force: true })
  fs.mkdirSync(path.join(WORK, 'naskah'), { recursive: true })
})

describe('routing lane', () => {
  it('mengirim order ke lane Antigravity saat mesin aktif antigravity', async () => {
    setEngine('antigravity')
    const { dispatchEngineOrder } = await loadDispatcher()
    const res = await dispatchEngineOrder({ text: '/buat-video uji lane agy', sender: 'Caca', directory: WORK })

    expect(res.ok).toBe(true)
    const lane = readJson(path.join(HOME, 'agy-inbox', `${res.order.id}.json`))
    expect(lane?.engine).toBe('antigravity')
    expect(fs.existsSync(path.join(HOME, 'engine-inbox', `${res.order.id}.json`))).toBe(true)
    expect(readJson(path.join(WORK, 'naskah', 'agy_active_orders.json'))).toHaveLength(1)
  })

  it('mengirim order ke lane OpenCode, bukan lane lain', async () => {
    setEngine('opencode')
    const { dispatchEngineOrder } = await loadDispatcher()
    const res = await dispatchEngineOrder({ text: '/buat-video uji lane oc', sender: 'Caca', directory: WORK })

    expect(res.ok).toBe(true)
    expect(readJson(path.join(HOME, 'opencode-inbox', `${res.order.id}.json`))?.engine).toBe('opencode')
    expect(fs.existsSync(path.join(HOME, 'agy-inbox', `${res.order.id}.json`))).toBe(false)
    expect(readJson(path.join(WORK, 'naskah', 'opencode_active_orders.json'))).toHaveLength(1)
  })

  it('DeepSeek hanya menulis arsip engine-inbox', async () => {
    setEngine('deepseek')
    const { dispatchEngineOrder } = await loadDispatcher()
    const res = await dispatchEngineOrder({ text: '/buat-video uji lane ds', sender: 'Caca', directory: WORK })

    expect(res.ok).toBe(true)
    expect(readJson(path.join(HOME, 'engine-inbox', `${res.order.id}.json`))?.engine).toBe('deepseek')
    expect(fs.existsSync(path.join(HOME, 'agy-inbox', `${res.order.id}.json`))).toBe(false)
    expect(fs.existsSync(path.join(HOME, 'opencode-inbox', `${res.order.id}.json`))).toBe(false)
  })
})

describe('klaim dan serah-terima', () => {
  it('claim by id, release, lalu bisa diklaim lagi', async () => {
    setEngine('deepseek')
    const { dispatchEngineOrder } = await loadDispatcher()
    const res = await dispatchEngineOrder({ text: '/buat-video uji serah terima', sender: 'Caca', directory: WORK })
    const id = res.order.id

    const claimed = await runNode('scripts/order.mjs', ['claim', id])
    expect(claimed.stdout).toContain(id)
    expect(fs.existsSync(path.join(HOME, 'engine-inbox', '.claimed', `${id}.json`))).toBe(true)

    const released = await runNode('scripts/order.mjs', ['release', id])
    expect(released.stdout).toContain('"released": true')
    expect(fs.existsSync(path.join(HOME, 'engine-inbox', '.claimed', `${id}.json`))).toBe(false)
    expect(readJson(path.join(HOME, 'engine-inbox', `${id}.json`))?.status).toBe('sent')

    const reclaimed = await runNode('scripts/order.mjs', ['claim', id])
    expect(reclaimed.stdout).toContain(id)
  })
})

describe('wake watcher', () => {
  it('lane AGY bangun untuk order antigravity dan menulis wake heartbeat', async () => {
    setEngine('antigravity')
    const { dispatchEngineOrder } = await loadDispatcher()
    const res = await dispatchEngineOrder({ text: '/buat-video uji wake agy', sender: 'Caca', directory: WORK })

    const wake = await runNode('scripts/order-wake.mjs', ['--engine', 'antigravity'])
    expect(wake.killed).toBe(false)
    expect(wake.stdout).toContain(res.order.id)
    expect(readJson(path.join(HOME, 'wake-heartbeat-antigravity.json'))?.mode).toBe('oneshot')
  })

  it('lane DeepSeek mengabaikan order antigravity', async () => {
    setEngine('antigravity')
    const { dispatchEngineOrder } = await loadDispatcher()
    await dispatchEngineOrder({ text: '/buat-video uji lane silang', sender: 'Caca', directory: WORK })

    const wake = await runNode('scripts/order-wake.mjs', ['--engine', 'deepseek'], 3000)
    expect(wake.killed).toBe(true)
  })

  it('order done tidak membangunkan mesin lagi', async () => {
    setEngine('opencode')
    const { dispatchEngineOrder } = await loadDispatcher()
    const res = await dispatchEngineOrder({ text: '/buat-video uji order selesai', sender: 'Caca', directory: WORK })

    const file = path.join(HOME, 'opencode-inbox', `${res.order.id}.json`)
    fs.writeFileSync(file, JSON.stringify({ ...readJson(file), status: 'done' }, null, 2), 'utf8')

    const wake = await runNode('scripts/order-wake.mjs', ['--engine', 'opencode'], 3000)
    expect(wake.killed).toBe(true)
  })
})
