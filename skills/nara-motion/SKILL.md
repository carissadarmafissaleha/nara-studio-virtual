---
name: nara-html-motion
description: >-
  Panduan dan instruksi pembuatan file animasi HTML5/Canvas/WebGL yang 100% kompatibel dengan render engine NARA 4K Motion Studio. Gunakan skill ini setiap kali membuat animasi HTML mandiri, kinetic typography, HUD sci-fi, particle simulation, visualisasi data, opener/promo/intro/bumper, explainer, atau template video komersial microstock untuk NARA. Sudah menggabungkan hukum kreatif   (anti-PPT, gaya lahir dari tema, teks hidup, latar bergerak) di atas aturan teknis NARA.
---

# NARA HTML Motion Animation Skill

Skill ini memandu pembuatan file animasi HTML5 standalone yang sepenuhnya kompatibel dengan **NARA 4K Motion Studio Engine** (aplikasi render desktop 4K ProRes 4444 Alpha & MP4 berbasis Electron, Headless Chromium, dan FFmpeg).

Animasi yang dihasilkan harus siap dirender offline secara deterministik (_zero temp files_, frame-by-frame lockstep) tanpa lag, tanpa patahan loop, dan langsung terbaca metadata komersialnya oleh Adobe Stock & Shutterstock.

---

## 0. Alur Kerja Wajib (Sebelum Menulis Kode)

### A. Jangan Membaca File yang Sudah Ada

- DILARANG membaca, membuka, me-list, atau meniru isi file/folder animasi yang sudah ada (mis. `.html`, aset, atau output di folder tujuan/workspace) sebagai referensi.
- Jangan menjalankan `list_dir`, `view_file`, `grep_search`, atau perintah sejenis pada folder animasi existing untuk "mencari inspirasi" atau "mengecek gaya yang sudah ada".
- Setiap animasi dibuat **dari nol** hanya berdasarkan skill ini dan jawaban brief dari user. Pengecualian: user secara eksplisit menyebut file tertentu untuk diedit/dijadikan acuan.
- **Selalu buat file BARU** dengan nama sesuai permintaan (request) user, mis. user minta "logo reveal" → `logo_reveal.html`. Jika user menyebut nama file, pakai persis nama itu (ekstensi `.html`).
- Jika user tidak menyebut nama, tanyakan (lihat pertanyaan nama file) atau turunkan dari konsep request dalam format `snake_case`. Jangan pernah menimpa/mengedit file existing; jika nama sudah dipakai, tambahkan akhiran `_v2`, `_v3`, dst. tanpa membaca file tersebut (cukup cek dengan nama saat menulis; `write_to_file` tanpa Overwrite akan gagal bila sudah ada).

### B. Ajukan Pertanyaan Brief Dulu (Wajib Sebelum Eksekusi)

Sebelum menulis kode, WAJIB bertanya kepada user (gunakan tool `ask_question` bila tersedia, dengan pilihan jawaban, atau daftar pertanyaan bernomor). Jangan menulis kode sebelum user menjawab. Lewati hanya pertanyaan yang sudah dijawab jelas oleh user di prompt.

Pertanyaan minimal:

1. **Konsep/Tema & Tujuan**: Apa yang dibuat (HUD, kinetic typography, logo reveal, background loop, infografis, partikel, dll) dan untuk apa (microstock, intro, overlay, wallpaper)?
2. **Teks/Konten**: Teks/judul/angka/data apa yang ditampilkan (jika ada)? Bahasa?
3. **Style Visual**: Cyberpunk neon, minimalis, glassmorphism, flat/corporate, retro, organik, dll?
4. **Palet Warna**: Warna dominan/aksen, atau serahkan ke saya? Background gelap, terang, atau transparan (alpha)?
5. **Font**: Sans-serif modern, monospace/tech, serif, bold display, atau font lokal tertentu (`@font-face` di `assets/fonts/`)? Mendukung Google Fonts saat online dengan fallback font lokal/sistem berkarakter.
6. **Kombinasi Library CDN Hybrid & Gaya Animasi**: Pakai semua library Hybrid CDN (`GSAP 3 + Three.js 3D WebGL + PixiJS + Anime.js + Canvas-Confetti` dengan fallback lokal `vendor/`) atau kombinasi tertentu? Tempo lambat/sedang/cepat?
7. **Ukuran/Resolusi**: 3840x2160 (16:9), 1920x1080, 1080x1920 (vertikal), atau 1080x1080 (kotak)?
8. **Durasi, FPS & Loop**: Seamless loop atau one-shot dengan hold? Durasi (3/5/10 detik), FPS (30/60), dan `hold_last_frames`?
9. **Transparansi/Alpha**: Perlu background transparan (ProRes 4444 Alpha)?
10. **Folder Aset Lokal & Audio**: Apakah membuat folder khusus beserta aset lokal (`assets/logo.svg`, `assets/badge.svg`, `assets/theme-vars.css`, `assets/telemetry-data.js`) dan/atau ada file audio se-nama yang ingin di-mux?
11. **Metadata Microstock**: Judul, deskripsi, keywords, dan kategori — tulis otomatis atau ada preferensi?
12. **Nama File Output**: Nama folder & file `.html` baru yang diinginkan (default: sesuai nama request, `snake_case`). File selalu dibuat baru, bukan menimpa.

### C. Konfirmasi Singkat

Setelah jawaban diterima, tulis **style brief** singkat (lihat Bagian 6, Hukum B2) bersama rundown adegan `detik | adegan | kalimat | visual`, lalu ringkas spesifikasi teknis (ukuran, durasi/loop, fps). Untuk opener/promo/explainer, minta persetujuan rundown sebelum menulis kode. Untuk loop/background sederhana, cukup ringkasan 3-5 baris lalu langsung eksekusi. Jika jawaban ambigu, tanyakan ulang hanya bagian yang kurang.

---

## 1. Aturan Wajib (Golden Rules)

1. **Hybrid Online CDN, Offline Local Fallback & Lockstep Frame-Sync**:
   - **Mode Online**: Saat perangkat terhubung ke internet, animasi bebas menggunakan CDN online resmi (`cdnjs`, `jsdelivr`, `unpkg`, atau Google Fonts). NARA otomatis mem-cache aset yang diunduh ke `generated_animations/.cdn_cache/` untuk persiapan rendering offline.
   - **Mode Offline**: Saat koneksi internet terputus atau rendering dijalankan secara *air-gapped*, Render Engine NARA mencegat (*intercept*) pemanggilan CDN dan menyajikan pustaka vendor internal (`src/assets/vendor/`) dengan latensi 0 ms tanpa error/timeout.
   - **Pola Dual-Fallback Wajib (Semua 5 Library Vendor Bawaan)**:
     Gunakan tag `<script>` dengan atribut `onerror` agar animasi berjalan lancar saat Online, saat Offline di dalam NARA, maupun saat dibuka mandiri:
     ```html
     <!-- Hybrid Online CDN dengan Automatic Offline Vendor Fallback -->
     <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" onerror="this.onerror=null;this.src='vendor/gsap.min.js';"></script>
     <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" onerror="this.onerror=null;this.src='vendor/three.min.js';"></script>
     <script src="https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.3.2/pixi.min.js" onerror="this.onerror=null;this.src='vendor/pixi.min.js';"></script>
     <script src="https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.2/anime.min.js" onerror="this.onerror=null;this.src='vendor/anime.min.js';"></script>
     <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js" onerror="this.onerror=null;this.src='vendor/canvas-confetti.min.js';"></script>
     ```
   - **Wajib Lockstep Sync Pustaka Eksternal ke `frameIndex`**:
     Jangan pernah membiarkan GSAP, Anime.js, Three.js, atau PixiJS berjalan dengan timer bebas! Kunci semuanya ke waktu deterministik `t = frameIndex / FPS`:
     - **GSAP 3**: Buat timeline dalam keadaan paused `const masterGsapTl = window.gsap ? gsap.timeline({ paused: true }) : null;` dan di dalam `renderFrame(frameIndex)` panggil `if (masterGsapTl) masterGsapTl.time(frameIndex / FPS);`.
     - **Anime.js**: Buat timeline `autoplay: false`, lalu di dalam `renderFrame(frameIndex)` panggil `if (masterAnimeTl) masterAnimeTl.seek((frameIndex / FPS) * 1000);`.
     - **Three.js (3D WebGL) & PixiJS (2D WebGL)**: Update rotasi/posisi mesh/sprite berdasarkan `t` atau `loopAngle` di dalam `renderFrame(frameIndex)`, panggil `threeRenderer.render(threeScene, threeCamera)` / `pixiApp.render()`, lalu kompositkan kanvasnya ke kanvas 4K utama dengan `ctx.drawImage(...)`.

   - **Integrasi Folder Aset Lokal (`assets/`) & Preloader**:
     - NARA memindai folder yang sama dengan file HTML hingga kedalaman 2 subfolder (`assets/`, `images/`, `fonts/`, `css/`, `js/`) lewat `detectFolderAssets()` dan menunggu seluruh `document.images` serta `document.fonts.ready` sebelum merender Frame 0.
     - Preload seluruh gambar/vektor lokal (`assets/logo.svg`, `assets/chip_core.svg`, `assets/badge_verified.svg`, `.png`, `.webp`) di dalam kontainer DOM tersembunyi `<div id="nara-local-assets" style="display:none">` dan gambar ke kanvas menggunakan fungsi aman disertai fallback prosedural:
       ```javascript
       function drawLocalImageOrFallback(imgId, cx, cy, w, h, fallbackDrawFn) {
         const img = document.getElementById(imgId);
         if (img && img.complete && img.naturalWidth > 0) {
           ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
         } else if (typeof fallbackDrawFn === 'function') {
           fallbackDrawFn(cx, cy, w, h);
         }
       }
       ```
     - Sertakan stylesheet lokal (`<link rel="stylesheet" href="assets/theme-vars.css" />`) dan modul data JS lokal (`<script src="assets/telemetry-data.js"></script>`) bila membuat paket folder animasi lengkap.

2. **Wajib Memiliki Header Metadata JSON (Line 1)**:
   - Harus dimulai tepat di baris pertama file dengan blok komentar:
     ```html
     <!--METADATA
     {
       "title": "Judul Komersial Video",
       "description": "Deskripsi profesional untuk microstock",
       "keywords": ["tag1", "tag2", "4k", "motion graphics", "loop", "prores"],
       "category": "Motion Graphics & Backgrounds",
       "fps": 60,
       "total_frames": 180,
       "loop": true,
       "width": 3840,
       "height": 2160,
       "hold_last_frames": 0
     }
     METADATA-->
     ```
   - Metadata ini otomatis diekstrak NARA untuk konfigurasi render, embedding tag video in-file, dan ekspor `metadata_export.csv`.

3. **Deterministic Virtual Clock (Mekanisme Render Frame-by-Frame)**:
   - Mesin render Puppeteer NARA mengunci waktu dan memanggil fungsi render per frame:
     ```javascript
     window.__renderTick = function (frameIndex, targetFps) {
       renderFrame(frameIndex);
     };
     ```
   - Animasi **TIDAK BOLEH** bergantung pada `performance.now()`, `Date.now()`, atau `setInterval()` untuk posisi visualnya. Seluruh state visual harus merupakan fungsi murni dari `frameIndex`.

4. **Matematika Deterministic (No Random Stutter)**:
   - DILARANG memanggil `Math.random()` di dalam loop `renderFrame()`. Jika dipanggil setiap frame, partikel akan bergetar acak dan gagal dirender konsisten.
   - Hasilkan partikel/posisi acak pada array saat inisialisasi di luar fungsi render, atau gunakan PRNG seeded:
     ```javascript
     function seededRandom(seed) {
       const x = Math.sin(seed) * 10000;
       return x - Math.floor(x);
     }
     ```

5. **Seamless Looping vs One-Shot Hold**:
   - **Seamless Loop** (`loop: true`):
     - Putaran trigonometri penuh: `const progress = (frameIndex % TOTAL_FRAMES) / TOTAL_FRAMES;`
     - Sudut rotasi / siklus: `const loopAngle = progress * Math.PI * 2;`
     - Gunakan `Math.sin(loopAngle)` dan `Math.cos(loopAngle)` agar frame terakhir menyatu sempurna kembali ke frame 0 tanpa jeda/patahan.
   - **One-Shot dengan Hold** (`loop: false`):
     - Gerakan terjadi dari frame `0` sampai `(TOTAL_FRAMES - HOLD_FRAMES)`.
     - Pose frame terakhir ditahan statis selama sisa frame `hold_last_frames` (misal 60 frame = 1 detik jeda untuk logo reveal / badge explainer).

6. **Canvas Stage 4K & Auto-Fit Scaling**:
   - Resolusi kanvas master: `3840` x `2160` (atau `1920x1080`, `1080x1920`, `1080x1080`).
   - Gunakan wrapper `#stage-container` dengan CSS `transform: translate(-50%, -50%) scale(...)` agar kanvas pas di jendela preview tanpa terdistorsi.

7. **Dukungan Alpha Channel (Transparansi ProRes 4444)**:
   - Untuk aset overlay (misal partikel, hud, lower-thirds):
     - Berikan `background: transparent;` pada CSS `body` dan `#stage-container`.
     - Bersihkan frame menggunakan `ctx.clearRect(0, 0, WIDTH, HEIGHT)` (bukan `ctx.fillRect()` warna solid).
     - NARA otomatis merender transparansi murni pada preset **MOV ProRes 4444 Alpha**.

---

## 2. Template Boilerplate Standar NARA

Gunakan struktur berikut sebagai fondasi setiap animasi HTML baru:

```html
<!--METADATA
{
  "title": "Quantum Cyberpunk Grid 4K Loop",
  "description": "Futuristic cyberpunk holographic energy grid with pulsing telemetry data and floating particle vortex.",
  "keywords": ["cyberpunk", "grid", "hologram", "hud", "quantum", "futuristic", "4k", "loop", "motion graphics", "technology"],
  "category": "Motion Graphics & Backgrounds",
  "fps": 60,
  "total_frames": 180,
  "loop": true,
  "width": 3840,
  "height": 2160,
  "hold_last_frames": 0
}
METADATA-->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Quantum Cyberpunk Grid 4K Loop</title>
    <style>
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      body {
        background: #04060e; /* Atau 'transparent' untuk alpha overlay */
        overflow: hidden;
        width: 100vw;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      #stage-container {
        width: 3840px;
        height: 2160px;
        position: absolute;
        top: 50%;
        left: 50%;
        transform-origin: center center;
      }
      canvas {
        display: block;
        width: 3840px;
        height: 2160px;
      }
    </style>
  </head>
  <body>
    <div id="stage-container">
      <canvas id="stage" width="3840" height="2160"></canvas>
    </div>

    <script>
      const canvas = document.getElementById("stage");
      const ctx = canvas.getContext("2d");
      const WIDTH = 3840;
      const HEIGHT = 2160;
      const TOTAL_FRAMES = 180;
      const IS_TRANSPARENT = false; // Set true jika template overlay

      // --- 1. INISIALISASI DATA DETERMINISTIK ---
      const PARTICLE_COUNT = 120;
      const particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          baseX: (i / PARTICLE_COUNT) * WIDTH,
          baseY: HEIGHT * 0.5 + Math.sin(i * 1.5) * 400,
          radius: 4 + (i % 6) * 3,
          phase: (i / PARTICLE_COUNT) * Math.PI * 2,
          speed: 1 + (i % 3) * 0.5,
          color: i % 2 === 0 ? "#00FFCC" : "#7928CA",
        });
      }

      // --- 2. LOGIKA RENDER FRAME UTAMA ---
      function renderFrame(frameIndex) {
        const progress = (frameIndex % TOTAL_FRAMES) / TOTAL_FRAMES;
        const loopAngle = progress * Math.PI * 2;

        // Bersihkan kanvas
        if (IS_TRANSPARENT) {
          ctx.clearRect(0, 0, WIDTH, HEIGHT);
        } else {
          ctx.fillStyle = "#04060E";
          ctx.fillRect(0, 0, WIDTH, HEIGHT);
        }

        // Render Visual Animasi
        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        particles.forEach((p, idx) => {
          const currentAngle = loopAngle * p.speed + p.phase;
          const x = p.baseX + Math.cos(currentAngle) * 80;
          const y = p.baseY + Math.sin(currentAngle) * 120;

          ctx.shadowBlur = 25;
          ctx.shadowColor = p.color;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(x, y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.restore();
      }

      // --- 3. NARA RENDER HOOK (MANDATORY) ---
      window.__renderTick = function (frameIndex, targetFps) {
        renderFrame(frameIndex);
      };

      // --- 4. PREVIEW LOOP DALAM BROWSER STANDAR ---
      let previewFrame = 0;
      function animLoop() {
        if (!window.__isNaraHeadless && !window.__IS_HEADLESS_RENDERER__) {
          renderFrame(previewFrame);
          previewFrame = (previewFrame + 1) % TOTAL_FRAMES;
          requestAnimationFrame(animLoop);
        }
      }

      // --- 5. AUTO-FIT SCALING KE VIEWPORT ---
      function autoFitStage() {
        const container = document.getElementById("stage-container");
        if (!container) return;
        const scale = Math.min(
          window.innerWidth / WIDTH,
          window.innerHeight / HEIGHT,
        );
        container.style.transform = `translate(-50%, -50%) scale(${scale})`;
      }

      window.addEventListener("resize", autoFitStage);
      window.addEventListener("DOMContentLoaded", () => {
        autoFitStage();
        requestAnimationFrame(animLoop);
      });
      autoFitStage();
    </script>
  </body>
</html>
```

---

## 3. Standar Durasi & Frame NARA

| Kebutuhan Video                                  | Durasi Rekomendasi                | FPS | Total Frames | Hold Frames | Formula Loop                 |
| :----------------------------------------------- | :-------------------------------- | :-- | :----------- | :---------- | :--------------------------- |
| **Fast Loop (HUD, Partikel, Icon)**              | 3.0 detik                         | 60  | 180          | 0           | `loopAngle = (f / 180) * 2π` |
| **Golden Microstock Loop (3D, Waves, Abstract)** | 5.0 detik                         | 60  | 300          | 0           | `loopAngle = (f / 300) * 2π` |
| **Ambient LED Screen / Wallpaper**               | 10.0 detik                        | 60  | 600          | 0           | `loopAngle = (f / 600) * 2π` |
| **Logo Reveal / Intro (One-Shot)**               | 3.0 detik (2s aksi + 1s hold)     | 60  | 180          | 60          | `t = min(1, f / 120)`        |
| **Infografis & Chart Race (One-Shot)**           | 5.0 detik (3.5s aksi + 1.5s hold) | 60  | 300          | 90          | `t = min(1, f / 210)`        |

---

## 4. Efek Visual Populer & Teknik Khusus

### A. Neon Glow & Cyberpunk Bloom

Gunakan `ctx.shadowBlur`, `ctx.shadowColor`, dan `ctx.globalCompositeOperation = 'lighter'` atau `'screen'`:

```javascript
ctx.save();
ctx.globalCompositeOperation = "lighter";
ctx.shadowBlur = 30;
ctx.shadowColor = "#00FFCC";
ctx.strokeStyle = "#00FFCC";
ctx.lineWidth = 6;
// Gambar path atau bentuk bercahaya
ctx.stroke();
ctx.restore();
```

### B. Smooth Easing Function (Khusus One-Shot)

Untuk animasi intro atau transisi, gunakan formula cubic bezier deterministik:

```javascript
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}
function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
```

### C. Auto Audio Muxing

Jika ingin menyertakan musik atau sound effects:

- Simpan file audio dengan nama file yang persis sama dengan file `.html` di folder yang sama.
- Contoh: `cyber_hud_4k.html` berdampingan dengan `cyber_hud_4k.wav` atau `cyber_hud_4k.mp3`.
- NARA akan mendeteksi audio secara otomatis dan melakukan muxing stereo 320 kbps (MP4) atau uncompressed PCM 24-bit (MOV ProRes 4444).

---

## 5. Aturan Anti-Overlap (Layout Bersih, Tanpa Teks Bertabrakan)

Hasil render TIDAK BOLEH memiliki teks/elemen yang saling tumpang tindih, terpotong, atau keluar frame, kecuali overlap disengaja sebagai efek layer (glow, bayangan, background).

1. **Layout Grid & Zona Terdefinisi**:
   - Bagi kanvas ke zona tetap (mis. title, subtitle, konten, footer) dengan konstanta `LAYOUT = { title:{x,y,w,h}, ... }`. Jangan menaruh posisi teks secara acak/ad-hoc.
   - Safe area: margin minimal **5%** dari semua sisi (3840x2160 → ±192px horizontal, ±108px vertikal). Semua teks harus berada di dalam safe area.

2. **Ukur Teks Sebelum Menggambar**:
   - Gunakan `ctx.measureText(text).width` untuk memastikan teks muat di lebar zona. Jika melebihi, kecilkan font (loop turun per langkah) atau pecah baris (word-wrap).

   ```javascript
   function fitText(ctx, text, maxW, startSize, fontFamily, weight = 700) {
     let size = startSize;
     do {
       ctx.font = `${weight} ${size}px ${fontFamily}`;
       if (ctx.measureText(text).width <= maxW) break;
       size -= 2;
     } while (size > 12);
     return size;
   }
   function wrapText(ctx, text, maxW) {
     const words = text.split(" "),
       lines = [];
     let line = "";
     for (const w of words) {
       const test = line ? line + " " + w : w;
       if (ctx.measureText(test).width > maxW && line) {
         lines.push(line);
         line = w;
       } else line = test;
     }
     if (line) lines.push(line);
     return lines;
   }
   ```

3. **Line-Height & Jarak Vertikal Eksplisit**:
   - Hitung tinggi blok = `jumlahBaris * fontSize * 1.2`. Posisi blok berikutnya = `y blok sebelumnya + tinggi blok + gap (≥ 0.5 × fontSize)`.
   - Set `ctx.textBaseline = 'top'` atau `'middle'` secara konsisten agar kalkulasi posisi akurat.

4. **Cegah Tabrakan Antar Elemen Dinamis**:
   - Untuk elemen bergerak (label, node, partikel berteks), hitung bounding box `{x,y,w,h}` dan cek tabrakan (AABB) saat inisialisasi (di luar `renderFrame`). Geser/relokasi posisi hingga tidak overlap.
   - Gunakan jalur gerak yang amplitudonya lebih kecil dari jarak antar elemen (amplitudo < gap/2).
   - Hindari 2 teks berbeda berada di posisi yang sama pada frame yang sama; jika bergantian, gunakan timeline (fade-out selesai sebelum fade-in dimulai, tanpa jeda tumpang tindih).

5. **Animasi Teks Tidak Boleh Menabrak**:
   - Animasi slide/scale/typewriter harus dihitung dari ukuran akhir (final bounding box), bukan ukuran saat ini; pastikan scale maksimum tetap berada dalam zona dan safe area.
   - Transisi antar teks berurutan: `outEnd <= inStart` (dalam frame).

6. **Kontras & Keterbacaan**:
   - Teks di atas visual ramai wajib punya panel/scrim semi-transparan atau `shadowBlur` gelap di belakangnya, dan diletakkan pada lapisan paling atas (digambar terakhir).
   - Urutan gambar: background → elemen dekoratif → konten → teks.

7. **Mode HTML/CSS**: Jika memakai DOM, gunakan `display:flex`/`grid` dengan `gap`, `overflow:hidden`, `white-space`/`text-wrap` eksplisit, dan hindari `position:absolute` tanpa koordinat zona. Jangan bergantung pada font yang belum dimuat (tunggu `document.fonts.ready`).

8. **Verifikasi Resolusi Lain**: Jika mendukung 1080x1920 / 1080x1080, hitung `LAYOUT` secara proporsional dari `WIDTH`/`HEIGHT`, bukan angka piksel tetap.

---

## 6. Hukum Kreatif (Disesuaikan untuk Arsitektur Hybrid NARA)

Aturan teknis NARA (Bagian 1) SELALU menang bila bentrok. Yang berbeda dari web player biasa: **tanpa autoplay-player bebas, tanpa `?debug`, tanpa ekspor MP4 sendiri**. Semua waktu = fungsi murni dari `frameIndex` (`t = frameIndex / fps`). Jika menggunakan pustaka **Hybrid CDN (GSAP, Three.js, PixiJS, Anime.js, Confetti)**, semuanya WAJIB menggunakan tag dual-fallback (`onerror="this.onerror=null;this.src='vendor/...';"`) dan dikunci secara *lockstep* ke `t = frameIndex / fps` (`masterGsapTl.time(t)`, `masterAnimeTl.seek(t * 1000)`, `threeRenderer.render(scene, camera)`). Prinsip kreatif di bawah ini tetap berlaku penuh.

### B1. Ini video, bukan slide (anti-PPT)

- Per adegan: **satu kalimat pendek + maksimal satu objek utama**. Tanpa kicker ("01 - FITUR"), sub-judul, paragraf, deretan chip/badge, atau metadata teknis. Maksimal 2 tingkat teks (satu angka/kalimat besar + satu label).
- Adegan berganti karena **dunia/kamera bergerak** (push-through, whip, zoom ke elemen, latar berubah), bukan karena `section` di-fade bergantian. Implementasi NARA: satu rig kamera (`translate/scale/rotate` pada seluruh dunia di canvas) yang dihitung dari `t`.
- Ada **benang merah visual**: satu subjek atau satu dunia yang disusuri kamera. Foto/gambar berganti-ganti tanpa dunia bersama = slideshow.
- Ken Burns (scale 1.0 -> 1.05) bukan satu-satunya gerak. Gerak tiap detik datang dari bahasa gerak latar (lihat B3).
- "Zoom" = ukuran shot (wide <-> medium close-up <-> close-up) mengikuti isi, bukan napas kamera beberapa persen.
- Transisi bervariasi dan punya pemicu terlihat (wipe objek, whip, push-through, cut di ketukan). Bukan fade + scale bump di semua batas.
- Hindari kerangka template: teks zoom lalu keluar kiri -> tiga tile fitur -> input diketik -> logo + CTA di tengah. Dua atau lebih tanpa tuntutan konsep = template. Untuk opener/promo, tulis 3 kandidat konsep, pilih satu dengan alasan dari produk, dan sebut `konsep | jumlah adegan | objek utama tiap adegan | pembuka | penutup`.
- Untuk loop murni/HUD/partikel/background, hukum slide tidak relevan; fokus ke B3-B5.

### B2. Style brief dulu, kode belakangan

Sebelum menulis kode (selain loop sederhana), tulis dan tunjukkan ke user:

1. Tema/produk + tiga kata sifat perasaan.
2. Palet: satu warna utama dari brand/tema, satu latar, satu aksen (hex + sumber tiap warna).
3. Font display yang punya karakter (bukan Poppins/Inter/Roboto/Montserrat/Arial) + font pendamping. Gunakan `@font-face` lokal (`assets/fonts/...` atau `assets/theme-vars.css`), Google Fonts (saat online), serta fallback font sistem berkarakter.
4. Penekanan teks: tanpa sorotan, atau satu bentuk sorotan saja.
5. Bahasa gerak latar (B3) dan tanda tangan gerak (satu gerak identitas yang diulang).
6. Permukaan latar >= 2 lapis (dasar + cahaya/tekstur/blob/grain), bukan flat.
7. Gaya render objek satu keluarga (flat, clay, glossy, kaca, isometrik, 3D WebGL Three.js, garis neon, dll).
8. Satu momen istimewa (efek termahal dipakai sekali).

**Gaya lahir dari tema**, bukan dari boilerplate Bagian 2 (warna, partikel, dan font di sana hanyalah PLACEHOLDER). Jangan membuat semua animasi gelap + neon cyan + glow. Latar tidak default gelap; pilih dari arah: sinematik gelap, poster color-block, editorial terang, kertas & cetak, retro/analog, brutalis mono, pastel ceria, mewah gelap, flat pop, grainy gradient. Referensi dari user = ambil ritme dan energi, bukan palet/font/tata letak/kalimat.

### B3. Latar tidak pernah statis

- Selalu ada gerak latar di setiap adegan: kamera bernapas di latar bertekstur, gradien berpindah, blob mengambang, grain hidup (seeded per frame), sapuan cahaya, bentuk besar berputar pelan, partikel naik, grid bernapas, teks hantu bergeser, parallax.
- Batang/garis melintas ke samping hanya bila tema kecepatan/aliran.
- Warna latar boleh berganti bila ada pemicu terlihat (wipe, benda, aksi UI), bukan cross-fade tanpa sebab.
- Untuk output loop, semua gerak latar harus periodik terhadap `loopAngle` agar seamless.

### B4. Teks hidup, latar tunduk

- Sentence case bobot 500-600. KAPITAL TEBAL hanya untuk satu adegan penekanan.
- Frase pendek (<= 4 kata) default tanpa titik. Tanda baca hanya bila mengubah arti/irama.
- Dua adegan berturut-turut tidak sama dalam ukuran, arah masuk, dan posisi teks.
- Di area belakang teks, latar harus gelap (<= 25% luminance) atau terang (>= 80%), tidak "ramai sedang". Di luar area teks, latar boleh kaya. Elemen latar di area teks: opacity <= .35.
- Judul bersih (putih penuh/kontras + drop shadow tipis); glow dipakai pada objek, bukan pada teks judul, kecuali diminta.
- Teks masuk/keluar dengan motion blur berarah (simulasikan dengan beberapa draw ber-alpha menurun sepanjang vektor gerak).
- Teks di 1080p tidak < 30 px (body >= 44, label >= 34); skala proporsional untuk 4K.
- Angka yang berubah tiap frame: `font-variant-numeric: tabular-nums` (DOM) atau lebar tetap dari `measureText` angka terlebar (Canvas).

### B5. Deterministik

Selaras dengan Aturan Emas #3-#4: tanpa `Date.now()`, `performance.now()`, `Math.random()` tak-seeded di jalur render. Getar kamera = sinus frekuensi tinggi dari `t`. Objek "mengalir" = posisi fungsi dari `t` (jarak), bukan akumulasi kecepatan per frame.

### B6. Explainer (bila diminta)

