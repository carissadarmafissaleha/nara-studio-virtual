# NARA STUDIO: ATURAN PRODUKSI & STANDAR AGEN

Studio ini dibangun khusus untuk **AI Engine**. Mesin produksi utama = sesi Agent yang bekerja di workspace ini; order dari kantor virtual (`office-nara`) sampai lewat `~/.agent-office/engine-inbox/`.

Setiap kali menerima order pembuatan video (`/buat-video`), Agen **AI Engine** WAJIB mematuhi standar berikut secara otomatis, tanpa meminta konfirmasi ulang.

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
   - mesin `hermes` → `npm run wake:hermes`

3. Pasang **hanya** watcher lane yang aktif **dan** yang cocok dengan sesi ini. Kalau kamu sesi DeepSeek tetapi `engine.json` berisi `antigravity`, jangan pasang `wake:agy` — pindahkan mesin dulu (`/engine deepseek` di chat) atau biarkan sesi AGY yang memasangnya. Watcher lane yang salah akan mengklaim order dan mengunci mesin yang benar sampai TTL 6 jam.
4. Setelah setiap order selesai dieksekusi (atau gagal), **pasang ulang** watcher untuk order berikutnya.
5. Kalau order berstatus `claimed` tetapi produksi sudah tidak berjalan, lepaskan dengan `node scripts/order.mjs release <id>` sebelum pindah mesin.
6. Footer kantor punya dua lampu: **LISTENER** = daemon stack (bisa menerima order), **WAKE** = watcher sesi (ada mesin yang siap dibangunkan). `WAKE: OFF` berarti order akan menumpuk walau `LISTENER: AKTIF`.

---

## 1. Stack Skill Wajib (Mandatory Skills)

Setiap video yang diproduksi **wajib** menggabungkan keenam komponen berikut.

### 1.1 `bang-motion` · `.agents/skills/bang-motion/`

| Aturan                               | Penjelasan                                                                                                                                           |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hukum Anti-PPT (Storytelling)**    | **Dilarang keras** membuat slide presentasi, fade statis, atau kartu-kartu poin kaku (bullet cards). Cerita wajib digerakkan aksi karakter hidup.  |
| **Transisi Sinematik Antar-Scene**   | Dilarang hard cut atau slide fade. Wajib kamera bergerak mulus (push/pull/pan/zoom + spring damping) disertai SFX transisi sinkron (whoosh/swoosh). |
| **Living Background**      | Latar wajib hidup: partikel, gradien yang "bernapas", tekstur bergerak, kamera yang bernapas |
| **Kinetic Typography**     | Teks muncul kata per kata (_staggered spring_), rotasi halus, skala tegas                    |
| **Ritme & Spring Physics** | Setiap elemen masuk dengan _anticipation → overshoot → settle_                               |

### 1.2 `remotion` · `.agents/skills/remotion/`

- Komposisi React **Remotion 4.x** murni di `src/remotion/compositions/<CompName>.tsx`.
- Durasi dan jumlah frame dihitung presisi dari **panjang audio narasi yang sebenarnya**, bukan tebakan.
- Audio narasi disinkronkan per scene dengan `<Sequence>`.
- **Eksplorasi Sound FX (SFX) Bebas Tanpa Batasan (Openverse CC0) & Caching**: DILARANG membatasi atau terpaku pada suara itu-itu saja (seperti whoosh/pop melulu). Agen DIBEBASKAN PENUH dan DIDORONG mengeksplorasi ribuan variasi efek suara dari API Openverse:
  `https://api.openverse.org/v1/audio/?q=<QUERY_BEBAS>&license=cc0`
  Bebas cari suara apa pun sesuai imajinasi & konteks cerita (misal foley, instrumen musik, kartun boing/squeak, suara alam, sci-fi hum, digital glitch, ketegangan, sub-bass, cash register, dll. atau pakai skrip `node scripts/fetch-sfx.mjs "<query>"`). Simpan ke `public/audio/sfx/`.
  - **Aturan Caching / Reuse (WAJIB)**: Sebelum mengunduh, agen wajib memeriksa isi folder `public/audio/sfx/`. Jika berkas audio yang dibutuhkan sudah ada di lokal, **wajib gunakan langsung berkas lokal tersebut dan JANGAN download ulang** agar efisien dan cepat.
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

### 1.4 Anti-Overlap, Proporsi Visual & Isolasi Total 3 Zona (MANDATORI)

Dilarang keras tulisan, karakter, dan ornamen saling tumpang tindih (*zero-overlap*) atau memiliki ukuran yang tidak proporsional (*anti-disproporsi*).

