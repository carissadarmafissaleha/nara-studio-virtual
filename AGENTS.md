# NARA STUDIO: ATURAN PRODUKSI & STANDAR AGEN (DEEPSEEK)

Studio ini dibangun khusus untuk **DeepSeek**. Mesin produksi utama = sesi DeepSeek yang bekerja di workspace ini; order dari kantor virtual (`office-nara`) sampai lewat `~/.agent-office/engine-inbox/`.

Setiap kali menerima order pembuatan video (`/buat-video`), Agen **DeepSeek (AI Engine)** WAJIB mematuhi standar berikut secara otomatis, tanpa meminta konfirmasi ulang.

---

## 0. Ritual Sesi Baru (WAJIB, sebelum kerja apa pun)

Wake order hanya bekerja kalau listener berjalan sebagai **background job di dalam sesi AI**. Proses yang dijalankan stack npm tidak bisa membangunkan model, jadi setiap sesi baru WAJIB memasangnya sendiri:

1. Cek mesin aktif dan antrean:
   ```bash
   node -e "console.log(require('fs').readFileSync(process.env.USERPROFILE + '/.agent-office/engine.json','utf8'))"
   node scripts/order.mjs list 5
   ```
2. Pasang watcher sesuai `active` di `engine.json` — **sebagai background job**, bukan foreground:
   - mesin `deepseek` → `npm run wake:ds`
   - mesin `antigravity` → `npm run wake:agy`
   - mesin `opencode` → `npm run wake:opencode`
3. Pasang **hanya** watcher lane yang aktif **dan** yang cocok dengan sesi ini. Kalau kamu sesi DeepSeek tetapi `engine.json` berisi `antigravity`, jangan pasang `wake:agy` — pindahkan mesin dulu (`/engine deepseek` di chat) atau biarkan sesi AGY yang memasangnya. Watcher lane yang salah akan mengklaim order dan mengunci mesin yang benar sampai TTL 6 jam.
4. Setelah setiap order selesai dieksekusi (atau gagal), **pasang ulang** watcher untuk order berikutnya.
5. Kalau order berstatus `claimed` tetapi produksi sudah tidak berjalan, lepaskan dengan `node scripts/order.mjs release <id>` sebelum pindah mesin.
6. Footer kantor punya dua lampu: **LISTENER** = daemon stack (bisa menerima order), **WAKE** = watcher sesi (ada mesin yang siap dibangunkan). `WAKE: OFF` berarti order akan menumpuk walau `LISTENER: AKTIF`.

---

## 1. Stack Skill Wajib (Mandatory Skills)

Setiap video yang diproduksi **wajib** menggabungkan keenam komponen berikut.

### 1.1 `bang-motion` · `.agents/skills/bang-motion/`

| Aturan                     | Penjelasan                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| **Hukum Anti-PPT**         | Dilarang membuat slide yang digerakkan (`section fade` / slide deck)                         |
| **Living Background**      | Latar wajib hidup: partikel, gradien yang "bernapas", tekstur bergerak, kamera yang bernapas |
| **Kinetic Typography**     | Teks muncul kata per kata (_staggered spring_), rotasi halus, skala tegas                    |
| **Ritme & Spring Physics** | Setiap elemen masuk dengan _anticipation → overshoot → settle_                               |

### 1.2 `remotion` · `.agents/skills/remotion/`

- Komposisi React **Remotion 4.x** murni di `src/remotion/compositions/<CompName>.tsx`.
- Durasi dan jumlah frame dihitung presisi dari **panjang audio narasi yang sebenarnya**, bukan tebakan.
- Audio narasi disinkronkan per scene dengan `<Sequence>`.
- SFX yang tersedia: `impact`, `whoosh`, `tick`, `riser`, `pop`, `boing`.
- Daftarkan komposisi ke `src/remotion/registry.ts` agar langsung tampil di **Screening Room**.

### 1.3 `ui-ux-pro-max` · `.agents/skills/ui-ux-pro-max/`

