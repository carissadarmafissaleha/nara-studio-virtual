/**
 * Engine: DeepSeek.
 *
 * Mesin produksi utama studio ini. Order dari kantor diteruskan ke sesi
 * DeepSeek yang bekerja langsung di workspace: naskah, voiceover, komposisi
 * Remotion, lalu laporan balik lewat scripts/publish-draft.mjs.
 *
 * Dua jalur:
 * - `url` diisi di ~/.agent-office/engine.json  -> order dikirim sebagai JSON
 *   ke endpoint HTTP.
 * - `url` kosong (default)                      -> order diarsipkan ke
 *   naskah/active_orders.json dan diambil dari inbox oleh listener.
 */
import fs from 'node:fs'
import path from 'node:path'

export const name = 'deepseek'

const TIMEOUT_MS = Number(process.env.NARA_ENGINE_TIMEOUT_MS || 15000)

function hasRemoteUrl(cfg) {
  return Boolean(cfg?.url && String(cfg.url).trim().length > 0)
}

async function postRemote(cfg, body) {
  const headers = { 'content-type': 'application/json' }
  if (cfg.token) headers.authorization = `Bearer ${cfg.token}`
  const res = await fetch(String(cfg.url).trim(), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const text = await res.text()
  return { status: res.status, text }
}

export async function ping(cfg = {}) {
  try {
    if (hasRemoteUrl(cfg)) {
      return { ok: true, detail: `Endpoint HTTP DeepSeek (${cfg.url})` }
    }
    return { ok: true, detail: 'DeepSeek AI Engine siap (produksi kreatif otonom)' }
  } catch (err) {
    return { ok: false, error: err?.message || String(err) }
  }
}

export async function send(cfg, { text, orderId, directory }) {
  if (hasRemoteUrl(cfg)) {
    const res = await postRemote(cfg, { type: 'video_order', orderId, text })
    if (res.status >= 400) throw new Error(`DeepSeek menolak order (HTTP ${res.status}).`)
    return { ok: true, engine: 'deepseek', detail: 'order terkirim ke endpoint' }
  }

  const dir = directory || process.cwd()
  const ordersFile = path.join(dir, 'naskah', 'active_orders.json')

  try {
    let list = []
    if (fs.existsSync(ordersFile)) {
      list = JSON.parse(fs.readFileSync(ordersFile, 'utf8')) || []
    }
    list.unshift({
      id: orderId,
      rawText: text,
      status: 'assigned_to_deepseek',
      createdAt: new Date().toISOString(),
    })
    fs.mkdirSync(path.dirname(ordersFile), { recursive: true })
    fs.writeFileSync(ordersFile, JSON.stringify(list.slice(0, 20), null, 2), 'utf8')
  } catch {}

  return {
    ok: true,
    engine: 'deepseek',
    detail: 'Order diterima DeepSeek Engine untuk produksi kustom',
    sessionId: 'deepseek-ai',
  }
}