#### A. Hukum Isolasi Total 3 Zona Vertikal
Layar kanvas 9:16 (1080 x 1920) dibagi secara kaku menjadi tiga zona terisolasi:

| Zona | Rentang Y | Tinggi | Aturan Keramat & Isi Konten |
| :--- | :--- | :--- | :--- |
| **Zona Atas (Top Text Zone)** | **0 – 460px** | **460px** | **DILARANG KERAS** menaruh elemen ornamen apa pun (jendela, jam, pohon, matahari, awan, bintang, rak buku, dsb) di zona ini! Zona ini **KHUSUS TEKS** (Kicker badge + Headline 1–2 baris terpusat). Padding top safe area: **160px**. Latar hanya boleh gradien bersih. |
| **Zona Tengah (Mid Visual Stage)** | **460 – 1500px** | **1040px** | **PANGGUNG VISUAL EKSKLUSIF** untuk karakter/maskot, perabot panggung, dan ornamen pemandangan (*environment scenery*). **DILARANG** menaruh teks narasi/paragraf panjang di panggung ini agar visual bersih dan berjiwa. |
| **Zona Bawah (Bottom Text Zone)** | **1500 – 1920px** | **420px** | **KHUSUS SUBTITLE NARRATION CARD**. Dilarang karakter atau props panggung menabrak masuk ke bawah Y = 1500px. Padding bottom safe area: **200px**. Subtitle berupa kartu pill semi-transparan yang elegan dan kontras. |

#### B. Standar Proporsi Skala & Komposisi Panggung Tengah (Anti-Disproporsional)
Setiap adegan di dalam panggung tengah (Zona 2) wajib mematuhi proporsi ukuran visual yang harmonis:

1. **Skala Karakter Utama**: Tinggi karakter **280px – 340px** (sekitar 30–35% dari tinggi panggung tengah). Karakter tidak boleh terlalu raksasa hingga mendominasi layar atau terlalu kerdil hingga kehilangan ekspresi.
2. **Tata Letak Perabot Lantai (Anchor Props)**: Meja belajar, kitchen stove, panggung, atau rumput diletakkan di **bagian bawah panggung tengah (Y: 1100 – 1450px)** sebagai lantai pijakan alami tempat karakter berdiri/duduk.
3. **Tata Letak Ornamen Dinding & Langit (Background Scenery)**: Jendela kelas (maksimal 250px), jam dinding (maksimal 110px), rak buku (maksimal 260px), atau matahari kartun (maksimal 180px) diletakkan di **bagian atas panggung tengah (Y: 480 – 750px)** dan **TIDAK BOLEH** melintasi batas atas Y = 460px.
4. **Komposisi Berdampingan (Side-by-Side Props & Karakter)**: Jika karakter berdampingan dengan badge atau piala (misal Scene 8), beri jarak aman (*gap*) minimal **30px – 40px** dan atur total lebar keduanya tidak melebihi 600px agar terpusat proporsional di kanvas 1080px.
5. **Fitur Kandungan / Poin Nutrisi**: DILARANG memaksakan 3 kartu berjajar horisontal secara sempit jika teksnya panjang karena menyebabkan teks berdesakan. **WAJIB gunakan Vertical Feature Rows** (baris fitur bertingkat) yang lega, lapang, dan nyaman dibaca.

#### C. Aturan Khusus Badge, Stiker & Ikon Grafis (WAJIB)
- Diameter atau lebar teks di dalam badge/stiker **maksimal 60–65%** dari diameter wadah bagian dalam.
- Sisakan minimal **20% safe padding** di sekeliling teks agar ketika badge berputar (`spin`/`rotate`) atau terkena efek spring pop-in, teks tidak pernah memotong garis tepi lingkaran/border.
- Dilarang menumpuk font besar di dalam lingkaran sempit tanpa menguji rotasinya.

#### D. Auto-Scale Tipografi Headline (1080p)

| Panjang judul | Ukuran font | Aturan lain |
| :--- | :--- | :--- |
| 1–4 kata | 64–72px | max-width 880px |
| 5–8 kata | 48–56px | maks 2 baris, line-height 1.2 |
| > 8 kata | 40–46px | maks 2 baris, line-height 1.15 |

