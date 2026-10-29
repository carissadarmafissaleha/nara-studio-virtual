#!/usr/bin/env node
/**
 * scripts/engine-inbox-daemon.mjs
 *
 * Daemon tampilan untuk lane mesin mana pun (dipakai `npm run dev:office-opencode`,
 * dan bisa juga untuk mesin lain). Tugasnya hanya:
 *   - mencetak order baru yang masuk ke lane itu,
 *   - menulis `listener-heartbeat-<engine>.json` untuk lampu LISTENER di footer.
 *
 * Dia **tidak pernah** mengklaim order dan tidak pernah `exit 0` — wake tetap
 * milik watcher sesi (`npm run wake:<engine>`), supaya order tidak terkunci oleh
 * proses yang tidak bisa membangunkan model.
 *
 *   node scripts/engine-inbox-daemon.mjs --engine opencode
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

function arg(name, fallback = '') {
  const i = process.argv.indexOf(`--${name}`)
  const value = i >= 0 ? process.argv[i + 1] : ''
  return value && !value.startsWith('--') ? value : fallback
}

const ENGINE_KEY = String(arg('engine', 'opencode')).toLowerCase()
const OFFICE_HOME = process.env.AGENT_OFFICE_HOME || path.join(os.homedir(), '.agent-office')
const INBOX_DIR = path.join(OFFICE_HOME, 'engine-inbox')
const LANE_DIR = path.join(OFFICE_HOME, `${ENGINE_KEY}-inbox`)
const ENGINE_FILE = path.join(OFFICE_HOME, 'engine.json')
const HB_FILE = path.join(OFFICE_HOME, 'listener-heartbeat.json')
const HB_OWN_FILE = path.join(OFFICE_HOME, `listener-heartbeat-${ENGINE_KEY}.json`)
const POLL_MS = Number(process.env.NARA_ORDER_POLL_MS || 1200)

function activeEngine() {
  try {
    const conf = JSON.parse(fs.readFileSync(ENGINE_FILE, 'utf8'))
    const raw = String(conf?.active || '').toLowerCase()
    return raw === 'agy' ? 'antigravity' : raw
  } catch {
    return 'deepseek'
  }
}

function writeHeartbeat(active) {
  const record = { active, engine: ENGINE_KEY, mode: 'daemon', pid: process.pid, timestamp: Date.now() }
  try {
    fs.writeFileSync(HB_OWN_FILE, JSON.stringify(record), 'utf8')
    if (activeEngine() === ENGINE_KEY) fs.writeFileSync(HB_FILE, JSON.stringify(record), 'utf8')
  } catch {}
}

function readOrders() {
  const byId = new Map()
  for (const dir of [LANE_DIR, INBOX_DIR]) {
    let files
    try {
      files = fs.readdirSync(dir)
    } catch {
      continue
    }
    for (const file of files.filter((f) => f.endsWith('.json') && !f.startsWith('.')).sort()) {
      try {
        const order = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
        if (!order || !order.id || !String(order.text || '').trim()) continue
        if (String(order.engine || '').toLowerCase() !== ENGINE_KEY) continue
        byId.set(order.id, order)
      } catch {}
    }
  }
  return [...byId.values()]
}

const seen = new Set(readOrders().map((order) => order.id))
console.log(`[${ENGINE_KEY} daemon] memantau ${LANE_DIR} + ${INBOX_DIR} (tanpa klaim)`)

process.on('exit', () => writeHeartbeat(false))
process.on('SIGINT', () => process.exit(0))

const loop = () => {
  writeHeartbeat(true)
  for (const order of readOrders()) {
    if (seen.has(order.id)) continue
    seen.add(order.id)
    if (['done', 'failed', 'cancelled'].includes(String(order.status || ''))) continue
    console.log(`=== ORDER UNTUK ${ENGINE_KEY.toUpperCase()} ===`)
    console.log(JSON.stringify({ id: order.id, sender: order.sender, chars: order.chars, createdAt: order.createdAt, text: order.text }, null, 2))
  }
  setTimeout(loop, POLL_MS)
}

loop()
