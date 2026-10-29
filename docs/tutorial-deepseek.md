# Tutorial Lengkap: DeepSeek (DS)

Panduan dari nol sampai MP4, khusus mesin **DeepSeek**.

---

## 0. Prasyarat

| Kebutuhan | Keterangan |
| :--- | :--- |
| Node.js 20+ | `node -v` |
| Python 3 | dipakai Edge-TTS; `python --version` |
| git | untuk clone repo |
| Sesi DeepSeek | agen yang punya akses shell di folder repo (mis. DeepSeek Harness CLI) |
| Port 3333 & 3334 | kosong |

---

## 1. Clone dan pasang

```bash
git clone https://github.com/carissadarmafissaleha/nara-studio-virtual.git
cd nara-studio-virtual
npm install
npm run setup:check
```

`npm install` menyiapkan `.venv` (edge-tts + g4f) dan mencerminkan `skills/`.
Kalau `setup:check` belum hijau, jalankan `npm run setup`.

---

## 2. Nyalakan kantor (terminal 1)

```bash
npm run dev:office-ds
```

| Proses | Port / tugas |
| :--- | :--- |
| `server/index.js` | `:3334` — API, chat, Screening Room, Papan ToDo |
| `vite` | `:3333` — UI kantor |
| `scripts/studio-bridge.mjs` | meneruskan `/buat-video` |
| `deepseek-inbox-listener.mjs --daemon` | hanya menampilkan order + heartbeat `LISTENER` |

Tunggu baris `Agent Office: http://127.0.0.1:3334/#token=...`.

> Daemon tidak membangunkan sesi. Wake dipasang di langkah 5.

---

## 3. Buka kantor

```bash
npm run open        # terminal lain, folder repo yang sama
```

Atau buka link bertoken dari langkah 2. Tanpa token, kantor read-only.

---

## 4. Pindahkan mesin ke DeepSeek

Di chat `#office-general`:

```
/engine deepseek
```

Nara membalas mesin aktif **DeepSeek**; footer menjadi `LISTENER: AKTIF`.

DeepSeek bisa juga dikonfigurasi memakai endpoint HTTP: isi `url` pada
`~/.agent-office/engine.json`

```json
{ "active": "deepseek", "targets": { "deepseek": { "url": "http://127.0.0.1:9000/order" } } }
```

Tanpa `url`, order diarsipkan ke `naskah/active_orders.json` dan diambil dari
inbox oleh watcher sesi.

---

## 5. Pasang wake di sesi DeepSeek

Di sesi DeepSeek, di folder repo, sebagai **background job**:

```bash
npm run wake:ds
```

Footer menjadi `LISTENER: AKTIF · WAKE: SIAP`.

Kalau sesi tidak mendukung background job, jalankan di foreground sebelum
mengirim order: proses menunggu, lalu keluar sendiri sambil mencetak payload
order saat order masuk.

---

## 6. Kirim order

```
/buat-video menjelaskan cara kerja panel surya, 8 scene, 9:16
```

Alur: order ke `engine-inbox/` → watcher klaim → `exit 0` → sesi DeepSeek
bangun → produksi (naskah, VO, aset PNG, komposisi) → lapor tiap tahap.

---

## 7. Pantau progres

```bash
node scripts/order.mjs list 5
```

Status: `sent → claimed → in_progress → done` (`done` = draf lengkap, bukan
render). Footer menampilkan tahap berjalan; `WAKE: OFF` berarti watcher sesi
belum dipasang.

---

## 8. Screening Room

`/screen` di chat. Draf sudah bersuara. Kalau hanya teks yang muncul, hard reload
(`Ctrl+Shift+R`); kalau masih, pakai `http://localhost:3333` atau build ulang UI:

```bash
npm run build
```

---

## 9. Render MP4 (manual)

`/todo` → approve kartu **“Render Video MP4: <judul>”** → server menjalankan
`npx remotion render` → hasil di `out/<nama-komposisi>.mp4`.

---

## 10. Order berikutnya

Pasang lagi watcher setelah order selesai:

```bash
npm run wake:ds
```

Pindah mesin? Hentikan stack DeepSeek dulu (port sama), lalu ikuti tutorial
mesin tujuan.

---

## 11. Troubleshooting

| Gejala | Sebab | Tindakan |
| :--- | :--- | :--- |
| `LISTENER: OFF` | stack mati / port dipakai | jalankan `npm run dev:office-ds`, cek `/health` |
| `WAKE: OFF` | watcher belum dipasang | `npm run wake:ds` di sesi DeepSeek |
| order `sent` lama | lane salah / watcher mati | cek `engine.json` = `deepseek`, `order.mjs list` |
| order `claimed` tapi diam | sesi mati setelah klaim | `node scripts/order.mjs release <id>` |
| order `failed` | dispatch gagal | lihat `error` di file order / chat |
| VO tidak bersuara | edge-tts belum ada | `npm run setup:check` lalu `npm run setup` |
| Screening Room hanya teks | bundle UI lama | hard reload atau `npm run build` |

---

## 12. Checklist cepat

- [ ] `npm install` + `npm run setup:check` hijau
- [ ] `npm run dev:office-ds` jalan, kantor dibuka dengan token
- [ ] `/engine deepseek` → Nara konfirmasi
- [ ] `npm run wake:ds` di sesi DeepSeek → `WAKE: SIAP`
- [ ] `/buat-video …` → `claimed` → `done`
- [ ] Draf diputar di `/screen`
- [ ] Approve kartu render → `out/*.mp4`
