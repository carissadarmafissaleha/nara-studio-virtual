/**
 * Engine: Hermes.
 *
 * Mirip OpenCode: tidak ada HTTP di jalur ini. Order "dikirim" dengan menaruh
 * salinannya di `~/.agent-office/hermes-inbox/`, lalu sesi Hermes memakainya
 * lewat watcher `npm run wake:hermes` (`node scripts/order-wake.mjs --engine hermes`).
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const name = 'hermes'

const SESSION_ID = 'hermes-studio'

function officeHome() {
  return process.env.AGENT_OFFICE_HOME || path.join(os.homedir(), '.agent-office')
}

function laneDir() {
  return path.join(officeHome(), 'hermes-inbox')
}

function archivedOrder(orderId, fallback) {
  const file = path.join(officeHome(), 'engine-inbox', `${orderId}.json`)
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {}
  return fallback
}

function ordersFile(directory) {
  return path.join(directory || process.cwd(), 'naskah', 'hermes_active_orders.json')
}

export async function ping() {
  try {
    fs.mkdirSync(laneDir(), { recursive: true })
    return { ok: true, detail: `Hermes siap — order masuk ke ${laneDir()}` }
  } catch (err) {
    return { ok: false, error: err?.message || String(err) }
  }
}

export async function send(_cfg, { text, orderId, directory }) {
  const sentAt = new Date().toISOString()
  const base = archivedOrder(orderId, {
    id: orderId,
    engine: 'hermes',
    sender: 'Caca',
    text,
    chars: String(text || '').length,
    status: 'pending',
    createdAt: sentAt,
  })

  const order = {
    ...base,
    id: orderId,
    engine: 'hermes',
    sessionId: SESSION_ID,
    text,
    chars: String(text || '').length,
    status: 'sent',
    sentAt,
    detail: 'Order diterima Hermes Engine untuk produksi video',
  }

  const lane = laneDir()
  fs.mkdirSync(lane, { recursive: true })
  fs.writeFileSync(path.join(lane, `${orderId}.json`), JSON.stringify(order, null, 2), 'utf8')

  const note = ordersFile(directory)
  let list = []
  try {
    if (fs.existsSync(note)) list = JSON.parse(fs.readFileSync(note, 'utf8')) || []
  } catch {}
  list.unshift({
    id: orderId,
    rawText: text,
    engine: 'hermes',
    status: 'assigned_to_hermes',
    createdAt: order.createdAt || sentAt,
  })
  fs.mkdirSync(path.dirname(note), { recursive: true })
  fs.writeFileSync(note, JSON.stringify(list.slice(0, 20), null, 2), 'utf8')

  return { ok: true, engine: 'hermes', sessionId: SESSION_ID, detail: order.detail }
}