```tsx
// Arsitektur Container 3 Zona Bersih (Zero-Overlap)
<AbsoluteFill style={{ display: "flex", flexDirection: "column" }}>
  {/* Zona 1: Top Text Zone (460px) - STRICTLY TEXT ONLY */}
  <div style={{ width: "100%", height: 460, paddingTop: 160, display: "flex", flexDirection: "column", alignItems: "center" }}>
    <div style={{ /* Kicker badge */ }}>{kicker}</div>
    <h1 style={{ fontSize: 52, maxWidth: 920 }}>{headline}</h1>
  </div>

  {/* Zona 2: Mid Visual Stage (1040px) - CHARACTERS & SCENERY ONLY */}
  <div style={{ width: "100%", height: 1040, position: "relative", overflow: "hidden" }}>
    {/* Background Scenery (Y: 480-750) */}
    {/* Karakter Utama (Y: 700-1100) */}
    {/* Anchor Props / Lantai (Y: 1100-1450) */}
  </div>

  {/* Zona 3: Bottom Text Zone (420px) - SUBTITLE PILL ONLY */}
  <div style={{ width: "100%", height: 420, paddingBottom: 200, display: "flex", justifyContent: "center" }}>
    <div style={{ /* Subtitle Card */ }}>{subtitle}</div>
  </div>
</AbsoluteFill>
```

### 1.5 Karakter Tematik & Alur Cerita (Storytelling Arc Minimal 8 Scene)

**Karakter kontekstual & hidup.** Setiap video wajib punya karakter atau maskot yang sesuai tema:

| Tema      | Contoh                      |
| --------- | --------------------------- |
| Perbankan | Maskot koin atau kartun ATM |
| Kuliner   | Koki                        |
| Sains     | Dokter atau sel             |
| Edukasi   | Anak ceria                  |

Rig ekspresi wajib: mata berkedip, reaksi emosional (kaget, senang, bingung, bersemangat), dan animasi bernapas/idle.

**Wajib Storytelling & Struktur Minimal 8 Scene (MANDATORI):**
Dilarang keras membuat video pendek dangkal atau daftar poin kaku/slide presentasi. Setiap video **wajib memiliki minimal 8 scene** dengan alur narasi dramatis yang utuh:

| Scene | Nama Babak | Durasi Relatif | Isi & Aksi Karakter |
| ----- | ---------- | -------------- | ------------------- |
| **1** | **Hook Menggelegar** | ~10% | Pertanyaan provokatif, misteri, atau kejadian mengejutkan dalam 3 detik pertama yang langsung mencengkeram atensi penonton. |
| **2** | **Problem & Konflik Nyata** | ~12% | Karakter utama menghadapi rintangan, rasa lelah, kebingungan, kegagalan, atau dilema mendesak. |
| **3** | **Eksplorasi / Kesalahan Umum** | ~12% | Karakter mencari jawaban, membongkar mitos, atau mencoba trik yang salah sebelum menemukan jalan yang benar. |
| **4** | **Kedatangan Solusi (The Turning Point)** | ~14% | Kemunculan solusi pahlawan (bahan utama, metode kunci, produk) dengan entrance spektakuler (aura, spring pop, SFX impact). |
| **5** | **Bedah Mekanisme Solusi (Why it Works)** | ~14% | Visualisasi cara kerja solusi secara ilmiah/logis (misal nutrisi diserap tubuh, sistem digital bekerja, reaksi kimia positif). |
| **6** | **Aksi & Transformasi Karakter** | ~14% | Karakter mengonsumsi/menerapkan solusi dan mengalami transformasi dramatis (energi meluap, visual glowing, percaya diri kembali). |
| **7** | **Bukti Nyata & Hasil Sukses** | ~12% | Demonstrasi hasil nyata: produktivitas naik, tubuh bugar, prestasi diraih, panggung selebrasi sukacita. |
| **8** | **Konklusi, Golden Rule & Call to Action (CTA)** | ~12% | Pesan takeaway 1 kalimat tegas, badge aturan emas (misal: "1 Butir Sehari"), serta ajakan interaksi penonton yang bersahabat. |

### 1.6 Environment Scenery & Background Berkomponen (Anti-Background Kosong)

**Dilarang Keras Latar Belakang Kosong/Polos.** Latar video tidak boleh hanya gradien datar atau warna polos tanpa dunia cerita (*no empty void*). Setiap adegan wajib memiliki tata letak panggung lingkungan (*world-building scenery*) yang kaya komponen kontekstual:

