#!/usr/bin/env node
/**
 * Publish a production result back into the office.
 *
 * This is the only channel a production engine needs: it lets the engine report
 * real stages, move the role cards, and queue the render approval — without ever
 * touching destructive routes (delete composition, delete render, trigger MP4).
 *
 * Usage
 *   node scripts/publish-draft.mjs step  --order ord-123 --step script --title "cara kerja panel surya" [--scenes 8] [--message "..."]
 *   node scripts/publish-draft.mjs final --order ord-123 --comp CaraKerjaPanelSurya --title "cara kerja panel surya" [--scenes 8] [--seconds 71] [--voice id-ID-ArdiNeural] [--no-build]
 *   node scripts/publish-draft.mjs fail  --order ord-123 --step voiceover --message "Edge-TTS tidak merespons"
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { execSync } from 'node:child_process'

const WORKSPACE = process.cwd()
const PORT = Number(process.env.AGENT_OFFICE_PORT || 3334)
const TASKS_PATH = path.join(WORKSPACE, 'public', 'active_tasks.json')
const NASKAH_TASKS_PATH = path.join(WORKSPACE, 'naskah', 'active_tasks.json')

/** Salinan order yang statusnya ikut diperbarui agar antrean tidak mengulang. */
const OFFICE_HOME = process.env.AGENT_OFFICE_HOME || path.join(os.homedir(), '.agent-office')
const ORDER_DIRS = [
  path.join(OFFICE_HOME, 'engine-inbox'),
  path.join(OFFICE_HOME, 'agy-inbox'),
]

/**
 * Tulis status order balik ke disk (`in_progress` / `done` / `failed`).
 * Listener kedua mesin melewati order `done`/`failed`, jadi order yang sudah
 * selesai tidak akan membangunkan sesi lagi setelah klaimnya kedaluwarsa.
 */
function updateOrderStatus(orderId, status, extra = {}) {
  if (!orderId) return
  for (const dir of ORDER_DIRS) {
    const file = path.join(dir, `${orderId}.json`)
    try {
      if (!fs.existsSync(file)) continue
      const order = JSON.parse(fs.readFileSync(file, 'utf8'))
      const next = { ...order, ...extra, status, updatedAt: new Date().toISOString() }
      fs.writeFileSync(file, JSON.stringify(next, null, 2), 'utf8')
    } catch {}
  }
}

/* ------------------------------------------------------------------ */
/* tiny helpers                                                        */
/* ------------------------------------------------------------------ */

function arg(name, fallback = '') {
  const i = process.argv.indexOf(`--${name}`)
  if (i === -1) return fallback
  const value = process.argv[i + 1]
  return value && !value.startsWith('--') ? value : 'true'
}

function flag(name) {
  return process.argv.includes(`--${name}`)
}

function post(endpoint, data) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(data)
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: endpoint,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      },
      (res) => {
        let body = ''
        res.on('data', (d) => (body += d))
        res.on('end', () => resolve({ status: res.statusCode, body }))
      }
    )
    req.on('error', (err) => resolve({ status: 0, body: String(err?.message || err) }))
    req.write(payload)
    req.end()
  })
}

async function say(sender, role, text) {
  await post('/chat', { sender, role, text })
}

async function draftStatus(payload) {
  await post('/api/draft-status', payload)
}

/* ------------------------------------------------------------------ */
/* tasks: six role cards per order, ids unique per order               */
/* ------------------------------------------------------------------ */

const TASK_DEFS = [
  { n: 1, owner: 'Lumi', subject: (t) => `Riset Data & Konsep Cerita: ${t}` },
  { n: 2, owner: 'Lumi', subject: (t) => `Penyusunan Naskah Sinematik: ${t}` },
  { n: 3, owner: 'Ardi', subject: () => 'Voiceover Bahasa Indonesia & Sound FX' },
  { n: 4, owner: 'Jeje', subject: () => 'Perakitan Visual & Animasi Kinetik' },
  { n: 5, owner: 'Nara', subject: () => 'Sinkronisasi Timeline Audio & Transisi Scene' },
  { n: 6, owner: 'Jeje', subject: () => 'Screening Room Preview & Render MP4' },
]

/** status of each card implied by the stage the engine really reached */
const STAGE_STATUS = {
  script: { 1: 'done', 2: 'in_progress', 3: 'todo', 4: 'todo', 5: 'todo', 6: 'todo' },
  voiceover: { 1: 'done', 2: 'done', 3: 'in_progress', 4: 'todo', 5: 'todo', 6: 'todo' },
  sfx: { 1: 'done', 2: 'done', 3: 'in_progress', 4: 'todo', 5: 'todo', 6: 'todo' },
  mix: { 1: 'done', 2: 'done', 3: 'done', 4: 'todo', 5: 'in_progress', 6: 'todo' },
  composition: { 1: 'done', 2: 'done', 3: 'done', 4: 'done', 5: 'done', 6: 'todo' },
  preview: { 1: 'done', 2: 'done', 3: 'done', 4: 'done', 5: 'done', 6: 'todo' },
}

