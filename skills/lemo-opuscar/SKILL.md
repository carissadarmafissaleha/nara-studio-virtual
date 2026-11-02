---
name: lemo-opuscar
description: Pustaka 66 gaya film sinematik berbasis kode (Lemo-Opuscar oleh LemoLab, MIT) yang diintegrasikan ke dalam NARA Studio Virtual. Gunakan skill ini ketika membuat video/film pendek (`/buat-video`) dengan gaya artistik spesifik seperti Crayon Picture Book (buku gambar krayon), Watercolor Brush (cat air), Impasto Oil Painting (cat minyak tebal), Ukiyo-e, Chinese Ink Wash, Shadow Puppetry (wayang kulit/bayangan), Risograph Print, Woodcut Print, Swiss Motion Graphics, Art Deco, Blueprint, 1930s Rubber Hose Cartoon, 80s Cel Anime, Mid-century Cartoon, 16-bit Pixel RPG, ASCII/CRT Terminal, Whiteboard Explainer, Chalkboard, Satellite Briefing, Exploded Teardown, atau gaya sinematik lain dari katalog 66 style Lemo-Opuscar.
license: MIT
metadata:
  upstream: https://github.com/lemomo-ai/lemo-opuscar
  styles_count: 66
---

# Lemo-Opuscar — 66 Gaya Film Berbasis Kode untuk NARA Studio Virtual