- Satu pertanyaan brief berisi: gaya (kartun kolase, jurnalisme foto, katalog putih, sketsa vintage, aksi kontinu, atau kartun panggung), rasio, durasi, dan suara.
- Kartun panggung: satu panggung per adegan, zoom kamera >= 1,08, kontinu di dalam panggung, cut atau geser antar panggung; rig sendi dengan transform manual; nol caption.
- Tiap orang/perusahaan/tempat/produk yang disebut harus tampil visualnya di adegan itu. Aset gambar dari folder lokal (Aturan Emas #1).
- Sudut pandang berganti; tidak tiga adegan berturut-turut dengan sudut sama.
- Penyerahan: sertakan naskah VO lengkap dan minta user merekam audio. Audio di-mux otomatis lewat file dengan nama sama dengan `.html` (Bagian 4C).
- Durasi mengikuti brief/VO, bukan durasi / 6. Atur `total_frames` dan `hold_last_frames` di metadata.

### B7. Jebakan

- Bloom/glow dengan threshold rendah -> layar putih; additive berlapis menumpuk. Batasi `lighter` pada objek kecil, bukan seluruh latar.
- Objek 3D pipih diputar penuh di sumbu Y -> jadi garis; goyangkan, jangan putar penuh.
- Filter SVG: lebarkan `x/y/width/height` agar ekor blur tidak terpotong.
- Memuat aset: tunggu `img.decode()` / `document.fonts.ready` sebelum frame pertama.

---

## 7. Checklist Verifikasi Sebelum Menyerahkan Kode HTML

- [ ] Tidak ada teks/elemen yang overlap, terpotong, atau keluar safe area (5%) pada frame mana pun.
- [ ] Semua teks diukur dengan `measureText` (fit/wrap) dan memiliki zona layout terdefinisi.
- [ ] Teks yang bergantian memakai timeline tanpa tumpang tindih (`outEnd <= inStart`).
- [ ] Baris pertama adalah `<!--METADATA { ... } METADATA-->` yang valid JSON.
- [ ] Seluruh tag `<script>` library CDN (GSAP, Three.js, PixiJS, Anime.js, Confetti) menggunakan pola **Hybrid Dual-Fallback** (`onerror="this.onerror=null;this.src='vendor/...';"`) dan dikunci secara *lockstep* ke `frameIndex`.
- [ ] Aset folder lokal (`assets/*.svg`, `.png`, `.webp`, `.css`, `.js`) di-preload di `#nara-local-assets` dan digambar melalui helper aman (`drawLocalImageOrFallback`) dengan fallback prosedural.
- [ ] Resolusi kanvas diset ke 3840x2160 (atau resolusi target).
- [ ] Fungsi `window.__renderTick(frameIndex, targetFps)` terdefinisi.
- [ ] Preview loop dilindungi oleh pengecekan `!window.__isNaraHeadless && !window.__IS_HEADLESS_RENDERER__`.
- [ ] Tidak ada pemanggilan `Math.random()` tanpa seed di dalam `renderFrame()`.
- [ ] Desain visual memiliki estetika komersial premium (gradasi warna modern, pencahayaan, kontras tajam).
- [ ] Style brief (tema, palet dari brand, font berkarakter, bahasa latar, tanda tangan gerak, momen istimewa) ditulis dan disetujui sebelum kode (kecuali loop sederhana).
- [ ] Tidak ada sisa placeholder boilerplate (neon cyan/ungu, partikel default, font generik) bila gaya tema lain.
- [ ] Lolos uji anti-PPT: bukan section yang di-fade, ada benang merah visual, <= 2 tingkat teks, gerak tiap detik, transisi bervariasi.
- [ ] Latar bergerak di setiap adegan, >= 2 lapis, dan periodik terhadap `loopAngle` bila `loop: true`.
- [ ] Teks hidup: sentence case bobot 500-600, tanpa titik otomatis, ukuran/arah/posisi bergantian, kontras latar di area teks terjaga.
- [ ] Berbeda dari animasi sebelumnya: minimal tiga dari palet, font, bahasa latar, tanda tangan gerak.
- [ ] Explainer: naskah VO lengkap disertakan dan user diajak mengirim audio untuk di-mux.

---

## 8. Referensi Tambahan

Lampiran A-F di akhir file ini berisi resep detail desain adegan. Baca hanya yang relevan dengan jenis pekerjaan:

| Lampiran             | Kapan dibaca                                                                      |
| -------------------- | --------------------------------------------------------------------------------- |
| `anti-ppt.md`        | Sebelum mendesain adegan opener/promo/explainer                                   |
| `opener-konsep.md`   | Opener/promo: menu konsep, kandidat, sidik jari struktur, animasi UI, penutup     |
| `techniques.md`      | Membangun adegan dan efek (split teks, ukuran shot, latar, gaya render, transisi) |
| `explainer.md`       | Explainer/video penjelasan (lima gaya, VO, entitas, sudut pandang)                |
| `kartun-panggung.md` | Explainer kartun panggung (rig sendi, kamera per panggung)                        |
| `architecture.md`    | Alasan di balik struktur kamera/timeline                                          |

**Aturan adaptasi (WAJIB) saat memakai Lampiran di NARA:**

- Jika menggunakan GSAP, Three.js, PixiJS, Anime.js, atau Confetti, gunakan pola **Hybrid Online CDN + Offline Vendor Fallback (`vendor/*.min.js`)** dan kunci waktunya secara *lockstep* ke `t = frameIndex / fps` (misal `masterGsapTl.time(t)`, `masterAnimeTl.seek(t * 1000)`), atau tulis kurva easing/stagger deterministik dari `t`.
- Abaikan instruksi player mandiri, autoplay bebas, `?debug=1`, `snap.mjs`, `export-frames.mjs`, `serve.py`, dan bridge After Effects. NARA merender sendiri melalui `window.__renderTick(frameIndex, targetFps)`.
- Ukuran stage mengikuti metadata NARA (mis. 3840x2160); gunakan unit skala proporsional `U = WIDTH / 1920`.
- Aturan teknis di Bagian 1 selalu menang bila bentrok.

---

## 9. Starter Opener & Hybrid Master NARA (Canvas 2D + Hybrid CDN + Folder Aset)

Titik awal opener/promo/kinetic typography. Salin ke file BARU, isi style brief, ganti token warna/font dan RUNDOWN. Placeholder abu-abu wajib diganti.

```html
<!--METADATA
{
  "title": "STARTER - Ganti Judul Komersial",
  "description": "Ganti deskripsi profesional untuk microstock",
  "keywords": ["motion graphics", "opener", "kinetic typography", "4k"],
  "category": "Motion Graphics & Backgrounds",
  "fps": 60,
  "total_frames": 480,
  "loop": false,
  "width": 3840,
  "height": 2160,
  "hold_last_frames": 60
}
METADATA-->
<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <title>NARA Starter Opener</title>
    <!--
  STARTER OPENER / PROMO / BUMPER / KINETIC TYPOGRAPHY untuk NARA.
  ARSITEKTUR + PERKAKAS, bukan gaya dan bukan kerangka. Mendukung Hybrid CDN (GSAP/Three/Pixi/Anime/Confetti) + Folder Aset Lokal.

  ===== STYLE BRIEF - isi dulu, baru sentuh kode (nara skill.md Bagian 6, B2) =====
  Tema/produk + 3 kata sifat : ____________________
  Konsep & sidik jari        : konsep | n adegan | objek tiap adegan | pembuka | penutup
  Palet (dari brand)         : utama #____  latar #____  aksen #____
  Font display / pendamping  : ____________ / ____________  (bukan Poppins/Inter/Roboto/Montserrat/Arial)
  Bahasa gerak latar         : ____________________
  Tanda tangan gerak         : ____________________
  Permukaan latar (>=2 lapis): ____________________
  Momen istimewa             : ____________________
  ==================================================================================
  Warna ABU-ABU + font sistem di bawah = PLACEHOLDER. Bila masih terlihat di hasil,
  gaya belum diturunkan dari tema.

  Semua waktu = fungsi murni dari frameIndex (t = frame / FPS). Tanpa Date.now,
  performance.now, atau Math.random di jalur render.
  Layout dihitung di "unit desain" 1920 lebar (U = WIDTH/1920); tinggi desain = HEIGHT/U.
-->
    <style>
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      body {
        background: #000;
        overflow: hidden;
        width: 100vw;
        height: 100vh;
      }
      #stage-container {
        width: 3840px;
        height: 2160px;
        position: absolute;
        top: 50%;
        left: 50%;
        transform-origin: center center;
      }
      canvas {
        display: block;
        width: 3840px;
        height: 2160px;
      }
    </style>
  </head>
  <body>
    <div id="stage-container">
      <canvas id="stage" width="3840" height="2160"></canvas>
    </div>

    <script>
      /* ================= KONFIGURASI (samakan dengan METADATA) ================= */
      const WIDTH = 3840,
        HEIGHT = 2160,
        FPS = 60;
      const TOTAL_FRAMES = 480; // 8 detik
      const IS_TRANSPARENT = false; // true => clearRect, tanpa latar solid
      const DURATION = TOTAL_FRAMES / FPS;

      /* ================= TOKEN GAYA - GANTI DARI STYLE BRIEF ================= */
      const PAL = {
        base: "#15171C",
        base2: "#242831",
        accent: "#8A8F98",
        accentLit: "#C4C8CF",
        ink: "#F2F3F7",
        inkDark: "#0B1B33",
      };
      const FONT = { display: "system-ui, 'Segoe UI', sans-serif" }; // GANTI: font lokal via @font-face

      const canvas = document.getElementById("stage");
      const ctx = canvas.getContext("2d");
      const U = WIDTH / 1920; // skala unit desain
      const DW = 1920,
        DH = HEIGHT / U; // ukuran desain

      /* ================= UTIL MATEMATIKA ================= */
      const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
      const lerp = (a, b, t) => a + (b - a) * t;
      const prog = (t, a, b) => clamp((t - a) / (b - a)); // 0..1 antara detik a dan b
      const E = {
        linear: (x) => x,
        inQuad: (x) => x * x,
        outCubic: (x) => 1 - Math.pow(1 - x, 3),
        outQuart: (x) => 1 - Math.pow(1 - x, 4),
        outExpo: (x) => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x)),
        inOutCubic: (x) =>
          x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
        inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
        outBack: (x) => {
          const c1 = 1.70158,
            c3 = c1 + 1;
          return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
        },
      };
      function mulberry32(a) {
        return function () {
          a |= 0;
          a = (a + 0x6d2b79f5) | 0;
          let t = Math.imul(a ^ (a >>> 15), 1 | a);
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      }
      function hexA(hex, a) {
        const n = parseInt(hex.slice(1), 16);
        return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
      }

      /* piecewise keyframes: keys = [[t, v], ...] dengan easing antar kunci */
      function track(keys, t, ease = E.inOutCubic) {
        if (t <= keys[0][0]) return keys[0][1];
        for (let i = 1; i < keys.length; i++) {
          if (t <= keys[i][0])
            return lerp(
              keys[i - 1][1],
              keys[i][1],
              ease(prog(t, keys[i - 1][0], keys[i][0])),
            );
        }
        return keys[keys.length - 1][1];
      }

      /* ================= LATAR (>= 2 lapis, selalu bergerak) - PLACEHOLDER ================= */
      const rnd = mulberry32(20260101);
      const BLOBS = Array.from({ length: 5 }, (_, i) => ({
        x: rnd() * DW,
        y: rnd() * DH,
        r: 420 + rnd() * 380,
        ph: rnd() * Math.PI * 2,
        k: 1 + (i % 2), // k integer => periodik terhadap DURATION (loop aman)
        col: i % 2 ? PAL.accent : PAL.accentLit,
        a: 0.16 + rnd() * 0.1,
      }));
      const DUST = Array.from({ length: 90 }, () => ({
        x: rnd() * DW,
        y: rnd() * DH,
        r: 1.2 + rnd() * 3,
        sp: 0.4 + rnd() * 0.9,
        ph: rnd() * 6.283,
      }));

      /* grain: tile noise seeded, digeser per frame (grain hidup, deterministik) */
      const grainTile = document.createElement("canvas");
      grainTile.width = grainTile.height = 256;
      {
        const g = grainTile.getContext("2d"),
          id = g.createImageData(256, 256),
          r = mulberry32(7);
        for (let i = 0; i < id.data.length; i += 4) {
          const v = r() * 255;
          id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
          id.data[i + 3] = 255;
        }
        g.putImageData(id, 0, 0);
      }
      const grainPat = ctx.createPattern(grainTile, "repeat");

      function drawBackground(t) {
        const ph = (t / DURATION) * Math.PI * 2;
        if (IS_TRANSPARENT) {
          ctx.clearRect(0, 0, DW, DH);
        } else {
          const g = ctx.createLinearGradient(0, 0, 0, DH); // lapis 1: gradien dasar
          g.addColorStop(0, PAL.base2);
          g.addColorStop(1, PAL.base);
          ctx.fillStyle = g;
          ctx.fillRect(-DW, -DH, DW * 3, DH * 3);
        }
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        for (const b of BLOBS) {
          // lapis 2: blob cahaya melayang
          const x = b.x + Math.cos(ph * b.k + b.ph) * 140,
            y = b.y + Math.sin(ph * b.k + b.ph) * 100;
          const g = ctx.createRadialGradient(x, y, 0, x, y, b.r);
          g.addColorStop(0, hexA(b.col, b.a));
          g.addColorStop(1, hexA(b.col, 0));
          ctx.fillStyle = g;
          ctx.fillRect(x - b.r, y - b.r, b.r * 2, b.r * 2);
        }
        ctx.restore();
        ctx.fillStyle = hexA(PAL.accentLit, 0.5); // lapis 3: debu naik pelan
        for (const d of DUST) {
          const y = (((d.y - t * 24 * d.sp) % DH) + DH) % DH;
          ctx.globalAlpha = 0.25 + 0.35 * Math.abs(Math.sin(t * 0.8 + d.ph));
          ctx.beginPath();
          ctx.arc(d.x, y, d.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      function drawGrain(frame, alpha = 0.06) {
        if (IS_TRANSPARENT) return;
        const r = mulberry32(frame * 9973 + 1);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.globalCompositeOperation = "overlay";
        ctx.translate(-Math.floor(r() * 256), -Math.floor(r() * 256));
        ctx.fillStyle = grainPat;
        ctx.fillRect(0, 0, DW + 256, DH + 256);
        ctx.restore();
      }
      function drawVignette(a = 0.45) {
        if (IS_TRANSPARENT) return;
        const g = ctx.createRadialGradient(
          DW / 2,
          DH / 2,
          DH * 0.45,
          DW / 2,
          DH / 2,
          DW * 0.62,
        );
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(1, `rgba(0,0,0,${a})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, DW, DH);
      }
      /* light leak: cahaya di depan lensa, lapisan paling atas. Panggil hanya di transisi yang butuh. */
      function leak(t, at, dur, side = 1) {
        const p = prog(t, at, at + dur);
        if (p <= 0 || p >= 1) return;
        const x = lerp(
            DW / 2 + side * 1500,
            DW / 2 + side * 330,
            E.outCubic(p),
          ),
          y = lerp(DH / 2 - 240, DH / 2 + 130, p);
        const a = Math.sin(p * Math.PI) * 0.85,
          R = 1200;
        const g = ctx.createRadialGradient(x, y, 0, x, y, R);
        g.addColorStop(0, hexA(PAL.accentLit, a));
        g.addColorStop(0.34, hexA(PAL.accent, a * 0.55));
        g.addColorStop(1, hexA(PAL.accent, 0));
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = g;
        ctx.fillRect(x - R, y - R, R * 2, R * 2);
        ctx.restore();
      }

      /* ================= TEKS: ukur, fit, split per huruf, pintu masuk/keluar + blur berarah ================= */
      function fitSize(text, maxW, start, weight = 500) {
        let s = start;
        do {
          ctx.font = `${weight} ${s}px ${FONT.display}`;
          if (ctx.measureText(text).width <= maxW) break;
          s -= 2;
        } while (s > 12);
        return s;
      }
      /* pintu: arah vektor gerak masuk (dx,dy dalam unit em), skala awal.  Pilih dari ARTI kalimat, jangan berulang antar adegan. */
      const DOORS = {
        up: { dx: 0, dy: 0.6, s0: 1, blur: [0.1, 1] },
        down: { dx: 0, dy: -0.6, s0: 1, blur: [0.1, 1] },
        left: { dx: -0.9, dy: 0, s0: 1, blur: [1, 0.08] },
        right: { dx: 0.9, dy: 0, s0: 1, blur: [1, 0.08] },
        depth: { dx: 0, dy: 0, s0: 2.4, blur: [0.6, 0.6] },
      };
      /**
       * drawText(t, o) - o:
       *  str, x, y (pusat, unit desain), size, weight, color, align
       *  inAt, inDur=.8, inDoor='up', stagger=.024, byWord=false
       *  outAt (opsional), outDur=.4, outDoor='up'
       *  maxW (opsional): kecilkan font otomatis
       * Aturan: outAt harus >= inAt + inDur + (jumlah unit * stagger) agar teks berurutan tidak tumpang tindih.
       */
      function drawText(t, o) {
        const {
          str,
          x,
          y,
          weight = 500,
          color = PAL.ink,
          inAt = 0,
          inDur = 0.8,
          inDoor = "up",
          stagger = 0.024,
          byWord = false,
          outAt = null,
          outDur = 0.4,
          outDoor = "up",
          maxW = DW * 0.9,
        } = o;
        const size = fitSize(str, maxW, o.size || 120, weight);
        ctx.font = `${weight} ${size}px ${FONT.display}`;
        ctx.textBaseline = "middle";
        ctx.textAlign = "left";
        const units = byWord ? str.split(" ") : [...str];
        const sep = byWord ? " " : "";
        const total = ctx.measureText(str).width,
          x0 = x - total / 2;
        const din = DOORS[inDoor],
          dout = DOORS[outDoor];
        let prefix = "";
        units.forEach((u, i) => {
          const px = x0 + ctx.measureText(prefix).width;
          prefix += u + (byWord && i < units.length - 1 ? sep : "");
          const uw = ctx.measureText(u).width;
          const pin = E.outQuart(
            prog(t, inAt + i * stagger, inAt + i * stagger + inDur),
          );
          let a = pin,
            dx = (1 - pin) * din.dx * size,
            dy = (1 - pin) * din.dy * size,
            sc = lerp(din.s0, 1, pin),
            bl = [(1 - pin) * din.blur[0], (1 - pin) * din.blur[1]],
            gs = 1;
          if (outAt !== null) {
            const pout = E.inQuad(
              prog(
                t,
                outAt + i * stagger * 0.4,
                outAt + i * stagger * 0.4 + outDur,
              ),
            );
            if (pout > 0) {
              a *= 1 - pout;
              dx = pout * dout.dx * size;
              dy = -pout * dout.dy * size;
              sc = lerp(1, dout.s0 > 1 ? 2.6 : 1, pout);
              bl = [pout * dout.blur[0], pout * dout.blur[1]];
              gs = -1;
            }
          }
          if (a <= 0.002) return;
          const G = 6,
            B = 34; // ghost = blur berarah sepanjang vektor gerak
          const vx = gs * Math.sign(dx) * bl[0] * B,
            vy = gs * Math.sign(dy) * bl[1] * B * 0.8;
          ctx.save();
          ctx.fillStyle = color;
          if (o.shadow !== false) {
            ctx.shadowColor = "rgba(0,0,0,.45)";
            ctx.shadowBlur = 24;
            ctx.shadowOffsetY = 4;
          } // judul bersih: drop shadow tipis, tanpa glow
          for (let k = G; k >= 1; k--) {
            const f = k / G;
            ctx.globalAlpha = a * (1 - f) * 0.35;
            ctx.save();
            ctx.translate(px + uw / 2 + dx + vx * f, y + dy + vy * f);
            ctx.scale(sc, sc);
            ctx.fillText(u, -uw / 2, 0);
            ctx.restore();
          }
          ctx.globalAlpha = a;
          ctx.translate(px + uw / 2 + dx, y + dy);
          ctx.scale(sc, sc);
          ctx.fillText(u, -uw / 2, 0);
          ctx.restore();
        });
      }

      /* ================= KAMERA: rig satu dunia, fungsi murni dari t ================= */
      function applyCamera(t) {
        const ph = (t / DURATION) * Math.PI * 2;
        // GANTI keyframe sesuai rundown: push, whip, wide <-> close-up. Napas saja tidak cukup (anti-PPT).
        const zoom =
          track(
            [
              [0, 1],
              [2.5, 1.0],
              [3.2, 1.35],
              [5.2, 1.0],
            ],
            t,
          ) *
          (1 + 0.012 * Math.sin(ph));
        const cx = track(
          [
            [0, 0],
            [2.5, 0],
            [3.2, 120],
            [5.2, 0],
          ],
          t,
        );
        const cy = track(
          [
            [0, 0],
            [2.5, 0],
            [3.2, -40],
            [5.2, 0],
          ],
          t,
        );
        ctx.translate(DW / 2, DH / 2);
        ctx.scale(zoom, zoom);
        ctx.translate(-DW / 2 - cx, -DH / 2 - cy);
      }

      /* ================= RUNDOWN - tulis adegan dari KONSEP di sini =================
   Tidak ada kerangka bawaan. Satu kalimat + maksimal satu objek per adegan.
   Placeholder di bawah hanya membuktikan pipeline jalan: GANTI SELURUHNYA. */
      function drawWorld(t) {
        drawText(t, {
          str: "Ganti dengan satu kalimat pendek",
          x: DW / 2,
          y: DH / 2,
          size: 120,
          inAt: 0.5,
          inDoor: "up",
          outAt: 2.6,
          outDoor: "up",
        });
        drawText(t, {
          str: "adegan kedua beda arah",
          x: DW / 2,
          y: DH / 2,
          size: 120,
          weight: 600,
          byWord: true,
          stagger: 0.12,
          inAt: 3.2,
          inDoor: "left",
          outAt: 6.4,
          outDoor: "depth",
        });
      }

      /* ================= RENDER FRAME UTAMA ================= */
      function renderFrame(frameIndex) {
        const t = Math.min(frameIndex, TOTAL_FRAMES - 1) / FPS;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, WIDTH, HEIGHT);
        ctx.setTransform(U, 0, 0, U, 0, 0); // semua gambar di unit desain
        ctx.save();
        applyCamera(t);
        drawBackground(t);
        drawWorld(t);
        ctx.restore();
        drawVignette();
        drawGrain(frameIndex);
        leak(t, 2.7, 1.0, 1); // contoh: hapus bila konsep tidak menuntut
      }

      /* ================= NARA RENDER HOOK (WAJIB) ================= */
      window.__renderTick = function (frameIndex, targetFps) {
        renderFrame(frameIndex);
      };

      /* ================= PREVIEW BROWSER ================= */
      let previewFrame = 0;
      function animLoop() {
        if (!window.__isNaraHeadless && !window.__IS_HEADLESS_RENDERER__) {
          renderFrame(previewFrame);
          previewFrame = (previewFrame + 1) % TOTAL_FRAMES; // preview selalu mengulang
          requestAnimationFrame(animLoop);
        }
      }
      function autoFitStage() {
        const c = document.getElementById("stage-container");
        const s = Math.min(innerWidth / WIDTH, innerHeight / HEIGHT);
        c.style.transform = `translate(-50%, -50%) scale(${s})`;
      }
      addEventListener("resize", autoFitStage);
      autoFitStage();
      (document.fonts && document.fonts.ready
        ? document.fonts.ready
        : Promise.resolve()
      ).then(() => {
        window.__fontsReady = true;
        renderFrame(0);
        requestAnimationFrame(animLoop);
      });
    </script>
  </body>
