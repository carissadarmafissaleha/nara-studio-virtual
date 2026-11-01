// Random office events that trigger periodically

export interface RandomOfficeEvent {
  id: string
  name: string
  slackAnnouncement: string
  duration: number // ms
  type: 'all-move' | 'single-agent' | 'visual-only' | 'slack-only'
  targetPosition?: { x: number; y: number }
  agentMessages?: string[]
  managerMessage?: string
  sound?: 'alarm' | 'celebration' | 'doorOpen' | 'error' | 'powerDown' | 'notification' | 'coffee'
}

export const RANDOM_EVENTS: RandomOfficeEvent[] = [
  {
    id: 'fire-drill',
    name: 'Simulasi Tanggap Darurat',
    slackAnnouncement: '🚨 SIMULASI STUDIO! Semua tim kumpul di titik kumpul!',
    duration: 6000,
    type: 'all-move',
    targetPosition: { x: 114, y: 105 },
    managerMessage: 'Simulasi tanggap darurat! Simpan file render!',
    agentMessages: ['waduh, renderan belum kelar!', 'naskah lagi seru-serunya!', 'kopi gue dingin!', 'amankan aset video!'],
    sound: 'alarm',
  },
  {
    id: 'pizza',
    name: 'Makan Bareng Tim Studio',
    slackAnnouncement: '🍕 Pizza tiba! Istirahat makan siang bareng tim!',
    duration: 5000,
    type: 'all-move',
    targetPosition: { x: 114, y: 105 },
    managerMessage: 'Makan siang bareng tim di lobi!',
    agentMessages: ['ASIK PIZZA!', 'waktunya isi bensin animator', 'ada nanasnya gak tuh?', 'ambil jatah pepperoni!'],
    sound: 'celebration',
  },
  {
    id: 'standup',
    name: 'Briefing Pagi Studio',
    slackAnnouncement: '📢 @here Briefing produksi video pagi dimulai',
    duration: 7000,
    type: 'all-move',
    targetPosition: { x: 411, y: 417 },
    managerMessage: 'Briefing! Adegan mana yang sudah siap render?',
    agentMessages: ['lagi ngerjain kinetic typography', 'sedang sinkronisasi audio VO', 'menunggu review naskah Lumi', 'komposisi 8 panggung sudah 90%', 'render uji coba lancar 60fps'],
    sound: 'notification',
  },
  {
    id: 'deploy',
    name: 'Final Export Video',
    slackAnnouncement: '🚀 MERENDER FINAL EXPORT MP4...',
    duration: 5000,
    type: 'slack-only',
    managerMessage: 'Bismillah render akhir video...',
    agentMessages: ['semoga gak crash di frame akhir', 'audio sync jangan geser', 'GPU kerja keras', 'bismillah 4K lancar', 'cek bitrate output'],
    sound: 'notification',
  },
  {
    id: 'deploy-success',
    name: 'Export Video Berhasil',
    slackAnnouncement: '✅ Export final video berhasil! Semua frame ter-render mulus 🎉',
    duration: 3000,
    type: 'slack-only',
    managerMessage: 'Alhamdulillah, master export selesai!',
    agentMessages: ['playback 60fps mulus!', 'nol frame drop!', 'audio sync mantap!', 'siap masuk screening room!'],
    sound: 'celebration',
  },
  {
    id: 'deploy-fail',
    name: 'Render Gagal',
    slackAnnouncement: '💥 RENDER GAGAL - TIMELINE CRASH DI FRAME 840',
    duration: 4000,
    type: 'slack-only',
    managerMessage: 'SIAPA YANG BIKIN KOMPOSISI ERROR?!',
    agentMessages: ['bukan gue!', 'GPU kehabisan VRAM nih', 'track audio-nya ilang?', 'cek log error Remotion...', 'coba render ulang...'],
    sound: 'error',
  },
  {
    id: 'power-flicker',
    name: 'Listrik Drop',
    slackAnnouncement: '⚡ Listrik studio sempat drop — simpan timeline kalian!',
    duration: 3000,
    type: 'visual-only',
    agentMessages: ['eh lampu barusan kedip ya...', 'CTRL+S CTRL+S CEPET', 'proyek timeline belum di-save!', 'simpan komposisi SEKARANG'],
    sound: 'powerDown',
  },
  {
    id: 'birthday',
    name: 'Ulang Tahun Kru',
    slackAnnouncement: '🎂 Selamat Ulang Tahun! Ada kue & tumpeng di ruang istirahat!',
    duration: 4000,
    type: 'all-move',
    targetPosition: { x: 287, y: 129 },
    managerMessage: 'Selamat ulang tahun! Potong kuenya bareng tim!',
    agentMessages: ['minta kue dong!', 'traktirannya mana nih!', '🎉🎉🎉', 'bikin harapan dulu!', 'semoga renderan lancar terus'],
    sound: 'celebration',
  },
  {
    id: 'who-broke-build',
    name: 'Pipeline Render Merah',
    slackAnnouncement: '🔴 Pipeline render MERAH! Siapa yang bikin build komposisi crash?',
    duration: 5000,
    type: 'slack-only',
    managerMessage: 'Gak ada yang pulang sebelum antrean render bersih dan jalan lancar!',
    agentMessages: ['lagi ngecek timeline komposisi...', 'bukan gue, scene gue lolos QA 60fps', 'jangan-jangan audio sync atau VO-nya gak pas?', 'ada aset font atau SVG yang ilang gak?', 'cek log konsol Remotion sekarang!'],
    sound: 'error',
  },
  {
    id: 'friday',
    name: 'Vibes Jumat Sore',
    slackAnnouncement: '🎉 Hari Jumat! Semangat beresin scene terakhir!',
    duration: 3000,
    type: 'slack-only',
    managerMessage: 'Dilarang batch render 4K pas Jumat sore.',
    agentMessages: ['TGIF!', 'ngopi dulu?', 'satu potong adegan lagi...', 'tenggo jam 5 pas', 'akhir pekan!'],
    sound: 'celebration',
  },
  {
    id: 'printer-jam',
    name: 'Storyboard Macet',
    slackAnnouncement: '🖨️ Printer cetak storyboard macet lagi nih',
    duration: 4000,
    type: 'single-agent',
    targetPosition: { x: 424, y: 132 },
    agentMessages: ['kenapa kita masih cetak fisik ya', 'mending review di tablet aja', 'kertasnya nyangkut di roller', 'zaman sekarang masih nge-print...'],
    sound: 'error',
  },
  {
    id: 'slack-down',
    name: 'Jaringan Chat Ngadat',
    slackAnnouncement: '💀 Jaringan chat studio ngadat... eh kok pesan ini bisa lewat?',
    duration: 3000,
    type: 'slack-only',
    agentMessages: ['lucu juga ya', 'saatnya pake surat kaleng', 'ngomong langsung aja ke meja sebelah', 'tapi lumayan hening sih'],
    sound: 'notification',
  },
]