| Tipe Setting | Komponen Wajib Hadir di Latar | Efek & Ambience |
| ------------ | ----------------------------- | --------------- |
| **Outdoor (Taman, Alam, Luar Ruang)** | Pohon rindang berayun lembut, semak-semak, rumput bergoyang, awan melayang di langit, matahari/sinar cahaya (*sun rays*), jalan setapak, siluet gedung kota di cakrawala. | Partikel daun jatuh, hembusan angin, kilau cahaya matahari. |
| **Indoor (Rumah, Kamar Tidur, Ruang Tamu)** | Jendela dengan pemandangan luar, meja & kursi, lampu ruangan yang berpijar, rak buku / bingkai foto dinding, karpet, jam dinding, pot tanaman hias hijau. | Pencahayaan hangat/sejuk, bayangan lembut perabot. |
| **Indoor (Kantor, Ruang Kerja, Studio)** | Meja kerja, monitor komputer, papan tulis/diagram kerja, lampu meja, kursi ergonomis, tanaman sudut, partisi ruangan. | Glitch lembut layar, pencahayaan kantor profesional. |
| **Area Spesifik (Dapur / Restoran)** | Kitchen set, kompor berasap tipis, wajan/panci, kulkas, rak bumbu dapur, gantungan spatula, meja makan. | Efek uap panas mengepul, aroma visual. |
| **Area Spesifik (Laboratorium / Medis)** | Meja riset kimia, rak tabung reaksi berwarna, mikroskop, layar hologram HUD/monitor detak, papan tulis formula. | Gelembung tabung bereaksi, glow neon HUD. |

**Prinsip 3 Layer Kedalaman (Parallax Depth):**
1. **Background Layer**: Dinding, pemandangan luar jendela, langit, pohon cakrawala (bergerak lambat / bernapas lembut).
2. **Midground Layer**: Karakter utama, meja kerja/tanah tempat berdiri, props interaktif (fokus tajam, pencahayaan utama).
3. **Foreground Layer (Ambient Props)**: Daun di pinggir layar, partikel debu cahaya (bokeh), kilatan sinar, atau perabot tepi yang memberi rasa dimensi 3D.

---

## 2. Eksplorasi Referensi & Riset Internet (Diizinkan Penuh)

- **Izin penuh** memakai `search_web` untuk data faktual, statistik industri, jurnal sains, rujukan BMKG/NASA, dan referensi visual terkini, agar konten akurat dan berbobot.
- Wajib membuka dan mengadopsi dokumen referensi di `.agents/skills/*/references/`.
- Klaim medis/sains wajib dilunakkan ("membantu", bukan "menyembuhkan") dan diberi catatan bila perlu.

## 3. Delegasi Sub-Agen, Aset Visual & Audio Generatif (Diizinkan Penuh)

- **Wajib Generate Gambar PNG Pendukung (Minimal 15, Maksimal 30):** Setiap produksi video WAJIB menghasilkan dan menyematkan aset gambar `.png` atau '.svg' pendukung minimal 15 dan maksimal 30 buah (ilustrasi karakter/objek, ikon props tematik, atau tekstur dengan latar transparan/alpha) via sub-agen `image-generator` atau generator visual untuk memperkaya panggung visual.
- **Sub-Agen Voiceover (VO) & Audio Sync:** Diizinkan penuh memanggil sub-agen/modul VO (`audio-sync`, script TTS `scripts/tts-cli.py`) untuk memproduksi rekaman narasi suara per adegan, mengukur panjang durasi audio secara riil, dan menyinkronkannya dengan SFX ke timeline.
- **Aset Vektor & Semantik:** Maskot/karakter berbasis SVG semantik murni, flat cartoon, skematik teknis, blueprint, grafik HUD, kartu data, badge, partikel.
- **Eksplorasi Sound FX Bebas (Openverse API CC0) & Caching**: Hapus segala batasan jenis suara. Agen bebas mencari dan memadukan efek suara apa pun dari Openverse CC0 API (`https://api.openverse.org/v1/audio/?q=<SOUND>&license=cc0` atau `node scripts/fetch-sfx.mjs "<query>"`) untuk menghidupkan suasana video. Simpan ke `public/audio/sfx/`, dan gunakan cache lokal bila sudah ada.
- **Eksplorasi Font Bebas (Internet & Caching Lokal)**: DILARANG membatasi diri pada font bawaan lokal atau 1–2 font itu-itu saja (seperti Baloo 2 atau Comic Neue). Agen DIBEBASKAN PENUH mengeksplorasi ribuan font internet (Google Fonts / Bunny CDN atau via `node scripts/fetch-font.mjs "<FontFamily>" [weight]`) yang paling pas dengan DNA & genre video (misal: `Space Grotesk`, `Plus Jakarta Sans`, `Syne`, `Bebas Neue`, `Cinzel`, `Fredoka`, `Outfit`, `DynaPuff`, `Fraunces`, dll.). Simpan ke `public/fonts/`. Periksa folder `public/fonts/` terlebih dahulu: bila font yang dicari sudah ada, langsung gunakan tanpa download ulang; bila belum, baru unduh. Deklarasikan `@font-face` di komposisi dan tahan render dengan `delayRender()` sampai `document.fonts.load()` selesai.

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
