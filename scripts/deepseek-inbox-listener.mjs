#!/usr/bin/env node
/**
 * scripts/deepseek-inbox-listener.mjs
 *
 * Listener yang memantau ~/.agent-office/engine-inbox/ untuk order masuk dari chat kantor.
 *
 * Mode:
 * 1. One-shot Wakeup Mode (`node scripts/deepseek-inbox-listener.mjs`):
 *    Mencetak detail order dan `process.exit(0)` untuk memicu wakeup DeepSeek.
 * 2. Daemon Mode (`node scripts/deepseek-inbox-listener.mjs --daemon`):
 *    Berjalan terus-menerus di dalam `npm run dev:office-ds`, memperbarui
 *    heartbeat footer kantor (biru `LISTENER: AKTIF`) tanpa mencuri order one-shot.
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const isDaemon = process.argv.includes('--daemon') || process.argv.includes('--loop')
const OFFICE_HOME = process.env.AGENT_OFFICE_HOME || path.join(os.homedir(), '.agent-office')
const INBOX_DIR = path.join(OFFICE_HOME, 'engine-inbox')
const PROCESSED_FILE = path.join(INBOX_DIR, '.processed_orders.json')
const HB_FILE = path.join(OFFICE_HOME, 'listener-heartbeat.json')
const HB_OWN_FILE = path.join(OFFICE_HOME, 'listener-heartbeat-deepseek.json')
const ENGINE_FILE = path.join(OFFICE_HOME, 'engine.json')

/** Mesin yang sedang aktif menurut engine.json (default: deepseek). */
function activeEngine() {
  try {
    const conf = JSON.parse(fs.readFileSync(ENGINE_FILE, 'utf8'))
    const raw = String(conf?.active || '').toLowerCase()
    return raw === 'agy' ? 'antigravity' : (raw || 'deepseek')
  } catch {
    return 'deepseek'
  }
}

/**
 * Heartbeat per-mesin selalu ditulis; file lama (dibaca footer) hanya ditulis
 * bila DeepSeek yang aktif, supaya listener AGY tidak saling menimpa status.
 */
function touchHeartbeat() {
  const record = {
    active: true,
    engine: 'deepseek',
    mode: isDaemon ? 'daemon' : 'oneshot',
    pid: process.pid,
    timestamp: Date.now(),
  }
  try {
    fs.writeFileSync(HB_OWN_FILE, JSON.stringify(record), 'utf8')
  } catch {}
  if (activeEngine() === 'deepseek') {
    try {
      fs.writeFileSync(HB_FILE, JSON.stringify(record), 'utf8')
    } catch {}
  }
}

process.on('exit', () => {
  const inactive = { active: false, engine: 'deepseek', timestamp: Date.now() }
  try {
    fs.writeFileSync(HB_OWN_FILE, JSON.stringify(inactive), 'utf8')
  } catch {}
  if (activeEngine() === 'deepseek') {
    try {
      fs.writeFileSync(HB_FILE, JSON.stringify(inactive), 'utf8')
    } catch {}
  }
})

if (!fs.existsSync(INBOX_DIR)) fs.mkdirSync(INBOX_DIR, { recursive: true })

function readAllOrders() {
  if (!fs.existsSync(INBOX_DIR)) return []
  const files = fs.readdirSync(INBOX_DIR).filter((f) => f.endsWith('.json') && !f.startsWith('.'))
  const list = []
  for (const f of files.sort()) {
    try {
      const order = JSON.parse(fs.readFileSync(path.join(INBOX_DIR, f), 'utf8'))
      if (order && order.id && order.text) list.push(order)
    } catch {}
  }
  return list
}

function getProcessedOrders() {
  try {
    if (fs.existsSync(PROCESSED_FILE)) {
      return new Set(JSON.parse(fs.readFileSync(PROCESSED_FILE, 'utf8')))
    }
  } catch {}
  const initialIds = readAllOrders().map((o) => o.id)
  try {
    fs.writeFileSync(PROCESSED_FILE, JSON.stringify(initialIds, null, 2), 'utf8')
  } catch {}
  return new Set(initialIds)
}

function markProcessed(orderId) {
  try {
    const set = getProcessedOrders()
    set.add(orderId)
    fs.writeFileSync(PROCESSED_FILE, JSON.stringify([...set], null, 2), 'utf8')
  } catch {}
}

const daemonSeen = new Set(readAllOrders().map((o) => o.id))

function getNextNewOrder() {
  const orders = readAllOrders()
  if (isDaemon) {
    for (const order of orders) {
      if (!daemonSeen.has(order.id)) {
        daemonSeen.add(order.id)
        return order
      }
    }
    return null
  }
  const processed = getProcessedOrders()
  for (const order of orders) {
    if (!processed.has(order.id)) {
      markProcessed(order.id)
      return order
    }
  }
  return null
}

async function watch() {
  console.log(`[DeepSeek Listener] Active (${isDaemon ? 'Daemon Loop' : 'One-shot Wakeup'}). Waiting for /buat-video orders...`)
  touchHeartbeat()

  while (true) {
    touchHeartbeat()
    const order = getNextNewOrder()
    if (order) {
      console.log('\n======================================================')
      console.log('🎬 [DEEPSEEK ORDER RECEIVED FROM OFFICE CHAT]')
      console.log('======================================================')
      console.log(JSON.stringify(order, null, 2))
      console.log('======================================================\n')
      if (!isDaemon) {
        process.exit(0)
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1200))
  }
}

watch().catch((err) => {
  console.error('[DeepSeek Listener Error]', err)
  process.exit(1)
})
