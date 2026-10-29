#!/usr/bin/env node
/**
 * scripts/order-wake.mjs
 *
 * Listener realtime: kantor -> mesin produksi.
 *
 * Kenapa ada, padahal sudah ada scripts/deepseek-inbox-listener.mjs?
 *   - Listener lama memakai `.processed_orders.json` sebagai penanda. Begitu
 *     order ditandai, order itu tidak akan pernah membangunkan mesin lagi —
 *     termasuk kalau sesi mesin mati di tengah jalan.
 *   - Listener ini memakai state sendiri (`.order-wake-seen.json`) sehingga
 *     aman berjalan bersamaan dengan listener/tooling kantor yang lain.
 *   - Order yang sudah diklaim (`.claimed/<id>.json` masih segar) dilewati,
 *     jadi order yang sedang dikerjakan tidak membangunkan mesin dua kali.
 *
 * Mode:
 *   node scripts/order-wake.mjs            # one-shot: tunggu 1 order baru, cetak JSON, exit 0
 *   node scripts/order-wake.mjs --daemon   # pantau terus, cetak setiap order baru
 *   node scripts/order-wake.mjs --seed     # tandai semua order yang ada sebagai "sudah dilihat"
 *   node scripts/order-wake.mjs --pending  # cetak order baru yang belum dilihat lalu exit
 *
 * Satu-satunya output di stdout adalah JSON (atau kosong), supaya pemanggil
 * bisa membacanya langsung. Diagnostik masuk ke stderr.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const OFFICE_HOME = process.env.AGENT_OFFICE_HOME || path.join(os.homedir(), '.agent-office')
const INBOX_DIR = path.join(OFFICE_HOME, 'engine-inbox')
const CLAIM_DIR = path.join(INBOX_DIR, '.claimed')
const STATE_FILE = path.join(INBOX_DIR, '.order-wake-seen.json')

/** Lane yang dijaga watcher ini; `--engine any` menerima semua lane. */
const engineArg = (() => {
  const i = process.argv.indexOf('--engine')
  const value = i >= 0 ? process.argv[i + 1] : ''
  return value && !value.startsWith('--') ? value.toLowerCase() : 'deepseek'
})()
const ENGINE_KEY = engineArg === 'agy' ? 'antigravity' : engineArg

/**
 * Watcher menulis heartbeat-nya sendiri (`wake-heartbeat-*`), terpisah dari
 * heartbeat daemon (`listener-heartbeat-*`). Footer jadi bisa membedakan
 * "stack hidup" dari "ada sesi AI yang siap dibangunkan".
 */
const WAKE_HB_FILE = path.join(
  OFFICE_HOME,
  `wake-heartbeat-${ENGINE_KEY === 'any' ? 'deepseek' : ENGINE_KEY}.json`
)

function heartbeatRecord(active = true) {
  return {
    active,
    engine: ENGINE_KEY === 'any' ? 'deepseek' : ENGINE_KEY,
    mode: daemon ? 'daemon' : 'oneshot',
    pid: process.pid,
    timestamp: Date.now(),
  }
}

/**
 * Hanya file wake yang ditulis: heartbeat daemon tetap milik stack, supaya
 * footer tidak pernah menampilkan "siap" padahal hanya daemon yang hidup.
 */
function touchHeartbeat() {
  try {
    fs.writeFileSync(WAKE_HB_FILE, JSON.stringify(heartbeatRecord()), 'utf8')
  } catch {}
}

process.on('exit', () => {
  try {
    fs.writeFileSync(WAKE_HB_FILE, JSON.stringify(heartbeatRecord(false)), 'utf8')
  } catch {}
})

/** Sama dengan scripts/order.mjs: klaim lebih tua dari ini dianggap ditinggal. */
const CLAIM_TTL_MS = Number(process.env.NARA_CLAIM_TTL_MS || 6 * 60 * 60 * 1000)
const POLL_MS = Number(process.env.NARA_ORDER_POLL_MS || 800)

const daemon = process.argv.includes('--daemon') || process.argv.includes('--loop')
const seedOnly = process.argv.includes('--seed')
const pendingOnly = process.argv.includes('--pending')

function log(line) {
  process.stderr.write(`[order-wake] ${line}\n`)
}

function readSeen() {
  try {
    const raw = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
    return new Set(Array.isArray(raw) ? raw : [])
  } catch {
    return new Set()
  }
}

function writeSeen(set) {
  try {
    fs.mkdirSync(INBOX_DIR, { recursive: true })
    // Tulis atomik: file sementara + rename, supaya state tidak pernah setengah jadi.
    const tmp = `${STATE_FILE}.${process.pid}.tmp`
    fs.writeFileSync(tmp, JSON.stringify([...set], null, 2), 'utf8')
    fs.renameSync(tmp, STATE_FILE)
    return true
  } catch (err) {
    log(`gagal simpan state: ${err?.message || err}`)
    return false
  }
}