// Obrolan drama antar-animator di kantor
export const DRAMA_CONVERSATIONS = [
  {
    trigger: 'coffee-meet',
    messages: [
      { sender: 0, text: 'udah liat potongan scene baru?' },
      { sender: 1, text: 'yang 20 sekuens itu? iya...' },
      { sender: 0, text: 'gak ada cue audio sama sekali lagi' },
      { sender: 1, text: '💀' },
    ],
  },
  {
    trigger: 'who-pushed',
    messages: [
      { sender: 0, text: 'siapa yang ubah komposisi master?' },
      { sender: 1, text: 'bukan gue' },
      { sender: 0, text: 'riwayat commit bilang lu yang edit sekuensnya' },
      { sender: 1, text: '...' },
    ],
  },
  {
    trigger: 'tabs-vs-spaces',
    messages: [
      { sender: 0, text: 'render 30fps atau 60fps?' },
      { sender: 1, text: '60fps lah, gerakannya jauh lebih mulus' },
      { sender: 0, text: 'GPU lu yang nangis nanti' },
    ],
  },
  {
    trigger: 'meeting',
    messages: [
      { sender: 0, text: 'briefing tadi harusnya bisa lewat chat doang' },
      { sender: 1, text: 'chat tadi harusnya bisa hening aja' },
    ],
  },
  {
    trigger: 'framework',
    messages: [
      { sender: 0, text: 'kita mending bikin semua animasi pake Remotion' },
      { sender: 1, text: 'lu ngomong gitu tiap minggu' },
      { sender: 0, text: 'dan gue selalu bener tiap minggu' },
    ],
  },
  {
    trigger: 'legacy',
    messages: [
      { sender: 0, text: 'nemu catatan TODO dari proyek 2024' },
      { sender: 1, text: 'tulisannya apa?' },
      { sender: 0, text: '"benerin easing curve nanti"' },
      { sender: 1, text: 'nanti itu sekarang' },
      { sender: 0, text: 'enggak. nanti itu nanti.' },
    ],
  },
  {
    trigger: 'ai',
    messages: [
      { sender: 0, text: 'naskah AI hari ini hook-nya dapet banget' },
      { sender: 1, text: 'ya iyalah hasil riset prompt Lumi' },
      { sender: 0, text: 'animator tinggal sat-set' },
    ],
  },
  {
    trigger: 'standup-excuse',
    messages: [
      { sender: 0, text: 'kemarin ngerjain apa seharian?' },
      { sender: 1, text: 'riset mendalam buat transisi visual' },
      { sender: 0, text: 'maksud lu nonton TikTok animasi 6 jam?' },
      { sender: 1, text: 'itu namanya benchmarking referensi!' },
    ],
  },
]