</html>
```

---

# Lampiran A: anti-ppt.md ( )

> Terapkan aturan adaptasi Bagian 8: gunakan Hybrid CDN dengan fallback lokal (`vendor/*.min.js`) dan kunci waktu secara lockstep ke `t = frameIndex / fps` (`masterGsapTl.time(t)`), abaikan player/debug/snap/export/AE bridge. Aturan Bagian 1 selalu menang.

# Anti-PPT — hukum desain adegan

Dokumen ini adalah alasan skill ini ada: hasil yang "secara teknis benar" tetap
gagal bila terasa seperti presentasi PPT.

## Kenapa model selalu jatuh ke pola slide

Model dilatih menyusun INFORMASI: judul → penjelas → bukti pendukung.
Struktur itu bagus untuk dokumen, dan fatal untuk motion graphic.
Video promosi tidak menjelaskan — ia **menyatakan**, satu pukulan per shot,
dan membiarkan gerakan + musik yang membawa emosinya. Kalau kamu merasa
sebuah adegan "kurang informasi", itu justru tanda adegannya sudah benar.

## Tabel pelanggaran → perbaikan

| Pelanggaran                                                                                                                                                                                                    | Perbaikan                                                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kicker "02 — FITUR" + judul 2 baris + body copy 2 baris + 4 chip badge, layout kolom kiri-kanan                                                                                                                | Satu kalimat ≤ 5 kata di tengah-atas + satu objek produk naik ke tengah                                                                                                                                                                                 |
| Tiga baris teks besar berisi tiga klaim "TANPA …"                                                                                                                                                              | Headline 2 kata + satu cara dari menu fitur (`opener-konsep.md`): satu fitur didemokan, kata berganti, objek bertransformasi, kartu dikocok, grid tile… — dipilih per proyek                                                                            |
| Opener produk B memakai kulit opener produk A (palet, glow, nebula, font yang sama) karena diambil dari starter/proyek lama                                                                                    | Gaya diturunkan dari brand B lewat style brief: palet dari logo/ikon B, font berkarakter lain, bahasa latar lain, tanda tangan gerak lain (SKILL.md Hukum #3)                                                                                           |
| Semua judul KAPITAL SEMUA, font lebar bobot 800, selalu di tengah, masuk dengan stagger huruf yang sama — terasa kaku                                                                                          | Sentence case bobot 500, penekanan pada kata kunci (sorotan kata opsional — bisa juga kata per kata, ukuran, jeda, objek di samping kata), tanpa titik otomatis (tanda baca hanya bila mengubah arti), ukuran/arah/posisi bergantian (techniques.md §1) |
| Setiap judul/klaim diakhiri titik, termasuk frase dua kata — terasa kaku dan seperti template                                                                                                                  | Default tanpa titik; `?` untuk pertanyaan sungguhan, titik hanya untuk gaya dua kalimat pendek yang disengaja dan konsisten (techniques.md §1 aturan 5)                                                                                                 |
| Ladang 96 batang cahaya putih ber-bloom di belakang judul — latar ramai, teks tidak kontras                                                                                                                    | Kantong gelap di bawah teks, partikel berwarna sisi gelap palet dan redup, ≤ 40 elemen terang, bloom hanya di objek (techniques.md §1b)                                                                                                                 |
| Semua opener gelap dengan nebula/partikel, latar tidak pernah dipertimbangkan per segmen                                                                                                                       | Latar dari tema (gradien terang, warna lembut, blok warna, kertas, foto, atau gelap); pergantian diputuskan per segmen di style brief dan terjadi di balik cut/wipe (techniques.md §7b)                                                                 |
| Setiap opener memberi kata sorotan (garis bawah/pill) di setiap kalimat, atau memakai pill + bintang yang sama persis dengan proyek lain                                                                       | Sorotan kata opsional dan diputuskan di style brief; bila dipakai, satu bentuk per video yang dipilih per proyek, tidak di setiap kalimat, ornamen hanya dari bentuk brand (techniques.md §1)                                                           |
| Opener app/SaaS hanya menampilkan screenshot diam yang di-zoom atau digeser                                                                                                                                    | UI dirakit ulang dari komponen produk, dipakai (kursor, jari, atau UI yang bereaksi sendiri), data mengisi, transisi dibawa UI (`opener-konsep.md` bagian animasi UI)                                                                                   |
| Video ditempel layar penuh dengan `autoplay loop`, berjalan dengan jamnya sendiri, dan animasi lain berhenti selama klip diputar                                                                               | Klip dipasang lewat `clip()` sebagai layer footage yang terikat timeline, dibungkus wadah/perangkat/bingkai yang ikut dianimasikan, teks dan anotasi tetap hidup di atasnya (techniques.md §9b)                                                         |
| Dua opener untuk produk berbeda sama-sama berlatar batang/potongan cahaya melesat ke samping ("lane" / "range") — hasil aturan "objek melintas tiap detik"                                                     | Gerak latar dipilih dari menu techniques.md §7c (gradien berpindah, blob, grain hidup, sapuan cahaya, bentuk berputar, partikel naik, grid bernapas…) dan berbeda dari proyek sebelumnya; aliran horizontal hanya untuk tema kecepatan/aliran           |
| Transisi: balok/persegi warna datar raksasa menyapu miring di setiap cut ("kotak persegi aneh"), atau garis tipis menyapu                                                                                      | Menu transisi techniques.md §4c: push-through 3D, kartu berputar dari kedalaman, objek berketebalan melewati lensa, mask bentuk brand, sapuan cahaya; minimal dua jenis, satu berkedalaman, wipe ≤ 2                                                    |
| Latar flat satu warna (gelap atau terang) dari awal sampai akhir                                                                                                                                               | Permukaan latar ≥ 2 lapis dari menu §7d: glow horizon, duotone diagonal, mesh blob, spotlight + tint, langit berlapis, tekstur — warna dari palet                                                                                                       |
| Latar diam, atau warna latar tidak pernah berganti walau segmen/energi berubah                                                                                                                                 | Latar selalu bergerak (§7c); warna latar boleh berganti kapan dibutuhkan asal ada pemicu terlihat: benda menutup lensa, aksi UI, push ke bidang warna, medan menyapu, cut di ketukan (techniques.md §7b)                                                |
| Menyalin palet, font, dan tata letak video referensi yang disodorkan user                                                                                                                                      | Ambil ritme dan energinya saja; kulit lahir dari tema produk — katakan itu ke user satu kalimat                                                                                                                                                         |
| Menampilkan `com.example.app` (nama package) di adegan CTA                                                                                                                                                     | Dihapus. User tidak peduli; kalau perlu, cukup baris hasil pencarian store                                                                                                                                                                              |
| Teks in/out dengan kamera statis                                                                                                                                                                               | Ukuran shot berganti ke elemen yang sedang bercerita (techniques.md §3b) + koreografi elemen beririsan (§4b); napas kamera sebagai lapisan dasar; push-through hanya bila termotivasi, ±1 per video                                                     |
| "Zoom in-out" dikerjakan sebagai napas kamera beberapa persen — tidak terlihat, video tetap terasa statis                                                                                                      | Pergantian ukuran shot yang jelas: kamera mendekat ke elemen (medium close-up / close-up) lalu mundur ke wide saat komposisi butuh seluruh frame; label di lapisan layar supaya tidak terpotong (techniques.md §3b)                                     |
| Glow tebal 4 lapis di semua judul                                                                                                                                                                              | Judul putih bersih + drop shadow tipis; glow disimpan untuk OBJEK (objek produk, ornamen)                                                                                                                                                               |
| Latar warp 520 garis putih panjang                                                                                                                                                                             | 300 partikel pendek berwarna gelap senada — latar tidak boleh bersaing dengan subjek                                                                                                                                                                    |
| Latar biru merata (flat)                                                                                                                                                                                       | Gradasi vertikal tegas: nyaris hitam di atas, menyala di horizon bawah                                                                                                                                                                                  |
| Elemen UI (badge status) muncul mendahului kalimat utamanya                                                                                                                                                    | Urutan atensi: kalimat → objek utama → detail pendukung                                                                                                                                                                                                 |
| Zoom push-through dipakai di SEMUA transisi                                                                                                                                                                    | Perpustakaan gerakan: spin, yaw 3D, roll, elemen terbang melewati lensa; zoom hanya saat termotivasi (mis. menyelam ke layar mockup). "Satu jenis transisi di semua cut" = template transisi PPT, cuma versi mahal                                      |
| Whip-pan translasi — tepi panggung tersingkap jadi gap hitam                                                                                                                                                   | Terbaca "pindah halaman". Jangan pernah menggeser dunia sampai tepinya terlihat                                                                                                                                                                         |
| Spin/yaw/roll kejut (zoom+putar tiba-tiba dengan blur di tiap cut)                                                                                                                                             | Itu bahasa PRESET editor video, bukan motion design. Ganti: kamera bernapas + koreografi elemen beririsan + object wipe                                                                                                                                 |
| Demo UI terasa statis: UI penuh di frame, kamera diam, hanya kursor bergerak, klik terlalu kecil untuk terbaca                                                                                                 | Kamera mengikuti interaksi bila perlu: dekati area yang akan diklik (scale 1,4–2,2, 0,6–0,9 dtk ease in-out), klik terbaca, lalu mundur/geser ke hasilnya; tidak di setiap klik (techniques.md §8)                                                      |
| Opener produk berbeda-beda keluar dengan kerangka sama: teks zoom lalu keluar ke kiri, tiga tile fitur, kotak input diketik, hook → fitur → fitur → janji → logo → CTA — kesannya template walau warnanya baru | Tiga kandidat konsep dari `opener-konsep.md`, satu dipilih dari sifat produk; sidik jari struktur berbeda dari opener sebelumnya; komponen kanonik maks dua dan hanya bila dituntut konsep                                                              |

## Pola gagal yang umum pada explainer

Contoh explainer sejarah 30 dtk, 6 adegan, yang terasa seperti PPT. Kodenya:

| Yang dibuat                                                                             | Kenapa PPT                                       | Yang seharusnya                                                                                     |
| --------------------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| 6 × `<section class="scene">` berisi foto full-bleed, dinyalakan `autoAlpha` bergantian | Ganti section = ganti slide, apa pun transisinya | Satu dunia yang mengalir; adegan berganti karena kamera/dunia bergerak atau whip ke sudut lain      |
| Tiap section: eyebrow (kicker) + judul 2 baris + kredit                                 | Tiga tingkat teks = layout slide                 | Satu angka/kalimat besar + satu label yang hidup di dunia                                           |
| Gerak hanya Ken Burns foto 1.08 → 1.015 dan scale bump `#world` 1.12 → .96 di tiap cut  | Gerak yang sama di semua cut = template          | Parallax, objek melintas, whip, instrumen (peta/profil/speedometer), kamera bernapas beda per momen |
| Light leak di setiap cut                                                                | Preset editor video                              | Simpan untuk satu momen istimewa                                                                    |
| Tidak ada subjek yang bertahan antar adegan                                             | Tidak ada yang "dibawa" penonton                 | Hero hadir > 60 % durasi                                                                            |

Pelajaran: hukum naratif saja tidak cukup; perlu larangan struktural yang bisa diperiksa dari kode
(SKILL.md → "Larangan struktural") dan starter yang memaksa rig yang benar
(`assets/starter-explainer.html`).

## Prinsip yang bisa dibawa ke proyek mana pun

1. **Satu shot = satu pernyataan.** Kalimat ≤ 5 kata lebih kuat daripada
   kalimat lengkap. "Dua kata. Satu pukulan." mengalahkan "Aplikasi ini
   bisa melakukan X, Y, dan Z untuk kamu".
2. **Hierarki atensi per adegan:** kalimat dulu, objek utama menyusul,
   detail paling akhir — jangan pernah terbalik.
3. **Teks panjang adalah bug.** Kalau sebuah klaim butuh > 6 kata,
   pecah jadi dua adegan atau ubah jadi visual (ikon, angka, mockup).
4. **Metadata bukan konten.** Nama package, URL panjang, versi, footnote —
   buang. Penonton awam tidak membacanya, penonton teknis tidak membutuhkannya.
5. **Mockup UI adalah pengecualian teks banyak** — layar aplikasi boleh penuh
   teks kecil karena ia dibaca sebagai GAMBAR, bukan sebagai teks. Justru
   itu: mockup harus setia pada aplikasi aslinya (font, warna, layout).
6. **Gerakan adalah kalimatnya juga.** Zoom masuk = penekanan; pan menyusur =
   pengungkapan bertahap; pull-back = reveal; bounce kecil = playful.
   Pilih gerakan yang searti dengan kalimatnya, jangan acak.
7. **Transisi ala motion designer, bukan preset editor.** Dua kegagalan
   umum: whip translasi menyingkap tepi ("pindah halaman"); spin/yaw kejut
   terbaca efek preset editor. Yang benar:
   (a) kamera BERNAPAS — drift zoom pelan tanpa henti, tak pernah
   menyentak; (b) perpindahan dikerjakan KOREOGRAFI ELEMEN yang keluar-
   masuk beririsan waktu; (c) OBJECT WIPE — sebuah elemen/ornamen menyapu
   dekat lensa menutup frame, adegan berganti di baliknya; (d) zoom cepat
   hanya bila TERMOTIVASI (menyelam ke layar mockup). Efek kejut apa pun
   (zoom/putar tiba-tiba + blur di tiap cut) adalah tanda bahaya.
8. **Kamera adalah pemersatu.** Sekali kamu punya rig kamera yang menggerakkan
   seluruh dunia, adegan-adegan terpisah terasa satu film. Tanpa itu,
   berapapun polesan per adegan, hasilnya tetap deck yang di-autoplay.
9. **Ritme keluar-masuk asimetris.** Masuk pelan-tegas (0.7–1.3 detik,
   `power4.out`), keluar cepat (0.35–0.55 detik, `power2.in`). Simetris
   terasa mekanis.
10. **Pilih 1–2 momen istimewa.** Efek paling mahal (pan 3D per kata, logo
    build-on) dipakai sekali-dua kali saja. Dipakai di semua tempat,
    berhenti terasa istimewa.
11. **Kalau ragu, gelapkan latarnya dan besarkan teksnya.** Kontras adalah
    produksi termurah yang paling sering dilupakan.

## Kalibrasi rasa (heuristik cepat)

Screenshot sebuah frame lalu tanya:

- Bisakah frame ini jadi slide korporat tanpa diubah? → gagal, rombak.
- Apakah mataku tahu harus melihat ke mana dalam 0,2 detik? → kalau tidak,
  kurangi elemen.
- Kalau semua teks disembunyikan, apakah latarnya masih menarik tapi tidak
  berisik? → keduanya harus ya.
- Apakah ada sesuatu yang BERGERAK karena kamera, bukan karena elemen
  menganimasikan dirinya sendiri? → harus ya di tiap transisi.

---

# Lampiran B: opener-konsep.md ( )

> Terapkan aturan adaptasi Bagian 8: gunakan Hybrid CDN dengan fallback lokal (`vendor/*.min.js`) dan kunci waktu secara lockstep ke `t = frameIndex / fps` (`masterGsapTl.time(t)`), abaikan player/debug/snap/export/AE bridge. Aturan Bagian 1 selalu menang.

# Konsep opener — pilih kerangka, jangan warisi kerangka

Dibaca untuk opener, promo produk, intro, dan teaser SEBELUM menulis rundown.

Tanpa pilihan kerangka, opener untuk produk berbeda cenderung keluar dengan susunan
yang sama — teks membesar dari zoom lalu keluar ke kiri, tiga tile ikon fitur, kotak
input yang diketik, lalu hook → fitur → fitur → janji → logo → CTA — walau palet dan
fontnya sudah berganti. Penyebabnya: pola yang pernah berhasil mudah ditiru, dan larangan yang
hanya punya satu perbaikan membuat semua jalan keluar mendarat di jawaban yang sama.
Hukum #3 mengunci kebaruan KULIT; dokumen ini mengunci kebaruan KERANGKA.

## Hukum kerangka

1. **Tiga kandidat, satu pilihan.** Sebelum rundown, tulis tiga kandidat konsep dari
   menu di bawah (atau konsep baru), masing-masing satu kalimat premis yang menyebut
   produknya. Pilih satu; alasannya dari sifat produk — _apa yang paling meyakinkan
   bila DILIHAT_, bukan apa yang paling mudah dibangun. Tunjukkan ketiganya ke user
   bersama style brief.
2. **Sidik jari struktur.** Tulis satu baris:
   `konsep · jumlah adegan · objek utama tiap adegan · pembuka · penutup`.
   Masukkan ke style brief dan ke pesan penutup, supaya proyek berikutnya bisa
   membandingkan.
3. **Berbeda dari opener sebelumnya.** Opener sebelumnya = yang ada di percakapan,
   memori, atau disebut user. Konsepnya harus berbeda, ATAU minimal tiga dari lima
   elemen sidik jari berbeda. Warna baru di atas urutan adegan lama tetap template.
4. **Komponen kanonik bukan default.** Daftar ini tidak dilarang, tetapi masing-masing
   hanya boleh muncul bila konsep menuntutnya, dan paling banyak DUA dalam satu opener:
   - teks yang diperbesar dari zoom lalu keluar ke kiri;
   - tiga tile/kartu fitur sejajar;
   - kotak input / searchbar yang diketik;
   - push-through kamera antar adegan;
   - light leak di titik cut;
   - logo + CTA bertumpuk di tengah sebagai adegan terakhir.
5. **Urutan baku bukan struktur standar.** Hook → fitur → fitur → janji → logo → CTA
   hanya satu kemungkinan, dan tidak boleh dipakai dua opener berturut-turut.
6. **Satu adegan tidak harus "kalimat + objek".** Adegan boleh tanpa teks (aksi
   produk), boleh teks saja (tipografi), boleh beberapa objek yang saling bereaksi.
   Yang dijaga tetap anti-PPT: bukan tiga tingkat teks, bukan section yang di-fade.
7. **Contoh bukan naskah.** Urutan babak di bagian konsep 13–19 adalah contoh cara merangkai
   bahasa geraknya, bukan naskah. Saat user meminta "style/konsep X":
   - ambil PRINSIP dan BAHASA GERAK-nya (bahan visual, cara transisi, ritme, warna), lalu
     susun babak baru dari produk dan audiens user;
   - pembuka dan penutup TIDAK sama dengan contoh konsep itu — pilih dari menu atau
     turunkan dari brand;
   - momen bertanda ✦ (momen khas) paling banyak satu, dan wajib ditransformasi:
     kata, bentuk, dan maknanya dari brand — bukan momen yang sama dengan objek diganti;
   - sidik jari hasil berbeda ≥ 3 dari 5 elemen dengan contoh sidik jari konsep itu;
   - palet, bentuk flat, dan properti selalu diturunkan dari logo, palet, dan dunia brand
     user; bila brand hanya punya satu warna, aksen dipilih dengan alasan tertulis;
   - bila user sendiri meminta satu momen contoh secara eksplisit, boleh dipakai — sebutkan
     bahwa momen itu diambil dari contoh.

## Menu konsep

| #   | Konsep                     | Premis                                                                                                                                                 | Struktur khas                                                                                                                                                                                                  | Kamera & transisi                                                                                                                       | Cocok untuk                                                  |
| --- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | Satu shot kontinu          | seluruh video satu ruang/benda tanpa cut                                                                                                               | 1 adegan panjang, 4–6 momen; teks menempel di permukaan dunia                                                                                                                                                  | kamera terus bergerak (dolly, orbit), perpindahan momen = kamera tiba di tempat baru                                                    | alat kreatif, hardware, brand ruang                          |
| 2   | Tipografi murni            | kata adalah subjek; tanpa mockup                                                                                                                       | kalimat membangun, pecah, dan menyusun ulang; di akhir huruf membentuk logo                                                                                                                                    | ritme dari audio, kata masuk dari 5+ arah berbeda                                                                                       | tagline kuat, event, rilis versi                             |
| 3   | Masalah → lenyap           | kekacauan dunia dirapikan satu aksi produk                                                                                                             | 1 adegan kacau yang memuncak → satu gerak produk → dunia bersih → logo                                                                                                                                         | kekacauan bergetar/menumpuk; aksi produk = satu gerak besar yang menyapu                                                                | produktivitas, utilitas, pembersih                           |
| 4   | Sebelum / sesudah          | perbedaan dilihat berdampingan                                                                                                                         | layar terbelah atau garis pembelah yang bergerak; tiap geseran = satu fitur                                                                                                                                    | garis pembelah adalah transisinya                                                                                                       | editor, filter, optimasi, before/after                       |
| 5   | Perjalanan di dalam UI     | kamera terbang di dalam antarmuka raksasa                                                                                                              | tombol jadi platform, kursor/jari jadi pemandu; fitur = tempat yang dilewati                                                                                                                                   | fly-through, parallax lapisan UI                                                                                                        | app dengan UI khas                                           |
| 6   | Makro produk               | close-up ekstrem, detail satu per satu                                                                                                                 | 4–6 detail, teks minim; produk utuh baru terlihat di akhir                                                                                                                                                     | rack focus, putar lambat, cahaya menyapu permukaan                                                                                      | hardware, kemasan, F&B, fashion                              |
| 7   | Metafora benda             | produk sebagai benda nyata yang berubah bentuk                                                                                                         | satu benda (kunci, benih, jembatan…) bertransformasi sepanjang video, berakhir jadi logo                                                                                                                       | morph adalah transisinya                                                                                                                | layanan abstrak: keamanan, cloud, finansial                  |
| 8   | Angka hidup                | satu angka besar menjadi cerita                                                                                                                        | angka berubah dan tiap perubahan menyingkap konteks (waktu dihemat, kecepatan, pengguna)                                                                                                                       | angka tetap di frame, dunia di belakangnya berganti                                                                                     | pencapaian, performa, milestone                              |
| 9   | Satu fitur, didemo penuh   | satu aksi terbaik dari awal sampai hasil                                                                                                               | input → proses → hasil memuaskan; fitur lain hanya kilasan di akhir                                                                                                                                            | mengikuti tangan/kursor, cut-in ke detail                                                                                               | app dengan satu keunggulan jelas                             |
| 10  | Tanya → jawab diegetik     | pertanyaan ditulis DI dunia, jawabannya aksi produk                                                                                                    | pertanyaan di papan/pesan/layar benda → produk menjawab dengan tindakan                                                                                                                                        | kamera pindah dari pertanyaan ke tempat jawaban                                                                                         | AI, pencarian, layanan bantuan                               |
| 11  | Kolase ritmis              | fragmen cepat mengikuti ketukan, kembali ke satu motif                                                                                                 | 12–20 potongan 0,3–0,8 dtk + motif berulang tiap 4 ketukan                                                                                                                                                     | cut-on-beat, match-cut bentuk                                                                                                           | musik, lifestyle, event, komunitas                           |
| 12  | Logo sebagai panggung      | bentuk logo membesar menjadi ruang                                                                                                                     | semua adegan terjadi di dalam geometri logo; akhir: kamera mundur, logo utuh                                                                                                                                   | kamera masuk ke lubang/lengkung logo                                                                                                    | brand dengan logo berbentuk kuat                             |
| 13  | Estafet benda              | satu benda berpindah melewati babak-babak layanan sampai tiba di penerima                                                                              | 4–6 babak (butuh → pilih → kumpulkan → kemas/proses → tiba); tiap babak satu aksi; tanpa teks selain brand yang menempel di benda                                                                              | tiap transisi DIBAWA benda itu (menu transisi di bawah); latar boleh berganti per babak                                                 | e-commerce, pengiriman, pesan-antar, marketplace, jasa       |
| 14  | Pamer sistem brand         | brand itu sendiri produknya: logo, simbol, maskot, stiker, tipografi, palet diperkenalkan sebagai satu keluarga                                        | 8–12 babak pendek tanpa cut: benda motif → logo → medan warna → manifesto → parade aset → maskot → manifesto 2 → halaman panduan brand → logo kembali (loop)                                                   | tiap babak lahir dari babak sebelumnya (menu transisi di bawah); dua medan warna penuh sebagai penanda bab                              | peluncuran/rebranding, komunitas, platform, agensi, startup  |
| 15  | Klaim → cara → hasil       | pengumuman fitur yang tenang: kalimat pendek, UI dipakai kursor, hasilnya mekar dari UI                                                                | siklus klaim (1–2,5 dtk) → cara di UI (2–6 dtk) → hasil (4–6 dtk), diulang per fitur; ditutup klaim kualitas, alamat, nama produk                                                                              | tanpa cut; wadah UI mekar jadi kartu hasil lalu menyusut jadi titik tempat kalimat berikut muncul                                       | fitur baru, AI generatif, alat kreatif, SaaS, kamera/editor  |
| 16  | Ekosistem UI hidup         | app/SaaS sebagai sistem kerja: alat yang berserakan dirapikan satu ikon produk, alurnya dipakai persona, hasilnya hidup, tim dan integrasinya terlihat | 12–16 babak 2–6 dtk: alat berserakan → ikon lahir → UI dirakit + dipakai → hasil + data → integrasi/peran → isi berganti → pernyataan + perangkat → ajakan                                                     | transisi dibawa UI (panel mekar, lencana menyusut, karusel jendela, ikon flip); cut keras maks dua sebagai penanda bab                  | SaaS B2B, asisten AI, workflow, dashboard, kolaborasi tim    |
| 17  | Pop flat berfoto           | brand gaya hidup yang ceria: orang nyata (foto potongan), bentuk flat, dan medan warna brand bergantian cepat                                          | 15–18 babak 0,3–3 dtk: sapaan → orang + stiker → wadah bentuk → aksi UI mengganti latar → peran pengguna → fitur meletup dari wadah → logo dirakit → brand di dunia nyata → huruf brand jadi panggung → ajakan | hampir tiap babak mengganti latar dengan pemicu (benda ke lensa, push ke bidang, ikon memenuhi frame, aksi UI); montase foto di ketukan | app konsumen, fintech, e-commerce, telko, kampanye anak muda |
| 18  | Menembus bentuk bergradien | satu bentuk milik brand diulang berlapis dan bercahaya; kamera atau bola cahaya menembus lapis demi lapis, tiap lapis membuka babak                    | 5–8 babak 2–4 dtk: gelap + titik cahaya → lapisan bentuk mekar/berputar → bola pemandu → terowongan lapisan → portal → simbol bercahaya → logo                                                                 | tanpa cut; tiap babak dimasuki lewat lubang bentuk babak sebelumnya                                                                     | tech, AI, musik, keamanan, fintech, peluncuran premium       |
| 19  | Tur produk berselang klaim | UI asli dipakai seperti tur, berhenti tiap beberapa detik di klaim pendek di medan warna brand                                                         | 9–11 babak 2–5 dtk: judul + objek di celah kata → tur UI → kartu diangkat → klaim → tur → belahan UI/klaim → diagram kartu → analitik → wordmark                                                               | dibawa UI (meredup, kartu terangkat, belahan layar); 1–2 cut                                                                            | SaaS, HR/tim, CRM, dasbor, keuangan bisnis                   |

Konsep boleh dipadukan dua (mis. 9 + 3: satu fitur yang merapikan kekacauan), tetapi
kerangkanya dari satu konsep induk.

## Estafet benda — menurunkannya dari brand

Konsep 13 paling mudah disesuaikan dengan brand karena isinya diambil dari perjalanan
layanan brand itu sendiri, bukan dari template:

1. **Peta perjalanan layanan jadi babak**: kebutuhan muncul → memilih → mengumpulkan →
   diproses/dikemas → tiba. Buang babak yang tidak khas brand; gabung yang terlalu tipis.
2. **Satu benda pahlawan** yang berganti wujud tetapi tetap dikenali: item di layar →
   kartu produk yang dipegang → benda nyata → isi kemasan → paket di tujuan.
3. **Aktor dari dunia brand, boleh tak terduga.** Tidak harus "orang memegang HP":
   penerima manfaat sebenarnya bisa menjadi aktornya (mis. hewan yang berbelanja untuk
   dirinya sendiri pada layanan hewan). Humornya lahir dari brand, bukan tempelan.
   Tangan/kaki/cakar yang masuk frame sudah cukup — tidak wajib tokoh utuh.
4. **Properti dari kategori produk brand.** Benda-benda kecil (camilan, alat, bahan,
   kemasan) diambil dari apa yang benar-benar dijual/dilayani brand; itu yang membuat
   opener terasa milik brand walau tanpa teks.
5. **Warna brand sebagai benang merah.** Warna utama brand ada di objek terpenting setiap
   babak (seragam, perangkat, kartu, kemasan), sedangkan latar boleh berganti terang ↔
   gelap ↔ putih per babak. Teknik fokus pembuka: dunia digambar garis abu-abu, hanya
   aktor/brand yang berwarna.
6. **Brand diegetik, end card tidak wajib.** Nama brand menempel di dunia (tulisan di
   dinding/meja, layar, label kemasan); penutup cukup aksi penerimaan.
7. **Ritme babak.** Pembuka dan penutup pendek (±2 dtk); babak memilih/mengumpulkan paling
   panjang (3–4,5 dtk). Tiap babak satu aksi utama yang terbaca tanpa suara dan tanpa teks.

## Pamer sistem brand — layout, warna, ritme

Konsep 14 cocok saat yang dijual adalah identitasnya (peluncuran, rebranding, komunitas).
Isinya diambil dari aset brand user sendiri — logo, simbol, maskot, bahasa komunitas,
halaman panduan brand — sehingga dua brand tidak mungkin menghasilkan video yang sama.

**Contoh urutan** (bukan naskah — Hukum kerangka #7):

1. Frame kosong → benda motif (bentuk logo dibuat tebal berlapis) naik dari tepi bawah,
   lapisannya menyusul satu per satu; stiker kepribadian menempel di sudutnya.
2. Benda memadat jadi satu ikon; isi ikon berganti cepat beberapa kali lalu berhenti di
   simbol brand; wordmark tersingkap dari balik simbol.
3. Logo diam di tengah; medan warna palet naik/menyapu bertingkat (sekunder sesaat, lalu
   utama penuh) dan logo berbalik warna di tempat mengikuti medan yang menutupnya.
4. Simbol sendirian di medan warna utama, bernapas dengan cahaya/aksen dari makna brand.
5. Kamera menembus simbol → latar netral; manifesto muncul kata per kata, 1–2 baris.
6. Parade aset (baris tile/ikon/maskot) masuk dari samping mendorong teks keluar; satu
   aset berhenti di tengah dan dikerubungi stiker.
7. Aset berputar sampai tipis; kartu medan warna kedua berputar membuka memenuhi frame;
   manifesto kedua.
8. Halaman panduan brand (logo, warna, tipografi, grafis, penerapan) naik bertumpuk dari
   bawah menutupi teks; halaman kosong terakhir menutup frame.
9. Simbol tumbuh dari satu titik; stiker meletup dari baliknya lalu ditarik kembali.
10. Simbol mendapat lapisan tebal yang sama dengan babak 1, lalu keluar lewat tepi bawah
    → frame kosong = frame pertama (loop).

**Layout**

- Satu sumbu tengah hampir di semua babak; objek utama ±25–35 % tinggi frame, sisanya
  ruang kosong.
- Teks kecil-sedang (±6 % tinggi frame per baris), maksimal dua baris, rata tengah,
  huruf kecil/sentence case, tracking rapat.
- Stiker (gelembung obrolan, label, emoji) menempel di sudut objek, miring ±8–15°,
  menumpang tepi objek, ukurannya ±25–40 % objek.
- Halaman panduan brand dipakai BESAR (70–90 % lebar frame) dan miring perspektif —
  dibaca sebagai gambar, bukan teks.

**Warna**

- Latar netral terang (putih bernuansa tipis, sedikit gradien) menguasai ±55 % luas
  layar sepanjang video; warna brand terasa keras karena jarang.
- Warna brand tampil PENUH hanya di dua babak (±3 dtk masing-masing) sebagai penanda
  bab: warna utama di babak logo, warna sekunder di babak manifesto kedua.
- Di luar dua medan itu, warna brand hanya menempel di objek (ikon, stiker, lapisan
  tebal). Objek 3D boleh bergradien mengilap supaya kontras dengan medan yang flat.
- Teks hampir hitam, baik di latar netral maupun medan warna; logo berbalik putih bila
  medan cukup jenuh.

**Ritme**

- Tanpa cut keras; 25–30 dtk, loop. Babak 2,5–4 dtk; dua puncak energi: medan warna
  utama masuk, dan kamera menembus simbol.
- Musik kontinu; tiap gerak besar jatuh di ketukan; manifesto muncul per kata mengikuti
  ketukan.

## Klaim → cara → hasil — layout, warna, ritme

Konsep 15 cocok saat yang dijual adalah kemampuan baru dan hasilnya bisa diperlihatkan.
Produknya sendiri tampil apa adanya: UI asli, kursor, hasil karya asli. Kemewahannya
datang dari menahan diri — hampir tanpa warna, tanpa hiasan, gerak pelan.

**Contoh urutan** (bukan naskah — Hukum kerangka #7)

1. Hasil karya produk dibuka sangat dekat dan buram, lalu menjauh mengecil dan memudar
   ke latar sementara kalimat klaim pertama muncul di bawahnya.
2. Klaim 1–2 baris; baris pendek "dengan [nama/logo produk]" menyusul.
3. Komponen UI (bar input, panel) muncul kecil tanpa bingkai perangkat, bergeser ke
   tengah, lalu kamera zoom ke bagian yang sedang dipakai.
4. Kursor besar menjadi aktor: menyeret aset ke slot, membuka menu, memilih opsi.
5. Slot hasil terlepas menjadi kartu abu kosong, mekar ke tengah, lalu kartu itu mulai
   memutar hasil dan membesar hampir memenuhi frame; kamera pelan menembus isinya.
6. Kartu menyusut sambil isinya terus di-crop masuk → pil → titik; kalimat klaim
   berikutnya muncul tepat di titik itu.
7. Babak 3–6 diulang untuk fitur kedua (dan ketiga bila ada), dengan komponen UI berbeda.
8. Klaim kualitas → alamat situs diketik → alamat terhapus → nama produk diketik,
   diam 2–3 dtk → pudar ke latar.

**Layout**

- Satu sumbu tengah. Teks satu gaya: grotesk netral bobot regular, sentence case, abu
  gelap; tinggi baris ±8 % tinggi frame, maksimal dua baris, lebar blok 30–65 %.
- Font teks = font UI produk sendiri, supaya video terasa sebagai perpanjangan produk
  (pengecualian dari "font display berkarakter" di Hukum #3).
- UI melayang tanpa bingkai perangkat, sudut membulat, bayangan lembut lebar; saat
  demo UI di-zoom sampai ±80 % lebar frame dan hanya bagian yang dipakai terlihat.
- Kartu hasil saat puncak 75–90 % lebar dan tinggi frame, sudut membulat, bayangan
  lembut; isinya selalu bergerak.

**Warna**

- ±80 % luas layar putih hangat yang tidak murni, ±15 % abu netral (UI, bayangan),
  ±5 % warna. Warna HANYA datang dari hasil karya produk; logo dan UI monokrom.
- Latar tetap berlapis walau nyaris putih: putih hangat + cahaya radial lebih terang di
  tengah + satu garis rambut lengkung yang sesekali melintas di belakang teks.
- Cocok untuk produk yang hasilnya berwarna. Bila hasil produk tidak visual, pakai
  konsep lain.

**Ritme**

- Tanpa cut, gerak tenang (ease in-out 0,8–1,2 dtk), perubahan frame per detik kecil.
  Klaim 1–2,5 dtk, cara 2–6 dtk, hasil 4–6 dtk; siklus 2–3 kali; penutup 4–5 dtk.
- Kata klaim muncul berurutan dari buram-abu ke tajam-gelap; kalimat keluar dengan
  meredup ke abu dulu, baru hilang.

## Menembus bentuk bergradien — layout, warna, ritme

Konsep 18 cocok untuk brand yang ingin terasa dalam dan misterius dengan sedikit kalimat.
Kerangkanya dari satu bentuk milik brand — siluet logo, huruf, simbol, atau bentuk dari
makna produk (lubang kunci untuk keamanan, lengkung untuk pintu/akses) — yang diulang
berlapis. Pilih bagian yang cocok dengan produk.

**Contoh urutan** (bukan naskah — Hukum kerangka #7)

1. Gelap; satu titik cahaya kecil muncul.
2. Titik mekar menjadi lapisan bentuk bergradien yang berputar pelan (kelopak berulang,
   cincin, lengkung berlapis).
3. Bola cahaya/kaca kecil memantul masuk dan menjadi pemandu mata.
4. Kamera mengikuti bola menembus lapisan garis tipis (lengkung atau bingkai berulang)
   seperti terowongan.
5. Bentuk kecil (segitiga, kubus, sapuan) mengorbit sebentar — isi produk dalam bahasa
   abstrak.
6. Portal/lubang bentuk terbuka; di dalamnya simbol atau objek brand bercahaya.
7. Kamera menembus lubang ke gelap → logo, atau objek jatuh ke podium.

**Layout**

- Satu sumbu tengah; lapisan bentuk 80–120 % tinggi frame (terpotong tepi), pusatnya
  sedikit di atas atau di bawah tengah.
- Bola pemandu kecil (±3–6 % tinggi frame) adalah satu-satunya objek tajam yang bergerak
  cepat.
- Teks sangat sedikit: kecil di sisi objek, atau tidak ada sampai logo.

**Warna**

- Dasar gelap atau warna dalam dari palet brand ±60–70 % luas; gradien bercahaya dari satu
  warna terang palet ke warna dasar, atau dua warna berjauhan yang bergantian per lapisan.
- Butiran halus di seluruh frame (grainy gradient, `techniques.md` §7d).
- Satu aksen cahaya hanya di bola pemandu dan inti portal.

**Ritme**

- Tenang: ease in-out 1–2 dtk, lapisan berputar 10–20° per detik, kamera masuk 0,8–1,2 dtk
  per lapisan. Tanpa cut; puncak saat menembus portal.

## Pop flat berfoto — layout, warna, ritme

Konsep 17 cocok untuk brand konsumen yang menjual rasa: ceria, dekat, sehari-hari.
Kerangkanya dari tiga bahan milik brand user: foto orang (pengguna/duta), bentuk flat
yang diturunkan dari logo, dan palet brand yang dipakai sebagai medan warna penuh.
Pilih bagian yang cocok — jangan disalin utuh.

**Bahasa gerak gaya ini** (yang diambil saat user meminta "flat pop berfoto")

- foto orang potongan yang pop elastis dan sering terpotong tepi bawah;
- bentuk flat turunan logo sebagai wadah foto, stiker, dan sinar;
- medan warna brand yang berganti cepat dengan pemicu terlihat;
- teks dua skala: label kecil yang menempel di objek dan kata besar di belakang objek;
- montase di ketukan dengan posisi subjek tetap.
  Babak di bawah hanya contoh cara SATU video merangkai bahasa itu.

**Contoh urutan** (bukan naskah — Hukum kerangka #7; ✦ = momen khas, maksimal satu dan wajib ditransformasi)

1. ✦ Frame terang kosong; sapaan pendek diketik, satu hurufnya direnggangkan berulang
   sampai memenuhi lebar frame, ditutup emotikon.
2. Orang (foto potongan) pop dari bawah; properti berwarna brand menempel (aksesori,
   stiker); pil label kata di sekitar kepala; bentuk flat kecil (hati, bintang) meletup naik.
3. Pil label tunggal di tengah mekar menjadi wadah bentuk (blob/lingkaran) berisi orang
   berikutnya; sinar atau petir flat meledak di belakangnya.
4. Orang berikutnya dalam bingkai persegi membulat berwarna brand; bingkai lama terdorong
   keluar; kamera push ke bidang warna sampai warna itu menjadi latar penuh.
5. ✦ Satu elemen UI (toggle/tombol) di medan warna; saat diaktifkan, warna latar ikut
   berubah — latar berganti karena aksi, bukan karena cut.
6. Elemen UI mengecil masuk ke layar ponsel di tangan.
7. ✦ Kata raksasa (peran/profesi pengguna) terpotong tepi di belakang orang; kata, orang,
   dan isi layar ponsel berganti bersama 2–4 kali.
8. Masalah kecil: satu kata + benda (laptop/tas penuh stiker) di latar terang; benda
   terbang ke lensa dengan motion blur → medan warna kedua.
9. Map/kotak jatuh dari atas, lalu ilustrasi fitur (grafik, kantong uang, kartu foto)
   meletup dari dalamnya.
10. Satu kartu foto membesar memenuhi frame → orang di latar putih.
11. Ikon app muncul di atas orang dan membesar menjadi medan warna; potongan bentuk logo
    berputar; medan warna palet bergantian cepat (0,2–0,3 dtk per warna).
12. ✦ Wordmark dirakit di medan warna: grid konstruksi tipis, huruf outline hantu tersebar,
    huruf terbang ke tempatnya satu per satu; kamera zoom sampai huruf terpotong tepi.
13. Brand di dunia nyata: foto lokasi/tempat pakai berganti cepat, stiker/penanda brand
    tetap di posisi yang sama.
14. Merchandise brand dipakai orang, huruf/simbol brand pucat raksasa di belakang.
15. Brand di ruang publik (papan iklan malam) — satu-satunya latar gelap.
16. ✦ Huruf/simbol brand raksasa sebagai panggung: orang berpose menembus bentuknya
    (sebagian di depan, sebagian di belakang), warna huruf bergantian per ketukan.
17. Penutup: ponsel masuk dari samping, wordmark di sudut, tagline kata per kata,
    kelompok orang bersorak, satu stiker kecil.

**Layout**

- Orang besar: 60–100 % tinggi frame, sering terpotong tepi bawah, posisi asimetris
  (kiri/kanan tengah); satu frame = satu orang + 1–3 elemen flat.
- Teks dua skala saja: pil label kecil (±5 % tinggi frame) yang menempel di objek, dan
  kata raksasa (±30–35 % tinggi frame) di belakang orang, terpotong tepi.
- Bentuk flat — termasuk wadah yang memotong foto — diturunkan dari geometri logo user
  (sudut, lengkung, huruf, ketebalan garis). Logo bersudut tajam menghasilkan wadah bersudut,
  bukan otomatis blob, pil, atau bingkai membulat.
- Wordmark dan huruf panggung selalu milik brand user.

**Warna**

- Warna brand user tampil sebagai medan penuh, bergantian dengan netral terang/gelap yang
  juga dari brand. 1–2 aksen diambil dari palet brand; bila brand hanya punya satu warna,
  pilih aksen dengan alasan tertulis di style brief — bukan meniru pasangan warna contoh.
  Aksen hanya di stiker, label, kata besar, dan sinar.
- Bentuk flat tanpa gradien; foto asli jenuh; ilustrasi 3D lembut boleh berbayang halus.
- Latar berganti sering (dalam contoh ±12 kali per 30 dtk) dan SELALU dengan pemicu:
  benda menutup lensa, push ke bidang warna, aksi UI, ikon membesar, medan menyapu,
  cut di ketukan. Paling banyak satu adegan gelap.
- Medan flat sah di sini tanpa tekstur karena berganti cepat dan selalu terisi objek
  bergerak (pengecualian `techniques.md` §7d).

**Ritme**

- 30 dtk, ±25 shot, rata-rata ±1,2 dtk. Babak perkenalan orang 1,5–3 dtk; montase foto
  (lokasi, merchandise, huruf panggung) 0,3–0,8 dtk di ketukan.
- Stiker, pil, dan bentuk kecil pop elastis (back.out); medan warna snap cepat
  (0,15–0,3 dtk); kamera push/zoom hanya untuk masuk ke bidang warna.

**Jaga-jaga**

- Foto orang dari user, generate lewat MCP, atau stok berlisensi — ditanyakan dulu ke user;
  alur lengkapnya di bagian "Foto dalam opener". Potongan bersih tanpa sisa latar.
- Jangan menyalin bentuk, huruf, properti, atau kalimat referensi — huruf panggung,
  stiker, dan kata raksasa diturunkan dari brand dan audiens user.

## Foto dalam opener — sumber aset, persiapan, animasi

Opener tidak harus ikon atau ilustrasi: foto orang, tempat, dan produk nyata membuat brand
terasa dekat (konsep 17; juga cocok untuk 3, 4, 6, 9, 13). Skill tidak boleh mengarang
foto yang sah, jadi sumbernya diputuskan BERSAMA user sebelum membangun.

**1. Tanyakan sumber foto dulu** (satu pertanyaan, sebelum style brief final)

- **Foto dari user** (prioritas): foto brand, duta, pengguna, tempat usaha, atau produk.
  Pastikan user berhak memakainya dan orang di foto setuju tampil.
- **Generate lewat MCP Higgsfield** bila user tidak punya foto dan menyetujuinya.
- **Stok berlisensi** yang disediakan atau disetujui user.
- Tanpa foto: pilih konsep lain atau gaya render ilustrasi (`techniques.md` §7e) — jangan
  diam-diam mengganti foto dengan ilustrasi yang tidak disepakati.

**2. Daftar shot** — tulis di style brief sebelum meminta atau men-generate foto: tiap
babak butuh foto apa (orang pop dari bawah, bersorak, menunjuk ke samping, memegang
ponsel, tangan memegang produk, lokasi pakai, merchandise), orientasi, dan ruang kosong
untuk teks. User yang memberi foto sendiri juga dibantu daftar ini.

**3. Generate via MCP (bila disetujui)**

- `generate_image` dengan satu blok gaya untuk semua shot: foto studio, pencahayaan yang
  sama, latar polos yang kontras dengan baju dan rambut, framing (full body / setengah
  badan), pose, ekspresi. Latar polos memudahkan potongan.
- Konsistensi orang: satu persona per peran; pakai gambar referensi/karakter yang sama
  untuk semua pose supaya wajah dan pakaian tidak berubah antar babak.
- Wajah fiktif — jangan meniru orang nyata, selebriti, atau karyawan brand tanpa izin.
  Busana boleh berwarna brand; logo dan teks brand ditambahkan di kode (stiker/lapisan),
  bukan di-generate, karena teks buatan generator sering rusak.
- Generate satu batch per gaya, lalu tunjukkan hasilnya ke user sebelum dianimasikan.
- `remove_background` → PNG transparan. Bila subjek ikut terhapus atau tepi rambut rusak,
  generate ulang dengan latar lebih kontras — jangan dipaksa.
- Foto lokasi/tempat pakai: foto dokumenter sudut mata, tanpa teks dan merek; penanda
  brand ditempel di kode.

**4. Persiapan foto** (dari user maupun hasil generate)

- Resolusi ≥ 1,5–2× ukuran tampil terbesar — zoom dan push kamera butuh cadangan piksel.
- Pangkas margin transparan (bbox alpha) supaya ukuran CSS = isi; periksa halo putih di
  tepi potongan pada perbesaran 200 %.
- Samakan rasa warna antar foto dengan satu grade tipis yang sama (mis. `filter:
saturate() contrast()` atau tint palet `soft-light` beropasitas rendah) supaya foto dari
  sumber berbeda terasa satu kampanye.
- Bayangan kontak lembut untuk orang yang "berdiri" di latar; tanpa bayangan untuk orang
  yang terpotong tepi bawah.

**5. Menganimasikan foto supaya tidak diam**

- Orang pop dari bawah dengan overshoot (`back.out`) dan rotasi kecil −4° → 0°, lalu drift
  halus (scale 1 → 1,02) selama ditahan.
- Parallax 2–3 lapis: bentuk flat di belakang, orang di tengah, stiker/pil di depan; kamera
  bergeser dan tiap lapis bergerak dengan kecepatan berbeda.
- Wadah memotong foto: foto dimask blob/bingkai membulat yang mekar. Orang boleh keluar
  bingkai (kepala/tangan melewati tepi) dengan dua salinan: satu dimask wadah, satu
  potongan bagian atas tanpa mask.
- Menembus huruf/bentuk brand: bentuk utuh di belakang orang dan salinan bentuk di depan
  yang dimask sebagian, sehingga orang tampak berpose menembus bentuk.
- Montase di ketukan: posisi dan skala orang tetap, fotonya berganti tiap 0,3–0,8 dtk.
- Ken Burns saja tetap ditolak (SKILL.md larangan struktural); foto latar penuh memakai
  parallax atau kamera yang benar-benar bergerak.

**6. Video sebagai pelengkap** — sumber ditanyakan dengan cara yang sama (file user, generate
lewat MCP dengan cek biaya, atau stok). Contoh di opener: rekaman layar produk di dalam mockup
perangkat pada promo SaaS, B-roll orang memakai produk di dalam wadah bentuk, satu klip
penekanan di antara adegan animasi. Klip dipasang sebagai layer footage yang terikat timeline
(`techniques.md` §9b), bukan video yang diputar sendiri.

## Tur produk berselang klaim — layout, warna, ritme

Konsep 19 cocok untuk app/SaaS yang kekuatannya ada di alur pakai sehari-hari (dasbor,
direktori, profil, laporan). UI asli dipakai seperti tur, dan setiap beberapa detik tur
berhenti di satu klaim pendek di medan warna brand. Pilih bagian yang cocok.

**Contoh urutan** (bukan naskah — Hukum kerangka #7)

1. Judul dengan objek di celah kata: dua kata judul mengapit tumpukan kecil kartu UI,
   kalimat kecil di bawahnya. Kamera zoom hentak ke kartu (blur radial kuat, ±0,5 dtk)
   lalu kembali ke komposisi yang sama.
2. Judul larut ke dasbor penuh yang tampil dari dekat; kamera mundur pelan lalu mendorong
   ke satu widget.
3. Kartu diangkat keluar: UI meredup ke abu, widget terangkat melayang, dan latar di
   belakangnya berubah menjadi gradien warna brand; kartu kedua terbang masuk dengan
   rotasi 3D dan mendarat di bawahnya; isinya terisi stagger.
4. Kartu memudar naik; klaim dua ketukan muncul per kata di medan warna — dua kalimat
   sangat pendek, baris kedua menyusul.
5. Klaim meredup → UI kembali: kursor membuka menu, daftar muncul, satu baris dipilih.
6. Panel detail muncul di atas daftar; daftar meredup dan latar kembali menjadi medan warna.
7. Layar terbelah: kiri panel terang berisi potongan kartu, kanan medan warna berisi klaim
   kedua per kata; lalu belahan menutup menjadi zoom dekat ke tombol yang diklik kursor.
8. Halaman detail penuh; kamera geser ke satu bagian.
9. UI meledak menjadi diagram: kolom bagian itu terlepas menjadi kartu yang terhubung garis
   (induk → anak) di latar pucat; satu kartu membesar, yang lain buram.
10. Klaim ketiga di atas dua kartu analitik yang bar dan angkanya menghitung naik.
11. Gelap ke medan warna tua; wordmark mengecil dari buram ke tajam, tagline per kata,
    cincin konsentris samar di latar.

**Layout**

- Judul/klaim satu sumbu tengah, grotesk netral semibold, 1–2 baris pendek (2–4 kata per
  baris), tinggi baris ±6–8 % tinggi frame; kalimat pengantar ±3 %.
- UI tampil dua skala: penuh layar (tur) dan kartu lepas 25–40 % lebar frame (sorotan),
  sudut membulat, bayangan lembut.
- Belahan layar 50/50 atau 55/45; teks selalu di belahan warna, UI di belahan terang.
- Diagram kartu: induk di atas tengah, 3 anak sejajar di bawah, garis penghubung tipis.

**Warna**

- Tiga keadaan latar yang berganti per babak, selalu dipicu UI (meredup, kartu terangkat,
  belahan): putih/krem hangat untuk judul dan tur (±40 % durasi), gradien warna brand
  gelap → terang di bawah untuk klaim dan kartu lepas (±45 %), versi sangat pucat warna
  brand untuk diagram dan analitik (±15 %).
- Warna brand juga warna tombol/aksi di UI, sehingga medan warna terasa lahir dari produk.
- Aksen lain hanya dari data UI (bar, label kecil).
- Penutup: medan warna brand paling tua, flat dengan cincin samar.

**Ritme**

- 25–30 dtk, 10–11 babak 2–5 dtk; hanya 1–2 cut, sisanya dibawa UI.
- Satu hentakan energi di pembuka (zoom hentak); sisanya tenang, ease in-out 0,8–1,2 dtk.
- Klaim per kata naik dari buram (±0,12–0,15 dtk per kata), tahan 1,5–2 dtk, keluar
  meredup ±50 % dulu lalu hilang.
- Berselang: UI → klaim → UI → klaim → UI → klaim → logo; tidak ada dua klaim berturut.

## Animasi UI untuk app & SaaS — layout, warna, ritme

Untuk produk aplikasi atau SaaS, bukti paling meyakinkan adalah produknya BEKERJA. Apa
pun konsep induknya (5, 9, 10, 15, 16…), opener app/SaaS punya minimal satu babak UI
hidup: UI dirakit, dipakai, dan menghasilkan sesuatu — bukan screenshot diam yang
di-zoom. Konsep 16 menjadikan animasi UI tulang punggung seluruh video.

**Yang wajib hanya itu.** Semua isi bagian ini — kursor, avatar, lencana, karusel,
perangkat, angka layout dan proporsi warna — adalah perbendaharaan, bukan resep. Pilih
yang cocok dengan produk; palet, latar, dan gaya tetap diturunkan dari brand (Hukum #3).

**Membangun UI untuk animasi**

- Susun ulang UI produk user sebagai komponen DOM/vektor yang disederhanakan, bukan
  tangkapan layar: judul, tombol, dan label yang diceritakan tetap terbaca; teks kecil
  lain menjadi garis abu membulat.
- Komponen, warna, istilah, dan font diambil dari produk user sendiri (font UI = font
  produk). Bila user belum punya UI, rancang UI minimal yang masuk akal untuk
  kategorinya dan tunjukkan dulu bersama style brief.
- Satu layar = satu tugas: satu panel, satu aksi, satu hasil. Bagian yang tidak dipakai
  di-crop keluar frame atau diburamkan.
- Panel mengambang tanpa bingkai perangkat: kartu putih, sudut membulat, bayangan lembut
  lebar yang jatuh jauh di bawah (bukan garis tepi). Perangkat (laptop/ponsel) disimpan
  untuk babak pernyataan dan penutup.
- Pemicu aksi bebas dipilih: kursor biasa, jari/tap untuk app ponsel, atau tanpa kursor
  sama sekali (UI bereaksi sendiri). Salah satu variasi OPSIONAL: kursor persona — panah
  kursor dengan avatar bulat pengguna di sampingnya, dipakai bila penting menunjukkan
  SIAPA yang bekerja (avatar dari user atau dibuat baru).
- Data selalu hidup: bar mengisi berurutan, progres bertingkat, angka berjalan, baris
  daftar muncul stagger (deterministik, `techniques.md` §9).
- Kamera ikut interaksi bila perlu: sebelum klik penting kamera mendekat ke area target,
  klik terbaca besar, lalu mundur/geser ke hasilnya (`techniques.md` §8). Tidak di setiap
  klik — babak UI yang tenang boleh lebar saja, asal video tidak terasa statis.

**Contoh urutan — konsep 16** (bukan naskah — Hukum kerangka #7; alur diambil dari produk user)

1. Alat lama berserakan: jendela dan berkas melayang di bidang miring 3D, kamera drift.
2. Ikon produk lahir dari balik tumpukan: simbol berputar sendirian, lalu wadah ikon
   aplikasi tumbuh di belakangnya.
3. Ikon naik mengecil; judul muncul; UI dirakit (input, chip saran); pemicu aksi (kursor,
   jari, atau UI sendiri) menjalankannya.
4. Panel mekar ke langkah berikut: unggah/pilih → proses dengan progres.
5. Hasil: dokumen/dashboard dengan data yang mengisi; kamera geser pelan.
6. Hasil dikunci ke lencana yang menyusut sampai tinggal ikon; lencana integrasi menempel.
7. Siapa yang memakai: avatar peran + pil label pop tersebar.
8. Ekosistem: jendela dan ikon berkas pop, lalu melengkung menjadi karusel di sekitar ikon.
9. Isi berganti, wadah tetap: satu dokumen, judul kasus pakai berganti 3–5 kali.
10. Kalimat manfaat + baris chip kemampuan yang berjalan.
11. Sisi ikon 3D raksasa lewat sebagai medan warna → ikon mundur → letupan & orbit
    integrasi.
12. Pernyataan posisi di samping ikon; perangkat masuk mendorong kalimat, ikon terbang ke
    layarnya, jendela UI keluar dari layar.
13. Babak masalah (opsional): satu benda simbol gelap besar + kalimat masalah.
14. Penutup: perangkat di atas alas berputar pelan dengan UI asli, ikon + kalimat ajakan
    kata per kata di sisinya; ikon membesar ke lensa sebagai bumper.

**Menu gerak UI** (pilih yang dituntut alur produk; jangan semua)

- **Perakitan komponen**: judul → bar input mekar dari tengah → placeholder diketik →
  baris chip saran menyusul stagger dari bawah.
- **Klik yang terasa**: kursor tiba dengan ease-out, berhenti ±0,2 dtk, tombol tertekan
  (scale .92 → 1), baru layar bereaksi; bila klik itu penting, kamera mendekat sebelum
  klik dan mundur/geser sesudahnya.
- **Panel mekar ke langkah berikut**: panel yang diklik membesar dan isinya berganti
  menjadi layar langkah berikutnya — satu wadah, bukan ganti slide.
- **Berkas terbang ke dropzone**: thumbnail berkas dibawa kursor ke area unggah; begitu
  jatuh, baris progres analisis mengisi satu per satu.
- **Grafik mengisi berurutan**: bar horizontal tumbuh dari kiri dengan stagger ±0,08 dtk;
  warna data bergradasi dari warna brand ke warna kedua.
- **Jendela melayang miring 3D**: jendela UI dan kartu tabel pada bidang miring
  (rotateX 20–35°, rotateZ −10…−20°); ikon jenis berkas/integrasi menempel di sudutnya.
- **Karusel jendela**: jendela melengkung membentuk silinder yang berputar mengelilingi
  ikon produk; ikon flip di tengah.
- **Isi berganti, wadah tetap**: satu panel diam; judul di atasnya berganti dengan roll
  vertikal (lama naik memudar, baru naik dari bawah) dan glyph ikonnya flip — tiap
  ±1,5 dtk. Banyak kasus pakai tanpa menjejer kartu.
- **Chip berjalan**: 2–3 baris chip kemampuan/template bergeser horizontal pelan, arah
  bergantian per baris; tiap chip punya garis aksen warna di tepi kiri.
- **Peran pop + pil label**: avatar bulat pop satu per satu di posisi tersebar asimetris;
  dari tiap avatar garis tipis terbentang lalu menjadi pil label peran.
- **Lencana integrasi**: produk dan layanan terhubung masing-masing di lencana bulat
  putih; lencana kedua mekar dari titik lalu menempel di samping yang pertama.
- **Letupan & orbit integrasi**: ikon layanan meletup keluar dari ikon produk, melayang
  tersebar, lalu tersedot kembali.
- **Ikon app 3D tebal**: ikon produk punya ketebalan sisi yang terlihat saat berputar;
  dipakai sebagai pemisah bab dan bumper penutup.
- **Perangkat membawa UI**: perangkat masuk dari tepi mendorong kalimat keluar; ikon flip
  dan terbang ke layarnya; jendela UI keluar dari layar dan melayang di sekitarnya.
- **Kartu diangkat keluar**: UI meredup ke abu, satu widget terangkat melayang di depan,
  latar di belakangnya berubah menjadi medan warna brand.
- **UI meledak menjadi diagram**: kolom satu bagian terlepas menjadi kartu yang terhubung
  garis induk → anak.
- **Fokus kedalaman**: satu kartu membesar tajam, kartu lain mengecil dan buram.
- **Layar terbelah UI / klaim**: belahan terang berisi potongan UI, belahan warna berisi
  klaim; belahan menutup menjadi zoom ke detail berikutnya.

**Layout** (angka titik tolak, bukan target)

- Contoh: latar satu bidang abu sangat terang hampir di semua babak dan kartu UI putih
  murni yang terangkat hanya oleh bayangan. Latar gelap, berwarna brand, atau bergradien
  sama sahnya bila brand memintanya; latar tetap bergerak (§7c) dan boleh berganti warna
  per bab.
- Satu objek fokus per momen: ikon produk ±15–27 % tinggi frame, panel UI demo 60–90 %
  lebar frame, perangkat ±45–55 % lebar.
- Teks satu gaya: grotesk geometris bobot regular, sentence case, hampir hitam; tinggi
  baris ±6 % tinggi frame, 1–2 baris. Teks tidak ditumpuk di atas UI — ia berdiri di SISI
  objek (kiri ikon/perangkat, atau di atas panel sebagai judul); ikon produk boleh menjadi
  "kata terakhir" kalimat.
- Chip dan tombol yang merupakan bagian UI boleh banyak; itu antarmuka, bukan badge
  dekoratif.

**Warna** (proporsi titik tolak; warnanya dari brand)

- Contoh: ±86 % luas layar putih/abu sangat terang, ±7 % abu sedang (garis teks UI, bayangan),
  ±2 % gelap (teks), ±4 % warna brand (ikon, tombol, pil, bar). Warna lain hanya dari
  data (gradien grafik) dan ikon integrasi.
- Warna brand memenuhi layar hanya sekali atau dua kali, sebagai permukaan ikon 3D
  raksasa yang lewat di depan kamera — itulah penanda bab.
- Satu benda gelap besar boleh muncul sekali di babak masalah supaya kontras emosinya
  terasa.

**Ritme**

- 50–60 dtk, 12–16 babak 2–6 dtk; musik kontinu tanpa VO — semua terbaca tanpa suara.
- Hampir semua perpindahan dibawa UI (menu transisi di bawah); cut keras paling banyak
  dua, masing-masing menandai bab.
- Kalimat muncul kata per kata dari abu muda/buram ke gelap tajam (±0,12–0,2 dtk per
  kata); saat kalimat berganti, kata baru masuk sementara kata lama memudar dan baris
  ikut bergeser.
- Tanpa kata sorotan: penekanan datang dari ikon di samping kalimat, urutan kata, dan jeda.

**Jaga-jaga**

- Logo layanan pihak ketiga hanya bila produk user memang terintegrasi dan user setuju
  menampilkannya; selain itu pakai ikon jenis berkas generik (dokumen, tabel, surat,
  grafik).
- Istilah, kalimat, nama template, dan data diambil dari produk user — jangan menyalin isi
  UI referensi.
- Screenshot asli boleh sebagai isi layar perangkat di babak penutup; demo di babak inti
  tetap komponen yang bisa dianimasikan.

## Menu transisi yang dibawa benda

Transisi tanpa cut yang dibawa objek; melengkapi menu `techniques.md` §4c.

- **Benda adegan berikutnya menjadi wipe**: perangkat/pintu/kemasan adegan baru naik dari
  tepi frame menutup adegan lama, dan kamera sudah berada di adegan barunya.
- **Keluar dari layar**: item yang dipilih terangkat ke arah kamera, layar melengkung atau
  terlipat menjauh, dan item itu kini benda nyata di dunia baru.
- **Match cut bentuk + ganti gaya render**: benda berwarna di latar gelap → cut ke bentuk
  yang sama sebagai garis outline di latar putih → mendapat warna lagi saat babak berjalan.
- **Tarik mundur menyingkap tujuan**: subjek mengecil ke tengah sementara lingkungan
  tersusun di sekelilingnya (teras, pintu, ruang) — benda ternyata sudah tiba.
- **Tangan penjemput**: tangan/kaki masuk frame mengambil benda; gerakan itu menutup satu
  babak dan membuka babak berikutnya.
- **Medan warna bertingkat + logo berbalik warna**: bidang warna palet naik/menyapu dua
  langkah (sekunder sesaat, lalu utama) dan MENJADI latar babak baru; logo tetap di tempat,
  warnanya berbalik tepat di garis medan. Bukan balok dekoratif yang lewat — medan itu tinggal.
- **Menembus simbol**: simbol membesar cepat ke lensa dengan blur; cahayanya menjadi latar
  babak berikutnya.
- **Parade mendorong**: baris objek masuk dari samping dan menabrak teks keluar frame.
- **Putar tipis → kartu warna membuka**: objek berputar sampai edge-on lalu hilang; kartu
  medan warna muncul edge-on dan berputar membuka memenuhi frame.
- **Halaman naik bertumpuk**: halaman/kartu besar naik dari bawah bergantian menutup babak;
  halaman kosong terakhir menjadi latar bersih.
- **Titik tumbuh**: babak baru dimulai dari satu titik warna yang membesar menjadi simbol.
- **Wadah mekar / menyusut**: slot UI terlepas jadi kartu kosong, mekar ke tengah, lalu
  mulai memutar hasil; di akhir kartu menyusut (isi terus di-crop masuk) → pil → titik,
  dan kalimat berikut muncul di titik itu.
- **Hasil menjauh jadi kalimat**: hasil karya mengecil, buram, memudar ke latar sambil
  kalimat muncul di bawahnya — irisan waktunya ±0,4 dtk.
- **Zoom ke potongan UI**: kamera mendekat ke bagian UI yang sedang dipakai kursor dan
  ikut bergeser bersama kursor; bagian lain keluar frame dengan sendirinya.
- **Meredup lalu berganti**: kalimat berubah abu terang dulu, baru hilang; kalimat baru
  muncul di posisi yang sama.
- **Hapus-ketik**: teks lama terhapus huruf demi huruf dari kiri, teks baru (mis. alamat
  → nama produk) diketik di posisi yang sama.
- **Lencana menyusut**: layar UI terkunci di dalam lencana bulat/bergerigi yang menyusut;
  isinya terus di-crop sampai tinggal ikon produk di tengah lencana.
- **Panel mekar ke langkah berikut**: tombol diklik → panel yang sama membesar memenuhi
  frame dan isinya berganti menjadi layar berikutnya.
- **Jendela melengkung jadi karusel**: jendela datar melengkung ke silinder yang berputar;
  saat berhenti, satu jendela lurus menjadi panel babak berikut.
- **Sisi ikon 3D sebagai wipe**: bidang warna brand menyapu frame dan ternyata permukaan
  ikon 3D raksasa yang berputar lalu mundur; babak baru sudah di belakangnya.
- **Perangkat mendorong kalimat**: perangkat masuk dari tepi, kalimat terdorong keluar
  sambil memudar, ikon terbang ke layar perangkat.
- **Ikon flip ganti isi**: ikon berputar sampai edge-on; di sisi baliknya glyph dan judul
  sudah berganti.
- **Benda keluar ke sudut**: benda besar babak lama terbang ke sudut atas dan kalimatnya
  buram keluar, sementara objek babak baru sudah naik dari bawah.
- **Pil mekar jadi wadah foto**: pil label di tengah membesar menjadi blob/bingkai yang
  berisi orang berikutnya.
- **Push ke bidang warna**: kamera mendorong masuk ke bingkai berwarna sampai warnanya
  menjadi latar babak berikut.
- **Aksi UI mengganti latar**: toggle/tombol diaktifkan dan warna latar berubah mengikuti
  state-nya.
- **UI masuk ke ponsel**: elemen UI besar mengecil ke layar ponsel yang naik di tangan.
- **Benda ke lensa**: benda terbang ke kamera dengan motion blur dan membuka medan warna.
- **Wadah meletupkan isi**: map/kotak jatuh dan mendarat, lalu isinya meletup keluar.
- **Kartu foto memenuhi frame**: satu kartu di kolase membesar menjadi adegan berikut.
- **Ikon menjadi medan**: ikon app membesar melewati tepi frame; warnanya menjadi latar.
- **Medan warna bergantian**: 3–4 medan palet snap/menyapu 0,2–0,3 dtk dengan logo tetap
  di tengah, warnanya berbalik mengikuti medan.
- **Penanda tetap, dunia berganti**: stiker/logo di posisi yang sama sementara foto di
  belakangnya berganti per ketukan.
- **Menembus lubang bentuk**: kamera mendorong ke lubang (kunci, portal, huruf) sampai gelap
  di dalamnya menjadi latar babak baru.
- **Gema bentuk logo**: siluet logo diulang berlapis konsentris dengan warna bergantian,
  lalu lapisan runtuh ke dalam menjadi satu logo.
- **Bola pemandu**: bola/cahaya kecil memantul ke lokasi berikutnya; kamera mengikutinya,
  tempat bola mendarat adalah adegan baru.
- **Flat menjadi 3D**: lingkaran/bentuk flat berputar dan ternyata benda bervolume (koin,
  tombol) — ganti gaya render di tengah gerak.
- **Titik tetap, latar berganti**: komposisi titik/bentuk flat diam di posisinya sementara
  warna latar berganti di bawahnya.
- **Mask bentuk logo membuka**: bentuk logo (huruf, lingkaran, silang) menjadi jendela yang
  membesar memperlihatkan adegan berikut.
- **Ubin berbalik**: frame terbagi grid ubin yang berbalik satu per satu menjadi adegan baru.
- **Panel vertikal bergeser**: 3–4 panel ilustrasi bersebelahan bergeser horizontal; satu
  panel melebar menjadi adegan penuh.
- **Kuas menulis logo**: sapuan bergradien menggambar garis yang ternyata tulisan logo;
  stiker menempel sesudahnya.
- **Objek jatuh ke podium**: objek jatuh ke balok yang naik dari bawah; balok menyatu
  menjadi satu alas.
- **Zoom hentak lalu kembali**: kamera menghentak ke objek dengan blur radial kuat lalu
  kembali ke komposisi semula yang sudah sedikit berubah — sekali saja, biasanya di pembuka.
- **UI meredup → kartu terangkat**: bukan cut; latar babak berikut muncul di belakang kartu
  yang diangkat keluar dari UI.
- **Belahan menutup menjadi zoom**: layar terbelah menyempit ke satu sisi sementara kamera
  mendekat ke tombol berikutnya.
- **Klaim meredup → UI larut masuk**: kalimat turun ke ±50 % opacity, lalu UI terang larut
  masuk dari tengah.

## Menu menyajikan fitur (pengganti otomatis "tiga tile")

- **Satu fitur didemokan**, sisanya kilasan 0,4 dtk di akhir.
- **Kata berganti** di kalimat yang sama: "Edit \_\_\_" → foto / video / suara.
- **Objek bertransformasi**: ikon/benda fitur A morph menjadi fitur B.
- **Kartu dikocok atau dilempar** satu per satu dari tangan/tumpukan.
- **Orbit**: ikon fitur mengelilingi produk lalu masuk ke dalamnya.
- **Mockup yang dipakai**: discroll/diklik, fitur menyala di tempatnya.
- **Checklist diegetik** yang dicentang oleh aksi di dunia.
- **Garis pembelah sebelum/sesudah** yang bergeser per fitur.
- **Layar yang terbangun lalu dipakai**: kerangka UI muncul, kartu produk mengisi grid
  satu per satu, kursor memilih — item terpilih lalu keluar dari layar sebagai benda.
- **Dikumpulkan tangan**: kartu fitur/produk melayang masuk dari tepi frame, tangan
  (atau cakar) menjemputnya satu per satu sehingga tumpukan bertambah.
- **Stiker kepribadian**: gelembung obrolan/label berbahasa komunitas audiens brand
  meletup di sudut objek lalu ditarik kembali — kepribadian brand tanpa kalimat.
- **Isi berganti cepat**: satu wadah (ikon/kartu) berganti isi beberapa kali dalam
  < 1 dtk lalu berhenti di milik brand.
- **Halaman panduan brand**: logo, palet, tipografi, grafis, dan penerapan tampil sebagai
  halaman besar yang naik bertumpuk.
- **Siklus klaim → cara → hasil per fitur**: tiap fitur mendapat satu kalimat, satu
  momen UI dipakai, satu hasil yang mekar — diulang, bukan dijejer.
- **Kursor sebagai aktor**: aset diseret ke slot, menu dibuka, opsi dicentang; UI asli
  produk tanpa bingkai perangkat.
- **Alur UI dipakai persona**: rakit → klik → panel mekar → proses → hasil (menu gerak UI
  di bagian animasi UI).
- **Isi berganti, wadah tetap**: satu panel diam, judul kasus pakai + glyph ikon berganti
  tiap ±1,5 dtk.
- **Chip berjalan**: baris-baris chip kemampuan bergeser horizontal, arah bergantian.
- **Peran pop + pil label**: siapa yang memakai produk, sebagai avatar tersebar berlabel.
- **Letupan integrasi**: layanan terhubung meletup dari ikon produk lalu tersedot kembali.
- **Kata raksasa berganti bersama orang**: peran/kebutuhan pengguna sebagai kata besar di
  belakang foto; kata, orang, dan isi layar berganti bersama.
- **Wadah meletupkan fitur**: map/kotak mendarat, ilustrasi fitur meletup keluar.
- **Brand di dunia nyata**: penanda brand tetap, lokasi pakai berganti cepat.
- **Objek 3D diapit teks kecil**: satu objek besar di tengah, potongan kalimat kecil di kiri
  dan kanannya.
- **Meja yang dirakit**: benda kategori produk jatuh dan tersusun menjadi satu meja/kolase.
- **Parade benda gaya hidup**: deretan benda 3D kategori pengguna bergeser horizontal di latar
  gelap, titik warna melayang di sela-selanya.
- **Pola kata sebagai latar**: kata brand diulang menjadi pola outline yang bergeser; satu
  kata terisi penuh saat objek lewat.
- **Tur berselang klaim**: tiap fitur = satu potongan tur UI + satu klaim dua ketukan di
  medan warna brand.
- **Grid tile ikon** (resep `techniques.md` §8) — jumlah mengikuti fitur, tidak selalu tiga.

Dua opener berturut-turut tidak memakai cara yang sama.

## Menu pembuka (3 detik pertama)

- **In media res**: objek sudah bergerak saat frame pertama.
- **Suara dulu**: ketukan/efek, visual menyusul satu ketukan kemudian.
- **Kata raksasa terpotong tepi**, kamera mundur menyingkap kalimat utuh.
- **Garis menggambar** lalu ternyata bentuk produk/logo.
- **Tekstur close-up** yang ternyata bagian produk.
- **Pertanyaan diketik diegetik** di benda dunia (bukan kotak input melayang).
- **Gelap → satu cahaya → dunia**.
- **Masalah langsung**: frame dibuka di tengah kekacauan.
- **Dunia abu-abu, satu subjek berwarna**: lingkungan garis monokrom, hanya aktor berwarna
  brand yang berwarna; nama brand tertulis besar sebagai bagian ruangan.
- **Aktor tak terduga**: frame pertama langsung memperlihatkan siapa pengguna sebenarnya
  (tangan/cakar di perangkat) — lucunya terbaca dalam satu detik.
- **Frame kosong, benda motif naik dari tepi**: bentuk logo dibuat tebal berlapis,
  lapisannya menyusul satu per satu — sekaligus disiapkan untuk penutup loop.
- **Hasil dulu**: frame pertama adalah hasil karya produk, sangat dekat dan buram, yang
  menjauh memberi tempat bagi kalimat klaim.
- **Alat lama berserakan**: jendela dan berkas melayang miring 3D di latar terang; ikon
  produk lahir dari balik tumpukan.
- **Simbol dulu, wadah menyusul**: simbol logo berputar sendirian, lalu wadah ikon
  aplikasi tumbuh di belakangnya.
- ✦ **Kata yang meregang**: satu kata pendek meregang (huruf diulang atau memanjang) sampai
  memenuhi lebar frame. Momen khas — pakai hanya bila kata itu memang
  bermakna panjang/terus-menerus bagi produk, dengan kata dan cara meregang yang baru.
- **Titik cahaya di gelap**: satu titik mekar menjadi lapisan bentuk bergradien yang berputar.
- **Judul kinetik tersusun**: huruf judul masuk terpisah dari arah berbeda lalu terkunci
  membentuk judul, dengan benda 3D kecil melayang di sekitarnya.
- **Objek di celah kata**: judul dua kata mengapit tumpukan kecil kartu/produk; zoom hentak
  ke objek lalu kembali.

Pintu masuk teks ada delapan — naik, turun, kiri, kanan, dari kedalaman, mask reveal,
per kata, diketik. Pilih dari arti kalimat; dua adegan berturut-turut tidak memakai
pintu yang sama.

## Menu penutup

- **Logo lahir dari objek terakhir** (morph atau bentuk yang menutup).
- **Kamera mundur**: dunia ternyata bentuk logo.
- **Kata kunci kalimat terakhir digantikan logo**.
- **CTA diegetik**: tombol di UI/benda dunia ditekan, bukan teks CTA melayang.
- **Loop mulus**: frame akhir menyambung ke frame pertama.
- **Diam tegas**: semua gerak berhenti bersamaan, satu kalimat, potong.
- **Penerimaan**: benda pahlawan sudah tiba, tangan/kaki penerima masuk frame; brand cukup
  di label benda, tanpa end card.
- **Callback ke pembuka**: logo mendapat bentuk/lapisan benda pembuka lalu keluar lewat
  tepi tempat benda itu masuk; frame terakhir kosong sama dengan frame pertama.
- **Alamat → nama**: alamat situs diketik, terhapus dari kiri, nama produk diketik di
  tempat yang sama, diam 2–3 dtk, pudar ke latar.
- **Perangkat di alas + ikon ke lensa**: perangkat dengan UI asli berputar pelan di atas
  alas, kalimat ajakan kata per kata di sisinya; ikon membesar ke lensa menjadi medan
  warna, lalu mundur sebagai bumper.
- ✦ **Huruf brand sebagai panggung**: orang berpose menembus huruf/simbol brand raksasa,
  warna dan orang berganti per ketukan. Momen khas — hanya bila bentuk
  brand user memang kuat sebagai panggung, dan tidak digabung dengan penutup contohnya.
- **Menembus portal ke logo**: kamera masuk ke lubang bentuk; di balik gelap, logo muncul.
- **Objek di podium**: objek utama jatuh dan mendarat di podium yang tersusun dari balok.
- **Wordmark mengecil dari buram**: medan warna brand tua, wordmark besar buram mengecil ke
  tajam, tagline per kata, cincin konsentris samar.

Logo + CTA bertumpuk di tengah hanya bila brief meminta CTA eksplisit.

## Contoh sidik jari (untuk membandingkan, bukan untuk disalin)

Opener baru yang memakai konsep 13–19 harus berbeda ≥ 3 dari 5 elemen dengan contoh sidik
jari konsep yang sama di bawah, dan pembuka serta penutupnya tidak boleh sama dengan contoh.

Ditolak sebagai template:
`hook-fitur-CTA · 6 adegan · teks / 3 tile / input / mockup / janji / logo · teks zoom lalu keluar kiri · logo + CTA di tengah`

Kerangka yang lahir dari produk:
`masalah → lenyap · 4 adegan · tumpukan notifikasi / jari / layar bersih / jam · notifikasi sudah berjatuhan di frame 1 · logo lahir dari layar bersih`

`estafet benda · 5 babak · aktor berseragam brand di dunia abu-abu / pengguna tak terduga memilih di layar / kartu produk dikumpulkan tangan / benda jatuh ke kemasan / kemasan tiba di depan pintu · satu subjek berwarna · penerimaan tanpa end card`

`pamer sistem brand · 10 babak · tumpukan motif / ikon berganti → logo / medan warna utama / manifesto / parade aset + maskot berstiker / medan warna sekunder / halaman panduan / simbol + stiker · benda motif naik dari frame kosong · callback loop`

`klaim → cara → hasil · 11 babak · hasil buram / klaim / nama produk / bar input / menu dipilih kursor / kartu hasil / klaim / chip opsi / kartu hasil / klaim kualitas / alamat → nama · hasil menjauh jadi kalimat · alamat berganti nama produk`

`ekosistem UI hidup · 14 babak · jendela berserakan / ikon lahir / UI dirakit + kursor persona / unggah + proses / dokumen hasil + grafik / lencana integrasi / peran + pil label / karusel jendela / judul kasus pakai berganti / chip berjalan / sisi ikon 3D + letupan integrasi / kalimat + perangkat / benda masalah gelap / perangkat di alas · alat lama berserakan · ikon ke lensa`

`pop flat berfoto · 17 babak · sapaan direnggangkan / orang + stiker / pil jadi blob / bingkai warna / toggle mengganti latar / ponsel / kata raksasa berganti / benda ke lensa / map meletup / kartu foto / ikon jadi medan / wordmark dirakit / penanda di lokasi / merchandise / papan malam / huruf panggung / ponsel + kerumunan · sapaan diketik · huruf panggung → kerumunan`

`menembus bentuk bergradien · 7 babak · titik cahaya / kipas gradien berputar / bola pemandu / terowongan lengkung / bentuk mengorbit / portal + simbol bercahaya / menembus ke logo · titik cahaya di gelap · menembus portal ke logo`

`tur produk berselang klaim · 11 babak · judul + kartu di celah kata / dasbor / kartu diangkat di medan warna / klaim / direktori + kursor / panel detail / belahan UI + klaim / halaman detail / diagram kartu / klaim + analitik / wordmark · objek di celah kata + zoom hentak · wordmark mengecil dari buram`

## Cek sebelum menyerahkan

- [ ] Tiga kandidat konsep ditulis; satu dipilih dengan alasan dari sifat produk
- [ ] Sidik jari struktur tertulis di style brief dan pesan penutup
- [ ] Berbeda dari opener sebelumnya: konsep berbeda, atau ≥ 3 dari 5 elemen sidik jari berbeda
- [ ] Tidak menyalin contoh konsep: pembuka dan penutup berbeda dari contohnya, ≤ 1 momen ✦ yang ditransformasi, sidik jari beda ≥ 3 dari 5 elemen dengan contoh sidik jari konsep itu
- [ ] Tiap warna di palet punya sumber brand atau alasan tertulis; bentuk flat dan properti diturunkan dari brand user
- [ ] Paling banyak dua komponen kanonik, masing-masing dituntut konsep
- [ ] Cara menyajikan fitur, pembuka, dan penutup dipilih dari menu, bukan warisan proyek lain
- [ ] Isi opener diturunkan dari brand: aktor, properti, dan urutan babak berasal dari layanan brand; warna brand ada di objek terpenting tiap adegan
- [ ] App/SaaS: minimal satu babak UI hidup (dirakit, dipakai, menghasilkan) dari komponen produk user, bukan screenshot diam
- [ ] Sorotan kata hanya bila style brief memilihnya — tidak otomatis di setiap kalimat
- [ ] Latar bergerak di setiap adegan; pergantian warna latar punya pemicu terlihat
- [ ] Gaya render objek satu keluarga (`techniques.md` §7e), atau pergantiannya dijadikan momen
- [ ] Bila memakai foto: sumbernya disepakati dengan user (foto user / generate MCP / stok), daftar shot tertulis, foto dianimasikan (pop, parallax, wadah) — bukan Ken Burns saja

---

# Lampiran C: techniques.md ( )

> Terapkan aturan adaptasi Bagian 8: gunakan Hybrid CDN dengan fallback lokal (`vendor/*.min.js`) dan kunci waktu secara lockstep ke `t = frameIndex / fps` (`masterGsapTl.time(t)`), abaikan player/debug/snap/export/AE bridge. Aturan Bagian 1 selalu menang.

# Teknik — resep efek yang sudah teruji

Semua resep dinyatakan generik; angka adalah titik awal yang terbukti enak,
bukan hukum. Font, warna, dan konten selalu milik brand user.

## Daftar isi

1. Tipografi hidup (split per huruf, penekanan & sorotan opsional, arah bergantian) + 1b. Kontras latar
2. Motion blur berarah (pembeda utama dari "web animation")
3. Kamera: push-through (opsional, termotivasi)
   3b. Ukuran shot: kamera ke elemen (wide ↔ medium close-up ↔ close-up)
4. Kamera: pan 3D menyusur kalimat per kata
   4b. Transisi antar adegan — hierarki yang benar
5. Light leak transisi
6. Glow yang benar (dan kapan tidak)
7. Latar Three.js: nebula, debu, grid, ornamen 3D, bloom
   7b–7d. Latar terang & pergantian, gerak latar, permukaan latar (termasuk grainy gradient)
   7e. Menu gaya render objek (flat, clay, glossy, kaca, isometrik, emas, garis neon)
8. Tile ikon & mockup UI
9. Ketikan / angka hidup yang deterministik
   9b. Video sebagai layer footage (clip, sinkron timeline, ekspor)
10. Jebakan (bug yang pernah terjadi)

---

## 1. Tipografi hidup — resep yang berhasil vs yang gagal

Dua pola yang sering muncul. Opener A terasa kaku: setiap
judulnya KAPITAL SEMUA, satu font lebar bobot 800, selalu di tengah, masuk
dengan stagger huruf yang sama, tanpa penekanan apa pun, tanpa variasi ukuran.
Opener B terasa hidup: kalimat sentence case bobot 500, SATU kata kunci
per kalimat di dalam pill yang mengembang dari kiri + sparkle, tanda baca
muncul terpisah setelahnya, ukuran dan arah masuk bergantian tiap adegan,
sebagian kalimat diletakkan di dekat objeknya (bukan selalu di tengah), dan
adegan gelap bergantian dengan adegan terang. Resep B:

> **Peringatan bentuk.** Di opener B, sorotannya berupa pill biru yang
> mengembang dari kiri dengan bintang kecil (sparkle) di sudutnya. Itu
> TANDA TANGAN proyek itu, bukan aturan. Yang jadi aturan hanya: kalimat
> punya penekanan. Sorotan kata adalah SATU cara dan OPSIONAL — banyak opener
> yang baik tanpa sorotan sama sekali (kata per kata redup → penuh, ukuran,
> jeda, ikon/UI di samping kata). Bila dipakai, BENTUK dipilih di style brief
> dan konsisten dalam satu video, tidak wajib di setiap kalimat; ORNAMEN
> (bintang, titik, garis kilat) opsional dan diturunkan dari bentuk brand.
> Dua proyek berbeda dengan pill + bintang yang sama = menyalin kulit.

**Menu penekanan** (pilih satu per video; `tanpa` adalah pilihan sah):

| Varian                                                                                                    | Rasa                       | Cocok untuk                               |
| --------------------------------------------------------------------------------------------------------- | -------------------------- | ----------------------------------------- |
| `tanpa` — tidak ada bidang/garis; kata per kata redup → penuh, ukuran, jeda, atau ikon/UI di samping kata | tenang, produk yang bicara | SaaS, AI, brand minimal, pengumuman fitur |
| `pill` — blok warna mengembang dari kiri                                                                  | tegas, produk digital      | app, SaaS, tech                           |
| `under` — garis bawah tebal menggambar dari kiri                                                          | editorial, tenang          | finansial, produktivitas, jurnalistik     |
| `marker` — coretan stabilo miring, sedikit transparan                                                     | hangat, manusiawi          | edukasi, komunitas, kuliner               |
| `box` — kotak garis tipis menggambar keliling                                                             | teknis, presisi            | developer tools, hardware                 |
| `color` — hanya warna kata berubah, tanpa bidang                                                          | mewah, minimal             | fashion, properti, otomotif               |
| `strike` — garis coret lalu kata pengganti muncul                                                         | ironis, sebelum/sesudah    | promo "bukan X, tapi Y"                   |

**CSS**

```css
.line {
  font-size: 112px;
  font-weight: 500;
  letter-spacing: -0.015em;
  color: #fff;
  white-space: nowrap;
  text-shadow: 0 4px 28px rgba(0, 0, 0, 0.5);
  line-height: 1.1;
  opacity: 0;
}
.line.sm {
  font-size: 74px;
}
.line.md {
  font-size: 92px;
}
.line.lg {
  font-size: 128px;
}
.line.xl {
  font-size: 150px;
  font-weight: 600;
  letter-spacing: -0.02em;
}
.line.ink {
  color: var(--ink-dark);
  text-shadow: none;
} /* versi untuk adegan terang */
.wd {
  display: inline-block;
  white-space: nowrap;
}
.ch {
  display: inline-block;
  will-change: transform, opacity, filter;
  opacity: 0;
}
.txt2 {
  display: inline-block;
  opacity: 0;
} /* tanda baca OPSIONAL: hanya bila kalimat memang bertanda baca */
/* kata sorotan: .hl + satu varian bentuk; <i> adalah bidang/garis yang digambar */
.hl {
  position: relative;
  display: inline-block;
}
.hl i {
  position: absolute;
  transform: scaleX(0);
  transform-origin: 0 50%;
}
.hl-t {
  position: relative;
  opacity: 0;
}
.hl.pill {
  padding: 0.02em 0.24em 0.04em;
  border-radius: 0.26em;
}
.hl.pill i {
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    95deg,
    color-mix(in srgb, var(--accent) 70%, #000),
    var(--accent) 60%,
    var(--accent-lit)
  );
}
.hl.pill .hl-t {
  color: #fff;
}
.hl.under i {
  left: 0;
  right: 0;
  bottom: -0.04em;
  height: 0.14em;
  border-radius: 0.07em;
  background: var(--accent);
}
.hl.marker i {
  left: -0.1em;
  right: -0.1em;
  top: 0.5em;
  bottom: -0.02em;
  background: var(--accent);
  opacity: 0.55;
  transform: scaleX(0) rotate(-1.5deg);
}
.hl.box i {
  inset: -0.06em -0.14em;
  border: 0.04em solid var(--accent);
  border-radius: 0.12em;
  background: none;
}
.hl.color .hl-t {
  color: var(--accent);
} /* tanpa <i> */
/* ornamen OPSIONAL — hanya bila bentuk brand memintanya; ganti path dengan bentuk brand */
.hl-orn {
  position: absolute;
  width: 0.46em;
  height: 0.46em;
  right: -0.22em;
  top: -0.24em;
  fill: var(--accent-lit);
  opacity: 0;
}
```

**Markup** — hanya `.txt` yang di-split per huruf; sorotan dan tanda baca
punya tween sendiri (contoh varian `under`, tanpa ornamen):

```html
<h1 class="line md">
  <span class="txt">Capek ngetik</span>&nbsp;<span class="hl under" id="hl-a"
    ><i></i><span class="hl-t">caption</span></span
  >&nbsp;<span class="txt">satu-satu</span><span class="txt2">?</span>
