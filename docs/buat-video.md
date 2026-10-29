# `/buat-video` — order video lewat mesin produksi

Office cuma jadi kurir. Begitu Bos Caca mengirim `/buat-video <brief>`, teks
brief diteruskan **utuh** ke mesin produksi yang sedang aktif, lalu mesin itu
yang mengerjakan naskah, VO, SFX, komposisi, dan preview.

## Alur

```
chat office  →  bridge (guard)  →  ~/.agent-office/engine-inbox/ord-*.json   (arsip)
                              →  lane mesin aktif:
                                   deepseek     : engine-inbox/ + naskah/active_orders.json
                                   antigravity  : agy-inbox/ + naskah/agy_active_orders.json
                              ←  scripts/publish-draft.mjs (step / final / fail)
                              ←  chat office + Papan ToDo + footer
```

- Bridge tidak pernah membaca isi brief sebagai perintah. Brief tidak masuk ke
  shell, tidak jadi nama file, dan tidak di-parse ulang.
- Render MP4 tidak pernah otomatis. Setelah preview siap, mesin menaruh kartu
  "Render Video MP4" di Papan ToDo; render baru jalan setelah Bos approve.
- Kalau brief salah ketik perintahnya (`/buat-vdieo`), bridge bertanya dulu dan
  **tidak** mengirim apa pun. Chip di chat bisa dipakai untuk mengirim ulang.

## Satu mesin aktif

Order hanya dikirim ke **satu** mesin: yang tertulis di `active` pada
`~/.agent-office/engine.json`. Mesin lain tidak menerima salinan, jadi tidak ada
order yang dikerjakan dua kali.

```json
{
  "active": "deepseek",
  "targets": {
    "deepseek": { "url": "" },
    "antigravity": {},
    "opencode": {}
  }
}
```

Dari chat:

- `/engine` — mesin aktif + status kesiapannya.
- `/engine deepseek`, `/engine agy`, atau `/engine opencode` — ganti mesin (config
  dibaca ulang tiap order, tidak perlu restart bridge).
- `/engine inbox` — order terakhir yang tersimpan.

`url` pada `deepseek` boleh dikosongkan: order lalu diarsipkan ke
`naskah/active_orders.json` dan diambil dari inbox oleh listener sesi DeepSeek.

## Per mesin

| Mesin | Lane order | Pembangun sesi | Berkas naskah |
| --- | --- | --- | --- |
| `deepseek` | `~/.agent-office/engine-inbox/` | `npm run wake:ds` (one-shot, `exit 0`) | `naskah/active_orders.json` |
| `antigravity` | `~/.agent-office/agy-inbox/` (+ arsip di `engine-inbox/`) | `npm run wake:agy` (one-shot, `exit 0`) | `naskah/agy_active_orders.json` |
| `opencode` | `~/.agent-office/opencode-inbox/` (+ arsip di `engine-inbox/`) | `npm run wake:opencode` (one-shot, `exit 0`) | `naskah/opencode_active_orders.json` |

Mode daemon (`--daemon`) hanya menampilkan order baru + heartbeat untuk footer;
mode one-shot yang mengklaim order lalu `exit 0` — itulah "wake" yang
membangunkan sesi mesin.

### Ritual sesi baru

Wake hanya bekerja kalau listener hidup sebagai background job **di dalam sesi
AI**. Proses yang dijalankan stack npm tidak bisa membangunkan model. Jadi tiap
sesi baru:

```bash
node scripts/order.mjs list 5      # antrean + mesin pemegang klaim
npm run wake:ds                    # bila engine.json active = deepseek
npm run wake:agy                   # bila engine.json active = antigravity
npm run wake:opencode              # bila engine.json active = opencode
```

Pasang hanya watcher lane yang aktif, lalu pasang ulang setelah setiap order
selesai. Kalau order tertahan di mesin lama, `node scripts/order.mjs release <id>`.

### Indikator footer

Footer membedakan dua hal yang sering tertukar:

