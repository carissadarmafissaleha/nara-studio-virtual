/**
 * Engine: Antigravity (AGY).
 *
 * Jalur AGY berbeda dari DeepSeek: tidak ada endpoint HTTP dan tidak ada CLI
 * yang dipanggil bridge. Order "dikirim" dengan menaruh salinannya di
 * `~/.agent-office/agy-inbox/`, yang dipantau `scripts/agy-inbox-listener.mjs`
 * di sesi AGY. Listener itu yang membangunkan sesi (exit 0), lalu sesi AGY
 * mengerjakan produksi dan melapor lewat `scripts/publish-draft.mjs`.
 *
 * Arsip utama tetap `engine-inbox/<id>.json` (ditulis dispatchEngineOrder);
 * adapter ini menyalinnya ke lane AGY dengan status `sent` dan mencatatnya di
 * `naskah/agy_active_orders.json`, persis seperti yang dibaca listener.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const name = 'antigravity'

const SESSION_ID = 'agy-studio'

function officeHome() {
  return process.env.AGENT_OFFICE_HOME || path.join(os.homedir(), '.agent-office')
}

function agyInboxDir() {
  return path.join(officeHome(), 'agy-inbox')
}

/** Order arsip yang sudah ditulis dispatchEngineOrder, kalau ada. */
function archivedOrder(orderId, fallback) {
  const file = path.join(officeHome(), 'engine-inbox', `${orderId}.json`)
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {}
  return fallback
}

/** `naskah/agy_active_orders.json` relatif ke workspace mesin yang memanggil. */
function agyOrdersFile(directory) {
  return path.join(directory || process.cwd(), 'naskah', 'agy_active_orders.json')
}

export async function ping() {
  try {
    fs.mkdirSync(agyInboxDir(), { recursive: true })
    return { ok: true, detail: `Antigravity (AGY) siap — order masuk ke ${agyInboxDir()}` }
  } catch (err) {
    return { ok: false, error: err?.message || String(err) }
  }
}

export async function send(_cfg, { text, orderId, directory }) {
  const sentAt = new Date().toISOString()
  const base = archivedOrder(orderId, {
    id: orderId,
    engine: 'antigravity',
    sender: 'Caca',
    text,
    chars: String(text || '').length,
    status: 'pending',
    createdAt: sentAt,
  })

  const order = {
    ...base,
    id: orderId,
    engine: 'antigravity',
    sessionId: SESSION_ID,
    text,
    chars: String(text || '').length,
    status: 'sent',
    sentAt,
    detail: 'Order diterima Antigravity (AGY) Engine untuk produksi video',
  }

  // 1. Lane AGY: file yang dipantau listener.
  const inbox = agyInboxDir()
  fs.mkdirSync(inbox, { recursive: true })
  fs.writeFileSync(path.join(inbox, `${orderId}.json`), JSON.stringify(order, null, 2), 'utf8')

  // 2. Catatan naskah: satu baris per order, terbaru dulu, maksimal 20.
  const ordersFile = agyOrdersFile(directory)
  let list = []
  try {
    if (fs.existsSync(ordersFile)) list = JSON.parse(fs.readFileSync(ordersFile, 'utf8')) || []
  } catch {}
  list.unshift({
    id: orderId,
    rawText: text,
    engine: 'antigravity',
    status: 'assigned_to_agy',
    createdAt: order.createdAt || sentAt,
  })
  fs.mkdirSync(path.dirname(ordersFile), { recursive: true })
  fs.writeFileSync(ordersFile, JSON.stringify(list.slice(0, 20), null, 2), 'utf8')

  return {
    ok: true,
    engine: 'antigravity',
    sessionId: SESSION_ID,
    detail: order.detail,
  }
}
