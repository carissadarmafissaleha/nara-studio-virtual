#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const HOME = process.env.AGENT_OFFICE_HOME || path.join(os.homedir(), '.agent-office')
const INBOX = path.join(HOME, 'hermes-inbox')
const WORKSPACE = path.resolve(process.cwd())
const WAKE_HB = path.join(HOME, 'wake-heartbeat-hermes.json')
const POLL_MS = Number(process.env.NARA_ORDER_POLL_MS || 2000)
const processed = new Set()

function touchWake(active = true) {
  try { fs.writeFileSync(WAKE_HB, JSON.stringify({ active, engine: 'hermes', mode: 'runner', pid: process.pid, timestamp: Date.now() }), 'utf8') } catch {}
}

async function runOrder(order) {
  const topic = String(order.text || '').trim()
  if (!topic) return
  console.log('[hermes-runner] processing', order.id, topic)
  const { stdout } = await exec('node', ['scripts/studio-compose.mjs', '--topic', topic], { cwd: WORKSPACE, maxBuffer: 10 * 1024 * 1024 })
  let info
  try { info = JSON.parse(stdout.trim()) } catch { info = null }
  if (!info?.compName) throw new Error('studio-compose failed')
  const comp = info.compName
  const scenes = Array.isArray(info?.audio?.timings) ? info.audio.timings.length : 8
  const seconds = Number(info?.seconds || 60)
  await exec('node', ['scripts/publish-draft.mjs', 'final', '--order', order.id, '--comp', comp, '--title', topic, '--scenes', String(scenes), '--seconds', String(seconds)], { cwd: WORKSPACE })
  console.log('[hermes-runner] done', order.id, comp)
}

async function loop() {
  touchWake(true)
  let files = []
  try { files = fs.readdirSync(INBOX).filter(f => f.endsWith('.json') && !f.startsWith('.')) } catch {}
  for (const f of files) {
    const id = f.replace(/\.json$/, '')
    if (processed.has(id)) continue
    let order
    try { order = JSON.parse(fs.readFileSync(path.join(INBOX, f), 'utf8')) } catch { continue }
    if (!order?.id || String(order.engine || '').toLowerCase() !== 'hermes') continue
    if (['done', 'failed', 'cancelled'].includes(String(order.status || ''))) { processed.add(id); continue }
    processed.add(id)
    try { await runOrder(order) } catch (e) { console.error('[hermes-runner] error', order.id, e?.message || e) }
  }
  setTimeout(loop, POLL_MS)
}

process.on('exit', () => touchWake(false))
process.on('SIGINT', () => process.exit(0))
console.log('[hermes-runner] memantau', INBOX)
loop()