| Lampu | Sumber | Arti |
| --- | --- | --- |
| `LISTENER` | `listener-heartbeat-<engine>.json` | daemon stack hidup: order `/buat-video` bisa masuk antrean |
| `WAKE` | `wake-heartbeat-<engine>.json` | ada watcher di sesi AI: order berikutnya akan membangunkan mesin |

`LISTENER: AKTIF` + `WAKE: OFF` adalah kondisi yang berbahaya bila didiamkan:
order tersimpan rapi tetapi tidak ada yang mengerjakannya. Keduanya dibaca dari
`GET /api/listener-status` (`{ daemon, wake }`), dengan ambang segar 6 detik.

## Klaim & status order

Supaya satu order tidak dikerjakan dua kali dan tidak hilang saat sesi mati:

| Berkas | Isi |
| --- | --- |
| `engine-inbox/.claimed/<id>.json` | `{ orderId, claimedAt, by }`, ditulis atomic (`wx`), TTL 6 jam |
| `engine-inbox/<id>.json` | `status`: `pending` → `sent` → `claimed` → `in_progress` → `done` / `failed` |

- Listener **mengklaim dulu**, baru bangun. Kalau proses lain sudah klaim, order
  dilewati.
- Klaim yang lebih tua dari 6 jam dianggap ditinggal, jadi order bisa diambil
  lagi setelah sesi yang macet.
- `publish-draft.mjs` menulis `in_progress` saat `step`, `done` saat `final`, dan
  `failed` saat `fail`. Listener melewati order `done`/`failed`.
- Listener AGY hanya mengambil order ber-`engine: "antigravity"`, dan watcher
  DeepSeek hanya order ber-`engine: "deepseek"` — lane tidak saling mencuri.

### Serah-terima antar mesin

Kalau mesin harus ditukar saat order masih berjalan, jangan tunggu klaim
kedaluwarsa — lepas klaimnya:

```bash
node scripts/order.mjs list 5           # id, status, claimedBy, umur klaim
node scripts/order.mjs release <id>     # hapus klaim + status kembali ke "sent"
```

`release` menghapus `engine-inbox/.claimed/<id>.json` dan mengembalikan status
di kedua salinan order (`engine-inbox/` dan `agy-inbox/`), jadi mesin berikutnya
bisa langsung mengambilnya. TTL klaim bawaan 6 jam dan bisa diperpendek lewat
`NARA_CLAIM_TTL_MS` (milidetik) pada proses listener/watcher dan perintah order:

```powershell
$env:NARA_CLAIM_TTL_MS = 1800000   # 30 menit
```

## Laporan tahap

Mesin melapor hanya tahap yang benar-benar selesai:

```bash
node scripts/publish-draft.mjs step --order <id> --step script --title "<topik>" --scenes 8
node scripts/publish-draft.mjs step --order <id> --step voiceover --title "<topik>"
node scripts/publish-draft.mjs step --order <id> --step sfx --title "<topik>"
node scripts/publish-draft.mjs step --order <id> --step mix --title "<topik>" --seconds 71
node scripts/publish-draft.mjs final --order <id> --comp <NamaKomposisi> --title "<topik>" --scenes 8 --seconds 71 --voice id-ID-ArdiNeural
node scripts/publish-draft.mjs fail  --order <id> --step voiceover --message "<sebab nyata>"
```

## Guard

| Aturan | Nilai |
| --- | --- |
| Panjang brief | maks 8.000 karakter (ditolak, bukan dipotong) |
| Order per menit | 10 |
| Order berjalan bersamaan | 1 |
| Deteksi salah ketik | jarak Levenshtein ≤ 2 dari `buatvideo` |
| Duplikat | brief identik dalam 1 menit tidak dikirim dua kali |
| Timeout mesin | 15 detik (`NARA_ENGINE_TIMEOUT_MS`) |

Order yang gagal tetap tersimpan di `~/.agent-office/engine-inbox/`, jadi tidak
hilang kalau mesinnya mati. Mesin juga bisa mengambil order berikutnya dengan:

```bash
node scripts/order.mjs claim    # JSON: { id, text, chars }
```
