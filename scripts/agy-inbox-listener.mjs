#!/usr/bin/env node
/**
 * scripts/agy-inbox-listener.mjs
 *
 * Listener khusus Antigravity (AGY). Hanya mengambil order yang memang
 * ditujukan ke lane AGY (`engine: "antigravity"`), jadi order DeepSeek yang
 * kebetulan ada di `engine-inbox/` tidak ikut dicuri.
 *
 * Perubahan penting dibanding versi lama:
 *   - Order DIKLAIM dulu (`.claimed/<id>.json`, atomic `wx`, TTL 6 jam) sebelum
 *     sesi dibangunkan. Klaim inilah yang mencegah dua mesin mengerjakan order
 *     yang sama dan mencegah order hilang kalau sesi AGY mati di tengah jalan.
 *   - Status order ditulis balik: `claimed` saat diambil, lalu `in_progress` /
 *     `done` / `failed` oleh `publish-draft.mjs`.
 *   - `.processed_agy_orders.json` hanya dipakai sebagai daftar "sudah pernah
 *     diproses" versi lama: id di dalamnya dilewati supaya order historis tidak
 *     tiba-tiba dibangunkan ulang.
 *
 * Mode:
 * 1. One-shot Wakeup (`node scripts/agy-inbox-listener.mjs`):
 *    klaim satu order baru, cetak JSON, lalu `process.exit(0)` — inilah
 *    "Reactive Wakeup" yang membangunkan sesi Antigravity.
 * 2. Daemon (`--daemon`): hanya menampilkan order baru + heartbeat untuk footer,
 *    tidak mengklaim apa pun (dipakai `npm run dev:office-agy`).
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const isDaemon = process.argv.includes('--daemon') || process.argv.includes('--loop')
const OFFICE_HOME = process.env.AGENT_OFFICE_HOME || path.join(os.homedir(), '.agent-office')
const AGY_INBOX_DIR = path.join(OFFICE_HOME, 'agy-inbox')
const ENGINE_INBOX_DIR = path.join(OFFICE_HOME, 'engine-inbox')
const CLAIM_DIR = path.join(ENGINE_INBOX_DIR, '.claimed')
const LEGACY_FILE = path.join(AGY_INBOX_DIR, '.processed_agy_orders.json')
const HB_FILE = path.join(OFFICE_HOME, 'listener-heartbeat.json')
const HB_OWN_FILE = path.join(OFFICE_HOME, 'listener-heartbeat-antigravity.json')
const WAKE_HB_FILE = path.join(OFFICE_HOME, 'wake-heartbeat-antigravity.json')
const ENGINE_FILE = path.join(OFFICE_HOME, 'engine.json')

const CLAIM_TTL_MS = Number(process.env.NARA_CLAIM_TTL_MS || 6 * 60 * 60 * 1000)
const POLL_MS = Number(process.env.NARA_ORDER_POLL_MS || 1200)
const ENGINE_KEY = 'antigravity'

function activeEngine() {
  try {
    const conf = JSON.parse(fs.readFileSync(ENGINE_FILE, 'utf8'))
    const raw = String(conf?.active || '').toLowerCase()
    return raw === 'agy' ? 'antigravity' : raw
  } catch {
    return ENGINE_KEY
  }
}

/**
 * Dua heartbeat yang berbeda tugas:
 *   daemon  -> `listener-heartbeat-*` (stack hidup, hanya menampilkan order)
 *   one-shot -> `wake-heartbeat-*`   (sesi AI siap dibangunkan)
 * Footer membaca keduanya lewat /api/listener-status.
 */
function heartbeatRecord(active) {
  return {
    active,
    engine: ENGINE_KEY,
    mode: isDaemon ? 'daemon' : 'oneshot',
    pid: process.pid,
    timestamp: Date.now(),
  }
}

function writeHeartbeat(active) {
  const record = heartbeatRecord(active)
  try {
    if (isDaemon) {
      fs.writeFileSync(HB_OWN_FILE, JSON.stringify(record), 'utf8')
      if (activeEngine() === ENGINE_KEY) fs.writeFileSync(HB_FILE, JSON.stringify(record), 'utf8')
    } else {
      fs.writeFileSync(WAKE_HB_FILE, JSON.stringify(record), 'utf8')
    }
  } catch {}
}

function touchHeartbeat() {
  writeHeartbeat(true)
}

process.on('exit', () => {
  writeHeartbeat(false)
})

if (!fs.existsSync(AGY_INBOX_DIR)) fs.mkdirSync(AGY_INBOX_DIR, { recursive: true })
if (!fs.existsSync(ENGINE_INBOX_DIR)) fs.mkdirSync(ENGINE_INBOX_DIR, { recursive: true })

