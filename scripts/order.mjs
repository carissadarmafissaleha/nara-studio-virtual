#!/usr/bin/env node
/**
 * Order book — the courier leaves every accepted order on disk, and the
 * production engine claims it from here.
 *
 * Why a claim step instead of putting the id inside the prompt: the boss's text
 * has to reach the engine byte-for-byte, so the order id can never be glued
 * onto it. The engine asks for "the next unclaimed order" instead.
 *
 * Usage
 *   node scripts/order.mjs claim           # oldest order nobody has taken yet
 *   node scripts/order.mjs latest          # newest order, claimed or not
 *   node scripts/order.mjs list [count]    # recent orders with their status
 *   node scripts/order.mjs show <orderId>  # one order, including its raw text
 *
 * Output is JSON on stdout, so a caller can read it with JSON.parse.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const OFFICE_HOME = process.env.AGENT_OFFICE_HOME || path.join(os.homedir(), '.agent-office')
const INBOX_DIR = path.join(OFFICE_HOME, 'engine-inbox')
const CLAIM_DIR = path.join(INBOX_DIR, '.claimed')

/** A claim older than this is treated as abandoned (engine crashed midway). */
const CLAIM_TTL_MS = Number(process.env.NARA_CLAIM_TTL_MS || 6 * 60 * 60 * 1000)

