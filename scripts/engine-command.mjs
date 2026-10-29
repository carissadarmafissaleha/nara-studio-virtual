/**
 * `/buat-video` — the office's courier command.
 *
 * This module owns everything that must be true *before* an order reaches a
 * production engine:
 *
 *   - The command is matched strictly (plus a typo catcher), so a misspelled
 *     command never starts a job silently.
 *   - The payload is treated as data: it is never re-parsed as an office
 *     command, never interpolated into a path, and never passed through a
 *     shell.
 *   - Long, empty, or control-character payloads are refused instead of being
 *     truncated or mangled.
 *   - Every accepted order is archived under ~/.agent-office/engine-inbox/ so
 *     a dead engine cannot lose it.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'

import { sendToEngine, loadEngineConfig, pingEngine, engineConfigPath, resolveEngineKey } from './engines/index.mjs'

export const COMMAND = '/buat-video'
export const MAX_PROMPT_CHARS = 8000
export const RATE_LIMIT = { max: 10, windowMs: 60_000 }

const ALIASES = new Set(['buatvideo', 'video', 'bikinvideo', 'buatvideoai'])
const CANONICAL = 'buatvideo'

const OFFICE_HOME = process.env.AGENT_OFFICE_HOME || path.join(os.homedir(), '.agent-office')
const INBOX_DIR = path.join(OFFICE_HOME, 'engine-inbox')

/** Sliding-window timestamps of accepted orders, newest last. */
const accepted = []
/** payload hash -> timestamp, so a double Enter cannot start two pipelines. */
const recentPayloads = new Map()
let inFlight = null

export function resetGuards() {
  accepted.length = 0
  recentPayloads.clear()
  inFlight = null
}

function normalize(token) {
  return String(token || '').toLowerCase().replace(/[-_]/g, '')
}

function levenshtein(a, b) {
  if (a === b) return 0
  const m = a.length
  const n = b.length
  if (!m) return n
  if (!n) return m
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    const row = [i]
    for (let j = 1; j <= n; j++) {
      row[j] = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
    prev = row
  }
  return prev[n]
}

/** Strip the exact command token; keep everything after it verbatim. */
function payloadAfter(trimmed, token) {
  return trimmed.slice(token.length).replace(/^\s+/, '')
}

const VIDEO_INTENT = /\b(buatkan|bikin|buat|bikinin)\s+(video|konten\s+video|motion|explainer|animasi|iklan)\b/i

/**
 * @returns {{kind:'none'|'send'|'empty'|'typo'|'suggest'|'too_long'|'invalid',
 *   payload?:string, suggestion?:string, reason?:string}}
 */
export function parseEngineCommand(raw) {
  const text = String(raw ?? '')
  const trimmed = text.replace(/^\s+/, '')
  if (!trimmed) return { kind: 'none' }

  if (!trimmed.startsWith('/')) {
    // Natural language is never auto-run: offer the command instead.
    if (VIDEO_INTENT.test(trimmed) || /\bexplainer\b/i.test(trimmed)) {
      return { kind: 'suggest', payload: trimmed }
    }
    return { kind: 'none' }
  }

  const token = trimmed.split(/\s/)[0]
  const word = normalize(token.slice(1))
  const isAlias = ALIASES.has(word) || word === CANONICAL

  if (!isAlias) {
    const close = word.length >= 5 && levenshtein(word, CANONICAL) <= 2
    if (close || word.startsWith('buatvid') || word === 'buat') {
      const payload = payloadAfter(trimmed, token)
      return {
        kind: 'typo',
        payload,
        suggestion: payload ? `${COMMAND} ${payload}` : COMMAND,
      }
    }
    return { kind: 'none' }
  }

  const payload = payloadAfter(trimmed, token)
  if (!payload.trim()) return { kind: 'empty' }
  if (payload.length > MAX_PROMPT_CHARS) {
    return { kind: 'too_long', payload, reason: `${payload.length} karakter (maks ${MAX_PROMPT_CHARS})` }
  }
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(payload)) {
    return { kind: 'invalid', payload, reason: 'mengandung karakter kontrol' }
  }
  return { kind: 'send', payload }
}

