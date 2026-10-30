# Tutorial Lengkap: Hermes

Panduan dari nol sampai MP4, khusus mesin **Hermes**.

---

## 0. Prasyarat

| Kebutuhan | Keterangan |
| :--- | :--- |
| Node.js 20+ | `node -v` |
| Python 3 | dipakai Edge-TTS |
| git | untuk clone repo |
| CLI Hermes | `hermes --version` jalan, dengan akses shell di folder repo |
| Port 3333 & 3334 | kosong |

Pasang Hermes mengikuti dokumentasi resminya, lalu pastikan perintah `hermes`
dikenali di terminal yang sama dengan repo.

---

## 1. Clone dan pasang

```bash
git clone https://github.com/carissadarmafissaleha/nara-studio-virtual.git
cd nara-studio-virtual
npm install
npm run setup:check
```

---

## 2. Nyalakan kantor (terminal 1)

```bash
npm run dev:office-hermes
```

| Proses | Port / tugas |
| :--- | :--- |
| `server/index.js` | `:3334` |
| `vite` | `:3333` |
| `scripts/studio-bridge.mjs` | meneruskan `/buat-video` |
| `engine-inbox-daemon.mjs --engine hermes` | menampilkan order + heartbeat `LISTENER` untuk lane Hermes |

Tunggu `Agent Office: http://127.0.0.1:3334/#token=...`.

Perintah `dev:office-*` lain memakai port yang sama — jalankan **satu** saja.

---

## 3. Buka kantor

```bash
npm run open
```

Atau klik link bertoken dari langkah 2.

---

## 4. Pindahkan mesin ke Hermes

```
/engine hermes
```

Alias: `/engine hermes`. Nara membalas **Hermes**; footer `LISTENER: AKTIF`.

`engine.json` akan berisi `"active": "hermes"`, dan order berikutnya hanya
masuk lane Hermes (`~/.agent-office/hermes-inbox/`).

---

## 5. Pasang wake di sesi Hermes

Di sesi Hermes, di folder repo, sebagai **background job**:

```bash
npm run wake:hermes
```

Footer menjadi `LISTENER: AKTIF · WAKE: SIAP`.

Kalau Hermes tidak mendukung background job, jalankan di foreground sebelum
mengirim order — ia menunggu lalu keluar sambil mencetak payload order.

Kalau Hermes tidak bereaksi saat proses selesai:

```bash
node scripts/order.mjs list 5
node scripts/order.mjs show <orderId>
```

lalu minta sesi mengerjakan order tersebut.

---

## 6. Kirim order

```
/buat-video cara kerja mesin cuci, cartoon, 6 scene, 9:16
```

Alur: `engine-inbox/` (arsip) + `hermes-inbox/` (lane) → watcher klaim →
`exit 0` → sesi Hermes bangun → produksi → lapor tahap.

---

## 7. Pantau progres

```bash
node scripts/order.mjs list 5
```

`sent → claimed → in_progress → done`. `done` artinya draf lengkap, bukan render.

---

## 8. Screening Room

`/screen` → pilih komposisi → Play. Hard reload (`Ctrl+Shift+R`) kalau hanya
teks; atau `npm run build` untuk UI `:3334`.

---

## 9. Render MP4 (manual)

`/todo` → approve **“Render Video MP4: <judul>”** → `out/<nama-komposisi>.mp4`.

---

## 10. Order berikutnya

```bash
npm run wake:hermes
```

Pindah mesin: hentikan stack Hermes dulu, lalu ikuti tutorial mesin tujuan.

---

## 11. Troubleshooting

| Gejala | Sebab | Tindakan |
| :--- | :--- | :--- |
| `/engine hermes` ditolak | config lama tidak punya target | perbarui repo (`git pull`), target `hermes` sudah default |
| `WAKE: OFF` | watcher belum dipasang | `npm run wake:hermes` |
| order `sent` lama | lane salah | cek `engine.json` = `hermes` |
| daemon lane tidak muncul | `dev:office-hermes` tidak dipakai | pakai perintah itu, atau jalankan `node scripts/engine-inbox-daemon.mjs --engine hermes` |
| `claimed` tapi diam | sesi mati | `node scripts/order.mjs release <id>` |
| Screening Room hanya teks | bundle lama | hard reload / `npm run build` |
| port bentrok | stack lain hidup | hentikan stack lama |

---

## 12. Checklist cepat

- [ ] `npm install` + `setup:check` hijau, `hermes` dikenali
- [ ] `npm run dev:office-hermes` jalan
- [ ] `/engine hermes` dikonfirmasi Nara
- [ ] `npm run wake:hermes` → `WAKE: SIAP`
- [ ] `/buat-video …` → `done`
- [ ] `/screen` memutar draf
- [ ] Approve render → MP4
