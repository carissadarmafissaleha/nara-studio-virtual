# Kontrak Desain Video — pakai `ui-ux-pro-max` di alur `/buat-video`

Berlaku untuk setiap order `/buat-video` yang menghasilkan komposisi Remotion.
Tujuan: keputusan visual (gaya, palet, font, ritme) diambil dari data, bukan selera mendadak, **tanpa** melanggar hukum motion di `bang-motion`.

## 1. Kapan skill ini dipakai

| Tahap | Pakai `ui-ux-pro-max`? | Alasan |
| :--- | :--- | :--- |
| Sebelum menulis komposisi | **Ya** — ambil gaya, palet, pasangan font, preset motion | Ini keputusan visual |
| Menyusun staging/adegan | Tidak | Itu wilayah sutradara/standar produksi (storyboard, komposisi per adegan) |
| Menyinkronkan VO/SFX | Tidak | Wilayah `audio-sync` |
| Audit hasil MP4 | Tidak | Wilayah `render-qa` |

## 2. Perintah yang dipakai

Jalankan dari root proyek (butuh Python 3 stdlib saja):

```bash
.venv/Scripts/python.exe .agents/skills/ui-ux-pro-max/scripts/search.py \
  "<tema> <audiens> <kata sifat>" --design-system --variance 4 --motion 8 --density 3 -f markdown
```

- `--motion` tinggi (7–9) karena video selalu bergerak.
- `--density` rendah (2–3) karena frame 1080×1920 butuh ruang, bukan kepadatan dashboard.
- Domain tambahan saat perlu: `--domain typography`, `--domain color`, `--domain gsap`, `--domain chart`.

## 3. Yang boleh dipakai, yang tidak

**Dipakai:**

- Keluarga gaya (mis. Claymorphism: sudut 16–24 px, border tebal, bayangan ganda).
- Pasangan font heading + body, plus URL Google Fonts-nya.
- Peran warna (primary / accent / background / foreground / muted) — dipetakan ke 3–5 warna video.
- Token motion (durasi, easing, staggered) sebagai pembanding ritme spring Remotion.
- Tipe chart bila video memuat data.

**Tidak dipakai:**

- Aturan layout responsif, touch target 44×44, navigasi, form, safe-area — itu untuk layar, bukan frame.
- Pola konversi (CTA sticky, social proof, feature grid) — itu kerangka landing page.
- Checklist pre-delivery UI di `references/pro-rules.md`.

## 4. Konflik yang sudah diputuskan

Skill ini rutin menawarkan palet indigo/ungu (`#4F46E5`, `#818CF8`). Standar studio **melarang** latar biru-ungu dan gradien neon sebagai *AI slop*.

**Aturan:** palet dari `ui-ux-pro-max` dipakai untuk **peran** (primary, accent, background, ink), lalu nilai hex-nya diganti ke palet tema yang lolos hukum motion. Contoh nyata: order "Manfaat Telur Omega" — skill menyarankan indigo + oranye; yang dipakai krem `#fff8ec`, kuning telur `#f0b429`, mint `#58b98a`, koral `#e8635a`, ink `#2b2140`.

Kalau dua skill bertabrakan, yang menang selalu skill motion; skill ini hanya menyumbang struktur keputusan.

## 5. Font: wajib benar-benar dimuat

Kesalahan yang pernah terjadi: komposisi menulis `'Baloo 2'` padahal tidak ada yang memuatnya, sehingga teks jatuh ke font sistem tanpa ketahuan.

Aturan:

1. Unduh woff2 ke `public/fonts/` (JANGAN andalkan CDN saat render).
2. Deklarasikan `@font-face` di dalam komposisi, bukan di `index.html`.
3. Bungkus dengan `delayRender()` + `document.fonts.load()` + `continueRender()`, plus timeout 3 detik sebagai jaring pengaman.

Baseline anak/edukasi: **heading Baloo 2, body Comic Neue**.

## 6. Status penerapan

| Order | Komposisi | Status |
| :--- | :--- | :--- |
| `ord-1793155237659-afca59` | [`ManfaatTelurOmega.tsx`](../src/remotion/compositions/ManfaatTelurOmega.tsx) | font lokal + claymorphism diterapkan |
| `ord-1793108852975-7fc477` | [`ManfaatManggaKids.tsx`](../src/remotion/compositions/ManfaatManggaKids.tsx) | belum — masih font sistem |
