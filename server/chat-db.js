/**
 * chat-db.js - SQLite-backed chat history for Agent Office
 * with automatic in-memory fallback for Node versions without precompiled better-sqlite3 bindings.
 *
 * DB location: ~/.agent-office/chat.db (or $AGENT_OFFICE_HOME/chat.db)
 */

import { homedir } from 'os'
import { join } from 'path'
import { mkdirSync, chmodSync, existsSync, readFileSync, writeFileSync } from 'fs'

const RUNTIME_DIR = process.env.AGENT_OFFICE_HOME || join(homedir(), '.agent-office')
try { mkdirSync(RUNTIME_DIR, { recursive: true, mode: 0o700 }) } catch {}
try { chmodSync(RUNTIME_DIR, 0o700) } catch {}

export const MAX_REACTIONS = 20
const DB_PATH = join(RUNTIME_DIR, 'chat.db')
const FALLBACK_FILE = join(RUNTIME_DIR, 'chat-fallback.json')

function loadFallbackMessages() {
  try {
    if (existsSync(FALLBACK_FILE)) {
      const data = JSON.parse(readFileSync(FALLBACK_FILE, 'utf8'))
      if (Array.isArray(data)) return data
    }
  } catch (err) {
    console.error('[chat-db] Failed to read chat-fallback.json:', err.message)
  }
  return []
}

function saveFallbackMessages(msgs) {
  try {
    writeFileSync(FALLBACK_FILE, JSON.stringify(msgs.slice(-1000), null, 2), 'utf8')
  } catch (err) {
    console.error('[chat-db] Failed to save chat-fallback.json:', err.message)
  }
}

let db = null
let useMemoryFallback = false

try {
  const { default: Database } = await import('better-sqlite3')
  const prevUmask = process.platform === 'win32' ? null : process.umask(0o077)
  try {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
  } finally {
    if (prevUmask !== null) process.umask(prevUmask)
  }

  db.exec(
    'CREATE TABLE IF NOT EXISTS messages (' +
    '  id         INTEGER PRIMARY KEY AUTOINCREMENT,' +
    '  sender     TEXT    NOT NULL,' +
    '  role       TEXT    NOT NULL DEFAULT \'default\',' +
    '  text       TEXT    NOT NULL,' +
    '  timestamp  INTEGER NOT NULL,' +
    '  is_system  INTEGER NOT NULL DEFAULT 0,' +
    '  reactions  TEXT    NOT NULL DEFAULT \'[]\',' +
    '  thread_id  INTEGER,' +
    '  seen       INTEGER NOT NULL DEFAULT 0' +
    ')'
  )

  const existingCols = new Set(db.prepare('PRAGMA table_info(messages)').all().map(c => c.name))
  for (const [col, ddl] of [
    ['recipient', 'recipient TEXT'],
    ['msg_type',  'msg_type TEXT'],
    ['read_at',   'read_at INTEGER'],
  ]) {
    if (!existingCols.has(col)) db.exec(`ALTER TABLE messages ADD COLUMN ${ddl}`)
  }
} catch (err) {
  console.warn('[chat-db] SQLite native binding unavailable; activating memory fallback:', err.message)
  useMemoryFallback = true
}

// ---------------------------------------------------------------------------
// Memory Store Fallback (with automatic JSON file persistence)
// ---------------------------------------------------------------------------
let memMessages = loadFallbackMessages()
let memNextId = memMessages.length > 0 ? Math.max(...memMessages.map(m => m.id || 0)) + 1 : 1

// Prepared statements for SQLite
const TRANSCRIPT_FILTER = "(@transcript = 1 OR msg_type IS NULL OR msg_type NOT IN ('prompt', 'reply'))"

let stmtInsert, stmtGetAll, stmtGetSince, stmtGetForRecipient, stmtMarkInboxRead, stmtMarkSeen, stmtGetReactions, stmtSetReactions, stmtGetThread, stmtGetById