</h1>
```

**JS** — empat pintu masuk/keluar + pill + tanda baca:

```js
const inUp = (ch, el, at, { dur = 0.8, st = 0.024 } = {}) => {
  tl.fromTo(
    ch,
    { opacity: 0, yPercent: 60, scaleY: 1.45 },
    {
      opacity: 1,
      yPercent: 0,
      scaleY: 1,
      duration: dur,
      ease: "power4.out",
      stagger: st,
      immediateRender: false,
    },
    at,
  );
  blurTween(tl, el, at, 30, 0, dur, VERT);
};
const inLeft = (ch, el, at, { dur = 0.75, st = 0.02 } = {}) => {
  tl.fromTo(
    ch,
    { opacity: 0, xPercent: -45 },
    {
      opacity: 1,
      xPercent: 0,
      duration: dur,
      ease: "power4.out",
      stagger: st,
      immediateRender: false,
    },
    at,
  );
  blurTween(tl, el, at, 50, 0, dur, { ease: "power4.out" });
};
const outUp = (ch, el, at, { dur = 0.4, st = 0.01 } = {}) => {
  tl.to(
    ch,
    {
      opacity: 0,
      yPercent: -70,
      duration: dur,
      ease: "power2.in",
      stagger: st,
    },
    at,
  );
  blurTween(tl, el, at, 0, 45, dur + 0.1, { ease: "power2.in", ...VERT });
};
const outLeft = (ch, el, at, { dur = 0.4, st = 0.01 } = {}) => {
  tl.to(
    ch,
    {
      opacity: 0,
      xPercent: -60,
      duration: dur,
      ease: "power2.in",
      stagger: st,
    },
    at,
  );
  blurTween(tl, el, at, 0, 55, dur + 0.1, { ease: "power2.in" });
};
/* mark(): menggambar bidang/garis sorotan apa pun varian bentuknya, lalu memunculkan katanya; ornamen hanya bila ada */
const mark = (hl, at) => {
  const i = $("i", hl);
  if (i)
    tl.fromTo(
      i,
      { scaleX: 0 },
      { scaleX: 1, duration: 0.5, ease: "power3.out", immediateRender: false },
      at,
    );
  tl.fromTo(
    $(".hl-t", hl),
    { opacity: 0, yPercent: 60 },
    {
      opacity: 1,
      yPercent: 0,
      duration: 0.7,
      ease: "power4.out",
      immediateRender: false,
    },
    at,
  );
  const orn = $(".hl-orn", hl);
  if (orn)
    tl.fromTo(
      orn,
      { opacity: 0, scale: 0.2, rotate: -40 },
      {
        opacity: 1,
        scale: 1,
        rotate: 0,
        duration: 0.5,
        ease: "back.out(2)",
        immediateRender: false,
      },
      at + 0.22,
    );
};
const popDot = (el, at) =>
  tl.fromTo(
    el,
    { opacity: 0, yPercent: 60 },
    {
      opacity: 1,
      yPercent: 0,
      duration: 0.5,
      ease: "power4.out",
      immediateRender: false,
    },
    at,
  );
