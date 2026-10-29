# 🎬 NARA Virtual Video Production Studio

> **Kantor virtual isometrik + studio produksi video otomatis untuk DeepSeek, Antigravity (AGY), dan OpenCode.**  
> React · Remotion 4.x · Edge-TTS · Express · WebSocket

NARA Studio menggabungkan kantor virtual pixel-art isometrik dengan mesin produksi video React (Remotion) yang dilengkapi naskah otomatis, voiceover Bahasa Indonesia (Edge-TTS), sound effects (SFX), dan chat tim AI yang terhubung ke internet & jam dunia real-time.

---

## 📚 Tutorial Lengkap per Mesin

Panduan langkah-demi-langkah untuk tiap mesin, dari clone sampai MP4:

| Mesin | Tutorial | Stack | Ganti mesin | Wake (di sesi mesin) |
| :--- | :--- | :--- | :--- | :--- |
| **Antigravity (AGY)** | [tutorial-agy.md](docs/tutorial-agy.md) | `npm run dev:office-agy` | `/engine agy` | `npm run wake:agy` |
| **DeepSeek (DS)** | [tutorial-deepseek.md](docs/tutorial-deepseek.md) | `npm run dev:office-ds` | `/engine deepseek` | `npm run wake:ds` |
| **OpenCode** | [tutorial-opencode.md](docs/tutorial-opencode.md) | `npm run dev:office-opencode` | `/engine opencode` (`oc`) | `npm run wake:opencode` |

Setiap tutorial berisi: prasyarat, clone & install, menyalakan stack, membuka
kantor dengan token, mengganti mesin, memasang wake (termasuk opsi foreground
untuk CLI tanpa background job), mengirim order, memantau progres, Screening
Room, render MP4, order berikutnya, troubleshooting, dan checklist cepat.

### Aturan bersama ketiga mesin

1. **Jangan pakai `&&`.** `dev:office-*` tidak pernah selesai, jadi perintah
   berikutnya tidak akan pernah jalan.
2. **Satu stack saja.** Semua stack memakai port `3333`/`3334`; hentikan yang
   lama sebelum menyalakan mesin lain.
3. **Lane harus cocok dengan sesi.** `engine.json = antigravity` → hanya sesi AGY
   yang memasang `wake:agy`; begitu juga `deepseek`/`wake:ds` dan
   `opencode`/`wake:opencode`.
4. **Wake itu background job di dalam sesi AI.** Stack npm tidak bisa
   membangunkan model.
5. **Pasang ulang setelah tiap order.** Kalau lupa, footer menunjukkan `WAKE: OFF`
   walau `LISTENER: AKTIF`.

---

## 🔀 Mengganti Mesin

Mesin aktif disimpan di `~/.agent-office/engine.json` dan bisa diganti dari chat:

```
/engine            # mesin aktif + status kesiapan
/engine agy        # lane Antigravity
/engine deepseek   # lane DeepSeek
/engine opencode   # lane OpenCode (alias: /engine oc)
```

Order hanya dikirim ke lane yang aktif, jadi tidak ada order yang dikerjakan dua
mesin.

### Wake & indikator footer

Setelah stack hidup, pasang wake dari sesi mesin masing-masing — perintahnya ada
di bagian per mesin di atas (`wake:agy`, `wake:ds`, `wake:opencode`), selalu
sebagai **background job**.

Footer punya dua lampu:

- **`LISTENER`** — daemon stack hidup, order bisa masuk antrean.
- **`WAKE`** — ada watcher di sesi AI, order berikutnya akan membangunkan mesin.

`LISTENER: AKTIF` + `WAKE: OFF` berarti order akan menumpuk. Setelah setiap order
selesai, pasang ulang watcher (lihat `AGENTS.md` §0).

### Klaim & serah-terima

Order diklaim lewat `engine-inbox/.claimed/<id>.json` (atomic, TTL 6 jam) agar
tidak dikerjakan dua kali. Statusnya ikut tertulis di file order:
`sent → claimed → in_progress → done` (`done` = draf lengkap, bukan render).

```bash
node scripts/order.mjs list 5          # antrean + mesin pemegang klaim
node scripts/order.mjs release <id>    # lepas klaim sebelum pindah mesin
```

---

## 👥 Tim Studio