if (!useMemoryFallback && db) {
  stmtInsert = db.prepare(
    'INSERT INTO messages (sender, role, text, timestamp, is_system, thread_id, recipient, msg_type) ' +
    'VALUES (@sender, @role, @text, @timestamp, @isSystem, @threadId, @recipient, @msgType)'
  )
  stmtGetAll = db.prepare(
    'SELECT * FROM (SELECT * FROM messages ' +
    `  WHERE ${TRANSCRIPT_FILTER} ` +
    '  ORDER BY timestamp DESC, id DESC LIMIT @limit) ' +
    'ORDER BY timestamp ASC, id ASC'
  )
  stmtGetSince = db.prepare(
    'SELECT * FROM messages ' +
    `WHERE timestamp > @since AND ${TRANSCRIPT_FILTER} ` +
    'ORDER BY timestamp ASC, id ASC ' +
    'LIMIT @limit'
  )
  stmtGetForRecipient = db.prepare(
    'SELECT * FROM (SELECT * FROM messages ' +
    `  WHERE recipient = @recipient COLLATE NOCASE AND timestamp > @since AND ${TRANSCRIPT_FILTER} ` +
    '  ORDER BY timestamp DESC, id DESC LIMIT @limit) ' +
    'ORDER BY timestamp ASC, id ASC'
  )
  stmtMarkInboxRead = db.prepare(
    'UPDATE messages SET read_at = @now ' +
    'WHERE read_at IS NULL AND recipient = @recipient COLLATE NOCASE'
  )
  stmtMarkSeen = db.prepare('UPDATE messages SET seen = 1 WHERE id = @id')
  stmtGetReactions = db.prepare('SELECT reactions FROM messages WHERE id = @id')
  stmtSetReactions = db.prepare('UPDATE messages SET reactions = @reactions WHERE id = @id')
  stmtGetThread = db.prepare('SELECT * FROM messages WHERE thread_id = @threadId ORDER BY timestamp ASC, id ASC')
  stmtGetById = db.prepare('SELECT * FROM messages WHERE id = @id')
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function addMessage({ sender, role = 'default', text, isSystem = false, threadId = null, recipient = null, msgType = null }) {
  const timestamp = Date.now()
  if (useMemoryFallback) {
    const msg = {
      id: memNextId++,
      sender,
      role,
      text,
      timestamp,
      is_system: isSystem ? 1 : 0,
      thread_id: threadId ?? null,
      recipient: recipient ?? null,
      msg_type: msgType ?? null,
      reactions: '[]',
      seen: 0,
      read_at: null,
    }
    memMessages.push(msg)
    if (memMessages.length > 1000) {
      memMessages = memMessages.slice(-1000)
    }
    saveFallbackMessages(memMessages)
    return msg
  }

  const info = stmtInsert.run({
    sender,
    role,
    text,
    timestamp,
    isSystem: isSystem ? 1 : 0,
    threadId: threadId ?? null,
    recipient: recipient ?? null,
    msgType: msgType ?? null,
  })

  // Enforce max 1000 messages (FIFO) in SQLite
  try {
    db.prepare('DELETE FROM messages WHERE id NOT IN (SELECT id FROM messages ORDER BY id DESC LIMIT 1000)').run()
  } catch {}

  return stmtGetById.get({ id: info.lastInsertRowid })
}

export function getMessages({ since = 0, limit = 1000, recipient = null, transcript = false } = {}) {
  if (useMemoryFallback) {
    let list = memMessages.filter(m => {
      if (!transcript && (m.msg_type === 'prompt' || m.msg_type === 'reply')) return false
      if (recipient && (!m.recipient || m.recipient.toLowerCase() !== recipient.toLowerCase())) return false
      if (since && m.timestamp <= since) return false
      return true
    })
    return list.slice(-limit)
  }

  const params = { since, limit, transcript: transcript ? 1 : 0 }
  if (recipient) return stmtGetForRecipient.all({ ...params, recipient })
  if (since) return stmtGetSince.all(params)
  return stmtGetAll.all(params)
}

export function markInboxRead(names) {
  const now = Date.now()
  if (useMemoryFallback) {
    const set = new Set(names.filter(Boolean).map(n => n.toLowerCase()))
    for (const m of memMessages) {
      if (m.recipient && set.has(m.recipient.toLowerCase()) && !m.read_at) {
        m.read_at = now
      }
    }
    return
  }
  const tx = db.transaction(list => {
    for (const recipient of list) stmtMarkInboxRead.run({ recipient, now })
  })
  tx(names.filter(Boolean))
}

export function markSeen(messageId) {
  if (useMemoryFallback) {
    const msg = memMessages.find(m => m.id === messageId)
    if (msg) msg.seen = 1
    return
  }
  stmtMarkSeen.run({ id: messageId })
}

export function addReaction(messageId, emoji) {
  if (useMemoryFallback) {
    const msg = memMessages.find(m => m.id === messageId)
    if (!msg) return []
    let reactions = []
    try { reactions = JSON.parse(msg.reactions) } catch {}
    const idx = reactions.indexOf(emoji)
    if (idx === -1) {
      if (reactions.length >= MAX_REACTIONS) return reactions
      reactions.push(emoji)
    } else {
      reactions.splice(idx, 1)
    }
    msg.reactions = JSON.stringify(reactions)
    saveFallbackMessages(memMessages)
    return reactions
  }

  const row = stmtGetReactions.get({ id: messageId })
  if (!row) return []
  let reactions
  try {
    reactions = JSON.parse(row.reactions)
    if (!Array.isArray(reactions)) reactions = []
  } catch {
    reactions = []
  }
  const idx = reactions.indexOf(emoji)
  if (idx === -1) {
    if (reactions.length >= MAX_REACTIONS) return reactions
    reactions.push(emoji)
  } else {
    reactions.splice(idx, 1)
  }
  stmtSetReactions.run({ id: messageId, reactions: JSON.stringify(reactions) })
  return reactions
}

export function getThread(threadId) {
  if (useMemoryFallback) {
    return memMessages.filter(m => m.thread_id === threadId)
  }
  return stmtGetThread.all({ threadId })
}

export function clearMessages() {
  if (useMemoryFallback) {
    memMessages = []
    saveFallbackMessages(memMessages)
    return true
  }
  try {
    db.exec('DELETE FROM messages')
    return true
  } catch (err) {
    console.error('[chat-db] Failed to clear messages:', err.message)
    return false
  }
}

export function purgeOldMessages(maxAgeMs = 24 * 60 * 60 * 1000) {
  const cutoff = Date.now() - maxAgeMs
  if (useMemoryFallback) {
    const before = memMessages.length
    memMessages = memMessages.filter(m => m.timestamp >= cutoff)
    if (memMessages.length !== before) {
      saveFallbackMessages(memMessages)
    }
    return
  }
  try {
    db.prepare('DELETE FROM messages WHERE timestamp < ?').run(cutoff)
  } catch (err) {
    console.error('[chat-db] Failed to purge old messages:', err.message)
  }
}

export default db || {
  exec: () => {},
  prepare: () => ({ all: () => [], get: () => null, run: () => ({}) }),
  transaction: fn => fn,
}