```

Urutan satu kalimat dengan sorotan: `inUp(ch)` → 0,4–0,6 dtk kemudian `mark(hl)` →
`popDot(txt2)` 0,25 dtk setelahnya — HANYA bila kalimatnya memang bertanda baca. Tanpa
sorotan: pintu teks saja (mis. per kata atau redup → penuh); hapus span `.hl`, dan hapus
`.txt2` bila kalimat tidak bertanda baca (default untuk judul dan klaim).

**Aturan keras tipografi (dari kegagalan A):**

1. Sentence case, bobot 500–600. KAPITAL SEMUA + bobot 800 + font lebar
   hanya untuk SATU adegan penekanan, bukan semua.
2. Sorotan kata OPSIONAL — diputuskan di style brief, bukan bawaan. Bila
   dipakai: bentuk dari menu di atas, satu bentuk per video, tidak wajib di
   setiap kalimat, berbeda dari proyek sebelumnya; ornamen tidak default.
   Bila tidak: penekanan dari urutan kata, ukuran/bobot, redup → penuh, jeda,
   atau objek di samping kata. Yang ditolak tetap kalimat datar tanpa
   penekanan apa pun.
3. Dua adegan berturut-turut tidak boleh sama dalam: ukuran (sm/md/lg/xl),
   arah masuk (inUp/inLeft), posisi (tengah / dekat objek / kiri-atas).
4. Kalimat panjang dipecah dua baris dengan bobot berbeda (500 lalu 600),
   atau baris kedua jadi `.txt2` yang pop menyusul.
5. Judul, klaim, dan frase pendek DEFAULT TANPA TITIK (terutama ≤ 4 kata atau satu
   baris). Tanda baca hanya bila mengubah arti atau irama: `?` untuk pertanyaan
   sungguhan, titik untuk gaya dua kalimat pendek berturut-turut yang disengaja, `!`
   sangat jarang. Gayanya diputuskan sekali di style brief dan konsisten. Bila dipakai,
   tanda baca adalah elemen terpisah yang muncul terakhir (`.txt2` + `popDot`) — tetapi
   jangan menambah titik hanya karena resepnya punya `popDot`.
6. Teks yang menempel pada objek (mockup, kartu) diposisikan di sisinya
   (`.pos` + left/top), bukan dipaksa ke tengah di atas objek.

## 1b. Kontras: latar tunduk pada teks

Contoh kegagalan: 96 batang cahaya putih dengan bloom aditif lebih
terang daripada judulnya → huruf putih kehilangan tepi dan latar terasa
ramai tanpa kontras. Aturan yang bisa diukur:

- **Kantong teks**: di area teks, luminance latar ≤ 25 % (gelap) untuk
  teks putih, atau ≥ 80 % (terang) untuk teks ink. Bila latar ramai,
  letakkan `.pocket` (radial-gradient gelap 55 % → transparan) di bawah
  teks dan nyalakan bersama teksnya.
- **Elemen latar apa pun (partikel, bentuk, tekstur, garis)**: warna diambil dari palet sisi GELAP (bukan
  putih), opacity ≤ .35 di dalam kantong teks, jumlah elemen terang yang
  terlihat ≤ 40, ukuran kecil. Bloom threshold tinggi (≥ .55) dan hanya
  untuk objek — bukan lapisan latar.
- **Uji cepat**: potret frame saat judul penuh, ubah ke grayscale; kalau
  ada bagian latar seterang huruf, latar terlalu ramai. Kalau semua teks
  disembunyikan latar harus terasa TENANG, bukan "menarik".
- **Irama gelap–terang**: selang-seling adegan gelap dan terang (mis. kartu
  "kertas" terang dengan teks ink) — kontras antar adegan lebih kuat
  daripada efek apa pun di dalam adegan.

## 2. Motion blur berarah — `feGaussianBlur` SVG

`filter: blur()` CSS mengabur ke segala arah → terlihat "tidak fokus".
Motion blur AE mengabur SEARAH gerak. `feGaussianBlur` menerima
`stdDeviation="x y"` terpisah:

```js
// buat <filter> sekali per tween, lebarkan kotaknya (default memotong ekor)
f.setAttribute("x", "-70%");
f.setAttribute("y", "-70%");
f.setAttribute("width", "240%");
f.setAttribute("height", "240%");
// tween nilai 30→0 saat masuk, 0→50 saat keluar; sumbu ikut arah gerak
blur.setAttribute("stdDeviation", `${v} ${v * 0.08}`); // gerak horizontal
```

Pasang filter saat tween mulai, LEPAS saat selesai (`filter:'none'`) —
elemen yang terus memakai filter SVG dirasterisasi ulang tiap frame, mahal.

## 3. Kamera: push-through (opsional, termotivasi)

Salah satu transisi dari menu §4c — jatah ±1 per video, hanya bila ada alasan
(§4b), bukan transisi antar semua segmen. Tiga langkah pada rig `#world` (dunia utuh):

```js
const camThrough = (
  atCut,
  {
    push = 2.0,
    from = 1.5,
    inDur = 0.5,
    outDur = 0.95,
    oOut = "50% 50%",
    oIn = "50% 50%",
  } = {},
) => {
  tl.set(rig, { transformOrigin: oOut }, atCut - inDur);
  tl.to(
    rig,
    { scale: push, duration: inDur, ease: "power2.in" },
    atCut - inDur,
  );
  tl.set(rig, { transformOrigin: oIn, scale: from }, atCut);
  tl.to(rig, { scale: 1, duration: outDur, ease: "power3.out" }, atCut);
};
```

- Dorong MASUK ke teks yang pergi (`power2.in` = makin cepat), cut,
  tarik MUNDUR dari teks baru yang lahir oversized (`power3.out`).
- Lompatan scale di titik cut TIDAK terlihat karena terjadi saat frame
  kosong / tertutup light leak — sengaja, ini teknik filmnya.
- `transformOrigin` menunjuk POSISI TEKS (tengah untuk hero; ~'50% 22%'
  untuk adegan yang teksnya di atas) — zoom harus menuju subjek.
- Sinkron dengan kamera WebGL (`camZ`) menambah kedalaman, tapi rig DOM
  yang membawa perasaan "kamera".

## 3b. Ukuran shot — kamera ke elemen (supaya tidak statis)

"Zoom in-out" dalam motion graphic berarti **pergantian ukuran shot**: kamera mendekat ke
satu elemen yang sedang bercerita, lalu mundur lagi. Napas kamera beberapa persen (§4b)
hampir tidak terlihat — itu lapisan dasar, bukan jawaban bila video terasa statis.

**Kosakata shot** (skala dihitung dari ukuran elemen, bukan angka tetap)

- **Wide** — seluruh komposisi terlihat; dipakai saat banyak elemen atau teks lebar perlu
  dibaca bersama.
- **Medium close-up** — elemen utama beserta sedikit konteksnya; target mengisi kira-kira
  sepertiga sampai setengah frame.
- **Close-up** — satu elemen atau detailnya mengisi sebagian besar frame; dipakai untuk
  penekanan, momen aksi, atau detail kecil yang harus terbaca.

**Memilih target dan waktu**

- Titik fokus = pusat elemen yang _sedang_ bercerita: teks yang baru muncul, benda yang
  tiba, tombol yang diklik, detail yang disebut kalimat. Kamera menyambut, bukan mengejar.
- Shot berganti mengikuti ketukan isi. Pola yang umum: dekat ke elemen A → mundur ke wide
  saat komposisi butuh seluruh frame → dekat ke elemen B. Variasikan ukuran; dua shot
  dengan ukuran sama berturut-turut terasa datar.
- Dua tempo gerak: **perpindahan shot** (ringkas, ease in-out) dan **push pelan saat
  menahan** (lambat, ease sine) supaya hold tidak mati.
- Di titik cut, kamera boleh langsung berada di close-up tanpa tween — adegan lahir dekat,
  lalu mundur. Video pun boleh dibuka sudah dalam close-up.
- Penutup yang ditahan (logo, CTA) tetap diberi push pelan; jangan membeku.
- Hindari bolak-balik dekat–jauh lebih cepat daripada pembaca sempat membaca atau
  melihat — terasa pusing. Teks muncul setelah kamera tiba, bukan di tengah perpindahan.

**Rig**

```js
const CAM = { s: 1, fx: W / 2, fy: H / 2 }; // skala + titik fokus (koordinat dunia)
const shot = (at, dur, s, fx, fy, ease = "power2.inOut") =>
  tl.to(CAM, { s, fx, fy, duration: dur, ease }, at);
const cutTo = (at, s, fx, fy) => tl.set(CAM, { s, fx, fy }, at); // lompat di titik cut
// ukuran dari elemen: fill ≈ bagian frame yang diisi target (close-up besar, medium close-up sedang)
const rectIn = (el, root) => {
  let x = 0,
    y = 0,
    n = el;
  while (n && n !== root) {
    x += n.offsetLeft;
    y += n.offsetTop;
    n = n.offsetParent;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}; // elemen SVG: pakai getBBox()
const frameOn = (el, fill) => {
  const r = rectIn(el, world);
  return [
    Math.max(1, Math.min((W * fill) / r.w, (H * fill) / r.h)),
    r.x + r.w / 2,
    r.y + r.h / 2,
  ];
};
// di render(t):
function applyCam(t) {
  const s = CAM.s * (1 + 0.01 * Math.sin(t * 0.7)); // napas halus di atas shot (opsional)
  let tx = W / 2 - CAM.fx * s,
    ty = H / 2 - CAM.fy * s;
  tx = Math.min(0, Math.max(W - W * s, tx));
  ty = Math.min(0, Math.max(H - H * s, ty)); // tepi dunia tak tersingkap
  world.style.transform = `translate(${tx}px,${ty}px) scale(${s})`;
}
// contoh: shot(T, .8, ...frameOn($('#judul'), .6)); shot(T + 2, .7, 1, W/2, H/2);
```

- Satu sistem skala per pembungkus: bila adegan memakai `shot()`, jangan sekaligus men-tween
  `scale` pada `#world` dari `breathe()`/push-through; tumpuk napas di dalam `applyCam`.
  Starter explainer sudah punya padanannya: `look()` = shot ke titik, `home()` = wide.
- Dunia/latar harus lebih luas dari frame (overscan) supaya klem tepi tidak mengunci shot.

**Lapisan**

- Elemen yang merupakan bagian dunia ikut zoom. Label, caption, dan antarmuka layar
  diletakkan di lapisan layar (HUD) di luar rig, supaya tidak membesar atau terpotong tepi.
- Kamera lokal boleh dipasang per babak (mis. mendekat ke area klik, atau reveal yang
  ditarik mundur dari skala besar) tanpa mengganggu kamera dunia. Getaran impact di
  pembungkus terpisah.

**Periksa**

- Potret di puncak tiap shot: teks tidak terpotong tepi, tepi dunia tidak tersingkap.
- Aset raster cukup tajam untuk skala close-up (resolusi ≥ skala × ukuran tampil).

## 4. Pan 3D menyusur kalimat

Untuk 1 (maks 2) segmen istimewa: satu kalimat LEBIH LEBAR dari frame,
kamera menyusurinya, tiap kata bangun saat dilewati.

```js
// x menaruh pivot di tengah frame; xPercent (relatif lebar kalimat)
// membawa kamera — bebas dari lebar font aktual
tl.set(line, { x: W / 2, xPercent: -6, rotateY: 10 }); // parent: perspective
tl.to(line, { xPercent: -94, duration: 2.9, ease: "power1.inOut" });
tl.to(line, { rotateY: -10, duration: 2.9, ease: "power1.inOut" });
// kata: dim → terang saat kamera lewat
tl.fromTo(
  words,
  { opacity: 0.2, yPercent: 16, scale: 0.96 },
  {
    opacity: 1,
    yPercent: 0,
    scale: 1,
    duration: 0.55,
    ease: "power2.out",
    stagger: (panDur / (nKata - 1)) * 0.95,
  },
);
```

Kunci rasanya: kata di DEPAN kamera redup (~20%) menunggu, kata yang sudah
dilewati tetap terang; `rotateY` berayun (bukan statis) supaya terasa dolly
melengkung; kamera WebGL ikut geser `camX` searah untuk paralaks latar.

## 4b. Transisi antar adegan — hierarki yang benar

Dua jenis transisi yang terasa murahan: whip translasi (menyingkap gap
hitam, terbaca "pindah halaman"), dan spin/yaw/roll kejut (zoom tiba-tiba +
blur adalah bahasa preset editor video, bukan motion design). Urutan yang benar:

1. **Kamera bernapas** (fondasi, selalu aktif): rig dunia drift zoom pelan
   `sine.inOut` ±4-5% per adegan, arah bergantian, dirantai tanpa lompatan.
   Kamera tidak pernah diam dan tidak pernah menyentak. Napas ini hanya lapisan
   dasar — tidak terbaca sebagai "zoom in-out"; untuk itu pakai ukuran shot (§3b).
2. **Koreografi elemen beririsan**: elemen adegan lama keluar (cepat,
   `power2.in`, blur berarah) SAMBIL elemen adegan baru masuk — irisan
   waktunya yang membuat perpindahan terasa hidup, bukan efek kameranya.
3. **Object wipe**: ornamen (bintang/bentuk brand) menyapu DEKAT lensa dan
   menutup frame tepat di titik cut; adegan berganti di baliknya. Resep:
   posisi z ≈ (camZ - 3), scale dunia ~2× tinggi-frame-pada-jarak-itu,
   lintasan diagonal `power1.inOut` ~1 detik, puncak skala tepat di cut,
   arah bergantian antar pemakaian. Awas tween lama yang masih menulis
   properti ornamen yang sama — ia membunuh wipe (cek overlap waktu).
4. **Zoom termotivasi**: push-through sebagai TRANSISI (jatah ±1 per video) HANYA
   bila ada alasannya — menyelam ke layar mockup, masuk ke lubang logo. Zoom tanpa
   motivasi terasa efek kejut. Jatah ini khusus zoom transisi: kamera yang mendekat
   ke area UI yang sedang diklik lalu mundur lagi adalah bahasa demo, bukan efek
   kejut, dan tidak dihitung jatah (§8 "Kamera mengikuti interaksi UI").

Element-driven exit tetap resep bagus: elemen lama terbang MELEWATI lensa
(scale ~2.2 + blur + stagger), kamera cuma menyusul halus (tanpa lompatan).

### 4c. Menu transisi — bukan balok persegi yang menyapu

Kegagalan yang umum: "object wipe" berupa balok warna datar raksasa yang
melintas miring terasa aneh dan murah, dan mudah terulang bila contoh menyebut
wipe objek lebih dulu. Opener yang berhasil memakai kedalaman: push-through 3D, kartu kaca yang berputar masuk, tile
yang `rotateY` dari kedalaman, elemen yang melewati lensa dengan ketebalan.
Pilih dari menu ini; dalam satu video minimal DUA jenis, minimal SATU yang
berkedalaman (3D/perspektif), dan wipe paling banyak dua kali:

| #   | Transisi                                                       | Cara                                                                                                             | Rasa              |
| --- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------- |
| 1   | Push-through 3D                                                | `camThrough` + lapisan dengan `translateZ` berbeda (perspective 1400px) sehingga lapisan depan lewat lebih cepat | menyelam ke dunia |
| 2   | Kartu/objek berputar masuk (`rotateY` −35° → 0, `perspective`) | objek berikutnya datang dari kedalaman sambil berputar, yang lama pergi sebaliknya                               | premium, taktil   |
| 3   | Objek melewati lensa dengan KETEBALAN                          | logo ekstrusi/kartu kaca/tile 3D (bukan persegi datar) membesar 1 → 2,5×, blur berarah, frame tertutup sesaat    | sinematik         |
| 4   | Sapuan cahaya (light leak / bloom through)                     | cahaya menutup 40–60 % frame di titik cut, bukan 100 %                                                           | lembut            |
| 5   | Mask reveal lewat bentuk brand                                 | adegan baru terlihat lewat lubang berbentuk logo/huruf yang membesar (`clip-path`/`mask`)                        | brand kuat        |
| 6   | Whip dengan blur berarah                                       | dunia bergeser 120–200 px + blur 18 px, 0,3 dtk, ke arah yang berganti                                           | energik           |
| 7   | Rack focus / kedalaman                                         | adegan lama diblur & diperkecil ke belakang, adegan baru tajam dari depan                                        | naratif           |
| 8   | Koreografi beririsan tanpa cut                                 | elemen lama keluar cepat sementara elemen baru sudah masuk; kamera bernapas terus                                | mengalir          |
| 9   | Ganti latar di balik #1–#5                                     | pergantian gelap↔terang/blok warna terjadi saat frame tertutup                                                   | segmen baru       |