// Reaksi Slack yang muncul acak pada pesan
export const SLACK_REACTIONS = ['👍', '🔥', '💀', '😂', '🚀', '❤️', '👀', '💯', '🎉', '😅', '🤔', '⚡']

// Event bertema The Office (Dunder Mifflin) versi Studio
export const OFFICE_EVENTS: RandomOfficeEvent[] = [
  {
    id: 'fire-alarm-stress-relief',
    name: 'Simulasi Kebakaran Dwight',
    slackAnnouncement: '🔥 KEBAKARAN! KEBAKARAN! (Dwight lagi simulasi keselamatan kebakaran)',
    duration: 6000,
    type: 'all-move',
    targetPosition: { x: 114, y: 105 },
    managerMessage: 'Apinya nembak ke arah kita!',
    agentMessages: ['PANIK!', 'selamatin Bandit!', 'kucingnya lempar ke atas!', 'gue nyerah!', 'ambil defibrilator!'],
    sound: 'alarm',
  },
  {
    id: 'cpr-training',
    name: "Stayin' Alive",
    slackAnnouncement: '🫀 Pelatihan CPR studio — ikuti ketukan lagu Stayin\' Alive',
    duration: 5000,
    type: 'slack-only',
    managerMessage: 'ah ah ah ah, stayin\' alive, stayin\' alive',
    agentMessages: ['ini... beneran hidup?', 'Dwight malah potong muka manekinnya', 'gue belajar ini dari serial drama', 'ah ah ah ah'],
    sound: 'notification',
  },
  {
    id: 'golden-ticket',
    name: 'Tiket Emas Diskon',
    slackAnnouncement: '🎫 Lima Tiket Emas tersembunyi di rim kertas — diskon render 10%!',
    duration: 4000,
    type: 'slack-only',
    managerMessage: 'Itu ide saya. Semuanya ide saya.',
    agentMessages: ['salahin Kevin nih', 'waktunya ala Willy Wonka', 'itu murni ulah Michael', 'siapa yang nge-acc ini'],
    sound: 'celebration',
  },
  {
    id: 'jim-prank',
    name: 'Prank Jim ke Dwight',
    slackAnnouncement: '🥤 Seseorang masukin stapler Dwight ke dalam puding jeli lagi',
    duration: 3500,
    type: 'slack-only',
    managerMessage: 'JIM!',
    agentMessages: ['mulai lagi deh', 'pasti Jim pelakunya', 'pencurian identitas bukan lelucon', 'Pam, tolongin'],
    sound: 'notification',
  },
  {
    id: 'parkour',
    name: 'Parkour Studio!',
    slackAnnouncement: '🏃 PARKOUR! PARKOUR! LOMPAT MEJA STUDIO!',
    duration: 4000,
    type: 'visual-only',
    managerMessage: 'PARKOUR!',
    agentMessages: ['parkour!', 'PAR-KOUR', 'Michael jangan loncat ke kardus!', 'ini bakal berakhir di IGD'],
    sound: 'celebration',
  },
  {
    id: 'schrute-bucks',
    name: 'Uang Schrute',
    slackAnnouncement: '💵 Dwight nerbitin Uang Schrute. Nilainya seperseribu rupiah.',
    duration: 3000,
    type: 'slack-only',
    agentMessages: ['kurs tukarnya berapaan?', 'emang gue keliatan butuh insentif receh?', 'mending Stanley Nickel sekalian', 'mana jatah bonus gue?'],
    sound: 'notification',
  },
  {
    id: 'kevins-chili',
    name: 'Sup Chili Kevin',
    slackAnnouncement: '🫘 Kevin numpahin sepanci sup chili di karpet studio. Lagi.',
    duration: 4000,
    type: 'slack-only',
    managerMessage: 'Satu-satunya cara cuma diserok pake papan klip...',
    agentMessages: ['JANGANNN', 'itu dia masak dari subuh', 'karpetnya ancur bau rempah', 'kan udah dibilang pake dua panci'],
    sound: 'error',
  },
  {
    id: 'printer-jam-dm',
    name: 'Printer Sabre Terbakar',
    slackAnnouncement: '🖨️ Printer Sabre keluar api beneran. Api asli.',
    duration: 4000,
    type: 'single-agent',
    targetPosition: { x: 424, y: 132 },
    agentMessages: ['printer Sabre berulah lagi', 'kan udah gue bilang!', 'panggil pemadam kebakaran!', 'garansinya udah hangus'],
    sound: 'error',
  },
  {
    id: 'dundies',
    name: 'Malam Penghargaan Dundies',
    slackAnnouncement: '🏆 Malam Penghargaan Dundies Studio dimulai nanti malam!',
    duration: 4000,
    type: 'slack-only',
    managerMessage: 'Kalian bakal ketawa, kalian bakal nangis...',
    agentMessages: ['penghargaan Berang-berang Terbaik lagi', 'jangan gue lagi pliss', 'dibs kategori Bos Terbaik', 'nanti abis ini makan-makan ya'],
    sound: 'celebration',
  },
  {
    id: 'pretzel-day',
    name: 'Hari Pretzel',
    slackAnnouncement: '🥨 HARI PRETZEL STUDIO TIBA!',
    duration: 5000,
    type: 'all-move',
    targetPosition: { x: 287, y: 129 },
    managerMessage: 'Kalian gak paham. Ini hari pretzel gratis.',
    agentMessages: ['hari terbaik sepanjang tahun', 'semua kalori terbayarkan', 'Stanley udah nungguin dari pagi', 'tambah semua topping manis!'],
    sound: 'celebration',
  },
  {
    id: 'bears-beets',
    name: 'Pertanyaan Beruang',
    slackAnnouncement: '📋 Pertanyaan: beruang jenis apa yang paling hebat?',
    duration: 3000,
    type: 'slack-only',
    agentMessages: ['salah. beruang hitam.', 'Bears, beets, Battlestar Galactica', 'pencurian identitas bukan lelucon, Jim', 'fakta: beruang doyan buah bit'],
    sound: 'notification',
  },
]

