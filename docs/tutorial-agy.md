# Tutorial Lengkap: Antigravity (AGY)

Panduan dari nol sampai MP4, khusus mesin **Antigravity (AGY)**.

---

## 0. Prasyarat

| Kebutuhan | Keterangan |
| :--- | :--- |
| Node.js 20+ | `node -v` |
| Python 3 | dipakai Edge-TTS; `python --version` |
| git | untuk clone repo |
| CLI Antigravity | `agy` bisa dijalankan dan punya akses shell di folder repo |
| Port 3333 & 3334 | kosong (tidak dipakai proses lain) |

---

## 1. Clone dan pasang

```bash
git clone https://github.com/carissadarmafissaleha/nara-office-ds.git
cd nara-office-ds
npm install
```

`npm install` menjalankan `scripts/setup.mjs`:

- membuat `.venv`,
- memasang **edge-tts + g4f**,
- mencerminkan `skills/` ke `.agents/skills/`.

Periksa tanpa mengubah apa pun:

```bash
npm run setup:check
```

Kalau ada yang merah, jalankan `npm run setup` (atau `npm run setup:full` untuk
mengunduh Chromium Remotion sekalian).

---

## 2. Nyalakan kantor (terminal 1)

```bash
npm run dev:office-agy
```

Yang hidup setelah perintah ini:

| Proses | Port / tugas |
| :--- | :--- |
| `server/index.js` | `:3334` — API kantor, chat, Screening Room, Papan ToDo |
| `vite` | `:3333` — UI kantor |
| `scripts/studio-bridge.mjs` | membaca chat, meneruskan `/buat-video` |
| `agy-inbox-listener.mjs --daemon` | **hanya** menampilkan order + heartbeat `LISTENER` |

Tunggu sampai muncul:

```
Agent Office: http://127.0.0.1:3334/#token=...
```

> Daemon **tidak** membangunkan sesi AGY. Itu tugas watcher di langkah 5.

---

## 3. Buka kantor di browser

Dari terminal lain di folder repo:

```bash
npm run open
```

Atau buka link bertoken dari langkah 2. Token disimpan browser (per profil), jadi
cukup sekali. Tanpa token, kantor tampil read-only: chat dan tombol aksi dibatasi.

---

## 4. Pindahkan mesin ke AGY

Di chat `#office-general`:

```
/engine agy
```

Balasan Nara menyebut **Antigravity (AGY)** dan status kesiapannya. Footer
berubah menjadi `LISTENER: AKTIF`.

Kalau balasannya `belum siap` → stack AGY tidak berjalan atau port dipakai stack
lain.

---

## 5. Pasang wake di sesi AGY

Buka CLI Antigravity **di folder repo yang sama**, lalu minta ia menjalankan
sebagai **background job**:

```bash
npm run wake:agy
```

Efeknya: footer menjadi `LISTENER: AKTIF · WAKE: SIAP`.

### Kalau AGY tidak mendukung background job

Jalankan perintah yang sama di **foreground**, lalu kirim order dari chat. Proses
itu menunggu, dan ketika order masuk ia mencetak payload order lalu keluar —
sesi AGY menerima teks order itu dan bisa mulai bekerja.

### Kalau AGY tidak bereaksi saat proses selesai

Minta sesi AGY membuka order secara eksplisit:

```bash
node scripts/order.mjs list 5
node scripts/order.mjs show <orderId>
```

---

## 6. Kirim order

Di chat kantor:

```
/buat-video penjelasan cara kerja mesin kopi, cartoon, 9:16, 30 detik
```

Yang terjadi:

1. bridge menulis order ke `~/.agent-office/engine-inbox/<id>.json` (arsip) dan
   `~/.agent-office/agy-inbox/<id>.json` (lane AGY),
2. watcher AGY **mengklaim** order (`.claimed/<id>.json`) lalu `exit 0`,
3. sesi AGY bangun dan memproduksi: naskah → VO Edge-TTS → aset PNG →
   komposisi Remotion,
4. tiap tahap dilaporkan ke chat, footer, dan Papan ToDo.

---

## 7. Pantau progres

```bash
node scripts/order.mjs list 5
```

| Status | Arti |
| :--- | :--- |
| `sent` | order menunggu; belum ada yang mengklaim |
| `claimed` | sudah diambil mesin (sedang/akan dikerjakan) |
| `in_progress` | minimal satu tahap sudah dilaporkan |
| `done` | draf lengkap terkirim (belum render) |
| `failed` | produksi berhenti; lihat pesan di chat |

Di kantor: footer menampilkan tahap berjalan, `LISTENER`, dan `WAKE`. Kalau
`WAKE: OFF` padahal order `sent`, berarti watcher sesi belum dipasang.

---

## 8. Screening Room

Buka `/screen` di chat atau tombol Screening Room. Pilih komposisi terbaru, tekan
Play. Draf sudah bersuara (VO Ardi + SFX) karena durasi tiap scene diukur dari
audio riil.

Kalau yang tampil hanya teks/tidak ada player, hard reload (`Ctrl+Shift+R`). Bila
masih, pastikan memakai `http://localhost:3333` (dev, selalu segar) atau build
ulang UI untuk `:3334`:

```bash
npm run build
```

---

## 9. Render MP4 (manual)

1. Buka `/todo`.
2. Cari kartu **“Render Video MP4: <judul>”**.
3. Klik Approve / Render.

Server menjalankan `npx remotion render` di latar dan menulis
`out/<nama-komposisi>.mp4`. Tidak ada render otomatis sebelum tombol ditekan.

---

## 10. Order berikutnya

Setelah order selesai, pasang lagi watcher di sesi AGY:

```bash
npm run wake:agy
```

Kalau mau pindah mesin, lihat tutorial mesin tujuan dan jalankan `/engine` yang
sesuai; `dev:office-agy` harus dimatikan lebih dulu karena port dipakai bersama.

---

## 11. Troubleshooting

| Gejala | Sebab | Tindakan |
| :--- | :--- | :--- |
| `LISTENER: OFF` | stack belum jalan / port dipakai | jalankan `npm run dev:office-agy`, cek `http://localhost:3334/health` |
| `WAKE: OFF` | watcher sesi belum dipasang | `npm run wake:agy` di sesi AGY |
| order `sent` lama | lane salah / watcher mati | cek `order.mjs list`; pastikan `engine.json` = `antigravity` |
| order `claimed` tapi diam | sesi mati setelah klaim | `node scripts/order.mjs release <id>` lalu kirim ulang |
| chat tidak dijawab | bridge mati | lihat terminal stack, cari `studio-bridge.mjs` |
| VO tidak bersuara | edge-tts belum terpasang | `npm run setup:check`, lalu `npm run setup` |
| Screening Room hanya teks | bundle UI lama | hard reload; atau `npm run build` |
| port 3333/3334 error | stack lain hidup | hentikan stack lama dulu |

---

## 12. Checklist cepat

- [ ] `npm install` sukses, `npm run setup:check` hijau
- [ ] `npm run dev:office-agy` jalan, token kantor dibuka
- [ ] `/engine agy` → Nara bilang AGY siap
- [ ] `npm run wake:agy` di sesi AGY → footer `WAKE: SIAP`
- [ ] `/buat-video …` → order `claimed` → `done`
- [ ] Draf diputar di `/screen`
- [ ] Kartu render di-approve → `out/*.mp4`