Ditolak sebagai default: persegi/balok warna datar yang menyapu penuh
frame, garis tipis menyapu, dan satu jenis transisi yang diulang di semua
cut. Wipe boleh hanya bila objeknya bermakna dan punya kedalaman (kartu
kaca, logo ekstrusi, tile), bukan bidang datar.

Transisi tanpa cut yang dibawa objek (benda adegan baru menjadi wipe, keluar dari
layar, match cut bentuk + ganti gaya render, tarik mundur menyingkap tujuan, tangan
penjemput, menembus simbol, parade mendorong, putar tipis → kartu warna membuka,
halaman naik bertumpuk, titik tumbuh, wadah mekar/menyusut, hasil menjauh jadi
kalimat, zoom ke potongan UI, meredup lalu berganti, hapus-ketik) ada di `opener-konsep.md` → "Menu transisi yang
dibawa benda". Medan warna palet yang MENJADI latar babak berikutnya — logo tetap di
tempat dan berbalik warna di garis medan — bukan balok dekoratif yang lewat: boleh,
paling banyak dua kali per video.

## 5. Light leak transisi

Bukan garis cahaya menyapu (terlihat murahan), tapi bola cahaya lembut yang
merembes dari tepi, bergantian kiri/kanan:

- div bulat ±2400px, radial-gradient inti terang → transparan, `blur(64px)`,
  `mix-blend-mode:screen`, **di lapisan PALING ATAS** (di atas vignette;
  ia cahaya di depan lensa, bukan properti dunia)
- masuk `sine.in` 40% durasi → keluar `sine.out` 60%; drift diagonal pelan
- warnai sesuai aksen brand

## 6. Glow yang benar

Pelajaran yang mahal: **glow di semua judul = teks kusam dan norak**.

- Judul: putih penuh + `text-shadow: 0 4px 28px rgba(0,0,0,.5)` saja
  (drop shadow keterbacaan, bukan glow).
- Glow disimpan untuk OBJEK produk: tile/kartu (rim border terang + inner glow
  naik dari bawah), mockup, ornamen, bar spektrum — objek yang memang ada di konsep.
- Elemen realistis (baris app store, tombol) TANPA glow sama sekali —
  makin realistis elemennya, makin salah glow-nya.
- Bloom WebGL: `threshold ≥ 0.5`. Threshold rendah membuat latar ikut mekar
  dan seluruh frame putih (sudah pernah terjadi).

## 7. Latar Three.js

Lapisan dari belakang ke depan, semua diikat `state`:

- **Nebula**: plane fbm-noise shader, `NormalBlending` (JANGAN additive —
  menumpuk lewat bloom → putih), gradasi vertikal: `exp(-((y-0.02)*3.4)^2)`
  menyalakan horizon, atas diredupkan ~70%. Ini penangkal "latar flat".
- **Debu**: 1000–1500 `Points`, ukuran ∝ 1/z, kelip via sinus per-seed.
- **Grid lantai**: shader `fwidth`-antialiased, fade JAUH sebelum horizon
  (garis yang bertemu di horizon menumpuk jadi pita terang memotong teks);
  opasitas per adegan 0.2–0.6, jangan lebih.
- **Ornamen 3D** (bintang ✦, bentuk brand): `Shape` + kurva cekung →
  `ExtrudeGeometry` + bevel, `MeshStandardMaterial` + DirectionalLight —
  Basic material terlihat flat, dan flat = PPT. Goyangkan sumbu Y dengan
  sinus ±0.55 rad, JANGAN putar penuh (benda pipih dilihat dari samping =
  sebatang garis). Satu ornamen "hero" melintas cepat saat transisi.
- **Tunnel/rush**: partikel PENDEK (len 0.8–2.5), warna gelap-sedang,
  ≤300 buah, opasitas ≤0.6 — versi garis panjang putih terlalu ramai
  dan membuat teks tidak kontras.
- **Bloom**: `UnrealBloomPass(strength .75–.95, radius .7, threshold .52)`,
  - denyut kecil mengikuti beat.
- **Kamera WebGL**: dolly `camZ` per adegan + handheld sway sinus lambat +
  shake beat via sinus frekuensi tinggi.

Gradient tambahan yang murah: div `mix-blend-mode:screen` berisi
radial-gradient aksen di bawah-tengah, DI DALAM rig `#world`.

## 7b. Latar terang & pergantian latar antar adegan

Latar WebGL gelap di §7 hanya satu bahasa. Salah satu opener yang diterima
berganti latar mengikuti segmennya: dasar gelap untuk masalah → terang
untuk solusi → kembali gelap untuk penekanan → blok warna untuk CTA. Itu
CONTOH, bukan templat: terang bisa gradien lembut dua warna palet, warna
pastel flat dengan blob, blok warna solid, kertas bertekstur, atau foto
dengan gradasi. Resep versi terang (kertas dan gradien memakai CSS yang
sama, cukup ganti `background`):

```css
.paper {
  position: absolute;
  inset: 0;
  opacity: 0;
  visibility: hidden;
  background: linear-gradient(180deg, #f7faff 0%, #eef4ff 55%, #e6eeff 100%);
}
.paper .b {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
} /* blob warna lembut, ikut palet */
.paper .b1 {
  left: -260px;
  top: -380px;
  width: 1100px;
  height: 1100px;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--accent-lit) 38%, #fff) 0%,
    transparent 68%
  );
}
.paper .b2 {
  left: 1180px;
  top: 520px;
  width: 1000px;
  height: 1000px;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--accent) 22%, #fff) 0%,
    transparent 66%
  );
}
.line.ink {
  color: #0b1b33;
  text-shadow: none;
} /* teks untuk latar terang */
```

```js
/* ganti latar DI BALIK cut/wipe: frame sedang tertutup, lompatan tak terlihat */
tl.set("#paper", { autoAlpha: 1 }, atCut);
tl.to("#gl", { opacity: 0, duration: 0.25 }, atCut);
tl.to(".vignette", { opacity: 0.35, duration: 0.4 }, atCut);
tl.to(".bgfx", { opacity: 0, duration: 0.25 }, atCut);
tl.to(
  ".paper .b",
  {
    x: 60,
    y: -40,
    duration: 3,
    ease: "sine.inOut",
    yoyo: true,
    repeat: 1,
    stagger: 0.4,
  },
  atCut,
); // blob hidup
/* di t=0 (loop): kembalikan semuanya */
tl.set("#paper", { autoAlpha: 0 }, 0);
tl.set(["#gl", ".vignette", ".bgfx"], { opacity: 1 }, 0);
```

Kapan berganti: kapan pun dibutuhkan, direncanakan di style brief — mood
atau topik segmen berubah (masalah → solusi, klaim → produk, isi → CTA),
brand warna-warni menuntut ritme warna (medan warna palet bergantian), atau
aksi di layar mengubahnya (toggle dinyalakan, benda menutup lensa, ikon
membesar memenuhi frame). Bumper pendek atau opener satu mood boleh satu
warna latar, tetapi latar itu tetap BERGERAK (§7c) — latar diam ditolak.
Yang tidak sah: latar yang tidak pernah dipertimbangkan (gelap otomatis
karena starter-nya gelap) dan pergantian tanpa pemicu. Bila berganti: di
titik cut/ketukan, di balik wipe/benda (camThrough/wipe/leak), atau sebagai
akibat aksi di layar — tidak pernah cross-fade tanpa sebab; teks ganti
varian (`.ink`) dan kantong gelap (`.pocket`) dimatikan di adegan terang;
vignette diringankan (0,3–0,4), bloom WebGL dimatikan. Gradien terang
contoh: `background:linear-gradient(160deg,color-mix(in srgb,var(--accent-lit) 30%,#fff),#fff 55%,color-mix(in srgb,var(--accent) 14%,#fff))`.

## 7c. Menu gerak latar — "gerak tiap detik" bukan berarti benda melintas

Kegagalan yang umum: opener untuk produk berbeda sama-sama memakai
batang/potongan cahaya yang melesat ke samping, karena aturan "gerak harus
ada di dunia (objek melintas) tiap detik" dibaca sempit — model memilih cara
termurah lalu mencari alasannya dari produk. Gerak latar dipilih di style brief dari
menu ini, dan harus berbeda dari proyek sebelumnya:

| #   | Bahasa gerak latar                                                                                     | Rasa            | Catatan                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1   | Latar bertekstur + kamera bernapas + satu gerak halus (tint/cahaya/grain bergeser pelan)               | tenang, mahal   | pilihan paling tenang yang masih sah; latar yang benar-benar diam ditolak                                           |
| 2   | Gradien besar yang berpindah/berputar pelan (2–3 warna palet)                                          | lembut, modern  | `background-position`/sudut di-tween 8–15 dtk                                                                       |
| 3   | Blob warna mengambang (2–4 lingkaran blur)                                                             | ramah, ringan   | ikut palet; drift ±60 px, 4–6 dtk                                                                                   |
| 4   | Grain/tekstur kertas yang hidup (offset mask per frame dari t)                                         | organik, cetak  | jangan noise acak — offset dari `t`                                                                                 |
| 5   | Sapuan cahaya SEKALI per segmen (light sweep)                                                          | premium         | bukan sapuan terus-menerus                                                                                          |
| 6   | Bentuk geometris besar (lingkaran/garis/logo negatif) berputar 20–40 dtk per putaran, 2 lapis parallax | brand, kuat     | bentuk dari logo/tema                                                                                               |
| 7   | Partikel NAIK pelan (debu, gelembung, percik)                                                          | hangat, hidup   | bukan horizontal; opacity ≤ .35 di kantong teks                                                                     |
| 8   | Grid/pola yang bernapas (skala/opacity 1.0↔1.04, 6–10 dtk)                                             | teknis, presisi | tanpa scroll                                                                                                        |
| 9   | Teks hantu raksasa bergeser lambat di belakang                                                         | editorial       | kontras rendah ≥ .12, satu gaya                                                                                     |
| 10  | Foto/ilustrasi tema dengan Ken Burns + parallax 2 lapis                                                | naratif         | butuh gradasi gelap di sisi teks                                                                                    |
| 11  | Aliran horizontal (streak/lane/range/hujan partikel)                                                   | kecepatan, data | HANYA bila tema = kecepatan/aliran; sudah dipakai dua proyek berturut → hindari kecuali dengan cara yang jelas baru |
| 12  | Medan warna palet bergantian (sapuan/snap 0,15–0,3 dtk, dipicu benda, aksi UI, atau ketukan)           | pop, energik    | untuk brand warna-warni; tiap medan diisi bentuk flat/objek yang bergerak                                           |

Aturan: satu bahasa per opener (boleh dua bila latar berganti antar
segmen), ditulis di style brief pada baris "gerak latar", terpisah dari
"tanda tangan gerak" (yang menggerakkan OBJEK/teks, bukan latar). Menu ini
juga berlaku untuk latar WebGL §7: nebula yang berdrift pelan + kamera bernapas
adalah #1, debu naik adalah #7; "tunnel/rush" adalah #11. Latar tidak pernah
diam di adegan mana pun; pergantian warna latar (§7b) boleh ditambahkan di atas
bahasa gerak mana pun.

## 7d. Menu permukaan latar — gradien, cahaya, tekstur (jangan flat)

"Gelap ≤ 25 % / terang ≥ 80 % di bawah teks" adalah aturan KANTONG TEKS,
bukan perintah membuat seluruh latar flat satu warna. Opener yang diterima
memakai latar yang kaya: gelap dengan glow radial di horizon, terang dengan
gradien lembut dan blob warna palet. Menu (semua dari token palet; nilai
bebas diubah):

```css
/* a. glow horizon (gelap) */ background:radial-gradient(70% 42% at 50% 108%,color-mix(in srgb,var(--accent) 34%,transparent),color-mix(in srgb,var(--accent) 12%,transparent) 48%,transparent 70%),linear-gradient(180deg,#05060a,var(--base) 60%,#0b1020);
/* b. duotone diagonal   */ background:linear-gradient(160deg,color-mix(in srgb,var(--accent) 55%,#000) 0%,var(--base) 45%,color-mix(in srgb,var(--accent-lit) 30%,#000) 100%);
/* c. mesh terang (blob) */ background:#F7FAFF; + 3–4 <i> radial-gradient(circle,color-mix(in srgb,var(--accent-lit) 38%,#fff),transparent 66%) berukuran 800–1200 px, drift ±60 px
/* d. spotlight + tint   */ background:radial-gradient(55% 60% at 50% 40%,color-mix(in srgb,var(--accent) 18%,var(--base)),var(--base) 75%);
/* e. langit berlapis    */ background:linear-gradient(180deg,#cfe0f5 0%,#f5efe3 100%); + pita warna tipis 2–3 lapis dengan opacity .2–.4
/* f. tekstur + tint     */ kertas/grain (feTurbulence) di atas a/b/c dengan mix-blend-mode:multiply/overlay, opacity .1–.3
/* g. grainy gradient    */ gradien jenuh 2–3 warna di BENTUK dan latar + lapisan butiran halus di atas semuanya (resep di bawah)
```

Aturan: flat satu warna hanya untuk arah "poster color-block" (diberi
grain/tekstur halus) dan "flat pop berfoto" (medan flat sah karena berganti
cepat dan selalu diisi bentuk flat/objek yang bergerak). Setiap latar punya ≥ 2 lapis (dasar + cahaya/
tekstur/blob). Warna latar dari palet tema, bukan hitam/putih murni.

### Grainy gradient (gradien berbutir)

Istilah populernya _grainy gradient_ atau _noisy gradient_: gradien warna jenuh yang
lembut ditambah butiran halus merata. Butiran membuat gradien terasa cetak/analog, dan
sekaligus menjadi dither yang mencegah banding (garis tangga) saat video dikompres.

**Ciri gaya**

- Gradien diletakkan DI BENTUK, bukan hanya di latar: lingkaran, lengkung, lubang,
  kelopak, lapisan konsentris. Tiap bentuk bercahaya dari dalam lalu memudar ke warna
  dalam/gelap; tepinya tetap tajam, isinya lembut.
- Palet 2–3 warna yang berjauhan (mis. biru ↔ oranye, teal ↔ krem, ungu ↔ merah muda) di
  atas dasar gelap atau warna dalam.
- Butiran monokrom halus di seluruh frame (latar DAN objek), intensitas sama di terang
  dan gelap — bukan bintik besar, bukan debu.
- Gerak tenang: lapisan membuka/berputar pelan, kamera menembus lubang bentuk, satu bola
  cahaya kecil memandu mata.

**Resep**

```html
<svg width="0" height="0" style="position:absolute">
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence
      type="fractalNoise"
      baseFrequency=".8"
      numOctaves="3"
      stitchTiles="stitch"
    />
    <feColorMatrix type="saturate" values="0" />
  </filter>
</svg>
<div class="grain" id="grain"></div>
<!-- lapisan teratas, di atas latar dan objek -->
```

```css
.shape {
  background: radial-gradient(
    60% 60% at 50% 30%,
    var(--c-lit),
    var(--c-mid) 45%,
    var(--c-deep) 100%
  );
}
.grain {
  position: absolute;
  inset: -60px;
  pointer-events: none;
  filter: url(#grain);
  opacity: 0.22;
  mix-blend-mode: overlay;
}
```

```js
/* butiran hidup yang deterministik: posisi melompat 12× per detik dari t, bukan Math.random */
const grainAt = (t) => {
  const k = Math.floor(t * 12);
  grainEl.style.transform = `translate(${((k * 37) % 60) - 30}px,${((k * 61) % 60) - 30}px)`;
};
```

- Latar gelap: overlay/soft-light, opacity .15–.3. Latar terang: multiply, opacity .08–.15.
- `baseFrequency` .65–.9 pada 1920×1080 memberi butiran 1–2 px; lebih halus dari itu
  hilang saat encode.
- WebGL: tambahkan di akhir fragment shader
  `col += (hash(gl_FragCoord.xy + floor(uTime*12.)) - .5) * .06;` — lebih ringan daripada
  filter SVG layar penuh.
- Preview real-time berat dengan filter SVG layar penuh: buat sekali tile noise 256 px di
  canvas lalu pakai sebagai `background-image` berulang. Untuk render per frame keduanya aman.

**Jaga-jaga**

- Butiran dan gradien halus rusak oleh kompresi: encode dengan `-crf 10–12 -tune grain`
  (libx264) atau bitrate tinggi, lalu periksa MP4-nya — bukan hanya browser. Video yang
  diunggah ulang di resolusi rendah kehilangan butiran dan memperlihatkan banding; butiran
  yang sedikit lebih besar lebih tahan.
- Kantong teks tetap diuji kontras; teks kecil boleh diletakkan di atas lapisan grain supaya
  hurufnya tidak tampak kotor.
- Grainy gradient adalah kulit, bukan kerangka: konsep dan transisi tetap dari
  `opener-konsep.md`.

## 7e. Menu gaya render objek — satu keluarga per video

Objek (ikon, benda, maskot, perangkat) bisa dirender dengan banyak bahasa material.
Pilih satu keluarga per video, atau dua bila pergantiannya dijadikan momen (bentuk flat
berputar dan ternyata benda 3D). Mencampur tanpa alasan terasa seperti kumpulan aset stok.

| Gaya render             | Ciri                                                                        | Cara di web                                                                  | Cocok untuk                           |
| ----------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------- |
| Flat solid              | isi warna rata, tanpa bayangan, bentuk geometris                            | SVG/CSS                                                                      | app konsumen, edukasi, infografik     |
| Flat + titik warna      | lingkaran palet berbagai ukuran tersebar, bergerak elastis di sekitar objek | SVG + GSAP                                                                   | brand ceria, logo reveal              |
| Soft 3D / clay          | matte pastel, sudut membulat tebal, bayangan lembut                         | Three.js `MeshStandardMaterial` roughness .7–.9, atau gambar hasil generator | fintech ramah, edukasi, produktivitas |
| Glossy 3D               | plastik mengilap, rim light, pantulan lingkungan                            | `MeshPhysicalMaterial` clearcoat 1 + envMap                                  | tech, keamanan, gaming                |
| Kaca / bola bercahaya   | transparan, pembiasan, inti bercahaya                                       | `MeshPhysicalMaterial` transmission 1 + bloom kecil                          | AI, portal, pemandu mata              |
| Isometrik               | sudut 30°, tanpa perspektif, blok rapi                                      | transform isometri CSS atau kamera ortografik                                | properti, SaaS, peta proses           |
| Logam/marmer realistis  | PBR, kedalaman bidang, gelap sinematik                                      | Three.js PBR + HDRI + DOF, atau render/generator diimpor sebagai lapisan     | penghargaan, mewah, event             |
| Garis neon di gelap     | outline tipis bercahaya, lengkung/bingkai berlapis                          | SVG stroke + glow tipis, atau garis Three.js                                 | tech, musik, portal                   |
| Ilustrasi karakter flat | tokoh vektor, warna hangat, tekstur tipis                                   | SVG/PNG berlapis                                                             | komunitas, layanan, explainer         |

- Objek realistis (logam, marmer, perangkat) paling efisien dibuat sebagai gambar/video dari
  generator atau render 3D, lalu dianimasikan sebagai lapisan (parallax, masuk/keluar, DOF
  palsu) — jangan memaksa Three.js bila hasilnya jauh di bawah.
- Gaya render ditulis di style brief dan berbeda dari proyek sebelumnya.

## 8. Tile ikon & mockup UI

**Tile ikon** (SATU opsi menyajikan fitur, bukan default — menu lengkap di
`opener-konsep.md`; jumlah mengikuti fitur, tidak selalu tiga): rounded-square ±210px, rim border
aksen terang 2px, inner glow naik dari bawah (radial di 50% 115%), ikon
stroke putih 3.5–4.5 + `drop-shadow`, label 1–2 kata di bawah. Masuk
`back.out(1.9)` stagger 0.15.

**Mockup UI**: bezel `border-radius` besar + layar `overflow:hidden`;
isi mockup memakai FONT & WARNA PRODUK ASLI (bukan font display) — mockup
dinilai sebagai "aplikasinya", bukan dekorasi. Elemen hidup di dalamnya
(spektrum, angka, sparkline) digerakkan dari sumber data yang sama dengan
latar 3D supaya konsisten. Masuk sebagai OBJEK (naik dari bawah frame,
rotateY ±10–24° dengan parent `perspective`), bukan sebagai kolom layout.

**Animasi UI app/SaaS** — UI dirakit dari komponen, dipakai (kursor/jari/aksi UI), data
hidup, dan transisi yang dibawa UI (panel mekar, lencana menyusut, karusel jendela):
panduan layout-warna-ritme dan menu gerak di `opener-konsep.md` bagian "Animasi UI
untuk app & SaaS".

**Kamera mengikuti interaksi UI** — supaya demo tidak statis dan jelas apa yang diklik.
UI penuh di frame dengan hanya kursor yang bergerak terasa seperti rekaman layar diam, dan
klik yang kecil tidak terbaca. Bila sebuah klik penting untuk cerita, kamera ikut:

1. **Dekati sebelum klik**: 0,3–0,5 dtk sebelum kursor tiba, kamera zoom ke area target
   (scale 1,4–2,2, `power2.inOut` 0,6–0,9 dtk); target sedikit di atas tengah frame.
2. **Klik terbaca**: kursor berhenti ±0,2 dtk, tombol tertekan (scale .92 → 1), sorot
   tipis pada tombol; kamera nyaris diam saat klik.
3. **Ikuti hasilnya**: kamera mundur ke lebar atau bergeser ke panel yang berubah
   (0,7–1 dtk), tidak melompat.
4. **Pilih, jangan semua**: 1–3 klik penting per babak mendapat zoom; klik lain cukup di
   kamera lebar atau pan pelan. Adegan UI yang memang tenang (dasbor dipamerkan, data
   mengisi) boleh tanpa zoom. Hindari zoom masuk-keluar bolak-balik lebih cepat dari
   ±1,5 dtk — terasa pusing.
5. Halus, tanpa blur radial — berbeda dari zoom hentak.

```js
/* ui = pembungkus seluruh UI + kursor (position:relative; transform-origin:0 0), berada di dalam
   frame ber-overflow:hidden. target = elemen di dalam ui (ui sebagai offsetParent). */
const camTo = (ui, target, at, { s = 1.8, dur = 0.8, fy = 0.45 } = {}) => {
  const W = ui.offsetWidth,
    H = ui.offsetHeight;
  const cx = target.offsetLeft + target.offsetWidth / 2,
    cy = target.offsetTop + target.offsetHeight / 2;
  tl.to(
    ui,
    {
      x: W / 2 - cx * s,
      y: H * fy - cy * s,
      scale: s,
      duration: dur,
      ease: "power2.inOut",
    },
    at,
  );
};
const camWide = (ui, at, dur = 0.9) =>
  tl.to(ui, { x: 0, y: 0, scale: 1, duration: dur, ease: "power2.inOut" }, at);
/* pola: camTo(ui,btn,T-.5) → klik di T → camWide(ui,T+.6) atau camTo(ui,panelBaru,T+.6,{s:1.3}) */
```

Kursor berada DI DALAM `ui` supaya ikut membesar bersama tombolnya. Target yang bersarang
dalam elemen ber-posisi lain: hitung posisinya dengan menjumlahkan `offsetLeft/Top` sampai `ui`.

## 9. Ketikan & angka hidup (deterministik)

Ketikan untuk teks yang memang diketik di dunia konsep (pesan, perintah, pencarian
yang jadi inti produk) — bukan kotak input yang ditaruh di setiap opener.

- Ketikan: `tl.fromTo(o,{i:0},{i:n, ease:'none', onUpdate: el.textContent =
str.slice(0, Math.round(o.i))})` — BUKAN setInterval.
- Uptime/counter: `f(t) = base + (t - tStart)`, format di render loop.
- Sparkline/spektrum: jumlah sinus berbeda frekuensi atas `t` — murah,
  terlihat organik, dan reproducible.

## 9b. Video sebagai layer footage

Motion graphic tidak hanya gambar dan shape: klip video bisa menjadi layer seperti footage
di After Effects — dipotong, diposisikan, di-mask, di-grade, dan dianimasikan bersama elemen
lain. Semua starter sudah membawa helper `clip()`.

**Kapan video lebih kuat daripada gambar**

- Gerak nyata yang menjadi bukti: rekaman layar produk, orang memakai produk, proses yang
  berjalan, suasana tempat.
- Satu momen penekanan 3–8 dtk — bukan pengganti seluruh motion design. Teks, angka,
  anotasi, dan transisi tetap dianimasikan di atas/sekitar klip.
- Bila gambar diam cukup menjelaskan, pakai gambar (lebih ringan, ekspor lebih cepat).

**Sumber klip** (ditanyakan ke user, sama seperti foto — `opener-konsep.md` "Foto dalam opener")

- File dari user (prioritas): rekaman layar produk, B-roll brand, footage acara.
- Generate lewat MCP Higgsfield bila disetujui — cek biaya dulu (klip video jauh lebih mahal
  daripada gambar). Paling konsisten: generate gambar dengan gaya proyek, lalu image-to-video.
- Stok berlisensi. Konteks faktual (berita, sejarah, data): klip hasil generate diberi label
  "ilustrasi/rekonstruksi" — jangan disajikan sebagai rekaman asli; wajah orang nyata tidak
  di-generate.

**Format**

- MP4 H.264 (`yuv420p`, `+faststart`) atau WebM VP9; tanpa suara (musik/VO tetap trek
  terpisah); 720p–1080p; potong ke bagian yang dipakai supaya ringan.

```bash
ffmpeg -i sumber.mov -ss 2 -t 6 -vf "scale=1920:-2" -c:v libx264 -pix_fmt yuv420p -crf 20 -movflags +faststart -an assets/klip.mp4
```

- Deliverable menjadi `index.html` + folder `assets/` berisi klip; sebutkan itu ke user.

**Pola pemakaian** (animasikan PEMBUNGKUS, bukan `<video>`-nya)

- Di dalam perangkat: layar laptop/ponsel di opener SaaS; kamera menembus ke layar.
- Di dalam wadah: kartu foto, bingkai membulat, lingkaran, huruf raksasa (`clip-path`/mask).
- Belahan layar: video di satu sisi, klaim/angka di sisi lain.
- Layar penuh dengan lapisan di atasnya: grade/tint palet (`filter` atau lapisan
  `mix-blend-mode`), vignette, teks di kantong kontras (§1b).
- Waktu: potong `in/out`, `rate` untuk slow/fast motion, `hold` untuk freeze frame akhir.
- Transisi masuk/keluar sama seperti elemen lain (wipe benda, kartu membesar, match cut).

**API helper** (ada di semua starter, setelah baris `window.OPENER=`)

```html
<div class="clipbox" id="box1">
  <video id="v1" src="assets/klip.mp4" muted playsinline preload="auto"></video>
</div>
```

```js
clip($("#v1"), { at: 4, in: 1.5, out: 6, rate: 1, hold: false }); // at = detik timeline; in/out = potongan sumber
tl.set("#box1", { autoAlpha: 1 }, 4); // tampilkan pembungkus saat klip mulai
tl.fromTo(
  "#box1",
  { scale: 0.8 },
  { scale: 1, duration: 1, ease: "power3.out", immediateRender: false },
  4,
);
```

- Isi video mengikuti jam timeline: saat diputar disinkronkan (koreksi bila selisih > 0,2 dtk),
  saat scrub/pause di-seek tepat. Jangan pakai atribut `autoplay`/`loop` dan jangan
  memanggil `play()` sendiri.
- `OPENER.seekFrame(t)` men-seek timeline DAN menunggu frame klip siap; `snap.mjs` dan
  `export-frames.mjs` memakainya otomatis, dan menunggu `OPENER.clipsReady()` sebelum mulai.
- Sembunyikan pembungkus di luar rentang klip (`autoAlpha`) — di luar rentang, video dijeda.

**Jaga-jaga**

- Paling banyak 2–3 klip tampil bersamaan; klip besar yang tak terlihat tetap di-decode.
- Ekspor MP4 lebih lambat karena tiap frame menunggu decoder video.
- Selisih ±1 frame saat diputar real-time itu wajar; hasil ekspor tetap presisi frame.
- Periksa hasil dengan `snap.mjs` di detik yang ada klipnya, bukan hanya di browser.

## 10. Jebakan

| Gejala                                                   | Sebab                                                                                                                               | Obat                                                                                                                    |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Seluruh frame putih menyala                              | bloom threshold rendah + additive layers                                                                                            | threshold ≥.5; latar NormalBlending                                                                                     |
| Elemen muncul mendahului animasinya                      | selector CSS lebih spesifik dari state-awal `opacity:0`                                                                             | jangan tulis opacity di selector spesifik; GSAP yang beri nilai akhir                                                   |
| Edit JS "tidak ngefek"                                   | browser cache module (heuristic)                                                                                                    | server `Cache-Control: no-store`                                                                                        |
| Ornamen 3D jadi garis putih                              | benda pipih diputar penuh sumbu Y                                                                                                   | goyangan sinus, bukan rotasi penuh                                                                                      |
| Ekor blur terpotong kotak                                | filter region default 110%                                                                                                          | x/y -70%, width/height 240%                                                                                             |
| Teks "gelap/kusam"                                       | tumpukan glow menghisap kontras                                                                                                     | hapus glow judul, putih penuh                                                                                           |
| Pita terang memotong teks di horizon                     | garis grid menumpuk di titik temu                                                                                                   | fade grid sebelum horizon                                                                                               |
| Scrub menghasilkan gambar beda-beda                      | ada random/akumulasi di render                                                                                                      | lihat daftar larangan determinisme                                                                                      |
| Teks patah/selebar salah saat split                      | split sebelum font termuat                                                                                                          | tunggu `document.fonts.ready`                                                                                           |
| Huruf/pill "flash" sesaat sebelum animasi masuknya       | `tl.set(el,{autoAlpha:1})` lalu `fromTo(...immediateRender:false)` mulai beberapa frame kemudian — di antaranya elemen tampil penuh | state awal `.ch`, `.hl-t`, tanda baca = `opacity:0` DI CSS, bukan hanya pembungkusnya                                   |
| Kartu kontrol/teks bergetar lebarnya saat angka berjalan | digit proporsional (1 lebih sempit dari 8)                                                                                          | `font-variant-numeric:tabular-nums` + `min-width` pada elemen angka                                                     |
| Screenshot scrub tertinggal satu langkah / tidak sinkron | GSAP menulis gaya secara lazy di tick berikutnya dan kanvas menunggu rAF (yang dithrottle di tab tersembunyi)                       | sediakan `OPENER.seek(t)` = `tl.pause(); tl.time(t); gsap.ticker.tick(); render(t)` dan pakai itu dari puppeteer/konsol |

---

# Lampiran D: explainer.md ( )

> Terapkan aturan adaptasi Bagian 8: gunakan Hybrid CDN dengan fallback lokal (`vendor/*.min.js`) dan kunci waktu secara lockstep ke `t = frameIndex / fps` (`masterGsapTl.time(t)`), abaikan player/debug/snap/export/AE bridge. Aturan Bagian 1 selalu menang.

# Explainer — cerita bergambar, bukan promo

Untuk kartun edukasi flat berkarakter (gaya 6, **kartun panggung**: satu panggung
per adegan, rig sendi, nol caption), baca [kartun-panggung.md](kartun-panggung.md).
Jumlah kalimat tidak menentukan jumlah shot; lebih banyak gerak kamera juga
bukan otomatis lebih menarik. Bagian resep kolase di bawah adalah opsi, bukan
pola wajib bagi semua explainer.

Dua gaya explainer yang paling sering dipakai:

|             | Kartun + VO                                                         | Jurnalisme visual (foto)                                    |
| ----------- | ------------------------------------------------------------------- | ----------------------------------------------------------- |
| Cocok untuk | sains/edukasi, ±75 dtk, 9:16                                        | berita/geopolitik, ±75 dtk, 9:16                            |
| Latar       | kertas krem bertekstur + noda warna                                 | hitam pekat + grain tipis                                   |
| Gambar      | ilustrasi flat digenerate (GPT Image 2) lalu latar dihapus → cutout | foto asli berlisensi bebas (Wikimedia Commons, NASA, DVIDS) |
| Teks        | Bricolage Grotesque tebal + Caveat (tulisan tangan)                 | Barlow Condensed tebal + IBM Plex Mono (kicker)             |
| Aksen       | pill warna (oranye/teal/merah/mustard), coretan spidol              | highlighter kuning, merah untuk peringatan, garis putus     |
| Suara       | VO diikat ke timeline                                               | tanpa VO — teks membawa cerita, beat 3–5 dtk untuk dibaca   |