function readOrders() {
  if (!fs.existsSync(INBOX_DIR)) return []
  return fs
    .readdirSync(INBOX_DIR)
    .filter((file) => file.endsWith('.json') && !file.startsWith('.'))
    .sort()
    .map((file) => {
      try {
        const order = JSON.parse(fs.readFileSync(path.join(INBOX_DIR, file), 'utf8'))
        return order && order.id ? { ...order, file: path.join(INBOX_DIR, file) } : null
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

function claimPath(id) {
  return path.join(CLAIM_DIR, `${id}.json`)
}

function isClaimed(order) {
  const file = claimPath(order.id)
  if (!fs.existsSync(file)) return false
  try {
    const claim = JSON.parse(fs.readFileSync(file, 'utf8'))
    const at = Number(claim?.claimedAt) || 0
    return Date.now() - at < CLAIM_TTL_MS
  } catch {
    return false
  }
}

/** `wx` makes the write fail if another process already claimed this order. */
function claimOrder(order, note) {
  fs.mkdirSync(CLAIM_DIR, { recursive: true })
  const stamp = { orderId: order.id, claimedAt: Date.now(), by: note }
  try {
    fs.writeFileSync(claimPath(order.id), JSON.stringify(stamp, null, 2), { encoding: 'utf8', flag: 'wx' })
    return true
  } catch {
    return false
  }
}

function publicView(order) {
  return {
    id: order.id,
    text: order.text,
    chars: order.chars ?? String(order.text || '').length,
    engine: order.engine,
    sender: order.sender,
    status: order.status,
    createdAt: order.createdAt,
  }
}

function claim(id) {
  const terminal = new Set(['done', 'failed', 'cancelled'])
  const terminalOf = (order) => terminal.has(String(order?.status || ''))
  const all = readOrders()

  // Klaim order tertentu (id disebutkan) — dipakai saat sesi dibangunkan listener.
  if (id) {
    const target = all.find((order) => order.id === id)
    if (!target) return { ok: false, id, reason: `Order ${id} tidak ada.` }
    if (terminalOf(target)) return { ok: false, id, reason: `Order ${id} sudah ${target.status}.` }
    if (isClaimed(target)) return { ok: false, id, reason: `Order ${id} sedang diklaim proses lain.` }
    return claimOrder(target, process.env.NARA_ORDER_CLAIMER || 'engine')
      ? { ok: true, ...publicView(target) }
      : { ok: false, id, reason: 'Gagal menulis klaim (sudah diambil proses lain).' }
  }

  const pending = all.filter((order) => !isClaimed(order) && !terminalOf(order))
  for (const order of pending) {
    if (claimOrder(order, process.env.NARA_ORDER_CLAIMER || 'engine')) {
      return { ok: true, ...publicView(order) }
    }
  }
  return { ok: false, id: null, reason: pending.length ? 'Semua order sudah diambil.' : 'Tidak ada order yang menunggu.' }
}

function latest() {
  const orders = readOrders()
  return orders.length ? { ok: true, ...publicView(orders[orders.length - 1]) } : { ok: false, id: null }
}

function show(id) {
  const order = readOrders().find((o) => o.id === id)
  return order ? { ok: true, ...publicView(order) } : { ok: false, id: null, reason: `Order ${id} tidak ada.` }
}

function list(count) {
  const orders = readOrders().slice(-Math.max(1, count)).reverse()
  return {
    ok: true,
    orders: orders.map((o) => {
      const claimFile = claimPath(o.id)
      let claim = null
      try {
        if (fs.existsSync(claimFile)) claim = JSON.parse(fs.readFileSync(claimFile, 'utf8'))
      } catch {}
      const ageMs = claim ? Date.now() - (Number(claim.claimedAt) || 0) : 0
      const terminal = ['done', 'failed', 'cancelled'].includes(String(o.status || ''))
      return {
        id: o.id,
        // Status akhir (done/failed) lebih informatif daripada "claimed" yang
        // hanya menyisa dari proses yang sudah selesai.
        status: terminal ? o.status : isClaimed(o) ? 'claimed' : o.status,
        claimedBy: claim?.by || null,
        claimAgeSec: claim ? Math.round(ageMs / 1000) : null,
        chars: o.chars ?? String(o.text || '').length,
        engine: o.engine,
        createdAt: o.createdAt,
        preview: String(o.text || '').split('\n')[0].slice(0, 80),
      }
    }),
  }
}

/**
 * Serah-terima antar mesin: lepaskan klaim dan kembalikan order ke `sent`,
 * supaya mesin berikutnya bisa langsung mengambilnya tanpa menunggu TTL.
 */
function release(id) {
  if (!id) return { ok: false, id: null, reason: 'Sebutkan id order: node scripts/order.mjs release <orderId>' }
  const order = readOrders().find((o) => o.id === id)
  if (!order) return { ok: false, id, reason: `Order ${id} tidak ada.` }

  const claimFile = claimPath(id)
  let claim = null
  try {
    if (fs.existsSync(claimFile)) claim = JSON.parse(fs.readFileSync(claimFile, 'utf8'))
    if (fs.existsSync(claimFile)) fs.rmSync(claimFile, { force: true })
  } catch (err) {
    return { ok: false, id, reason: `Gagal melepas klaim: ${err?.message || err}` }
  }

  // Status di kedua salinan (arsip engine-inbox dan lane agy-inbox).
  const home = process.env.AGENT_OFFICE_HOME || path.join(os.homedir(), '.agent-office')
  for (const dir of [INBOX_DIR, path.join(home, 'agy-inbox')]) {
    const file = path.join(dir, `${id}.json`)
    try {
      if (!fs.existsSync(file)) continue
      const current = JSON.parse(fs.readFileSync(file, 'utf8'))
      fs.writeFileSync(file, JSON.stringify({
        ...current,
        status: 'sent',
        releasedAt: new Date().toISOString(),
        releasedFrom: claim?.by || null,
      }, null, 2), 'utf8')
    } catch {}
  }

  return {
    ok: true,
    id,
    released: !!claim,
    releasedFrom: claim?.by || null,
    status: 'sent',
    note: claim ? `Klaim ${claim.by || '?'} dilepas; order bisa diambil mesin lain.` : 'Order tidak sedang diklaim; status dikembalikan ke sent.',
  }
}

const [command = 'claim', argument] = process.argv.slice(2)

try {
  let result
  if (command === 'claim') result = claim(String(argument || ''))
  else if (command === 'release') result = release(String(argument || ''))
  else if (command === 'latest') result = latest()
  else if (command === 'show') result = show(String(argument || ''))
  else if (command === 'list') result = list(Number(argument) || 10)
  else {
    console.error('Usage: node scripts/order.mjs <claim|release <orderId>|latest|list [n]|show <orderId>>')
    process.exit(2)
  }
  console.log(JSON.stringify(result, null, 2))
} catch (err) {
  console.log(JSON.stringify({ ok: false, id: null, reason: String(err?.message || err) }))
  process.exit(1)
}