function taskId(order, n) {
  return `task-${String(order).replace(/^ord-/, '')}-${n}`
}

function readTasks() {
  try {
    if (fs.existsSync(TASKS_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(TASKS_PATH, 'utf8'))
      if (Array.isArray(parsed)) return parsed
    }
  } catch {}
  return []
}

function writeTasks(tasks) {
  const data = JSON.stringify(tasks, null, 2)
  fs.mkdirSync(path.dirname(TASKS_PATH), { recursive: true })
  fs.writeFileSync(TASKS_PATH, data, 'utf8')
  try {
    fs.mkdirSync(path.dirname(NASKAH_TASKS_PATH), { recursive: true })
    fs.writeFileSync(NASKAH_TASKS_PATH, data, 'utf8')
  } catch {}
}

/** Upsert this order's cards, dropping cards from earlier orders only. */
function upsertTasks({ order, title, stage, extras = {} }) {
  const wanted = STAGE_STATUS[stage]
  if (!wanted) return []

  const existing = readTasks()
  const mine = new Set(TASK_DEFS.map((d) => taskId(order, d.n)))
  const isPipelineCard = (t) => /^task-[\w.-]+-\d+$/.test(String(t?.id || '')) && !mine.has(t.id)
  const kept = existing.filter((t) => t && !isPipelineCard(t))

  const cards = TASK_DEFS.map((def) => {
    const id = taskId(order, def.n)
    const prev = kept.find((t) => t.id === id)
    return {
      ...prev,
      id,
      owner: def.owner,
      subject: def.subject(title),
      status: wanted[def.n],
      orderId: order,
      ...(extras[id] || {}),
    }
  })

  const orderIds = new Set(cards.map((c) => c.id))
  const untouched = kept.filter((t) => !orderIds.has(t.id))

  // Keep the approval card on top, newest first, like the board expects.
  const next = [...untouched.filter((t) => t.approval === 'render' || t.id?.startsWith('render-')), ...cards, ...untouched.filter((t) => !(t.approval === 'render' || t.id?.startsWith('render-')))]

  // The office merges on POST; writing the file keeps GET /api/tasks in sync now.
  writeTasks(next)
  return next
}

function addApprovalCard({ order, title, comp, scenes, seconds, voice }) {
  const tasks = readTasks().filter((t) => !(t.approval === 'render' && t.status === 'todo'))
  const card = {
    id: `render-${Date.now()}`,
    subject: `Render Video MP4: ${title}`,
    status: 'todo',
    owner: 'Jeje',
    reviewType: 'screening',
    approval: 'render',
    compositionId: comp,
    compositionTitle: title,
    orderId: order,
    description:
      `Komposisi ${comp} (${scenes ? `${scenes} scene / ` : ''}${seconds ? `${seconds} detik` : 'durasi menyesuaikan'}) siap dipreview di Screening Room. ` +
      (voice ? `Sudah ada VO (${voice}) + SFX, preview langsung bersuara. ` : '') +
      'Belum dirender.',
    deliverables: 'Preview berisi gambar + VO + SFX di Screening Room. Approve untuk mulai render MP4.',
  }
  const next = [card, ...tasks]
  writeTasks(next)
  return card
}

/* ------------------------------------------------------------------ */
/* the three commands                                                  */
/* ------------------------------------------------------------------ */

const STEP_INFO = {
  script: { percent: 12, owner: 'Lumi', role: 'scriptwriter' },
  voiceover: { percent: 38, owner: 'Ardi', role: 'voiceover' },
  sfx: { percent: 55, owner: 'Ardi', role: 'voiceover' },
  mix: { percent: 68, owner: 'Ardi', role: 'voiceover' },
  composition: { percent: 80, owner: 'Jeje', role: 'video-editor' },
  preview: { percent: 94, owner: 'Jeje', role: 'video-editor' },
}

function stepMessage(step, ctx) {
  const title = ctx.title || 'video'
  const scenes = ctx.scenes ? `${ctx.scenes} scene` : 'naskah'
  const seconds = ctx.seconds ? `${ctx.seconds} detik` : ''
  switch (step) {
    case 'script':
      return `Naskah siap, Bos. ${scenes} untuk "${title}".`
    case 'voiceover':
      return `Mic on. Voiceover ${scenes} sedang direkam.`
    case 'sfx':
      return 'SFX transisi disiapkan (impact, whoosh, riser).'
    case 'mix':
      return `VO + SFX sudah nyatu${seconds ? `, total ${seconds}` : ''}.`
    case 'composition':
      return `Komposisi jadi: ${scenes}${seconds ? ` / ${seconds}` : ''}.`
    case 'preview':
      return 'Preview sudah bersuara di Screening Room. Belum dirender — approve dulu di ToDo.'
    default:
      return step
  }
}