Opener menjual satu perasaan; explainer **mengantar satu argumen**. Hukum
anti-PPT tetap berlaku, tapi dengan dua kelonggaran: satu adegan boleh punya
kalimat + satu angka/anotasi, dan mockup/peta/grafik boleh "padat" karena
dibaca sebagai gambar.

## Langkah nol: pastikan gayanya, rasio, durasi, suara

User sering hanya bilang "buatkan explainer tentang X". Kalau dibiarkan,
model mengarang gaya, rasio, DAN durasi — bisa jadi 10 menit. Sebelum
menulis apa pun, ajukan SATU pertanyaan (pakai mekanisme tanya-jawab agenmu
bila ada; kalau tidak, tulis daftarnya dan tunggu jawaban) berisi empat hal.
Lewati bagian yang sudah disebut user; bila ada video referensi, gaya
diambil dari sana (ritmenya — lihat SKILL.md Hukum #3).

**Gaya** (sertakan satu baris rekomendasi: sejarah → 4 atau 1; berita → 2;
produk → 3; gerak/rute → 5; sains/edukasi berkarakter → 6; topik ringan → 1):

| #   | Gaya                  | Rasanya                                                                                              | Cocok untuk                                               | Aset                                                     |
| --- | --------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------- |
| 1   | Kartun kolase         | kertas krem, cutout ilustrasi flat, pill warna, tulisan tangan                                       | edukasi sains/anak, topik ringan                          | ilustrasi digenerate → latar dihapus                     |
| 2   | Jurnalisme visual     | hitam, foto asli, highlighter kuning, tag sumber                                                     | berita, isu viral, geopolitik                             | foto berlisensi bebas (Wikimedia/NASA)                   |
| 3   | Katalog putih         | putih bergrid, cutout foto, tipografi campur, coretan                                                | produk, brand, profil perusahaan                          | foto produk/orang, latar dihapus                         |
| 4   | Sketsa vintage        | kertas sepia, ukiran/etsa, serif klasik, anotasi karat                                               | sejarah, biografi, penemuan                               | ilustrasi gaya ukiran digenerate                         |
| 5   | Aksi kontinu (vektor) | dunia mengalir, satu subjek, angka di dalam dunia, ganti sudut                                       | kecepatan, rute, transportasi, olahraga, proses           | 100 % SVG digambar, tanpa generate                       |
| 6   | Kartun panggung       | flat cerah, satu panggung per adegan, tokoh bersendi beraksi, mesin/air/tanaman hidup, tanpa caption | edukasi sains/sosial berkarakter, proses & dampak, cerita | tubuh & dunia vektor; kepala digenerate → ekspresi lokal |

**Tiga hal lain dalam pertanyaan yang sama:**

| Hal    | Pilihan                                                                         | Default bila "terserah"              |
| ------ | ------------------------------------------------------------------------------- | ------------------------------------ |
| Rasio  | 16:9 (YouTube/layar) · 9:16 (Reels/TikTok/Shorts) · 1:1                         | 16:9                                 |
| Durasi | 30 dtk · 60 dtk · 90 dtk                                                        | 60 dtk                               |
| Suara  | tanpa suara · VO dikirim user nanti (bangun dulu, retime kemudian) · musik saja | tanpa suara, naskah VO tetap ditulis |

Yang TIDAK ditanya: caption (default tanpa) dan player (default tanpa,
autoplay + loop).

**Pagar durasi:** ikuti durasi brief dan VO; default tetap ringkas. Jumlah
adegan ditentukan oleh konteks yang berubah. Beberapa kalimat dapat memakai
satu dunia dengan aktivitas yang berkembang. Materi berlebih dipotong,
bukan videonya dipanjangkan. Permintaan "10 menit" → konfirmasi, lalu pecah
per bab ≤ 90 dtk dengan berkas terpisah.

## Penyerahan: naskah VO ikut di pesan, user yang mengisi suaranya

Explainer hampir selalu berakhir dengan VO dari user (direkam sendiri atau
di-generate di layanan TTS pilihannya). Jadi urutan bakunya: bangun tanpa
suara dengan timing baca → serahkan `index.html` + naskah VO DI DALAM pesan
penutup → minta user merekam/generate dan mengirim ulang audionya → retime
video ke audio itu. Contoh penutup:

> Naskah VO (satu paragraf = satu adegan, angka ditulis dengan kata):
>
> 1. …
> 2. …
>    Rekam atau generate dengan suara pilihanmu — bicara wajar, jeda ±1 detik
>    antar paragraf, format wav/mp3 bebas — lalu kirim ke sini; videonya akan
>    saya sinkronkan ke suara itu.

Naskah yang sama disimpan sebagai `vo-script.md`. Jangan hanya menulis
"naskah ada di berkas": user membaca pesan, bukan folder.

## Mulai dari starter yang benar

Explainer SELALU dimulai dari starter gayanya (folder `assets/`):
`starter-explainer-kartun.html`, `starter-explainer-jurnalisme.html`,
`starter-explainer-katalog.html`, `starter-explainer-sketsa.html`, atau
`starter-explainer.html` untuk aksi kontinu. Kelimanya satu rig; yang beda
hanya PERMUKAAN (tekstur latar, jenis aset, font, warna). Dua mode gerak:

| Mode   | Dunia                                                                                     | Gerak utama                                                                           | Gaya yang memakainya                                          |
| ------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| ALIRAN | strip parallax mengalir dari profil kecepatan, subjek diam di frame, objek dunia melintas | dunia bergerak                                                                        | aksi kontinu (vektor)                                         |
| KOLASE | kertas/foto/putih diam berisi cutout & foto, boleh lebih besar dari frame                 | kamera: `into` → `settle` → `look` → `home` lalu DIAM; aset `fly` dan tetap bergoyang | kartun kolase, jurnalisme foto, katalog putih, sketsa vintage |

Keduanya boleh dicampur dalam satu video (mis. kolase untuk sejarah, lalu
whip ke peta simulasi). Starter kolase sudah berisi contoh koreografi wajib:
mulai close-up aset A → `look` ke aset B → `home` (zoom out selesai) → baru
`say` kalimat + `draw` anotasi + label → `unsay` → `into`/`settle`
push-through ke adegan 2 yang letaknya di luar frame (bukan section
di-fade).

Jebakan scrub: `tl.pause(t)` GSAP menekan callback (`suppressEvents`), jadi
`onUpdate: applyCam` tidak jalan saat snapshot/scrub walau saat diputar
normal jalan. `seek` harus `tl.pause(t,false)` lalu `applyCam()`. Yang tidak boleh: menulis dari nol atau dari starter
opener — hampir pasti berujung "section yang di-fade".

## Default yang sering salah dikira

- **Rasio: default 16:9 (1920×1080) atau mengikuti layar user.** 9:16 HANYA
  bila user memintanya (Reels/TikTok/Shorts). Jangan berasumsi explainer =
  vertikal.
- **Tanpa player.** Autoplay + loop; panel scrub hanya `?debug=1`.
- **Tanpa subtitle/caption.** Default tidak ada teks pendamping VO di bawah
  layar; caption hanya bila user minta. Informasi dibawa oleh angka besar,
  label yang hidup di dalam dunia (papan nama, tanda stasiun), dan gambar.
- **Pelajari prinsip referensi, jangan salin perangkat tata letaknya.** Panel
  tiga kolom, subtitle bawah, bentuk odometer — kalau referensi memakainya,
  itu contoh, bukan resep. Ambil prinsipnya (angka di dunia, subjek terus
  bergerak) lalu wujudkan dengan cara sendiri.
- **Panggung diskalakan ke jendela dengan `position:absolute; left:50%;
top:50%; transform:translate(-50%,-50%) scale(s)`**, bukan grid
  `place-items:center` — sel grid ikut setinggi panggung mentah, sehingga
  panggung terdorong ke bawah dan terpotong.

## Struktur yang dipelajari dari referensi (bukan ditiru)

Explainer kolase dan explainer jurnalisme visual yang baik punya tulang
yang sama, dan tulang inilah yang boleh dipakai ulang:

1. **Hook** = satu gambar + satu klaim yang bikin penasaran (viral, angka
   aneh, pertanyaan).
2. **Pertanyaan eksplisit** di layar ("Kenapa bisa?", "Kenapa tahun ini?").
3. **Konteks visual**: peta / foto lokasi / ilustrasi dunia, dengan label
   dan satu lingkaran merah di titik penting.
4. **Angka besar** yang menghitung naik, lalu dibandingkan (bar sebelum/sesudah).
5. **Linimasa** 2–3 tanggal, satu kalimat per tanggal.
6. **Grafik** yang menggambar diri (garis harga, area di bawahnya).
7. **Dampak ke penonton** ("terasa di dompet sehari-hari").
8. **Penutup yang menggema ke hook** + daftar sumber kecil.

Jangan ambil: palet, font, layout persis, maskot, kalimat. Ganti semuanya.

## Satu adegan = 3–5 elemen yang menumpuk (bukan satu gambar)

Kegagalan yang umum: tiap adegan hanya SATU cutout + satu kalimat. Walau kamera
sudah bergerak, penonton tidak tahu "seperti apa" hal yang diceritakan — satu
simbol tidak cukup menjelaskan. Explainer jurnalistik yang baik (±20 beat per
30 dtk) memakai pola berikut:

1. **Akresi per frasa.** Tiap frasa VO MENAMBAH satu elemen; elemen lama
   tetap di tempat. Adegan selesai dengan 3–5 elemen (maksimal 5) yang
   bersama-sama menjelaskan: subjek (foto/cutout) + bukti (dokumen, kliping,
   layar) + skala (angka atau grid pengulangan) + label/stempel tanggal +
   coretan. Contoh "pesan musuh tak terbaca" = kapal → kapal selam melintas →
   radio penyadap → lembar telegram berisi sandi yang terus berganti + stempel
   RAHASIA → kalimat.
2. **Bukti, bukan hiasan.** Pilih elemen yang menjawab "seperti apa
   bentuknya?": dokumen ketik dengan stempel (nama perkara · BERSALAH),
   kliping koran dengan frasa disorot, kartu sumber (badge media + judul),
   layar/mockup, blok tanggal. Dokumen dibangun di HTML (kertas putih +
   border tipis + mono + stempel miring merah) — tidak perlu digenerate.
3. **Pengulangan untuk skala.** Satu gambar diperbanyak jadi grid (foto anak sekolah
   jadi puluhan; satu rotor mesin jadi 12 rotor)
   dengan stagger `back.out` — lebih terasa daripada angka saja. Angka
   tetap ada, tapi bukan satu-satunya.
4. **Foto → dokumen.** Foto zoom out lalu ternyata ada di sampul majalah /
   koran; blok tahun muncul di sebelahnya. Satu aset, dua makna.
5. **Elemen yang bergerak sendiri** (deterministik dari `tl.time()`):
   huruf sandi berganti lalu terurai jadi teks terbaca, jarum jam berlari ke
   tengah malam, angka menghitung naik, palu hakim mengetuk.
6. **Kamera tetap satu per adegan**: elemen menumpuk di area yang sama;
   kamera `look` sedikit (±200 px, z 1–1,15) untuk menyambut elemen baru.
   Elemen baru = look kecil, bukan cut.
7. **Batas teks tidak berubah**: satu kalimat besar + satu label per adegan.
   Dokumen/stempel/blok tanggal/catatan tangan dihitung OBJEK (dibaca sebagai
   gambar) bukan tingkat teks — syaratnya isi ≤ 3 baris pendek.
8. **Aset tambahan cepat**: properti fotoreal "studio product photo,
   isolated on pure white" (Higgsfield `gpt_image_2_5`, tanpa wajah orang
   nyata) ditumpuk `mix-blend-mode:multiply` — latar putihnya lenyap di atas
   grid tanpa hapus latar. Jangan beri `drop-shadow` pada elemen multiply
   (bayangannya jadi persegi); bayangan sudah ada di fotonya. Foto arsip
   berlatar rumit tetap lewat `image_background_remover` (butuh `prompt`),
   lalu pangkas margin transparan (bbox alpha) supaya ukuran CSS = isi.
9. Kalau `remove_background` menghapus subjeknya (kapal hilang, tersisa
   haluan kapal lain), jangan dipaksa — generate properti pengganti.

Helper di `assets/starter-explainer-katalog.html`: `slam` (stempel
dihentak), `block` (blok tanggal disingkap dari kiri), `multiply` (grid
beruntun); CSS `.doc`, `.stampblk`, `.pnote`, `.grid`, `.cut.card`.

## Resep teknis

**Panggung 9:16**: `#stage` 1080×1920, `fit()` sama seperti 16:9. Judul
88–168 px, kicker mono 26 px, kredit foto 20 px kiri-bawah.

**Kalimat per kata** (`say/unsay`): tiap kata `<span class="wd">` (nowrap)
masuk `yPercent 60→0, scaleY 1.3→1`, stagger 0.07–0.12, blur vertikal;
kata kunci `<span class="wd hl"><i></i>kata</span>` — `<i>` adalah
highlighter yang `scaleX 0→1` dari kiri SETELAH kata-katanya selesai
(`hlAt`). Frasa yang harus bisa patah baris JANGAN dijadikan satu `.wd`
(itu penyebab teks meluber ke luar frame di 9:16).

**Foto** (`photo(sel, at, end, {from,to,x,y})`): `object-fit:cover`, masuk
dengan blur berarah, lalu Ken Burns `scale 1→1.12–1.25` + geser sedikit
sepanjang adegan (`ease:'none'`). Gradasi gelap di atas/bawah (`.dim`,
`.top`) supaya teks kontras. Grain ringan `mix-blend-mode:overlay`.

**Cutout ilustrasi** (`enter/leave`): masuk dari bawah dengan overshoot
`back.out(1.4)`, drop-shadow di elemen pembungkus. Filter warna (grayscale)
taruh di `<img>`, bukan di pembungkus — `blurTween` menulis `filter` pada
pembungkus dan menghapus filter lain.

**Anotasi SVG** (`draw`): `strokeDasharray = L`, `strokeDashoffset L→0`.
Set `opacity:0` sampai detik mulainya — linecap bulat pada panjang 0 tampak
sebagai titik nyasar. Garis putus-putus tidak bisa pakai dashoffset (akan
"berjalan"); pakai `clip-path: inset()` yang dibuka dari kiri (`drawDash`).

**Peta**: citra satelit domain publik (NASA MODIS/Worldview) sebagai dasar +
label `.tag` mono dengan garis kiri kuning + lingkaran merah + garis putus
jalur. Lebih jujur dan lebih cepat daripada menggambar peta sendiri.

**Grafik garis**: hitung titik dari data di JS, `path` digambar dengan
dashoffset, area gradasi fade-in setelahnya, titik data pop stagger, label
hanya untuk 2–3 titik penting (awal, puncak, terakhir).

**Angka besar**: tween objek `{v}` → `textContent = Math.round(v)`;
`font-variant-numeric: tabular-nums`.

**Tint per adegan**: lapisan `.tint` full-frame (malam/dingin/gelap) di
dalam `#world`, di-tween opacity — murah dan langsung mengubah mood.

**Potongan antar adegan** (`cut`): dorong dunia 1.05× lalu adegan baru
lahir 1.08–1.12× dan mengendap ke 1 dalam 0.8 dtk; elemen lama keluar ke
atas dengan blur SAMBIL yang baru masuk. Kamera tetap bernapas di antara.

**Retime ke VO yang datang belakangan** (video dirancang dulu tanpa suara).
Tanpa ffmpeg: buka `scripts/vo-pauses.html`, pilih audionya, salin `SEG`
(mulai tiap potongan ucapan), `PARA` (mulai tiap paragraf = adegan) dan
`DUR`; angkanya identik dengan `silencedetect` (ambang -30 dB relatif
puncak, jeda >= 0,45 dtk, paragraf >= 0,8 dtk; ubah bila VO berisik).
Langkahnya:
jangan tulis ulang build(). Bungkus `tl.to/fromTo/set` dengan pemetaan
posisi linear per adegan `T(t)` dari batas adegan lama (OLD) ke awal
paragraf VO (NEW, dari silencedetect jeda ≥0,9 dtk; VO bernoise perlu
ambang −25 dB). Durasi tween tetap; hanya posisinya yang meregang. Transisi
push-through dihitung langsung di waktu baru (`T(cut)-.9`) supaya tetap
presisi. Satu berkas VO lebih mudah daripada delapan klip.

**VO diikat timeline** (kalau ada): `<audio>` per klip + `syncAudio()` di
loop rAF: bila timeline play dan `t` di dalam rentang klip → `currentTime =
t - start`, play; bila tidak → pause. Perlu tombol "Mulai" pertama karena
autoplay. Durasi adegan ikut durasi klip (ukur dulu dengan ffprobe).

## Sumber gambar