| Aspek                | Standar                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| **Font pairing**     | Headline tegas + body berlegibilitas tinggi, harmonis                                                 |
| **Kontras**          | Minimal **4,5:1** (WCAG AA)                                                                           |
| **Palet 60-30-10**   | 60% latar, 30% kontainer/kartu, 10% aksen _punchy_                                                    |
| **Spacing**          | Modular, kelipatan **4px / 8px**                                                                      |
| **Safe area (9:16)** | **180px atas** dan **240px bawah** bebas dari konten penting (UI mobile/player)                       |
| **Komponen**         | Lencana kicker, kartu metrik, diagram HUD, dan teks pendukung dengan visual modern dan presisi tinggi |

### 1.4 Anti-Overlap & Tata Letak 3 Zona (Mandatori)

Teks **tidak boleh** bertumpuk atau menabrak karakter, maskot, diagram, atau badge. Layar dibagi menjadi tiga zona vertikal yang terisolasi:

| Zona       | Tinggi  | Isi                                                                          |
| ---------- | ------- | ---------------------------------------------------------------------------- |
| **Atas**   | **26%** | Badge kicker + judul headline, terpusat, auto-scale                          |
| **Tengah** | **50%** | Panggung visual khusus maskot, karakter, dan diagram animasi. **Bebas teks** |
| **Bawah**  | **24%** | Bar narasi/subtitle + badge CTA pendukung                                    |

> Total tepat 100%. Safe area 180px/240px dihitung sebagai padding **di dalam** zona atas dan bawah.

**Auto-scale tipografi & line-clamp (1080p):**

| Panjang judul | Ukuran font | Aturan lain                          |
| ------------- | ----------- | ------------------------------------ |
| 1–4 kata      | 72–88px     |                                      |
| 5–8 kata      | 52–64px     | maks 2 baris                         |
| > 8 kata      | 42–48px     | maks 2 baris, `line-height` 1,15–1,2 |

**Implementasi:** gunakan flex column terisolasi atau container safe-zone, bukan koordinat absolut acak.

```tsx
<AbsoluteFill
  style={{
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  }}
>
  <div style={{ flex: "0 0 26%", paddingTop: 180 }}>
    {/* kicker + headline */}
  </div>
  <div style={{ flex: "1 1 50%" }}>{/* karakter / diagram */}</div>
  <div style={{ flex: "0 0 24%", paddingBottom: 240 }}>
    {/* subtitle + CTA */}
  </div>
</AbsoluteFill>
```

### 1.5 Karakter Tematik & Alur Cerita (Storytelling Arc)

**Karakter kontekstual & hidup.** Setiap video wajib punya karakter atau maskot yang sesuai tema:

| Tema      | Contoh                      |
| --------- | --------------------------- |
| Perbankan | Maskot koin atau kartun ATM |
| Kuliner   | Koki                        |
| Sains     | Dokter atau sel             |
| Edukasi   | Anak ceria                  |

Rig ekspresi wajib: mata berkedip, reaksi emosional (kaget, senang), dan animasi bernapas/idle.

**Alur 4 babak.** Dilarang membuat video seperti daftar poin kaku.

| Babak                         | Porsi durasi | Isi                                                                   |
| ----------------------------- | ------------ | --------------------------------------------------------------------- |
| **1. Hook & Konflik**         | 0–20%        | Karakter menghadapi rasa penasaran, masalah, atau kebutuhan mendesak  |
| **2. Perjalanan & Tantangan** | 20–60%       | Karakter mengeksplorasi langkah atau fakta penting                    |
| **3. Pencerahan & Solusi**    | 60–85%       | Masalah selesai lewat bukti atau demonstrasi nyata                    |
| **4. Konklusi & CTA**         | 85–100%      | Pesan moral atau tips utama, lalu ajakan aksi penutup yang bersahabat |

### 1.6 Dinamika Nuansa Background Antar-Scene (Mandatori)

- Setiap pergantian scene **wajib** mengubah nuansa latar: pergeseran gradien warna, pencahayaan, arah partikel ambient, atau suasana panggung.
- Tujuannya agar perpindahan babak terasa hidup dan tidak monoton.
- Dilarang memakai satu warna latar statis sepanjang video.

