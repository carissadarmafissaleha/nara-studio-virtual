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

Setiap video yang diproduksi WAJIB menggabungkan 4 pilar skill utama:

1. **`bang-motion` (`.agents/skills/bang-motion/`)**
   - **Hukum Anti-PPT:** dilarang membuat slide yang digerakkan (`section fade` / `slide deck`).
   - **Living Background:** latar wajib hidup (partikel, gradien bernapas, tekstur bergerak, kamera bernapas).
   - **Kinetic Typography:** teks muncul kata per kata (_staggered spring_), rotasi halus, skala tegas.
   - **Ritme & Spring Physics:** setiap elemen masuk dengan _anticipation, overshoot, settle_.
2. **`remotion` (`.agents/skills/remotion/`)**
   - Komposisi React Remotion 4.x murni di `src/remotion/compositions/<CompName>.tsx`.
   - Durasi dan frame terukur presisi dari panjang audio narasi riil, bukan tebakan.
   - Audio narasi disinkronkan per scene dengan `<Sequence>`, didukung SFX (`impact`, `whoosh`, `tick`, `riser`, `pop`, `boing`).
   - Didaftarkan ke `src/remotion/registry.ts` agar langsung tampil di **Screening Room**.
3. **`ui-ux-pro-max` (`.agents/skills/ui-ux-pro-max/`)**
   - **Tipografi & Font Pairing:** Pasangan font harmonis (Headline tegas + Body berlegibilitas tinggi), rasio kontras visual minimal 4.5:1 (WCAG AA).
   - **Palet Warna & Reasoning:** Gunakan aturan proporsi warna 60-30-10 (60% background/latar, 30% kontainer/kartu, 10% aksen _punchy_).
   - **Spacing Modular & Safe Areas:** Spacing berbasis kelipatan 4px/8px, safe-zone vertikal 180px atas & 240px bawah pada 9:16 untuk bebas gangguan UI mobile/player.
   - **Desain Kartu & Komponen:** Desain lencana kicker, kartu metrik, diagram HUD, dan teks pendukung dengan visual modern dan presisi tinggi.
4. **Hukum Anti-Overlap & Tata Letak 3-Zona (Mandatori)**
   - **Dilarang keras teks menabrak aset visual:** Elemen teks tidak boleh bertumpuk atau overlap dengan karakter, maskot, diagram, atau badge.
   - **Sistem 3-Zona Vertikal:**
     - **Zona Atas (Top 26-28%):** Badge kicker & Judul headline terpusat dengan Auto-Scale font.
     - **Zona Tengah (Middle 46-50%):** Panggung visual khusus maskot/karakter/diagram animasi (bebas gangguan teks).
     - **Zona Bawah (Bottom 22-26%):** Bar narasi/subtitle & badge CTA pendukung.
   - **Auto-Scale Tipografi & Line-Clamp:**
     - Judul 1–4 kata: font size normal (72–88px di 1080p).
     - Judul 5–8 kata: font size otomatis turun (52–64px).
     - Judul > 8 kata: font size turun (42–48px), line-height 1.15–1.2, batasi maksimal 2 baris.
   - **Gunakan Flexbox Stack Terisolasi:** Utamakan tata letak flex column (`display: 'flex', flexDirection: 'column', justifyContent: 'space-between'`) atau container safe-zone dibanding koordinat absolute acak.
5. **Karakter Tematik & Alur Cerita Terstruktur (Storytelling Arc)**
   - **Karakter Kontekstual & Hidup:** Setiap video WAJIB menampilkan karakter/maskot yang sesuai dengan tema (misal: maskot koin/kartun ATM untuk perbankan, koki untuk kuliner, dokter/sel untuk sains, anak ceria untuk edukasi). Karakter harus memiliki rig ekspresi (mata berkedip, reaksi emosional kaget/senang, animasi bernapas/idle).
   - **Struktur Alur Cerita 4 Babak:** Dilarang membuat video seperti daftar poin kaku. Naskah wajib memiliki alur cerita:
     1. _Hook & Konflik (0–20% durasi):_ Karakter menghadapi rasa penasaran, masalah, atau kebutuhan mendesak.
     2. _Perjalanan & Tantangan (20–60% durasi):_ Karakter mengeksplorasi langkah atau fakta penting.
     3. _Pencerahan & Solusi (60–85% durasi):_ Masalah terselesaikan dengan bukti atau demonstrasi nyata.
     4. _Konklusi & CTA (85–100% durasi):_ Pesan moral/tips utama dan ajakan aksi penutup yang bersahabat.
6. **Dinamika Nuansa Background Antar-Scene (Mandatori)**
   - **Wajib Ganti Nuansa Tiap Scene:** Setiap pergantian scene WAJIB mengubah nuansa visual latar belakang (pergeseran gradien warna, pencahayaan/lighting, arah partikel ambient, suasana panggung) agar perpindahan babak terasa hidup dan tidak monoton. Dilarang memakai satu warna background statis sepanjang video.

---

## 2. Eksplorasi Referensi & Riset Internet (Diizinkan Penuh)

- **Izin Penuh Cari Data di Internet:** Bebas menggunakan `search_web` untuk mencari data faktual, statistik industri, jurnal sains, rujukan BMKG/NASA, dan referensi visual terkini agar konten akurat dan berbobot.
- Boleh membuka dan mengadopsi dokumen referensi di `.agents/skills/*/references/`.
- Klaim medis/sains wajib dilunakkan ("membantu", bukan "menyembuhkan") dan diberi catatan bila perlu.

---

## 3. Delegasi Sub-Agen, Aset Visual & Audio Generatif (Diizinkan Penuh)

- **Wajib Generate Gambar PNG Pendukung (Minimal 8, Maksimal 20):** Setiap produksi video WAJIB menghasilkan dan menyematkan aset gambar `.png` atau '.svg' pendukung minimal 8 dan maksimal 20 buah (ilustrasi karakter/objek, ikon props tematik, atau tekstur dengan latar transparan/alpha) via sub-agen `image-generator` atau generator visual untuk memperkaya panggung visual.
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