- **Digenerate** (kartun): Higgsfield `gpt_image_2` (1k, medium), prompt
  satu gaya untuk semua aset ("flat vector, outline coklat tebal, warna
  hangat, latar putih polos"), lalu `remove_background` → PNG transparan.
  Generate dalam satu batch supaya gayanya seragam.
- **Foto asli** (jurnalistik): Wikimedia Commons API
  `action=query&generator=search&gsrnamespace=6&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1920`
  → cek `LicenseShortName` (Public domain / CC BY / CC BY-SA), unduh thumb
  1920 px, tulis kredit di layar. NASA (MODIS/Worldview) dan DVIDS/DoD
  domain publik. Jangan pakai screenshot berita/TV.
- Kalau foto lokasi persis tidak ada, pakai foto sejenis dan beri label
  "ilustrasi" — jangan berpura-pura.
- **Video pelengkap**: klip 3–8 dtk sebagai layer footage (`techniques.md` §9b) — dari user,
  stok berlisensi, atau generate lewat MCP bila disetujui (label "ilustrasi/rekonstruksi" pada
  topik faktual). Klip tetap dibungkus desain adegan: kartu, bingkai, anotasi, angka.

## Entitas yang disebut WAJIB tampil (aturan krusial)

Kegagalan yang umum: nama perusahaan disebut tanpa foto perusahaannya, nama
penemu disebut tanpa wajahnya, "17 pabrik" tanpa pabriknya, produk disebut
tanpa kemasannya — penonton tidak bisa mengaitkan kata dengan gambar. Prosedur:

1. Dari naskah, tulis **daftar entitas**: orang, perusahaan, gedung/kota,
   produk/varian, peristiwa. Tiap entitas = satu gambar di adegannya.
2. Urutan sumber: foto bebas lisensi (Commons/NASA) → foto resmi dari situs
   produk/artikel (`og:image` halaman, kredit dicantumkan) → foto kiriman
   user → generate fotoreal berlabel "ilustrasi" hanya untuk tempat/objek
   generik (pabrik, lini produksi), **tidak pernah** untuk wajah orang nyata.
3. Foto orang dari komposit/meme (mis. tangkapan layar viral) boleh dipotong
   dan dihapus latarnya jadi cutout — hasilnya justru cocok dengan gaya
   kolase. Cantumkan sumbernya.
4. Kalau semua gagal, tanya user sebelum memakai siluet/placeholder.

## Keterbacaan di ponsel (aturan keras)

Keterangan ilustrasi 22 px dan sub-label nama 26 px hampir tidak bisa dibaca,
apalagi di ponsel. Video 9:16 ditonton di layar ±6 inci,
dan safe-area scale 0,78 memperkecil semuanya lagi. Ukuran MINIMUM pada
panggung 1080 px (sebelum safe-scale):

| jenis teks                | minimum                             |
| ------------------------- | ----------------------------------- |
| body copy / keterangan    | 44 px                               |
| label nama, kicker, tahun | 34 px (sub-label 32 px)             |
| kredit / sumber           | 30 px, kontras cukup (opacity ≥ .6) |
| anotasi tulisan tangan    | 48 px                               |
| judul                     | 100 px ke atas                      |

Kalau memakai safe-scale, kalikan 1/0,78 dulu. Tidak ada teks di bawah
30 px, titik. Kalau ada informasi yang "tidak muat", pecah ke adegan lain
atau buang — bukan dikecilkan.

## Variasi, bukan pola tetap

Dua kebiasaan yang membuat video terasa "itu-itu saja":

- **Teks hantu / angka tahun besar**: pilih SATU gaya untuk satu video
  (outline di satu adegan dan isi di adegan lain terasa tidak
  konsisten) — dan pastikan terlihat: isi transparan ≥ .18–.25, jangan
  .08–.12 karena menyatu dengan latar. Gaya lain (outline, blur, terpotong
  tepi) dipakai di video lain, bukan dicampur dalam satu video.
- **Lingkaran / anotasi** tidak harus putus-putus. Bergantian: garis utuh
  tipis, garis warna aksen, garis ganda, kotak sudut, garis bawah tangan,
  atau tanpa lingkaran sama sekali.

## Aset harus terasa hidup

Ayunan cutout ±10 px selama 2 dtk terlihat statis. Minimum:
ayunan ±22–28 px dengan durasi 1,3–1,8 dtk (`sine.inOut`, yoyo), ditambah
putaran kecil ±1,5° dan pertumbuhan skala 1→1,06 pelan sepanjang adegan,
serta geser x beberapa belas px. Beri fase/durasi berbeda per objek supaya
tidak serempak. Untuk objek besar (kapal, kota) tambahkan gerak arah
(berlayar, dorong kamera) dengan `ease:'none'`.

## Resep kamera kolase: close-up → meluncur → zoom out

Prinsip umum ukuran shot untuk semua jenis video ada di `techniques.md` §3b.
Ini satu resep untuk kolase berteks. Untuk animasi karakter/proses, kamera dapat
menetap, mengikuti subjek, atau menyusuri sistem setelah reveal awal. Jangan
memaksakan resep ini pada setiap segmen; gunakan kebutuhan narasi sebagai alasan.

Resep ini menjawab tiga kegagalan umum: (a) animasi yang hanya
"elemen masuk, elemen keluar" terasa PPT; (b) setelah kamera zoom out lalu
mendorong lagi ke catatan, "info lain terpotong"; dan potongan langsung dari
lebar ke close-up "terkesan tiba-tiba karena latar tiba-tiba zoom in".

- Rig `#world` = kamera: state `C={x,y,z}` (titik fokus dalam koordinat
  adegan + zoom), diterapkan tiap frame: `transformOrigin:'0 0'; scale:z;
x:540-sx*z; y:960-sy*z` dengan (sx,sy) titik fokus setelah safe-scale.
  Helper `look(at,x,y,z,dur,ease)`; `HOME` = posisi identitas (pusat frame,
  z 1) — hitung dari safe-scale, bukan asal (540,960).
- **Pola per adegan**: lahir di close-up aset pertama (z ≈ 1,4, mengendap
  ke 1,32) → meluncur ke aset kedua sambil ia masuk → zoom out ke HOME saat
  judul muncul → **diam** di HOME sampai transisi. Tidak ada dorongan lagi
  setelah zoom out; catatan/rute cukup dianimasikan elemennya.
- **Transisi = push-through** (bukan jump): 0,9 dtk sebelum cut, elemen lama
  sudah pergi dan kamera mendorong (`power2.in`) ke titik aset pertama adegan
  berikutnya; tepat di cut adegan baru lahir di framing itu dan kamera
  mengendap (`power3.out`). Latar yang kontinu membuat potongan tak terasa.
  Aset pertama harus sudah masuk ≤ 0,1 dtk setelah cut supaya close-up tidak
  kosong.
- **Urutan wajib: zoom out SELESAI dulu, baru teks muncul.** Alasannya:
  teks yang lahir bersamaan (atau lebih dulu) dengan zoom out "terasa
  terpotong". Judul, body, label tahun, catatan tangan — semuanya
  dijadwalkan ≥ 0,1 dtk setelah `home()` selesai. Zoom out dibuat singkat
  (1,0–1,2 dtk) supaya masih ada waktu baca; kalau tidak muat, buang satu
  kalimat (kalimat pembuka yang sudah dibawa VO adalah kandidat pertama).
- Panorama (kota, kapal): pan menyusur 2,5–3 dtk pada z 1,3–1,5, baru ke
  HOME. Objek yang masuk dari samping "disambut" kamera yang ikut bergerak.
- Wajib: latar/kertas jauh lebih luas dari frame (`inset:-1400px`) dan
  vignette DI LUAR rig; jangan tumpuk tween scale lain pada rig (kamera
  bernapas digantikan koreografi ini).

## Format sosial (IG Reels / TikTok / Shorts)

- **Safe area**: bungkus semua adegan dalam `.safe{transform:scale(.78);
transform-origin:50% 45%}` → margin atas ±190 px, bawah ±230 px pada
  1080×1920 supaya tidak tertutup caption/navigasi. Grid/latar tetap penuh.
- **Tanpa kontrol**: tidak ada overlay Play maupun slider. R = replay,
  spasi = pause. `?clean=1` tetap ada untuk render.
- **Suara harus terdengar sejak awal.** Browser memblokir audio autoplay tanpa
  gestur (juga di `file://`), dan user menganggap "suara tidak muncul"
  sebagai bug. Dua lapis:
  1. Di halaman: coba `vo.play()`; bila berhasil → play dari 0 bersuara.
  2. Bila ditolak: **JANGAN mulai tanpa suara** — tahan di frame awal dengan
     petunjuk kecil "ketuk / tekan tombol apa pun", lalu gestur pertama
     memulai video + suara bersamaan dari 0. (Memutar visual dulu lalu
     restart saat diketuk terasa seperti suara hilang.)
     Jangan membuat file peluncur (`.cmd`, `.bat`, skrip shell) untuk memaksa
     autoplay — deliverable cukup `index.html` (+ `assets/`). Trik
     play-muted-lalu-unmute juga tidak bekerja: unmute tanpa gestur tetap
     diblokir.

## Fakta

Explainer berita wajib sumber: cari dulu (EIA/lembaga resmi, media besar,
Wikipedia Current Events untuk tanggal), simpan daftar sumbernya di README
dan tampilkan ringkasannya di kartu penutup. Angka yang tidak terverifikasi
tidak ditampilkan — tulis klaim kualitatifnya saja.

## Jebakan yang sudah terjadi

| Gejala                                         | Sebab                                          | Obat                                                     |
| ---------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------- |
| Kalimat meluber ke luar frame 9:16             | satu frasa panjang dijadikan satu `.wd` nowrap | pecah per kata                                           |
| Mockup ponsel menutupi baris ke-3 judul        | posisi ponsel dihitung untuk judul 2 baris     | ukur tinggi judul asli, ponsel mulai ≥ 60 px di bawahnya |
| Cutout tetap berwarna padahal diberi grayscale | `blurTween` menimpa `filter` pembungkus        | filter warna di `<img>`                                  |
| Titik merah nyasar sebelum coretan digambar    | linecap bulat pada dash length 0               | `opacity:0` sampai `draw` mulai                          |
| Latar kanvas WebGL tidak diperlukan            | explainer 2D                                   | lewati Three.js; cukup rig `#world` + tint + grain       |

## Gaya ketiga: "katalog putih" (cutout foto di latar putih)

Ciri gaya: latar putih bergrid tipis, cutout produk, objek terbang melewati
lensa, lingkaran putus-putus, tipografi script + sans tebal miring.
Cocok untuk explainer produk atau merek (±60 dtk, 9:16, tanpa VO) dengan warna
dan foto asli — bukan hitam-putih, bukan kartun.

- Latar `#fff` + grid 120 px `rgba(0,0,0,.07)` yang dipudarkan ke tepi (mask
  radial). Tanpa grain, tanpa vignette — bersih.
- **Cutout** = foto Commons yang latarnya dihapus (impor URL ke Higgsfield
  `media_import_url` → `remove_background`; lebih andal daripada upload +
  PUT). Bayangan dua lapis `drop-shadow` (jauh lembut + dekat tipis).
- **Properti pendukung** (sumpit, globe, blok mi) boleh digenerate fotoreal
  "studio product photo, isolated on pure white" lalu dihapus latarnya.
- **Tipografi campur** per beat: script (Caveat) untuk penghubung ("lihat
  bagaimana", "lalu…"), sans 900 untuk subjek, italic 900 untuk angka/klaim,
  kicker mono-ish uppercase spasi lebar, body copy kecil abu-abu.
  Masuk: script `scale .7→1 back.out`, bold dari kiri dengan blur horizontal,
  body per baris.
- **Lingkaran putus-putus** di sekitar objek utama: `stroke-dasharray` tetap,
  digambar dengan `clip-path: inset()` dari kiri (bukan dashoffset).
- **Objek lewat lensa** (`pass`): cutout besar terbang diagonal dengan blur
  horizontal konstan, 1.2–1.3 dtk, lalu hilang — dipakai 1–2× per adegan.
- Peta dunia SVG opacity ~.16 + titik merah + garis putus rute.
- Jebakan: cutout tinggi (foto potret) mudah menabrak body copy — hitung
  tinggi dari rasio foto; taruh body copy DI ATAS peta/objek bila perlu.
- **Elemen bukti** (explainer tokoh sejarah ±50 dtk, 9:16, VO): kartu foto
  (`.cut.card`: foto arsip berbingkai putih 16 px, grayscale ringan),
  dokumen ketik (`.doc`: judul Inter spasi lebar + Plex Mono + stempel
  `.stamp` merah/hijau yang dihentak `slam`), blok tanggal (`.stampblk`
  hitam/kuning disingkap `block`), catatan tangan (`.pnote` Caveat di
  kertas krem), grid pengulangan (`.grid` + `multiply`), jam SVG dengan
  jarum yang di-tween `rotation` + `svgOrigin`. Lihat bagian "Satu adegan =
  3–5 elemen".
- 9:16: W=1080, H=1920, bungkus `#world` dalam `.safe` (scale .78);
  area adegan 1080×1920 disusun di dunia (jarak 1600 px mendatar, 2400–3000
  px menurun agar sisa cutout adegan sebelumnya tidak ikut terlihat), kertas
  grid dibuat 14000×12500 px supaya semua area tertutup.

## Gaya keempat: "buku sketsa vintage" (ukiran sepia di kertas tua)

Dipakai untuk explainer sejarah (mesin uap, 64 dtk, 9:16, tanpa suara).

- Semua gambar digenerate satu batch dengan prefiks prompt yang sama:
  "Vintage 19th-century copperplate engraving illustration, fine sepia ink
  cross-hatching, etching style … isolated on a plain white background, no
  text, no border". Potret tokoh sejarah: "engraved portrait … bust inside an
  oval" — sebut era/profesi, bukan nama, lalu beri label nama di layar dan
  kredit "ilustrasi gaya ukiran".
- Latar dihapus (remove background) lalu cutout dipasang dengan
  `mix-blend-mode:multiply` di atas tekstur kertas (juga digenerate, 9:16)
  supaya tinta "meresap" ke kertas; bayangan hanya untuk objek besar.
- Tipografi: serif display tebal (Playfair Display 900) + italic Garamond
  untuk kalimat penghubung + small-caps berspasi (Cinzel) untuk label tahun/
  nama; anotasi tulisan tangan warna karat; highlighter emas transparan.
- Tahun besar sebagai "ghost" outline di atas, label "Tempat · Tahun" di
  bawahnya — ini linimasa tanpa garis linimasa.
- Rate limit generator (maks 4 job bersamaan): kirim remove-background
  bertahap 3–4 sekaligus.

## Gaya kelima: "aksi kontinu" — satu subjek yang tidak pernah berhenti

Obat untuk explainer yang "terasa slide PPT" walau kameranya sudah
berkoreografi. Contoh polanya: explainer olahraga kecepatan tinggi (ilustrasi
flat, 16:9): semua fakta disampaikan TANPA menghentikan aksinya. Bisa 100 %
vektor SVG yang digambar prosedural di JS (tanpa gambar generate) — justru
itu yang memberi rasa motion graphic After Effects.

Prinsip (urutan penting):

1. **Satu pahlawan, dari detik 0 sampai akhir.** Subjek utama (atlet, kereta,
   motor, kurir) tidak pernah keluar frame. Yang berganti adalah DUNIA di
   sekitarnya, bukan subjeknya. Kalau ada 10 adegan, pahlawan hadir di 10-nya.
2. **Selalu bergerak.** Latar mengalir (parallax 2–3 lapis, looping), ada
   garis kecepatan, percikan/debu/asap partikel, subjek sendiri bergoyang
   halus. Tidak ada satu detik pun yang diam total — bahkan saat angka besar
   sedang dibaca.
3. **Angka adalah properti panggung, bukan overlay.** Angka besar berdiri di
   dalam dunia (di belakang subjek, dengan kedalaman parallax), lalu subjek
   MELINTAS DI DEPANNYA dan menyapu angka itu keluar. Angka yang berubah
   (35 → 43) berputar seperti odometer di tempat, bukan fade in/out.
4. **Sudut pandang berganti, subjek tetap di tengah.** Samping → depan
   (head-on) → miring mengikuti tikungan (seluruh dunia di-rotate 8–15°) →
   atas (top-down). Pergantian sudut = pergantian adegan; tidak perlu cut.
5. **Perubahan palet = perubahan tempo.** Saat cerita naik (kecepatan,
   bahaya), latar berganti warna dalam 0,3 dtk + blur gerak; subjek tetap.
   Kembali ke palet awal saat tempo turun.
6. **Perbandingan tetap di dalam dunia yang sama** (angka pembanding
   berdiri di latar, objek pembanding lewat di jalur lain), bukan layar
   dibelah jadi panel — membelah layar terasa "template" dan menghentikan
   dunia.
7. **Teks hanya dua tingkat: angka besar + label dunia.** Tanpa subtitle
   (lihat "Default yang sering salah dikira"); tidak ada kicker/body/badge.

Resep teknis (HTML + GSAP):

- Pahlawan = beberapa lapisan PNG (badan, kepala/helm, kendaraan, bayangan)
  dalam satu `#hero` supaya tiap bagian bisa punya goyangan sendiri
  (`yoyo` ±6–10 px dengan periode berbeda) + `#hero` di-nudge ±25 px.
- Latar = 2–3 strip lebar (`width:300%`) yang di-`x` looping
  (`repeat:-1`, `ease:'none'`); kecepatan lapisan belakang ½ dari depan.
  Ganti "tempat" dengan mengganti isi strip saat berada di luar frame.
- Angka dunia: elemen di lapisan `.deep` (skala .9, gerak ¾ kecepatan
  latar depan) sehingga subjek yang di depan menutupinya saat melintas.
  Odometer: dua `<span>` bertumpuk dalam `overflow:hidden`, tween `y`.
- Ganti sudut: siapkan 2–3 set gambar pahlawan (samping/depan/atas) yang
  digenerate satu batch dengan gaya sama; saat ganti, whip 0,25 dtk
  (blur gerak arah + geser 60 px) lalu set berikutnya sudah bergerak.
- Tikungan: `rotate` seluruh `#world` 8–15° selama 1,5 dtk, subjek ikut
  miring sedikit lebih banyak (lead 3–5°).
- Palet: semua warna lewat CSS variable; tween `--bg`, `--ink` dengan gsap
  (registerPlugin tidak perlu; tween objek lalu `style.setProperty`).
- Objek dunia diberi `t0` (masuk) dan `t1` (dibuang) supaya gunung/portal
  yang sudah "ditembus" tidak tetap tergambar di depan subjek.
- Menyembunyikan satu view dengan `visibility:hidden` TIDAK menyembunyikan
  anak SVG yang punya atribut `visibility="visible"` sendiri — atribut anak
  mengalahkan induk, objeknya "tembus" ke view lain (penanda peta muncul di
  atas kereta samping, dan tampak blur karena view lama masih ber-filter).
  Untuk menampilkan anak, HAPUS atributnya (`removeAttribute('visibility')`),
  jangan set 'visible'.
- Bangunan/peron yang "melayang": kanopi + tiang tipis saja tanpa dinding di
  belakang subjek dan lantai di depan roda. Beri dinding berjendela di lapisan
  belakang dan lantai peron di lapisan depan yang menutup bogie.
- Grup SVG yang diskalakan/diputar dari titik (0,0) lokalnya (kereta yang
  mendekat, subjek yang miring): tulis atribut `transform` langsung
  (`translate(x y) scale(s)`), jangan `gsap.set` — `transformOrigin` GSAP
  diukur dari kotak pembatas elemen dan `svgOrigin` dari koordinat global,
  sehingga objek melompat atau hilang saat kecil.
- Ukuran teks tetap mengikuti aturan "Keterbacaan di ponsel".

**Sudut pandang WAJIB berganti.** "Subjek dari samping + teks" dari awal
sampai akhir terasa statis dan monoton walau latar mengalir dan kamera
bergerak. Aturan: tidak ada tiga adegan berturut-turut dengan
sudut yang sama, dan tiap fakta baru idealnya dapat "instrumen" sendiri.
Katalog sudut yang sudah terbukti (semua vektor, semua dari rig yang sama):

| Fakta                         | Sudut / instrumen                                                                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pembuka & penutup             | samping (jangkar visual — hanya di sini subjek boleh "hanya lewat")                                                                                            |
| kecepatan                     | kabin pengemudi: jarum speedometer menyapu + angka digital ikut, rel mengalir di kaca depan                                                                    |
| rute / jarak / titik henti    | simulasi peta: rute tergambar, penanda berjalan, titik pop, kamera zoom awal → seluruh rute                                                                    |
| medan / terowongan / tanjakan | profil ketinggian (grafik kontur), rute memotong bukit, terowongan sebagai segmen berongga, yang terpanjang disorot lalu di-zoom                               |
| perbandingan waktu            | balapan di peta: tiga penanda berangkat bersamaan di jalurnya masing-masing, satu jam tempuh berjalan, pemenang tiba saat yang lain baru ¼ jalan — bukan panel |
| jumlah / kapasitas            | interior: lorong kabin perspektif, deretan kursi menyala berurutan, jendela dengan pemandangan mengalir                                                        |
| kedekatan / skala             | tampak depan: subjek mendekat dari titik hilang sampai memenuhi frame                                                                                          |

Urutan yang enak: samping → kabin → peta → profil → balapan peta → depan →
interior → samping. Tiap view = satu `<div class="view">` berisi SVG
sendiri, diganti dengan whip (blur + geser 0,3 dtk); render tiap view tetap
fungsi murni dari waktu & jarak dunia yang sama, jadi sinkron VO tidak
terganggu saat view diganti.

Pemecah monotoni paling murah kalau hanya sempat satu: **simulasi peta
rute**. Peta vektor bergaya (garis pantai, sungai, waduk, ikon gunung, jalan
tol tipis, blob kota, kompas + skala), rute digambar dengan
`stroke-dasharray = panjang` dan `dashoffset` mengikuti progres; penanda
subjek bergerak lewat `getPointAtLength` dan diputar mengikuti tangen;
stasiun/titik "pop" (scale 0→1 dengan sedikit overshoot) saat progres
melewati fraksi panjangnya; kamera peta mulai zoom 2–2,5× di titik awal,
mengikuti penanda, lalu melonggar ke seluruh rute (`translate(pusat)
scale(z) translate(-cx -cy)` dihitung dari progres). Angka total (jarak,
waktu) muncul setelah zoom out. Tanpa ini, "subjek + teks" dari awal
sampai akhir tetap terasa statis walau latar mengalir.

Kamera samping juga harus "bernapas": rangkaian keyframe
`[t, zoom, cx, cy]` (dorong masuk 1,06–1,12× pada momen penting: angka
besar, portal terowongan, kedatangan) + osilasi ±0,6 % lambat, diterapkan
pada satu `<g>` pembungkus isi SVG — bukan pada teks HTML yang menempel di
kamera.

Jebakan: kalau pahlawan berganti gambar tiap adegan (pose baru, warna baru),
efek "satu subjek" hilang — jaga siluet, warna, dan posisi di frame. Dan
jangan hentikan latar untuk membaca teks; perlambat ke 40 % saja.

---

# Lampiran E: kartun-panggung.md ( )

> Terapkan aturan adaptasi Bagian 8: gunakan Hybrid CDN dengan fallback lokal (`vendor/*.min.js`) dan kunci waktu secara lockstep ke `t = frameIndex / fps` (`masterGsapTl.time(t)`), abaikan player/debug/snap/export/AE bridge. Aturan Bagian 1 selalu menang.

# Kartun panggung — explainer kartun edukasi flat, satu panggung per adegan

Gaya keenam explainer. Angka acuannya dari dua jenis video: cerita kartun ±40 dtk
dengan satu tokoh di lima lingkungan, dan explainer ±80 dtk (7 panggung, 2 tokoh,
tanpa caption). Kegagalan yang umum dicatat di bawah karena model mudah yakin
hasilnya sudah benar.

**Definisi.** Tiap adegan adalah _panggung_ sendiri seukuran frame (1920×1080 +
overscan), digambar vektor, hidup penuh (≥10 benda bergerak), punya kamera sendiri.
Kamera hanya bergerak **di dalam** panggung (zoom 1,08–1,95, tidak pernah wide).
Antar panggung: **cut**, atau geser 96 px / 72 px dengan blur ≤10 px. VO membawa
kalimat; gambar membawa makna; **tidak ada caption**.

Bedakan dari mode lain di skill ini:

|                   | Kartun kolase (`starter-explainer-kartun`) | Kartun panggung (`starter-explainer-panggung`) |
| ----------------- | ------------------------------------------ | ---------------------------------------------- |
| Dunia             | satu kertas besar berisi cutout diam       | banyak panggung, tiap panggung satu frame      |
| Gerak utama       | kamera menyusuri aset diam                 | isi panggung beraksi; kamera menemani          |
| Pergantian adegan | push-through kamera                        | cut / geser 96 px                              |
| Latar             | kertas krem + grain + noda                 | flat cerah, tanpa tekstur                      |
| Teks              | kalimat + pill highlighter                 | nol caption; label diegetik saja               |
| Aset              | ilustrasi generate → cutout                | vektor digambar + kepala raster bersendi       |

## Hukum 1 — Satu panggung per adegan, kamera tidak pernah wide

Rencana kamera proyek acuan: 1,95 → 1,08 · 1,65 → 1,14 → 1,18 · 1,90 → 1,12 → 1,36 ·
1,45 → 1,57 → 1,17. **Tidak ada satu pun di bawah 1,08.** Karakter di close-up
mengisi ~55–65 % tinggi frame, di wide masih ~35 %.

Kegagalan nyata: dunia dibangun sebagai satu peta raksasa (20.000 px) yang
dijelajahi kamera dengan zoom 0,2–0,7. Semua bergerak, tapi separuh video jadi
miniatur — rumah sebesar ibu jari, tanah kosong 60 % layar. Itu tetap terasa
"slide dengan gambar kecil di tengah". Perbaikannya bukan tambal sulam: dunia
harus dipecah jadi panggung-panggung seukuran frame.

Pola kamera per panggung: **tahan 0,45–0,7 dtk → satu gerak per beat VO → tahan.**
Gerak yang sah: push-in ke objek (1,12 → 1,45), tilt ke atap / ke bawah tanah
dalam panggung yang sengaja dibuat lebih tinggi dari frame, mengikuti subjek
(lompatan: tinggi kamera mengikuti busur, framing longgar di udara). Zoom
diinterpolasi logaritmik supaya terasa rata.

## Hukum 2 — Kontinu di dalam panggung, cut di antaranya

Kalimat VO berganti ≠ panggung berganti. Selama hubungan ruang/sebab-akibatnya
masih membantu penonton, tetap di panggung yang sama dan ubah **aksinya**:
dinding terangkat memperlihatkan rak, jarum meter naik, lampu hijau menyala,
tanaman tumbuh berurutan. Pindah panggung hanya saat lokasi, skala, atau cara
menjelaskan memang berganti. Proyek acuan: 39,6 dtk = 5 panggung; 81 dtk = 7.

Transisi beraksen hanya pada perpindahan tempat yang sungguh-sungguh (2 dari 6
pergantian di proyek acuan), sisanya cut langsung. Angka yang terbukti:

```
keluar  0,28 dtk  offset = -d · q²        (q = 0→1)
cut
masuk   0,42 dtk  offset = +d · (1-q)³
d = 96 px horizontal atau 72 px vertikal, blur ≤ 10 px pada kontainer,
TANPA scale bump, TANPA garis-garis sapuan tambahan.
```

Offset diterapkan ke rig kamera panggung, bukan dengan menggeser frame yang
sudah di-crop. Jangan terbang lintas dunia 3 detik (naik ke langit, menyelam ke
bawah tanah, zoom keluar) — itu pola "tahan → pan jauh sambil zoom → cut → ulangi"
yang melelahkan.

Cut antar panggung **bukan** pelanggaran "Larangan struktural #1" di SKILL.md
selama tiap panggung hidup (isinya beraksi). Yang dilarang adalah gambar diam
yang di-fade.

## Hukum 3 — Tiap panggung ≥10 benda yang bergerak

Bukan hiasan: tiap benda menjelaskan tempat, kegiatan, atau hubungan. Contoh
yang terbukti: kipas berputar (`t·100°`), jarum meter bergoyang, lampu status
berdenyut, tetes air merambat **mengikuti jalur pipa** (parametrik
`getPointAtLength`, bukan dash-offset), riak sungai bergeser, asap/uap naik
dengan opacity berkeyframe, debu tertiup, burung melintas, jemuran bergoyang,
daun pohon bernapas, ayam berjalan dengan kaki bergerak, lampu rak menyala
berurutan lalu berkedip acak-deterministik, tanaman tumbuh lalu layu, retakan
menjalar (stroke-dashoffset), lapisan tanah menumpuk, muka air turun.

Partikel: **satu tween gerak + satu tween opacity berkeyframe**
(`keyframes:{opacity:[0,.9,.9,0]}`), keduanya `repeat:-1`. Dua tween opacity
tak-hingga pada elemen yang sama saling menimpa — uapnya tidak pernah muncul.

## Hukum 4 — Rig sendi, bukan gambar utuh

Gambar utuh tidak punya sendi. Hierarki yang terbukti (koordinat lokal, kaki di y=0):

```
root (pelvis di 0,-214)
├─ thigh_L/R  translate(±26,-214)   paha 118 → lutut di +102
│  └─ shin     translate(0,102)     betis 108 → mata kaki di +96
│     └─ foot  translate(0,96)
└─ torso       translate(0,-214)    badan -152..+8, leher -178..-138
   ├─ arm_R    translate(50,-126)   lengan atas 98 → siku +78    (digambar SEBELUM badan)
   │  └─ fore  translate(0,78)      lengan bawah 90 → pergelangan +74
   │     └─ hand translate(0,74)
   ├─ arm_L    (sama, -50; digambar SESUDAH badan)
   └─ head     translate(0,-160)    dagu di sendi leher, overlap 14 px ke leher
```

Idle yang membuat tokoh hidup tanpa "melakukan" apa-apa:
badan `±1,1° / 1,7 dtk`, kepala `±1,7° / 2,3 dtk`, lengan `±1–1,5° / 1,9 dtk`,
**kedip tiap ≈3,5 dtk selama 0,13 dtk** (offset per tokoh supaya tidak serempak).
Jalan: `step = sin(t·8)`; paha `step·15°`, betis `max(0,step)·18°`, badan
naik-turun `|step|·3–4 px`, **bayangan elips di kaki ikut bergeser**. Lompat: paha,
betis, lengan, bayangan (mengecil di udara) semua fungsi satu kurva `jump(t)`.
Aksi kecil di tiap kalimat: menunjuk (lengan atas 6° → -72° dalam 0,7 dtk),
melambai, menimba (lengan -62°/-10° yoyo 0,42 dtk + engkol `+=180°`), mengipas
wajah (lengan bawah -40° ↔ -70°, 0,35 dtk).

Ekspresi = tukar gambar kepala (senang / cemas / kaget), bukan morph. Kedip =
gambar kepala kedua dengan mata tertutup, opacity 0 → 1 → 0.

Bayangan kaki: elips `rx ≈ 72·skala, ry 16, opacity .13`, digambar **sebelum**
tokoh, ikut bergerak saat jalan.

## Hukum 5 — Transform ditulis manual; GSAP tidak boleh menyentuh sendi

Dua jebakan yang paling sering terjadi:

1. **`transformOrigin` GSAP pada SVG relatif ke bounding box**, dan bbox grup
   berubah saat anaknya bergerak. Akibatnya bahu, leher, poros kipas, kaki ayam
   — semuanya berputar di titik yang bergeser: kepala terlihat lepas, baling-baling
   melayang keluar dari porosnya, kaki tertinggal di belakang badan.
2. **Tween `x`/`y` GSAP pada grup yang sudah punya `translate(...)` menimpa
   translate itu** (nilai absolut, bukan tambahan). Tiang listrik lenyap, awan
   tidak pernah pindah.

Solusi (pola null-per-sendi): tiap sendi punya proxy `{tx,ty,x,y,r,sx,sy}` dan
atribut `transform` ditulis sendiri —

```js
function J(el, tx = 0, ty = 0) {
  const j = {
    el,
    tx,
    ty,
    x: 0,
    y: 0,
    r: 0,
    sx: 1,
    sy: 1,
    apply() {
      el.setAttribute(
        "transform",
        `translate(${j.tx + j.x},${j.ty + j.y}) rotate(${j.r}) scale(${j.sx},${j.sy})`,
      );
    },
  };
  j.apply();
  return j;
}
tl.to(j, { r: -62, duration: 0.42, onUpdate: j.apply }, at); // sumbu putar = titik asal lokal
```

Aturan turunannya: grup **penempatan** (`translate`) dan grup **yang
dianimasikan** selalu dua elemen berbeda. GSAP boleh langsung menyentuh
`opacity`, `attr`, dan `x/y` pada elemen **tanpa** transform (rect/circle
dengan `x/cx`), atau `scaleX/scaleY` pada elemen tunggal (bbox-nya tetap).

## Hukum 6 — Nol caption, teks hanya diegetik

Proyek acuan tidak punya satu pun kalimat di layar. Teks yang ada adalah bagian
dunia: papan "AIRLOCK", tabung "O2", plat "PUSAT DATA", papan "DIJUAL". Kalimat
VO tidak ditulis ulang di layar — kalau penonton butuh membaca, gambarnya yang
belum menjelaskan. Kalimat sorotan + pill highlighter milik mode kolase, bukan
mode ini.

## Hukum 7 — Palet cerah flat; bukan kertas, bukan grain

Kertas krem + grain + noda air adalah kulit _kartun kolase_ — di mode ini
terlihat vintage dan salah. Yang terbukti: langit gradien pucat
(`#BFDDE3 → #F6EFDD` atau `#EDB095 → #F8D8AD`), tanah `#D88560`/`#E6D5AC`, krem
`#FFF3DC`, navy `#345867`, teal `#237C80`, mint `#8DD3C3`, emas `#F4BC52`, koral
`#E0714F`. Flat fill, tanpa outline, tanpa tekstur, tanpa vignette. Bayangan hanya
elips kontak di tanah dan sisi gelap bangunan 0,86–0,9× warna dasar. Pilih palet
dari tema tetap berlaku (Hukum #3 SKILL.md) — yang dikunci di sini hanya
**tanpa tekstur**.

## Karakter: kepala raster + tubuh vektor

Pipeline yang terbukti (identitas boleh dari foto user, boleh anonim):

1. **Generate hanya KEPALA** (satu gambar, latar transparan). Prompt yang
   berhasil (tanpa menyebut merek apa pun):
   > ONE isolated front-facing cartoon HEAD, centered, generous margin. No body,
   > no neck below the jaw, no shoulders, no text. VERY MINIMAL flat 2D
   > educational-cartoon style: broad softly rounded head, simple small ears,
   > hair as ONE solid silhouette (no strands, no highlights), eyes ONLY TWO
   > SMALL SOLID BLACK DOTS (no sclera, iris, highlights, eyelids), two tiny
   > eyebrow strokes, nose omitted, mouth a tiny curved smile line. Flat fills,
   > ~3 colors, no gradients, no outlines, no shading. A clean silhouette for a
   > cutout animation puppet.
   > Tambahkan ciri identitas (warna kulit, model rambut, kacamata, hijab polos
   > satu warna) sebagai kalimat terpisah.
2. **Ekspresi & kedip dibuat lokal** — `scripts/kepala-ekspresi.py`: deteksi dua
   pupil (komponen gelap hampir persegi di tengah wajah) dan mulut (komponen
   lebar-tipis di bawahnya), lalu gambar ulang: kedip = elips kulit + garis
   lengkung; cemas = mulut cekung; kaget = lingkaran. Menghasilkan
   `<nama>-{senang,cemas,kaget}[-kedip].png` + `kepala-meta.json` (bbox, pupil,
   warna kulit). Tidak ada generate ulang untuk ekspresi.
3. **Tubuh digambar vektor** dengan hierarki Hukum 4; kepala ditempel di sendi
   leher dengan `<image>` yang dagunya (bawah bbox) tepat di (0,0) dan overlap
   14 px ke leher. Lebar kepala ≈ 150 px pada badan selebar 130 px.
4. Semua variasi kostum (baju, celana, gaun) lewat warna & path tubuh; kepala
   yang sama dipakai ulang. Master yang disetujui dibekukan.

Tanpa akses generate: `character()` di starter punya kepala vektor sederhana
(lingkaran kulit, siluet rambut, dua titik mata, garis mulut) — cukup untuk
gaya ini.

## Panggung yang terbukti untuk cerita "proses & dampak"

Halaman rumah (tokoh + ponsel, balon respons, sinyal terbang) · eksterior mesin
besar (push-in → dinding terangkat → isi menyala → tilt ke atap) · pabrik tepi
sungai (dua arah aliran + panah lingkaran) · menara & langit (panggung tinggi:
tilt mengikuti uap ke awan, hujan, angin) · sumur & penampang tanah (permukaan
di y≈520, lapisan menumpuk, akuifer, pipa penyedot berlabel) · tanah kering &
kemarau (matahari naik, retakan, tanaman layu, tokoh mengipas) · peta petak sawah
(grid terisi air berurutan, pita hujan bergeser) · kembali ke panggung
sebelumnya dengan kamera lebih dekat sebagai penutup.

Skala tinggi karakter ≈ 520 px pada skala 1 (kepala 186 + badan). Panggung
dengan bawah tanah: tinggi tokoh 0,85 dan lapisan ≤ 440 px supaya kepala dan
akuifer muat satu frame pada zoom 1,08.

## Verifikasi

Potret 20–24 detik kunci (`scripts/snap.mjs`) → lembar kontak 4 kolom, lalu
nilai dengan mata: **ada frame yang wide?** kepala/menara terpotong? tokoh
"lepas" di sendi? benda yang seharusnya muncul tidak ada (tanda tween menimpa
translate)? Untuk sekuens kontinu, render GIF 8 fps satu panggung penuh —
bukan montase — untuk membuktikan tidak ada patahan. Selain itu cek mekanis:
`grep` tidak ada `transformOrigin:'0px 0px'` / `rotation:` pada sendi, dan tidak
ada `tl.to(<grup ber-translate>,{x|y})`.

---

# Lampiran F: architecture.md ( )

> Terapkan aturan adaptasi Bagian 8: gunakan Hybrid CDN dengan fallback lokal (`vendor/*.min.js`) dan kunci waktu secara lockstep ke `t = frameIndex / fps` (`masterGsapTl.time(t)`), abaikan player/debug/snap/export/AE bridge. Aturan Bagian 1 selalu menang.

# Arsitektur — struktur proyek dan alasannya

Tiap keputusan di sini pernah salah dulu sebelum benar. Bagian "kenapa"
lebih penting daripada kodenya.

## Struktur berkas

```
proyek/
├── index.html          markup semua adegan + filter SVG motion blur
├── css/app.css         token warna, layout adegan, state awal tersembunyi
├── js/three-scene.js   dunia WebGL ber-state (latar, partikel, ornamen, bloom)
├── js/timeline.js      SATU-SATUNYA tempat waktu ditulis (GSAP master timeline)
├── js/util.js          splitChars + blurTween (motion blur berarah)
├── js/main.js          perekat: fit stage, loop render, panel kontrol
└── tools/
    ├── serve.py        dev server Cache-Control: no-store
    └── export-frames.mjs  render frame-by-frame (puppeteer)
```

Boleh dipadatkan jadi satu berkas (lihat `assets/starter-opener.html`) untuk
prototipe; pecah ke struktur di atas begitu adegan > 3.

## Panggung: 1920×1080 dipatok, lalu di-scale

```css
#stage {
  position: fixed;
  left: 50%;
  top: 50%;
  width: 1920px;
  height: 1080px;
  transform: translate(-50%, -50%) scale(var(--fit));
  overflow: hidden;
}
```

```js
const s = Math.min(innerWidth / 1920, innerHeight / 1080);
```

**Kenapa:** komposisi tidak boleh berubah karena ukuran jendela. Posisi yang
disetujui di monitor 27" harus identik saat direkam. Ukuran jendela hanya
mengubah zoom, bukan layout.

## Rig kamera `#world`

```
#stage
└── #world            ← rig kamera: DI-SCALE/TRANSLATE oleh timeline
    ├── <canvas>      ← WebGL (latar 3D)
    ├── .bgfx         ← gradient overlay (blend screen)
    └── #dom          ← semua adegan teks/UI
├── .leak             ← light leak: DI LUAR world, lapisan paling atas
├── .vignette, .grain
```

**Kenapa world membungkus canvas juga:** saat kamera zoom, yang ikut membesar
harus teks DAN latarnya.
Men-zoom layer teks saja terasa palsu; men-zoom seluruh dunia terasa kamera.
Light leak justru HARUS di luar world: ia cahaya di depan lensa, bukan
bagian dunia.

## State-driven WebGL

Scene Three.js tidak tahu apa-apa soal waktu. Ia mengekspos satu objek:

```js
const state = {
  grid: 0,
  dust: 0.5,
  nebula: 0.6,
  stars: 0,
  tunnel: 0,
  flow: 0,
  camX: 0,
  camY: 0,
  camZ: 16,
  camRoll: 0,
  bloom: 0.85,
  shake: 0,
  heroO: 0,
  heroS: 1,
  heroX: 0,
  heroY: 0,
  heroZ: 6, // ornamen utama
};
```

dan timeline GSAP men-tween angka-angka itu. Fungsi `render(t)` menerima
`t = tl.time()`.

**Kenapa:** satu sumber kebenaran waktu. Scrub, pause, dan export otomatis
benar karena WebGL tidak punya jam sendiri.

**Aturan `flow`:** benda yang "mengalir" (tunnel, hujan partikel) disimpan
sebagai JARAK yang di-tween (`flow: '+=300'`), posisi tiap partikel =
`(seed + flow*speed) % span`. JANGAN `pos += speed*dt` — itu akumulasi yang
membuat scrub dan export tidak reproducible.

## Timeline: detik absolut

```js
tl.fromTo(chars, {...}, {...}, 8.10);   // ← angka absolut, bukan "+=0.3"
```

**Kenapa:** rundown adegan berisi angka detik; menulis angka yang sama di
kode membuat urutan terbaca sekali lihat, dan menggeser satu adegan tidak
merembet ke adegan lain. Sediakan konstanta `DURATION` di satu tempat.

## State awal di CSS, bukan di GSAP

```css
.hero,
.line,
.obj,
.ornament {
  opacity: 0;
}
```

```js
tl.fromTo(
  el,
  { opacity: 0, y: 60 },
  { opacity: 1, y: 0, immediateRender: false },
  8.1,
);
```

**Kenapa:** dengan `immediateRender:false`, CSS-lah yang memegang keadaan
sebelum tween mulai — tanpanya semua elemen berkedip di frame pertama.

**JEBAKAN yang pernah terjadi:** selector state awal kalah spesifisitas.
`.card.ghost{opacity:.85}` mengalahkan `.card{opacity:0}` sehingga elemen
muncul mendahului animasinya. Jangan pernah menulis `opacity` di selector
yang lebih spesifik dari selector state-awal; biarkan GSAP yang memberi
nilai akhirnya.

## Determinisme — daftar larangan

| Larangan                                   | Gantinya                                      |
| ------------------------------------------ | --------------------------------------------- |
| `Math.random()` di render loop             | sinus frekuensi tinggi: `Math.sin(t*137.2)`   |
| `Date.now()` / `performance.now()`         | `tl.time()` diteruskan sebagai parameter      |
| `setInterval` untuk teks berjalan/mengetik | tween `{i:0→n}` + `onUpdate` slice            |
| akumulasi `pos += v*dt`                    | posisi = fungsi(seed, state.flow)             |
| `Math.random()` saat SETUP boleh           | seed dibuat sekali saat load, bukan per frame |

## Dev server wajib no-cache

`python -m http.server` membiarkan browser menahan module JS lama lewat
heuristic caching — edit "tidak ngefek", dan kamu akan mengejar hantu.
Selalu pakai server yang mengirim `Cache-Control: no-store`
(`scripts/serve.py`). ES module tidak jalan lewat `file://`, jadi server
memang wajib.

## Verifikasi vs export — dua hal berbeda

- **Verifikasi** (setiap batch perubahan): `scripts/snap.mjs` memotret
  6–20 detik kunci lewat `OPENER.seek(t)`; hasilnya dilihat, bukan
  disimpan. Tanpa Node: `?debug=1` + screenshot manual.
- **Export** (hanya bila user minta MP4): render semua frame. Jangan
  tertukar — merender penuh untuk "ngetes" membuang ribuan gambar dan tidak
  memberi penilaian apa pun.

## Export ke video

Jangan merekam layar untuk hasil final (frame drop). Karena semuanya
deterministik: set `tl.time(frame/fps)` → tunggu 2× rAF (satu untuk GSAP
menulis style, satu untuk render loop menggambar) → screenshot → ulangi.
`scripts/export-frames.mjs` melakukannya via puppeteer; gabungkan dengan:

```
ffmpeg -framerate 60 -i frames/f%05d.png -c:v libx264 -pix_fmt yuv420p -crf 16 out.mp4
```

Ekspos `window.OPENER = { tl, DURATION }` supaya skrip export (dan debugging
konsol) bisa mengendalikan timeline.

## Panel kontrol developer — tersembunyi

Jangan tampilkan player di deliverable. Default: autoplay saat dibuka, loop
saat selesai, R ulang, Space jeda. Panel (play/pause, slider scrub, jam
`t.toFixed(2)`) hanya muncul dengan `?debug=1`; `?clean=1` = tanpa panel dan
tanpa autoplay untuk skrip export. Scrub tetap alat review utama user —
mereka berpikir dalam "detik ke-X" — tapi lewat URL debug, bukan di hasil.

## Verifikasi visual (bukan opsional)

Setelah tiap batch perubahan: buka di browser, `tl.pause(); tl.time(X)` di
konsol untuk tiap detik kunci, screenshot, nilai dengan heuristik di
`anti-ppt.md`. Kode yang jalan ≠ adegan yang benar; hampir semua revisi
user datang dari MELIHAT, bukan dari error.

## Bentuk deliverable: satu berkas, tanpa server

Selama pengembangan boleh multi-file (css/, js/) + server no-cache. Tapi yang
DISERAHKAN adalah satu `index.html` yang bisa diklik dua kali:

- `<style>` dan `<script type="module">` ditulis inline. Alasannya teknis:
  Chrome menolak `<script type="module" src="js/app.js">` dari `file://`
  (origin `null` → CORS), sedangkan module inline boleh meng-`import` dari
  CDN https tanpa masalah.
- Import map + GSAP/Three/Pixi/Anime dari CDN tetap dapat dipakai. Sistem Hybrid CDN NARA otomatis memuat dari CDN Online saat ada internet, dan beralih ke vendor lokal internal saat offline tanpa menghentikan rendering atau memunculkan error CORS.
- Untuk deliverable konsumen, sertakan fallback offline: `<script src="https://..." onerror="this.onerror=null; this.src='vendor/...';"></script>` agar file tetap bisa dibuka di komputer mana pun tanpa koneksi internet.
- Aset lokal (ikon, gambar) cukup path relatif — `<img src="icon.png">` aman di `file://`.
- Hindari `fetch()`/XHR ke berkas lokal — itu diblokir di `file://`.
- Node/puppeteer hanya untuk render MP4; jangan sampai user mengira opener
  butuh `node_modules`. Jelaskan itu di README. Tanpa Node: rekam layar
  (dengan catatan bisa drop frame). Tanpa Python: tidak ada yang hilang —
  server hanya perlu bila memakai module lokal, dan deliverable satu-berkas
  tidak memakainya.
- Skrip render/snap memakai default `pathToFileURL(process.cwd())` supaya
  bekerja tanpa server; URL http tetap bisa dioper lewat env `URL`.

Proses inline yang aman: baca css & js, ganti tag `<link>`/`<script src>`
dengan isinya, pastikan JS tidak mengandung `</script>`, lalu hapus folder
sumbernya supaya tidak ada dua kebenaran.
