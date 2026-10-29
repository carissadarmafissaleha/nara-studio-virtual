/**
 * Engine: OpenCode.
 *
 * Sama seperti Antigravity: tidak ada HTTP di jalur ini. Order "dikirim" dengan
 * menaruh salinannya di `~/.agent-office/opencode-inbox/`, lalu sesi OpenCode
 * memakainya lewat watcher `npm run wake:opencode`
 * (`node scripts/order-wake.mjs --engine opencode`).
 *
 * Arsip utama tetap `engine-inbox/<id>.json` yang ditulis dispatchEngineOrder;
 * adapter ini hanya menyalinnya ke lane OpenCode + mencatat di
 * `naskah/opencode_active_orders.json`.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const name = 'opencode'

const SESSION_ID = 'opencode-studio'

function officeHome() {
  return process.env.AGENT_OFFICE_HOME || path.join(os.homedir(), '.agent-office')
}

function laneDir() {
  return path.join(officeHome(), 'opencode-inbox')
}

function archivedOrder(orderId, fallback) {
  const file = path.join(officeHome(), 'engine-inbox', `${orderId}.json`)
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {}
  return fallback
}

function ordersFile(directory) {
  return path.join(directory || process.cwd(), 'naskah', 'opencode_active_orders.json')
}

export async function ping() {
  try {
    fs.mkdirSync(laneDir(), { recursive: true })
    return { ok: true, detail: `OpenCode siap — order masuk ke ${laneDir()}` }
  } catch (err) {
    return { ok: false, error: err?.message || String(err) }
  }
}

export async function send(_cfg, { text, orderId, directory }) {
  const sentAt = new Date().toISOString()
  const base = archivedOrder(orderId, {
    id: orderId,
    engine: 'opencode',
    sender: 'Caca',
    text,
    chars: String(text || '').length,
    status: 'pending',
    createdAt: sentAt,
  })

  const order = {
    ...base,
    id: orderId,
    engine: 'opencode',
    sessionId: SESSION_ID,
    text,
    chars: String(text || '').length,
    status: 'sent',
    sentAt,
    detail: 'Order diterima OpenCode Engine untuk produksi video',
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
    engine: 'opencode',
    status: 'assigned_to_opencode',
    createdAt: order.createdAt || sentAt,
  })
  fs.mkdirSync(path.dirname(note), { recursive: true })
  fs.writeFileSync(note, JSON.stringify(list.slice(0, 20), null, 2), 'utf8')

  return { ok: true, engine: 'opencode', sessionId: SESSION_ID, detail: order.detail }
}