// Event mode insiden darurat studio
export const INCIDENT_EVENTS: RandomOfficeEvent[] = [
  {
    id: 'fire-drill',
    name: 'Ruang Darurat Studio',
    slackAnnouncement: '🚨 Semua kru kumpul di ruang kontrol — ada render darurat!',
    duration: 6000,
    type: 'all-move',
    targetPosition: { x: 114, y: 105 },
    managerMessage: 'Semua masuk call! Siapa yang megang proyek ini?',
    agentMessages: ['otw ruang kontrol', 'ini revisi mepet dari klien?', 'bentar mute dulu, lagi rame'],
    sound: 'alarm',
  },
  {
    id: 'pizza',
    name: 'Pizza Lembur',
    slackAnnouncement: '🍕 Pizza lembur tiba! Dibiayai dari pos anggaran darurat',
    duration: 5000,
    type: 'all-move',
    targetPosition: { x: 114, y: 105 },
    managerMessage: 'Makan cepet, terus kita lanjut!',
    agentMessages: ['pizza lembur rasanya beda', 'loyang kedua malam ini', 'ngetik sambil ngunyah, maap'],
    sound: 'celebration',
  },
  {
    id: 'standup',
    name: 'Update Progres Darurat',
    slackAnnouncement: '📢 @here apa kendalanya, siapa yang ke-block, apa yang perlu dibantu?',
    duration: 7000,
    type: 'all-move',
    targetPosition: { x: 411, y: 417 },
    managerMessage: 'Laporan giliran satu-satu!',
    agentMessages: ['error frame turun 40%', 're-render setengah jalan', 'butuh bantuan audio engineer', 'masih ngecek bitrate'],
    sound: 'notification',
  },
  {
    id: 'deploy',
    name: 'Render Ulang Darurat',
    slackAnnouncement: '🚀 MEMULAI RENDER ULANG MASTER...',
    duration: 5000,
    type: 'slack-only',
    managerMessage: 'Tahan napas semuanya...',
    agentMessages: ['bismillah', 'pantau monitor GPU', 'kalo ini gagal kita rollback ke draf sebelumnya'],
    sound: 'notification',
  },
  {
    id: 'deploy-success',
    name: 'Render Darurat Selesai',
    slackAnnouncement: '✅ Render ulang berhasil — semua frame normal & mulus',
    duration: 3000,
    type: 'slack-only',
    managerMessage: 'Nyalakan timer all-clear!',
    agentMessages: ['bisa napas lega sekarang', 'grafik render stabil', 'siapa yang mau tulis evaluasi pasca-insiden?'],
    sound: 'celebration',
  },
  {
    id: 'deploy-fail',
    name: 'Render Ulang Gagal',
    slackAnnouncement: '💥 Render ulang masih gagal — mencoba fallback draf lama',
    duration: 4000,
    type: 'slack-only',
    managerMessage: 'Tenang semua, kita cari solusinya.',
    agentMessages: ['aduh', 'aset baru gak kompatibel', 'cek file backup sekarang!'],
    sound: 'error',
  },
  {
    id: 'power-flicker',
    name: 'UPS Studio Aktif',
    slackAnnouncement: '⚡ UPS studio menyala! Server render aman.',
    duration: 3000,
    type: 'visual-only',
    agentMessages: ['tadi ada kedip ya?', 'untung UPS aktif cepet'],
    sound: 'powerDown',
  },
  {
    id: 'birthday',
    name: 'Pergantian Shift',
    slackAnnouncement: '🕑 Tim shift malam sudah masuk — serah terima di ruang istirahat',
    duration: 4000,
    type: 'all-move',
    targetPosition: { x: 287, y: 129 },
    managerMessage: 'Briefing singkat, terus yang shift pagi boleh istirahat',
    agentMessages: ['catatan serah terima ada di papan', 'semangat ya shift malam', 'nitip monitor renderan'],
    sound: 'notification',
  },
  {
    id: 'who-broke-build',
    name: 'Pelacakan Frame Rusak',
    slackAnnouncement: '🔴 Melacak render crash — mencari frame rusak antara 0 dan 1800',
    duration: 5000,
    type: 'slack-only',
    managerMessage: 'Tenang semua. Cari aset yang bermasalah, bukan salahin orang.',
    agentMessages: ['frame 420 error', 'frame 120 aman', 'aset WebM di scene 3 rusak?', 'ada font glyph yang hilang!'],
    sound: 'error',
  },
  {
    id: 'friday',
    name: 'Jumat Lembur',
    slackAnnouncement: '📅 Pengingat: ini awalnya cuma revisi kecil Jumat sore',
    duration: 3000,
    type: 'slack-only',
    managerMessage: 'Jangan pernah lagi nerima revisi dadakan pas Jumat',
    agentMessages: ['jangan pernah lagi', 'minggu lalu kita juga bilang gitu', 'mulai besok Jumat haram ubah timeline'],
    sound: 'notification',
  },
  {
    id: 'printer-jam',
    name: 'Cetak Log Error',
    slackAnnouncement: '🖨️ Ada yang cetak log error Remotion ke printer',
    duration: 4000,
    type: 'single-agent',
    targetPosition: { x: 424, y: 132 },
    agentMessages: ['ini tebelnya 400 halaman...', 'error stacktrace dicetak fisik?!', 'cabut colokan printernya!'],
    sound: 'error',
  },
  {
    id: 'slack-down',
    name: 'Server Dashboard Down',
    slackAnnouncement: '💀 Server dashboard status mati. Ironis banget.',
    duration: 3000,
    type: 'slack-only',
    agentMessages: ['malah server monitoring yang tumbang', 'kirim kabar lewat WA', 'pake merpati pos aja sekalian'],
    sound: 'notification',
  },
]

