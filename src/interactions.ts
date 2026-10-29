/**
 * interactions.ts — Boss interaction definitions for clickable furniture
 *
 * Each interaction defines what happens when the boss clicks a furniture item:
 * - walkTo: position to walk to (near the item)
 * - effect: sprite to show above boss on arrival
 * - duration: how long the effect lasts (ms)
 * - chatMessage: what to post in office chat
 * - furnitureState: optional state change for the furniture item
 * - cooldown: minimum ms between interactions with this item
 */

import { boardChatLines, getShownBoard, type TaskBoardInfo } from './taskBoard'

export interface Interaction {
  walkTo: { x: number; y: number }
  effect: string
  duration: number
  chatMessage: string | string[]
  furnitureState?: { id: string; state: string; revertAfter?: number }
  cooldown: number
  sound?: string
}

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * What clicking a piece of furniture does. The kanban board (and the
 * whiteboard) reads out the task board on the wall when a session has one
 * (src/taskBoard.ts: "3 to do, 1 in progress: Fix the parser") and keeps its
 * flavour lines when none has; `board` is the shown board, passed in by tests.
 */
export function getInteraction(furnitureId: string, board: TaskBoardInfo | null = getShownBoard()): Interaction | null {
  switch (furnitureId) {
    // Plants — water them
    case 'plant-1':
    case 'plant-2':
    case 'plant-3':
    case 'plant-4':
    case 'plant-5':
      return { walkTo: { x: 58, y: 81 }, effect: '/sprites/effects/watering-can.png', duration: 3000, chatMessage: ['Menyiram tanaman studio', 'Biar suasana studio video tetap segar', 'Merawat tanaman hijau'], cooldown: 30000 }

    // Coffee machine
    case 'coffee':
      return {
        walkTo: { x: 73.5, y: 56.7 },
        effect: '/sprites/effects/need-coffee.png',
        duration: 4000,
        chatMessage: ['Menyeduh kopi studio dulu ☕', 'Waktunya kopi! Mata butuh jeda render', 'Isi bensin kafein animator', 'Ada yang mau kopi hangat?'],
        furnitureState: { id: 'coffee', state: 'on', revertAfter: 10000 },
        cooldown: 15000,
        sound: 'coffee',
      }

    // Filing cabinet
    case 'filing-1':
      return {
        walkTo: { x: 47.8, y: 57.6 },
        effect: '/sprites/effects/post-it.png',
        duration: 3000,
        chatMessage: ['Mencari dokumen storyboard 📁', 'Menyimpan arsip naskah video', 'Cek folder aset visual', 'Merapikan konsep scene video'],
        furnitureState: { id: 'filing-1', state: 'open', revertAfter: 8000 },
        cooldown: 10000,
      }

    // Printer
    case 'printer-1':
      return {
        walkTo: { x: 81.0, y: 63.0 },
        effect: '/sprites/effects/post-it.png',
        duration: 3000,
        chatMessage: ['Mencetak lembar storyboard 🖨️', 'Print breakdown naskah 4-scene', 'Cek panduan color grading', 'Print naskah dubbing untuk Ardi'],
        cooldown: 15000,
      }

    // Whiteboard / kanban board
    case 'whiteboard':
    case 'kanban-board':
      return {
        walkTo: { x: 80.0, y: 46.0 },
        effect: '/sprites/effects/post-it.png',
        duration: 4000,
        chatMessage: ['Cek timeline produksi video 🎬', 'Memindahkan scene yang sudah dirender', 'Jadwal screening berikutnya', 'Review shot list eksplain hari ini'],
        cooldown: 20000,
      }

    // Background hotspots
    case 'fire-extinguisher':
      return { walkTo: { x: 18.0, y: 66.0 }, effect: '/sprites/effects/fire.png', duration: 3000, chatMessage: ['Cek alat pemadam api studio', 'Keamanan studio nomor satu', 'Aman terkendali'], cooldown: 30000 }

    case 'water-cooler':
      return { walkTo: { x: 56.5, y: 46.0 }, effect: '/sprites/effects/glass-water.png', duration: 3000, chatMessage: ['Isi ulang botol minum 💧', 'Tetap terhidrasi saat animasi timeline panjang', 'Jeda minum sejenak'], cooldown: 10000 }

    case 'bell':
      return { walkTo: { x: 62.6, y: 46.0 }, effect: '/sprites/effects/star.png', duration: 2000, chatMessage: ['Teng teng! Waktunya screening video! 🔔', 'Kumpul tim! Review hasil render terbaru', 'Perhatian semua kru motion studio!'], cooldown: 20000, sound: 'bell' }

    case 'ship-it-poster':
      return { walkTo: { x: 18.0, y: 52.0 }, effect: '/sprites/effects/rocket.png', duration: 3000, chatMessage: ['Visual harus kelas dunia! 🚀', 'Motion grafis anti-PPT!', 'Semangat render hari ini!'], cooldown: 30000 }

    case 'tv-monitor':
      return { walkTo: { x: 85, y: 50 }, effect: '/sprites/effects/typing.png', duration: 3000, chatMessage: ['Cek live preview 60 FPS di layar besar 📺', 'Monitoring frame rate Remotion', 'Warna di monitor studio akurat', 'Semua scene render siap export'], cooldown: 15000 }

    default:
      return null
  }
}