/** Kedua lane dibaca (arsip + lane AGY), di-dedupe per id; lane AGY menang. */
function readAllOrders() {
  const byId = new Map()
  for (const dir of [ENGINE_INBOX_DIR, AGY_INBOX_DIR]) {
    if (!fs.existsSync(dir)) continue
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json') && !f.startsWith('.')).sort()) {
      try {
        const order = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
        if (!order || !order.id || !String(order.text || '').trim()) continue
        byId.set(order.id, { ...order, _dir: dir, _file: file })
      } catch {}
    }
  }
  return [...byId.values()].sort((a, b) => String(a.id).localeCompare(String(b.id)))
}

/** Id yang sudah diproses build lama: jangan dibangunkan lagi. */
function legacySeen() {
  try {
    if (!fs.existsSync(LEGACY_FILE)) return new Set()
    const parsed = JSON.parse(fs.readFileSync(LEGACY_FILE, 'utf8'))
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function claimPath(id) {
  return path.join(CLAIM_DIR, `${id}.json`)
}

function isClaimed(id) {
  const file = claimPath(id)
  if (!fs.existsSync(file)) return false
  try {
    const claim = JSON.parse(fs.readFileSync(file, 'utf8'))
    return Date.now() - (Number(claim?.claimedAt) || 0) < CLAIM_TTL_MS
  } catch {
    return true
  }
}

/** `wx` = gagal kalau proses lain sudah lebih dulu mengklaim order ini. */
function claim(order) {
  fs.mkdirSync(CLAIM_DIR, { recursive: true })
  const stamp = { orderId: order.id, claimedAt: Date.now(), by: ENGINE_KEY }
  try {
    fs.writeFileSync(claimPath(order.id), JSON.stringify(stamp, null, 2), { encoding: 'utf8', flag: 'wx' })
  } catch {
    return false
  }
  writeStatus(order, 'claimed', { claimedAt: new Date(stamp.claimedAt).toISOString(), claimedBy: ENGINE_KEY })
  return true
}

/** Tulis status ke salinan order yang ada (lane AGY dan/atau arsip engine). */
function writeStatus(order, status, extra = {}) {
  const targets = new Set([order?._dir, AGY_INBOX_DIR, ENGINE_INBOX_DIR].filter(Boolean))
  for (const dir of targets) {
    const file = path.join(dir, `${order.id}.json`)
    try {
      if (!fs.existsSync(file)) continue
      const current = JSON.parse(fs.readFileSync(file, 'utf8'))
      fs.writeFileSync(file, JSON.stringify({ ...current, ...extra, status, updatedAt: new Date().toISOString() }, null, 2), 'utf8')
    } catch {}
  }
}

const isTerminal = (order) => ['done', 'failed', 'cancelled'].includes(String(order?.status || ''))
const isAgyLane = (order) => String(order?.engine || '').toLowerCase() === 'antigravity'

function pickOrder({ allowClaim }) {
  const legacy = legacySeen()
  for (const order of readAllOrders()) {
    if (!isAgyLane(order)) continue
    if (isTerminal(order)) continue
    if (legacy.has(order.id)) continue
    if (isClaimed(order.id)) continue
    if (allowClaim && !claim(order)) continue
    return order
  }
  return null
}

function view(order) {
  return {
    id: order.id,
    engine: order.engine,
    sender: order.sender,
    chars: order.chars ?? String(order.text || '').length,
    createdAt: order.createdAt,
    text: order.text,
  }
}

/** Daemon tidak mengklaim: cukup laporkan order baru supaya terlihat di log. */
const daemonSeen = new Set(readAllOrders().map((o) => o.id))

async function watch() {
  console.log(`[AGY Listener] Active (${isDaemon ? 'Daemon Loop' : 'One-shot Wakeup'}). Lane: antigravity. Waiting for /buat-video orders...`)

  while (true) {
    touchHeartbeat()
    if (isDaemon) {
      for (const order of readAllOrders()) {
        if (!isAgyLane(order) || isTerminal(order) || daemonSeen.has(order.id)) continue
        daemonSeen.add(order.id)
        console.log('=== ORDER UNTUK ANTIGRAVITY (AGY) ===')
        console.log(JSON.stringify(view(order), null, 2))
      }
    } else {
      const order = pickOrder({ allowClaim: true })
      if (order) {
        console.log('=== NEW ORDER CLAIMED FOR ANTIGRAVITY (AGY) ===')
        console.log(JSON.stringify(view(order), null, 2))
        // Exit(0) → Reactive Wakeup sesi Antigravity.
        process.exit(0)
      }
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS))
  }
}

watch().catch((err) => {
  console.error('[AGY Listener Error]', err)
  process.exit(1)
})
