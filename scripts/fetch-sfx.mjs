#!/usr/bin/env node
/**
 * scripts/fetch-sfx.mjs
 *
 * Mengambil Sound Effects (SFX) berlisensi CC0 dari Openverse API dengan Caching Lokal:
 *   https://api.openverse.org/v1/audio/?q=<SOUND>&license=cc0
 *
 * Logika Caching:
 *   1. Cek apakah file sudah ada di `public/audio/sfx/<nama>.<ext>`.
 *   2. Jika sudah ada, langsung gunakan file lokal (tanpa download ulang).
 *   3. Jika belum ada, unduh dari Openverse API dan simpan ke `public/audio/sfx/`
 *      agar video berikutnya bisa langsung memakai file tersebut.
 */
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
if (args.length === 0 || args[0] === '--help') {
  console.log(`Usage: node scripts/fetch-sfx.mjs "<query>" [outputPath]`)
  process.exit(0)
}

const query = args[0].trim().toLowerCase()
const cleanName = query.replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
const defaultDir = path.join(process.cwd(), 'public', 'audio', 'sfx')

// Cek apakah file sudah ada di public/audio/sfx/ (mp3, wav, ogg)
function findLocalSfx(name) {
  const exts = ['.mp3', '.wav', '.ogg']
  for (const ext of exts) {
    const candidate = path.join(defaultDir, `${name}${ext}`)
    if (fs.existsSync(candidate) && fs.statSync(candidate).size > 1000) {
      return candidate
    }
  }
  return null
}

async function getSfx() {
  const localMatch = findLocalSfx(cleanName)
  if (localMatch) {
    console.log(`[SFX Cache Hit] Sudah ada di lokal: ${path.relative(process.cwd(), localMatch)} (tidak download ulang)`)
    return { path: localMatch, cached: true }
  }

  // Jika belum ada di lokal, download dari Openverse
  const url = `https://api.openverse.org/v1/audio/?q=${encodeURIComponent(query)}&license=cc0&page_size=5`
  console.log(`[SFX] Mencari "${query}" di Openverse CC0 API...`)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)

  let results = []
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (res.ok) {
      const data = await res.json()
      results = data.results || []
    }
  } catch (err) {
    console.warn(`[SFX Warning] Gagal query Openverse (${err.message})`)
  } finally {
    clearTimeout(timeout)
  }

  const item = results.find(r => r.url && (r.url.endsWith('.mp3') || r.url.endsWith('.wav') || r.url.endsWith('.ogg'))) || results[0]
  if (!item || !item.url) {
    console.warn(`[SFX] Tidak ditemukan SFX di Openverse untuk "${query}", memeriksa fallback...`)
    // Coba fallback ke file default yang ada (impact, whoosh, tick, riser)
    const fallback = findLocalSfx('whoosh') || findLocalSfx('impact')
    if (fallback) return { path: fallback, fallback: true }
    throw new Error(`Tidak ditemukan SFX untuk "${query}"`)
  }

  console.log(`[SFX] Mengunduh: "${item.title}" dari ${item.url}`)
  const dlController = new AbortController()
  const dlTimeout = setTimeout(() => dlController.abort(), 15000)

  try {
    const audioRes = await fetch(item.url, { signal: dlController.signal })
    if (!audioRes.ok) throw new Error(`HTTP ${audioRes.status}`)
    const arrayBuffer = await audioRes.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const ext = item.filetype ? `.${item.filetype}` : (path.extname(new URL(item.url).pathname) || '.mp3')
    const finalOut = args[1] || path.join(defaultDir, `${cleanName}${ext}`)

    fs.mkdirSync(path.dirname(finalOut), { recursive: true })
    fs.writeFileSync(finalOut, buffer)
    console.log(`[SFX Saved] Disimpan ke: ${path.relative(process.cwd(), finalOut)} (${(buffer.length / 1024).toFixed(1)} KB) untuk penggunaan seterusnya`)
    return { path: finalOut, cached: false, title: item.title }
  } finally {
    clearTimeout(dlTimeout)
  }
}

getSfx().catch(err => {
  console.error(`[SFX Error] ${err.message}`)
  process.exit(1)
})