async function runStep() {
  const order = arg('order')
  const step = arg('step', 'script')
  const info = STEP_INFO[step]
  if (!order) throw new Error('--order wajib')
  if (!info) throw new Error(`--step tidak dikenal: ${step}`)

  const ctx = {
    title: arg('title'),
    scenes: Number(arg('scenes', '0')) || undefined,
    seconds: arg('seconds'),
    voice: arg('voice'),
  }
  const message = arg('message') || stepMessage(step, ctx)

  await draftStatus({
    state: 'working',
    stage: step,
    percent: Number(arg('percent', String(info.percent))),
    message,
    log: message,
    topic: ctx.title || undefined,
    compositionId: arg('comp') || undefined,
    sceneCount: ctx.scenes,
  })

  upsertTasks({ order, title: ctx.title || 'video', stage: step })
  updateOrderStatus(order, 'in_progress', { stage: step })
  await say(info.owner, info.role, message)
  console.log(JSON.stringify({ ok: true, step, order, message }))
}

async function runFinal() {
  const order = arg('order')
  const comp = arg('comp')
  const title = arg('title') || comp
  if (!order) throw new Error('--order wajib')
  if (!comp) throw new Error('--comp wajib')

  const scenes = Number(arg('scenes', '0')) || undefined
  const seconds = arg('seconds')
  const voice = arg('voice')

  if (!flag('no-build')) {
    try {
      const { regenerateRegistry } = await import('./studio-compose.mjs')
      regenerateRegistry()
    } catch (err) {
      console.error('[publish] registry gagal:', err?.message || err)
    }
    try {
      const tmpDir = path.join(WORKSPACE, '.tmp')
      fs.mkdirSync(tmpDir, { recursive: true })
      execSync('npm run build', {
        cwd: WORKSPACE,
        stdio: 'pipe',
        timeout: 300000,
        env: { ...process.env, TEMP: tmpDir, TMP: tmpDir },
      })
    } catch (err) {
      console.error('[publish] build gagal:', err?.message || err)
    }
  }

  upsertTasks({
    order,
    title,
    stage: 'preview',
    extras: {
      [taskId(order, 3)]: {
        description: voice
          ? `VO Bahasa Indonesia (${voice})${scenes ? ` untuk ${scenes} scene` : ''} + SFX transisi.`
          : 'Voiceover + SFX sudah masuk ke timeline.',
      },
      [taskId(order, 5)]: {
        description: seconds
          ? `Timeline ${seconds} detik mengikuti panjang VO tiap scene; SFX di-duck di bawah narasi.`
          : 'Timeline mengikuti panjang VO tiap scene; SFX di-duck di bawah narasi.',
      },
    },
  })
  addApprovalCard({ order, title, comp, scenes, seconds, voice })
  updateOrderStatus(order, 'done', { stage: 'preview', compositionId: comp })

  await draftStatus({
    state: 'done',
    stage: 'preview',
    percent: 100,
    message: `Draf siap dipreview${scenes ? ` (${scenes} scene` : ' ('}${seconds ? ` / ${seconds} detik)` : ')'}`,
    log: 'Preview siap dibuka di Screening Room',
    previewReady: true,
    topic: title,
    compositionId: comp,
    sceneCount: scenes,
  })

  await say('Jeje', 'video-editor',
    `Komposisi ${comp} siap dipreview${scenes ? ` — ${scenes} scene` : ''}${seconds ? `, ${seconds} detik` : ''}.\n\n` +
    (voice ? `Preview sudah lengkap: gambar, VO Ardi (${voice}), dan SFX transisi.\n\n` : '') +
    'Buka Screening Room untuk melihat dan mendengarnya.')
  await say('Nara', 'assistant',
    `Kalau sudah oke, approve "Render Video MP4: ${title}" di Papan ToDo. Saya belum render apa pun.`)

  console.log(JSON.stringify({ ok: true, final: true, order, comp, title }))
}

async function runFail() {
  const order = arg('order')
  const step = arg('step', 'unknown')
  const message = arg('message') || 'Mesin berhenti sebelum draf selesai.'
  await draftStatus({ state: 'failed', stage: step, message, log: message })
  updateOrderStatus(order, 'failed', { stage: step, error: message })
  if (order) {
    const tasks = readTasks().map((t) =>
      t.orderId === order && t.status === 'in_progress' ? { ...t, status: 'todo' } : t
    )
    writeTasks(tasks)
  }
  await say('Nara', 'assistant', `Mesin berhenti di tahap ${step}. ${message}\n\nOrder tetap tersimpan; kirim ulang kalau sudah siap.`)
  console.log(JSON.stringify({ ok: false, failed: true, order, step, message }))
}

/* ------------------------------------------------------------------ */

const cmd = process.argv[2]
try {
  if (cmd === 'step') await runStep()
  else if (cmd === 'final') await runFinal()
  else if (cmd === 'fail') await runFail()
  else {
    console.error('Usage: node scripts/publish-draft.mjs <step|final|fail> [flags]')
    process.exit(2)
  }
} catch (err) {
  console.error('[publish]', err?.message || err)
  process.exit(1)
}
