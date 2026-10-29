#!/usr/bin/env node
/**
 * scripts/regen-registry.mjs — tulis ulang src/remotion/registry.ts dari file
 * komposisi yang ada di disk.
 *
 * Registry sengaja TIDAK di-commit: semua hasil order /buat-video (komposisi,
 * aset, audio, naskah) tidak masuk git. Tanpa registry, Remotion CLI dan build
 * tidak tahu komposisi mana yang ada — jadi file ini dibuat ulang setiap:
 *   - server kantor start (dev:office-*),
 *   - `npm run build`,
 *   - `npm run remotion:render`,
 *   - `npm run dev` (lewat predev).
 *
 * Kalau belum ada komposisi sama sekali, registry tetap ditulis dengan daftar
 * kosong supaya `import { compositions }` tidak gagal.
 */
import { regenerateRegistry } from './studio-compose.mjs'

try {
  const comps = regenerateRegistry()
  console.log(`[registry] ${comps.length} komposisi terdaftar${comps.length ? `: ${comps.map((c) => c.compName).join(', ')}` : ' (kosong)'}`)
} catch (err) {
  // Jangan gagalkan server hanya karena registry: Root.tsx punya fallback kosong.
  console.error('[registry] gagal menulis registry:', err?.message || err)
  process.exitCode = 0
}