/**
 * Lane tiap mesin punya folder sendiri (`agy-inbox`, `opencode-inbox`), sedangkan
 * arsip semua order tetap di `engine-inbox`. Keduanya dibaca, lane menang saat
 * id-nya sama (salinan lane yang paling baru ditulis adapter).
 */
function laneDirs() {
  const dirs = []
  if (ENGINE_KEY !== 'deepseek' && ENGINE_KEY !== 'any') {
    dirs.push(path.join(OFFICE_HOME, `${ENGINE_KEY}-inbox`))
  }
  if (ENGINE_KEY === 'any') {
    try {
      for (const name of fs.readdirSync(OFFICE_HOME)) {
        if (name.endsWith('-inbox')) dirs.push(path.join(OFFICE_HOME, name))
      }
    } catch {}
  }
  dirs.push(INBOX_DIR)
  return dirs
}

function listOrders() {
  const byId = new Map()
  for (const dir of laneDirs()) {
    let files
    try {
      files = fs.readdirSync(dir)
    } catch {
      continue
    }
    for (const f of files.filter((name) => name.endsWith('.json') && !name.startsWith('.')).sort()) {
      try {
        const order = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
        if (!order || !order.id || !String(order.text || '').trim()) continue
        const previous = byId.get(order.id)
        // Lane menang atas arsip; dalam satu folder, file terbaru menang.
        if (!previous || dir !== INBOX_DIR) byId.set(order.id, { ...order, file: f })
      } catch {}
    }
  }
  return [...byId.values()]
}

function isClaimed(id) {
  const file = path.join(CLAIM_DIR, `${id}.json`)
  if (!fs.existsSync(file)) return false
  try {
    const claim = JSON.parse(fs.readFileSync(file, 'utf8'))
    const at = Number(claim?.claimedAt) || 0
    return Date.now() - at < CLAIM_TTL_MS
  } catch {
    return true // file claim rusak: anggap sudah dipegang, jangan bangunkan mesin
  }
}

/** Order yang belum dilihat mesin, belum dipegang proses lain, dan belum selesai. */
const TERMINAL = new Set(['done', 'failed', 'cancelled'])

function inLane(order) {
  if (ENGINE_KEY === 'any') return true
  return String(order?.engine || '').toLowerCase() === ENGINE_KEY
}

function freshOrders() {
  const seen = readSeen()
  return listOrders().filter(
    (o) => inLane(o) && !TERMINAL.has(String(o.status || '')) && !seen.has(o.id) && !isClaimed(o.id)
  )
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

if (seedOnly) {
  const seen = readSeen()
  const orders = listOrders()
  for (const o of orders) seen.add(o.id)
  const ok = writeSeen(seen)
  process.stdout.write(JSON.stringify({ ok, seeded: orders.length, total: seen.size }) + '\n')
  process.exit(0)
}

if (pendingOnly) {
  const pending = freshOrders()
  process.stdout.write(JSON.stringify({ ok: true, pending: pending.map(view) }, null, 2) + '\n')
  process.exit(0)
}

function take(order) {
  const seen = readSeen()
  seen.add(order.id)
  writeSeen(seen)
}

function tick() {
  touchHeartbeat()
  const pending = freshOrders()
  if (!pending.length) return null
  if (daemon) {
    for (const order of pending) {
      take(order)
      process.stdout.write(JSON.stringify({ at: new Date().toISOString(), ...view(order) }) + '\n')
    }
    return null
  }
  const order = pending[0]
  take(order)
  process.stdout.write(JSON.stringify({ at: new Date().toISOString(), ...view(order) }, null, 2) + '\n')
  return order
}

if (daemon) {
  log(`daemon aktif — memantau ${INBOX_DIR}`)
  // fs.watch memberi respons instan; polling tetap jalan sebagai jaring pengaman
  // karena event filesystem di Windows bisa terlewat.
  let trigger = null
  try {
    fs.watch(INBOX_DIR, { persistent: true }, () => {
      if (trigger) trigger()
    })
  } catch (err) {
    log(`fs.watch tidak tersedia (${err?.message || err}), pakai polling saja`)
  }
  setInterval(() => tick(), POLL_MS)
  tick()
  await new Promise(() => {})
} else {
  // Satu kali bangun: begitu ada order baru, cetak lalu exit supaya harness
  // memberi tahu sesi mesin bahwa job selesai.
  const first = tick()
  if (first) process.exit(0)
  let done = false
  const finish = () => {
    if (done) return
    done = true
    const order = tick()
    if (order) process.exit(0)
    done = false
  }
  try {
    fs.watch(INBOX_DIR, { persistent: true }, finish)
  } catch (err) {
    log(`fs.watch tidak tersedia (${err?.message || err}), pakai polling saja`)
  }
  setInterval(finish, POLL_MS)
}