function writeOrder(order) {
  try {
    fs.mkdirSync(INBOX_DIR, { recursive: true })
    const file = path.join(INBOX_DIR, `${order.id}.json`)
    fs.writeFileSync(file, JSON.stringify(order, null, 2), 'utf8')
    return file
  } catch {
    return null
  }
}

function hashPayload(text) {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16)
}

/**
 * Send one order. Returns a structured result so the caller can speak honestly
 * (accepted / duplicate / too fast / busy / engine failure).
 */
export async function dispatchEngineOrder({ text, sender = 'Caca', directory = process.cwd() }) {
  const parsed = parseEngineCommand(text)
  if (parsed.kind !== 'send') return { ok: false, kind: parsed.kind, parsed }

  const payload = parsed.payload
  const now = Date.now()

  while (accepted.length && now - accepted[0] > RATE_LIMIT.windowMs) accepted.shift()
  if (accepted.length >= RATE_LIMIT.max) {
    return { ok: false, kind: 'rate_limited', parsed, retryInMs: RATE_LIMIT.windowMs - (now - accepted[0]) }
  }

  const hash = hashPayload(payload)
  const seenAt = recentPayloads.get(hash)
  if (seenAt && now - seenAt < RATE_LIMIT.windowMs) {
    return { ok: false, kind: 'duplicate', parsed }
  }

  if (inFlight) {
    return { ok: false, kind: 'busy', parsed, inFlight }
  }

  const conf = loadEngineConfig()
  const order = {
    id: `ord-${now}-${crypto.randomBytes(3).toString('hex')}`,
    engine: conf.active,
    sender,
    text: payload,
    chars: payload.length,
    status: 'pending',
    createdAt: new Date(now).toISOString(),
  }

  accepted.push(now)
  recentPayloads.set(hash, now)
  inFlight = order.id
  writeOrder(order)

  try {
    const result = await sendToEngine({ text: payload, orderId: order.id, directory })
    writeOrder({ ...order, status: 'sent', sentAt: new Date().toISOString(), engine: result.engine, sessionId: result.sessionId, detail: result.detail })
    return { ok: true, kind: 'sent', parsed, order: { ...order, status: 'sent' }, result }
  } catch (err) {
    const message = err?.message || String(err)
    writeOrder({ ...order, status: 'failed', failedAt: new Date().toISOString(), error: message })
    return { ok: false, kind: 'engine_error', parsed, order, error: message }
  } finally {
    inFlight = null
  }
}

/* ------------------------------------------------------------------ */
/* `/engine` — inspect and switch the production machine from chat      */
/* ------------------------------------------------------------------ */

export function describeEngine() {
  const conf = loadEngineConfig()
  const names = Object.keys(conf.targets)
  return { active: conf.active, available: names, configPath: engineConfigPath() }
}

export async function switchEngine(name) {
  const conf = loadEngineConfig()
  const wanted = resolveEngineKey(name)
  if (!wanted || !conf.targets[wanted]) {
    const options = Object.keys(conf.targets).filter((key) => key !== 'none').join(', ')
    return { ok: false, error: `Mesin "${String(name || '').trim()}" tidak dikenal. Pilihan: ${options}.` }
  }
  try {
    fs.mkdirSync(path.dirname(engineConfigPath()), { recursive: true })
    const onDisk = fs.existsSync(engineConfigPath())
      ? JSON.parse(fs.readFileSync(engineConfigPath(), 'utf8'))
      : {}
    onDisk.active = wanted
    onDisk.targets = { ...(onDisk.targets || {}) }
    fs.writeFileSync(engineConfigPath(), JSON.stringify(onDisk, null, 2), 'utf8')
  } catch (err) {
    return { ok: false, error: `Gagal menyimpan config: ${err?.message || err}` }
  }
  const status = await pingEngine()
  return { ok: true, active: wanted, status }
}

export function listOrders(limit = 5) {
  try {
    if (!fs.existsSync(INBOX_DIR)) return []
    return fs.readdirSync(INBOX_DIR)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .slice(-limit)
      .reverse()
      .map((f) => {
        try { return JSON.parse(fs.readFileSync(path.join(INBOX_DIR, f), 'utf8')) } catch { return null }
      })
      .filter(Boolean)
  } catch {
    return []
  }
}