---

## 2. Eksplorasi Referensi & Riset Internet (Diizinkan Penuh)

- **Izin penuh** memakai `search_web` untuk data faktual, statistik industri, jurnal sains, rujukan BMKG/NASA, dan referensi visual terkini, agar konten akurat dan berbobot.
- Wajib membuka dan mengadopsi dokumen referensi di `.agents/skills/*/references/`.
- Klaim medis/sains wajib dilunakkan ("membantu", bukan "menyembuhkan") dan diberi catatan bila perlu.

## 3. Delegasi Sub-Agen, Aset Visual & Audio Generatif (Diizinkan Penuh)

- **Wajib Generate Gambar PNG Pendukung (Minimal 15, Maksimal 30):** Setiap produksi video WAJIB menghasilkan dan menyematkan aset gambar `.png` atau '.svg' pendukung minimal 15 dan maksimal 30 buah (ilustrasi karakter/objek, ikon props tematik, atau tekstur dengan latar transparan/alpha) via sub-agen `image-generator` atau generator visual untuk memperkaya panggung visual.
- **Sub-Agen Voiceover (VO) & Audio Sync:** Diizinkan penuh memanggil sub-agen/modul VO (`audio-sync`, script TTS `scripts/tts-cli.py`) untuk memproduksi rekaman narasi suara per adegan, mengukur panjang durasi audio secara riil, dan menyinkronkannya dengan SFX ke timeline.
- **Aset Vektor & Semantik:** Maskot/karakter berbasis SVG semantik murni, flat cartoon, skematik teknis, blueprint, grafik HUD, kartu data, badge, partikel.
- **Font wajib dimuat sungguhan**: unduh woff2 ke `public/fonts/`, deklarasikan `@font-face` di dalam komposisi, tahan render dengan `delayRender()` sampai `document.fonts.load()` selesai.

---

## 4. Eksekusi Mandiri & Tanpa Konfirmasi

- Order masuk dari kantor (`~/.agent-office/engine-inbox/`) atau dari listener; **langsung kerjakan** dari naskah, audio, sampai komponen Remotion.
- Setelah selesai, laporkan tahap final ke kantor:
  ```bash
  node scripts/publish-draft.mjs final --order <id> --comp <CompName> --title "<Judul>" --scenes <N> --seconds <S>
  ```
- Draf wajib siap diputar di **Screening Room** (`http://localhost:3333/screen`).
- Render MP4 tetap menunggu persetujuan di Papan ToDo; jangan pernah mengklaim render yang belum terjadi.

---

## 5. Kejujuran Laporan

- Hanya laporkan tahap yang benar-benar selesai (`script`, `voiceover`, `sfx`, `mix`, `composition`, `preview`).
- Kalau gagal, pakai `publish-draft.mjs fail --step <tahap> --message "<sebab nyata>"`.
- Jangan menyebut "selesai" untuk pekerjaan yang belum diverifikasi (typecheck + potret frame kunci).

---

## 6. Lokasi Berkas Produksi (WAJIB)

`scripts/` hanya untuk **pipeline bersama** (`order-wake`, `publish-draft`, `order`, `regen-registry`, `tts-cli`, `engines/*`, `studio-bridge`, dll). Jangan menaruh skrip sekali pakai di sana.

Semua berkas yang lahir dari satu order ditulis ke folder order itu:

```
productions/<orderId>/
  storyboard.md        # 镜头表 / rencana scene
  make-<topik>.mjs     # generator VO + komposisi
  assets/              # skrip pembuat PNG bila ada
```

- Folder `productions/` sudah di-ignore git; hasilnya tidak masuk repo.
- Aset runtime tetap ke `public/assets/<topik>/`, audio ke `public/audio/vo/<slug>/` (keduanya juga di-ignore).
- Komposisi akhir tetap ke `src/remotion/compositions/<CompName>.tsx`, dan registry di-generate ulang otomatis.