import { getTheme } from './theme'
import { getVariant } from './incident'

export function pickEvent(): RandomOfficeEvent {
  const isOffice = getTheme() === 'office'

  // Incident mode: the deploy chain runs hotter (0.35 vs 0.15) and every
  // event reads as part of the outage. Same ids, so movement targets resolve.
  if (getVariant() === 'incident') {
    if (Math.random() < 0.35) {
      return Math.random() < 0.7
        ? INCIDENT_EVENTS.find(e => e.id === 'deploy-success')!
        : INCIDENT_EVENTS.find(e => e.id === 'deploy-fail')!
    }
    const pool = INCIDENT_EVENTS.filter(e => e.id !== 'deploy-success' && e.id !== 'deploy-fail')
    return pool[Math.floor(Math.random() * pool.length)]
  }

  // Deploy events chain together (kept for both themes)
  if (Math.random() < 0.15) {
    return Math.random() < 0.7
      ? RANDOM_EVENTS.find(e => e.id === 'deploy-success')!
      : RANDOM_EVENTS.find(e => e.id === 'deploy-fail')!
  }

  if (isOffice) {
    // 70% Office-themed, 30% default — keeps things varied
    const useOffice = Math.random() < 0.7
    const pool = useOffice
      ? OFFICE_EVENTS
      : RANDOM_EVENTS.filter(e => e.id !== 'deploy-success' && e.id !== 'deploy-fail')
    return pool[Math.floor(Math.random() * pool.length)]
  }

  const pool = RANDOM_EVENTS.filter(e => e.id !== 'deploy-success' && e.id !== 'deploy-fail')
  return pool[Math.floor(Math.random() * pool.length)]
}
