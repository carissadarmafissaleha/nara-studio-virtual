// Natural conversational personality responses for NARA studio crew (DeepSeek & AGY)
// No stiff AI templates, no 'Bos' addressing, spoken naturally as creative human colleagues
export function generateNaturalReply(agentName, role, userText) {
  const t = (userText || '').toLowerCase().trim();
  const name = 'Kak Caca';

  // Sapaan / Tanya kabar / Lagi apa
  if (/lagi apa|ngapain|sedang apa|kegiatan|sibuk/i.test(t)) {
    if (role === 'scriptwriter' || agentName === 'Lumi') {
      const answers = [
        `Lagi ngulik storyboard sama riset hook visual baru nih, ${name}! Ada ide cerita seru yang mau kita garap bareng?`,
        `Lagi nyiapin draf narasi dan ngerapiin punchline naskah, ${name}. Mau naskah topik apa hari ini?`,
        `Lagi baca-baca referensi visual menarik buat materi video kita berikutnya, ${name}. Mau coba konsep baru?`
      ];
      return answers[Math.floor(Math.random() * answers.length)];
    }
    if (role === 'voiceover' || agentName === 'Ardi') {
      const answers = [
        `Lagi cek mic sama pemanasan artikulasi vokal nih, ${name}! Siap dubbing naskah kapan aja.`,
        `Lagi dengerin sampel beat audio sama SFX pop-whoosh yang pas buat video kita, ${name}.`,
        `Standby di studio rekaman, ${name}. Mau dubbing narasi dengan tone santai atau semangat nih?`
      ];
      return answers[Math.floor(Math.random() * answers.length)];
    }
    if (role === 'video-editor' || agentName === 'Jeje') {
      const answers = [
        `Lagi ngutak-atik transisi spring physics di Remotion, ${name}! Biar animasinya makin smooth dan fluid.`,
        `Lagi ngecek komposisi visual timeline, ${name}. Semua layer dan aset udah tertata rapi nih.`,
        `Lagi standby di software editing, ${name}. Kalau naskah dan aset visual siap, langsung aku render!`
      ];
      return answers[Math.floor(Math.random() * answers.length)];
    }
    // Nara (Assistant)
    const answers = [
      `Lagi pantau papan tugas dan ngecek kesiapan tim studio, ${name}! Semua siap jalan kalau ada brief baru.`,
      `Lagi standby di meja koordinasi, ${name}. Semua timeline proyek aman terkendali!`,
      `Lagi cek progres draf dan screening room, ${name}. Ada yang bisa aku bantu siapkan?`
    ];
    return answers[Math.floor(Math.random() * answers.length)];
  }

  // Sapaan santai / Halo / Hai / Pagi / Malam
  if (/^(halo|hai|hey|pagi|siang|sore|malam|hi|assalamu)/i.test(t)) {
    const greetings = [
      `Halo ${name}! Semangat ya hari ini, ada yang mau dikerjain bareng?`,
      `Hai ${name}! Senang dengar kabar dari kamu. Tim studio standby di meja masing-masing nih.`,
      `Halo ${name}! Gimana harinya? Semua kru studio udah siap tempur nih.`
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  // Tanya kabar / Apa kabar
  if (/apa kabar|gimana|sehat/i.test(t)) {
    return `Kabar baik dan semangat banget, ${name}! Tim kita semua fit dan siap buat video kreatif lagi.`;
  }

  // Terimakasih / Makasih / Keren / Bagus
  if (/makasih|terima kasih|thanks|thank you|keren|mantap|bagus|top/i.test(t)) {
    return `Sama-sama ${name}! Senang banget kalau hasilnya memuaskan. Kita gas lagi project berikutnya ya!`;
  }

  // Respon kontekstual ramah natural
  if (role === 'scriptwriter' || agentName === 'Lumi') {
    return `Siap ${name}! Catatan kamu udah aku catat di naskah. Tinggal bilang kalau mau kita kembangin lebih lanjut ya.`;
  }
  if (role === 'voiceover' || agentName === 'Ardi') {
    return `Sip ${name}! Tone suaranya udah aku sesuaikan. Kasih tau aja kalau butuh penyesuaian tempo atau intonasi ya.`;
  }
  if (role === 'video-editor' || agentName === 'Jeje') {
    return `Siap ${name}! Frame dan layout videonya udah aku atur biar estetik dan enak ditonton.`;
  }
  return `Siap ${name}! Udah aku koordinasikan ke semua kru, kita siap eksekusi kapan pun kamu mau.`;
}