Skill ini mengintegrasikan pustaka gaya film **[`lemomo-ai/lemo-opuscar`](https://github.com/lemomo-ai/lemo-opuscar)** (MIT License) langsung ke dalam pipeline **NARA Studio Virtual** (Remotion 4.x + HTML5 Canvas / WebGL2 / SVG Semantik).

Setiap gaya di folder `styles/<slug>/STYLE.md` mendefinisikan **invarian artistik** yang terukur secara matematis dan fisik:
1. **Essence & Material Physics** (tekstur kertas, adhesi krayon/tinta, pendaran fosfor CRT, ketebalan cat minyak, dsb.)
2. **Colour Logic** (palet warna terbatas dan aturan kontras tiap medium)
3. **Typography & Subtitles** (gaya teks yang menyatu dengan medium)
4. **Motion Quality** (frame-stepping 12 fps vs 24/30 fps, boiling lines, kurva spring/monotone spline)
5. **Camera Grammar & Native Moves** (gerakan kamera khas dan transisi organik dari medium itu sendiri)
6. **Sound Palette** (instrumen musik dan foley yang cocok dengan material visual)
7. **Pitfalls** (kesalahan visual yang wajib dihindari)

---

## Cara Menggunakan di NARA Studio Virtual

1. **Pilih Gaya (`styles/README.md`):**
   - Jika order `/buat-video` menyebut gaya tertentu (mis. *"gaya buku krayon"*, *"gaya cat air"*, *"pixel art RPG"*, *"anime 80an"*, *"blueprint"*, *"chalkboard"*), cari foldernya di [`styles/README.md`](styles/README.md) dan **baca `styles/<slug>/STYLE.md` sampai tuntas** sebelum merancang storyboard.
   - Jika order tidak menyebut gaya spesifik, pilih 1 gaya dari 66 pilihan di bawah yang paling mengangkat topik cerita (mis. cerita dongeng anak → `crayon-book`, `watercolor`, `paper-popup`, atau `midcentury-toon`; sains/teknik → `blueprint`, `whiteboard`, `teardown`, `iso-infographic`; sejarah/dokumenter → `halftone-dossier`, `woodcut`, `archive-lighttable`).

2. **Padukan dengan Aturan Produksi NARA Studio (`AGENTS.md`):**
   - Resolusi tetap **1080×1920 (9:16), 30 fps** di `src/remotion/compositions/<CompName>.tsx`.
   - Patuhi zonasi vertikal NARA Studio (Aman atas `0–180`, Judul/Kicker `180–400`, Panggung Aktor & Canvas `420–1460`, Buffer `1460–1480`, Subtitle `1480–1680`).
   - Semua waktu dan gerak wajib deterministik dari `useCurrentFrame()` — **dilarang `Math.random()`**, gunakan `mulberry(seed)` atau `hash(n)` dari `src/remotion/opuscar/lib.ts` atau `random()` dari `remotion`.

3. **Gunakan Helper `src/remotion/opuscar/lib.ts`:**
   - Import fungsi kurva & efek Opuscar langsung di komponen Remotion:
     ```tsx
     import {
       clamp, lerp, seg, ss, eio, eo, ei, back,
       opuscarSpring, mulberry, hash, vnoise, fbm2,
       monotone, track, env, boilOffset,
       OpuscarCanvas, PaperTextureOverlay, CrtScanlineOverlay
     } from '../opuscar/lib';
     ```
   - Gunakan `<OpuscarCanvas draw={(ctx, timeSec, frame, width, height) => { ... }} />` di dalam panggung Remotion untuk menggambar efek Canvas 2D prosedural (goresan kuas cat air, krayon di atas kertas bertekstur, partikel tinta, blueprint grid, dsb.) yang 100% sinkron dengan `useCurrentFrame()`.

4. **Panduan Penyutradaraan & Suara:**
   - Baca [`DIRECTOR.md`](DIRECTOR.md) untuk prinsip *hook 3 detik pertama*, *native move* pada klimaks, variasi kecepatan (*rhythm*), dan *camera grammar*.
   - Baca [`core/audio/INSTRUMENTS.md`](core/audio/INSTRUMENTS.md) dan `core/audio/sfx.py` untuk resep sintesis foley & instrumen musik yang sesuai dengan material gaya film.

---

## Katalog Lengkap 66 Gaya (`styles/<slug>/STYLE.md`)

- **Hand-drawn & Painting (8):**
  `crayon-book` (Crayon Picture Book), `watercolor` (Watercolor Brush), `ink-wash` (Chinese Ink Wash), `impasto` (Impasto Oil Painting), `one-line` (One-line Drawing), `whiteboard` (Whiteboard Explainer), `urban-sketch` (Urban Sketch · Pen & Wash), `chalkboard` (Chalkboard)
- **Cartoon & Anime (4):**
  `rubber-hose` (1930s Rubber Hose Cartoon), `cel-anime-80s` (80s Cel Anime), `scifi-toon` (Sci-Fi Sitcom Toon), `midcentury-toon` (Mid-century Cartoon)
- **East Asian Traditions (4):**
  `shadow-puppet` (Shadow Puppetry / Wayang), `ukiyoe` (Ukiyo-e), `papercut-red` (Red Paper-cut), `paper-lantern` (Paper-cut Lightbox)
- **Print & Printmaking (6):**
  `risograph` (Risograph Print), `halftone-dossier` (Halftone Dossier), `woodcut` (Woodcut Print), `engraving` (Copperplate Engraving), `silkscreen-poster` (Silkscreen Travel Poster), `printed-long-take` (Printed Long Take)
- **Graphic & Type (7):**
  `swiss-motion` (Swiss Motion Graphics), `spy-titles` (60s Spy Title Sequence), `art-deco` (Art Deco), `blueprint` (Blueprint), `stained-glass` (Stained Glass), `pictogram-motion` (Pictogram Motion), `ascii-crt` (ASCII / CRT Terminal)
- **Information & Keynote (8):**
  `dataviz` (Data Storytelling), `iso-infographic` (Isometric Infographic), `dark-keynote` (Dark Tech Keynote), `living-screencast` (Living Screencast), `hologram-hud` (Sci-fi Hologram HUD), `transit-map` (Transit Map), `isometric-picture-book` (Isometric Picture Book), `circuit-board` (Circuit Board)
- **Materials & 3D (7):**
  `brick-toy` (Brick Toy), `paper-popup` (Paper Pop-up Book), `tilt-shift` (Tilt-Shift Miniature), `lowpoly-island` (Low-poly Isometric Island), `glass-product` (Glass Product Render), `memphis-diorama` (Memphis Diorama), `desktop-flythrough` (Desktop Flythrough)
- **Games (4):**
  `pixel-rpg` (16-bit Pixel RPG), `hd-2d` (HD-2D), `microgame` (Microgame Frenzy), `game-show` (Game Show Flat)
- **Evidence Films (8):**
  `satellite-briefing`, `briefing-board`, `lidar-survey`, `white-model`, `data-physical`, `teardown`, `microscope`, `archive-lighttable`
- **Edit & Documentary (8):**
  `caption-news`, `newsreel`, `countdown`, `city-symphony`, `visual-investigation`, `kino-montage`, `telestrator`, `news-package`
- **Cinema & Eras (2):**
  `silent-film` (1920s Silent Film), `backrooms` (Liminal Found Footage)
