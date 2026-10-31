#!/usr/bin/env node
/**
 * scripts/fetch-font.mjs
 *
 * Mengunduh font dari Google Fonts / Bunny CDN ke `public/fonts/` dengan Caching Lokal:
 *
 * Logika Caching:
 *   1. Cek apakah font sudah ada di `public/fonts/<font-name>*.woff2`.
 *   2. Jika sudah ada di lokal, langsung gunakan file tersebut (tanpa download ulang).
 *   3. Jika belum ada, cari dan download berkas .woff2 dari internet, simpan ke `public/fonts/`
 *      agar video berikutnya langsung memakai file lokal tersebut.
 *
 * Penggunaan:
 *   node scripts/fetch-font.mjs "Plus Jakarta Sans" [weight]
 *   node scripts/fetch-font.mjs "Montserrat" 700
 */
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
if (args.length === 0 || args[0] === '--help') {
  console.log(`Usage: node scripts/fetch-font.mjs "<FontFamily>" [weight]`)
  process.exit(0)
}

const family = args[0].trim()
const weight = args[1] ? String(args[1]).trim() : '400'
const slug = family.toLowerCase().replace(/[^a-z0-9]+/g, '-')
const targetDir = path.join(process.cwd(), 'public', 'fonts')

function findLocalFont(name, wt) {
  if (!fs.existsSync(targetDir)) return null
  const files = fs.readdirSync(targetDir)
  const pattern = new RegExp(`^${name}(?:-${wt}|-latin|).*\\.woff2$`, 'i')
  const matched = files.find(f => pattern.test(f))
  return matched ? path.join(targetDir, matched) : null
}

async function getFont() {
  const local = findLocalFont(slug, weight)
  if (local) {
    console.log(`[Font Cache Hit] Sudah ada di lokal: ${path.relative(process.cwd(), local)} (tidak download ulang)`)
    return { path: local, cached: true }
  }

  console.log(`[Font] Mengambil metadata font "${family}" (${weight}) dari internet...`)
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)

  try {
    const cssRes = await fetch(cssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: controller.signal,
    })

    if (!cssRes.ok) throw new Error(`HTTP ${cssRes.status}`)
    const cssText = await cssRes.text()

    // Cari URL woff2 di dalam CSS
    const match = cssText.match(/src:\s*url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)\s*format\(['"]woff2['"]\)/i)
    if (!match || !match[1]) {
      throw new Error(`Tidak dapat mengekstrak woff2 URL dari response Google Fonts`)
    }

    const woff2Url = match[1]
    console.log(`[Font] Mengunduh binary: ${woff2Url}`)

    const fontRes = await fetch(woff2Url)
    if (!fontRes.ok) throw new Error(`Gagal download woff2: HTTP ${fontRes.status}`)

    const buffer = Buffer.from(await fontRes.arrayBuffer())
    const outFileName = `${slug}-${weight}.woff2`
    const outPath = path.join(targetDir, outFileName)

    fs.mkdirSync(targetDir, { recursive: true })
    fs.writeFileSync(outPath, buffer)

    console.log(`[Font Saved] Disimpan ke: ${path.relative(process.cwd(), outPath)} (${(buffer.length / 1024).toFixed(1)} KB) untuk penggunaan seterusnya`)
    return { path: outPath, cached: false }
  } catch (err) {
    console.warn(`[Font Warning] Gagal unduh dari Google Fonts (${err.message}). Memeriksa font lokal yang ada...`)
    const fallback = fs.readdirSync(targetDir).find(f => f.endsWith('.woff2'))
    if (fallback) {
      const fbPath = path.join(targetDir, fallback)
      console.log(`[Font Fallback] Menggunakan: ${fallback}`)
      return { path: fbPath, fallback: true }
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

getFont().catch(err => {
  console.error(`[Font Error] ${err.message}`)
  process.exit(1)
})