| Karakter | Peran | Tugas Utama |
| :--- | :--- | :--- |
| 👑 **Caca** | `boss` | Pemimpin & Pengarah Studio (Meja `spot-1`) |
| ✨ **Nara** | `assistant` | Koordinator Studio, Status Proyek & Pengiriman Order |
| ✍️ **Lumi** | `scriptwriter` | Penulis Naskah, Riset Fakta & Storyboard (`/script`) |
| 🎙️ **Ardi** | `voiceover` | Talent Suara Edge-TTS & Sound Designer (`/vo`) |
| 🎬 **Jeje** | `video-editor` | Remotion Motion Developer & Video Renderer (`/render`) |

> Kru studio mengobrol secara alami dengan sapaan **Kak Caca**, dilengkapi akses **Jam Dunia Real-Time** dan **Live Web Search**.

---

## 💬 Perintah Chat Kantor (`#office-general`)

- `/buat-video <brief>` — Mengirim order produksi video ke mesin aktif (DeepSeek / AGY / OpenCode).
- `/engine [agy|deepseek|opencode]` — Menampilkan atau mengganti mesin produksi aktif.
- `/script <topik>` — Meminta Lumi membuat draf naskah cepat.
- `/vo <teks>` — Meminta Ardi merekam audio voiceover Edge-TTS.
- `/render [NamaKomposisi]` — Meminta Jeje merender komposisi Remotion ke MP4.
- `/screen` — Membuka Screening Room untuk preview video.
- `/todo` — Membuka Papan Tugas (Kanban).
- `/clear` — Membersihkan riwayat chat.

---

## 📐 Standar Produksi Video (`/buat-video`)

1. **4 Pilar Skill Wajib:** `bang-motion` + `remotion` + `huashu-art-motion` + `ui-ux-pro-max`.
2. **Anti-PPT & Dinamika Background:** Latar hidup (partikel/gradien bernapas) dan **wajib ganti nuansa background di setiap scene**.
3. **Aset Gambar PNG (2–10 File):** Wajib men-generate dan menyematkan minimal 2 hingga 10 gambar `.png` pendukung ke dalam adegan.
4. **Karakter Tematik & Alur 4 Babak:** Maskot kontekstual dengan rig ekspresi hidup dalam alur *Hook → Eksplorasi → Solusi → Konklusi/CTA*.
5. **Tata Letak 3-Zona Anti-Overlap:** Zona Atas (Headline auto-scale), Zona Tengah (Visual/Maskot bebas teks), Zona Bawah (Subtitle/CTA).

---

## 🗂️ Apa yang tidak masuk git

Repo ini hanya menyimpan **kode**, bukan hasil produksi. Semua berkas yang lahir
dari order `/buat-video` diabaikan:

| Diabaikan | Contoh |
| :--- | :--- |
| Komposisi Remotion | `src/remotion/compositions/*.tsx` |
| Registry (di-generate) | `src/remotion/registry.ts` |
| Aset PNG per order | `public/assets/<topik>/` |
| Voiceover & SFX | `public/audio/**` |
| Naskah | `naskah/` |
| Render & screenshot | `out/`, `dist/` |
| Skrip generator sekali pakai | `scripts/make-*.mjs`, `scripts/*-cv-audio.mjs` |
| Skrip & artefak per order | `productions/<orderId>/` (storyboard, generator, skrip aset) |

`registry.ts` ditulis ulang otomatis oleh `scripts/regen-registry.mjs` setiap
server kantor start, `npm run build`, `npm run dev`, dan `npm run remotion:render`.
Jadi di clone baru:

```bash
git clone … && cd nara-office-ds
npm install
npm run dev:office-agy     # server menulis registry dari komposisi yang ada
```

Clone tidak membawa video lama — itu memang tujuannya. Kalau mau mengarsipkan
hasil produksi, simpan di luar repo atau di `.tmp/` (sudah di-ignore).

---

## 🔗 Sumber & Lisensi

- **[Claude-Office (Agent Office)](https://github.com/W17ant/Claude-Office)** oleh **W17ant** (MIT) — Fondasi kantor virtual isometrik & WebSocket.
- **[Remotion 4.x](https://www.remotion.dev/)** · **[Edge-TTS](https://github.com/rany2/edge-tts)** · **[GPT4Free](https://github.com/xtekky/gpt4free)** — Engine video React, sintesis suara Bahasa Indonesia, dan klien LLM.
- Dirilis di bawah **[MIT License](LICENSE)** (lihat juga [`NOTICE.md`](NOTICE.md)).
