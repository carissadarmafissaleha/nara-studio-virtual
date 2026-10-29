#!/usr/bin/env node
import { generateNaturalReply } from './natural-replies.mjs';
/**
 * NARA Studio Unified Bi-Directional Bridge (DeepSeek & Antigravity / AGY)
 *
 * Satu jembatan terpadu untuk kedua mesin produksi (DeepSeek & AGY):
 * 1. Office -> DeepSeek & Antigravity (AGY):
 *    Menerima perintah `/buat-video` dari chat kantor dan meneruskannya serentak ke:
 *    - `~/.agent-office/engine-inbox/` (dibaca oleh DeepSeek & AGY, serta `publish-draft.mjs`)
 *    - `~/.agent-office/agy-inbox/` (dibaca oleh AGY Listener)
 *    - `naskah/active_orders.json` & `naskah/agy_active_orders.json`
 * 2. Persona Routing & AI Chat:
 *    Lumi (Scriptwriter), Ardi (Voiceover), Jeje (Editor), dan Nara (Assistant)
 *    menjawab secara cerdas dan luwes (menyapa "Kak Caca").
 */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import { exec, execFile } from 'node:child_process';
import { latestCompositionName } from './studio-compose.mjs';
import {
  parseEngineCommand,
  dispatchEngineOrder,
  describeEngine,
  switchEngine,
  listOrders,
} from './engine-command.mjs';
import { pingEngine } from './engines/index.mjs';

const PORT = process.env.AGENT_OFFICE_PORT || 3334;
const WORKSPACE = process.cwd();
const USER_HOME = os.homedir();
const OFFICE_HOME = process.env.AGENT_OFFICE_HOME || path.join(USER_HOME, '.agent-office');

const WIN_PYTHON = path.join(WORKSPACE, '.venv', 'Scripts', 'python.exe');
const UNIX_PYTHON = path.join(WORKSPACE, '.venv', 'bin', 'python');
function resolvePythonEnv() {
  const pyvenvCfg = path.join(WORKSPACE, '.venv', 'pyvenv.cfg');
  const venvSite = path.join(WORKSPACE, '.venv', 'Lib', 'site-packages');
  if (process.platform === 'win32' && fs.existsSync(pyvenvCfg) && fs.existsSync(venvSite)) {
    const cfg = fs.readFileSync(pyvenvCfg, 'utf8');
    const m = cfg.match(/^executable\s*=\s*(.+)$/m);
    const baseExe = m && m[1].trim();
    if (baseExe && fs.existsSync(baseExe)) {
      return { bin: baseExe, env: { ...process.env, PYTHONPATH: venvSite } };
    }
  }
  const bin = fs.existsSync(WIN_PYTHON) ? WIN_PYTHON : (fs.existsSync(UNIX_PYTHON) ? UNIX_PYTHON : 'python');
  return { bin, env: process.env };
}
const { bin: PYTHON_BIN, env: PYTHON_ENV } = resolvePythonEnv();
const AI_SERVICE_SCRIPT = path.join(WORKSPACE, 'scripts', 'ai-service.py');
const TTS_CLI_SCRIPT = path.join(WORKSPACE, 'scripts', 'tts-cli.py');

const LAST_CHAT_PATH = path.join(OFFICE_HOME, 'last-chat');
const AGY_INBOX_DIR = path.join(OFFICE_HOME, 'agy-inbox');
const ENGINE_INBOX_DIR = path.join(OFFICE_HOME, 'engine-inbox');
const AGY_ORDERS_FILE = path.join(WORKSPACE, 'naskah', 'agy_active_orders.json');
const INBOX_LOG_PATH = path.join(WORKSPACE, 'office-inbox.jsonl');
const NASKAH_DIR = path.join(WORKSPACE, 'naskah');

if (!fs.existsSync(NASKAH_DIR)) fs.mkdirSync(NASKAH_DIR, { recursive: true });
if (!fs.existsSync(AGY_INBOX_DIR)) fs.mkdirSync(AGY_INBOX_DIR, { recursive: true });
if (!fs.existsSync(ENGINE_INBOX_DIR)) fs.mkdirSync(ENGINE_INBOX_DIR, { recursive: true });

console.log('[NARA Studio Bridge] Unified Bridge (DeepSeek + AGY) active!');
console.log(`[NARA Studio Bridge] Office Port: ${PORT}`);
console.log(`[NARA Studio Bridge] Chat Hook: ${LAST_CHAT_PATH}`);
console.log(`[NARA Studio Bridge] Engine & AGY Inbox ready`);

// --- HTTP Helpers ---
function postJson(endpoint, data) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(data);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => resolve(body));
      }
    );
    req.on('error', () => resolve(null));
    req.write(payload);
    req.end();
  });
}

async function postOfficeChat(sender, text, role = 'assistant') {
  try {
    await postJson('/chat', { sender, text, role });
    console.log(`[Office Chat] ${sender} (${role}): ${text.slice(0, 80)}...`);
  } catch (err) {
    console.error('[Office Chat Error]', err);
  }
}

async function postOfficeEvent(event) {
  try {
    await postJson('/api/agent/event', event);
  } catch {}
}

// --- Chat Watcher ---
let lastProcessedTimestamp = 0;
let lastProcessedText = '';

if (fs.existsSync(LAST_CHAT_PATH)) {
  try {
    const initData = JSON.parse(fs.readFileSync(LAST_CHAT_PATH, 'utf8'));
    if (initData && initData.timestamp) {
      lastProcessedTimestamp = initData.timestamp;
      lastProcessedText = initData.text || '';
    }
  } catch {}
}

const BOT_SENDERS = ['nara', 'lumi', 'ardi', 'opi', 'jeje', 'system', 'render qa'];

async function processOfficeChat() {
  if (!fs.existsSync(LAST_CHAT_PATH)) return;

  let msg = null;
  try {
    const raw = fs.readFileSync(LAST_CHAT_PATH, 'utf8');
    msg = JSON.parse(raw);
  } catch {
    return;
  }

  if (!msg || !msg.text) return;

  if (msg.timestamp && msg.timestamp === lastProcessedTimestamp && msg.text === lastProcessedText) {
    return;
  }
  if (msg.timestamp && msg.timestamp < lastProcessedTimestamp) {
    return;
  }

  const sender = (msg.sender || '').trim();
  const rawText = String(msg.text || '');
  const text = rawText.trim();

  if (BOT_SENDERS.includes(sender.toLowerCase())) {
    return;
  }

  lastProcessedTimestamp = msg.timestamp || Date.now();
  lastProcessedText = text;

  console.log(`[NARA Bridge] Received from [${sender}]: "${text}"`);

  const logRecord = {
    id: msg.id,
    timestamp: new Date().toISOString(),
    sender,
    text,
    bridge: 'unified',
  };
  fs.appendFileSync(INBOX_LOG_PATH, JSON.stringify(logRecord) + '\n', 'utf8');

  dispatchOfficeCommand(sender, text, rawText);
}

async function dispatchOfficeCommand(sender, text, rawText = text) {
  const lower = text.toLowerCase().trim();

  // Ignore UI-only slash commands
  if (/^\/(screen|todo|tasks|settings|pengaturan|skills|hire|wardrobe|clear|clear-chat|clear-all|all-clear|the-office|theoffice|incident|help)(\s|$)/i.test(lower)) {
    return;
  }

  let attachedFilePath = '';
  const fileMatch = text.match(/📎\s*\[Lampiran:\s*([^|\]]+)\s*\|\s*([^\]]+)\]/);
  if (fileMatch) {
    attachedFilePath = fileMatch[2].trim();
  }

  const orderIntent = parseEngineCommand(rawText);

  const chip = (label, message) =>
    !message ||
    /[\r\n()[\]`]/.test(message) ||
    message.length > 320
      ? ''
      : `\n\n[${label}](action:${message})`;

  if (orderIntent.kind === 'send') {
    const outcome = await dispatchEngineOrder({ text: rawText, sender, directory: WORKSPACE });

    if (outcome.ok) {
      const order = outcome.order;
      const engineKey = outcome.result?.engine || order.engine;
      const engineLabels = {
        antigravity: 'Antigravity (AGY)',
        opencode: 'OpenCode',
        deepseek: 'DeepSeek',
      };
      const engineLabel = engineLabels[engineKey] || engineKey;
      await postOfficeChat('Nara',
        `Order diterima, Kak Caca! Diteruskan ke mesin produksi **${engineLabel}**.\n\n` +
        `Order id: \`${order.id}\` • ${order.chars} karakter, dikirim utuh tanpa dipotong.\n\n` +
        `Tim studio yang memproses akan melapor tiap tahap di sini. Render MP4 tetap menunggu approval Kak Caca di Papan ToDo.`,
        'assistant');
      await postOfficeEvent({
        type: 'agent_working',
        agent: { id: 'assistant-claude', name: 'Nara', role: 'assistant' },
        tool: 'studio:order',
        text: `Order ${order.id} diteruskan ke tim produksi`,
      });
      return;
    }

    if (outcome.kind === 'duplicate') {
      await postOfficeChat('Nara',
        'Order yang sama baru saja dikirim, Kak Caca. Aku tidak mengirim ulang supaya tidak dobel.\n\n' +
        'Kalau memang mau diulang, ubah sedikit teksnya (misal tambah "versi 2").',
        'assistant');
      return;
    }

    if (outcome.kind === 'rate_limited') {
      const seconds = Math.max(1, Math.ceil((outcome.retryInMs || 1000) / 1000));
      await postOfficeChat('Nara',
        `Order ditahan dulu ya Kak Caca — terlalu banyak dalam semenit. Coba lagi dalam ${seconds} detik.`,
        'assistant');
      return;
    }

    if (outcome.kind === 'busy') {
      await postOfficeChat('Nara',
        `Masih ada order yang sedang dikirim (\`${outcome.inFlight}\`). Tunggu sebentar ya Kak Caca, lalu kirim lagi.`,
        'assistant');
      return;
    }

    if (outcome.kind === 'engine_error') {
      await postOfficeChat('Nara',
        `Order tersimpan sebagai \`${outcome.order.id}\`, tapi ada kendala saat meneruskan ke inbox.\n\n` +
        `${outcome.error}`,
        'assistant');
      return;
    }

    await postOfficeChat('Nara',
      'Order belum terkirim, Kak Caca. Silakan coba kembali ya.',
      'assistant');
    return;
  }

  if (orderIntent.kind === 'typo') {
    const suggestion = orderIntent.suggestion || '';
    const shown = suggestion.length > 140 ? `${suggestion.slice(0, 140)}…` : suggestion;
    const hint = chip('Kirim order ini', suggestion)
      || `\n\nKetik ulang dengan awalan \`/buat-video\` supaya aku bisa mengirimnya.`;
    await postOfficeChat('Nara',
      `Maksud Kak Caca \`${shown}\` ya?\n\nAku belum mengirim apa pun.` + hint,
      'assistant');
    return;
  }

  if (orderIntent.kind === 'empty') {
    await postOfficeChat('Nara',
      'Perintah `/buat-video` diterima, tapi brief-nya masih kosong nih Kak Caca — belum ada yang aku kirim.\n\n' +
      'Contoh: `/buat-video` lalu tulis brief lengkapnya (topik, jumlah scene, durasi, gaya visual).',
      'assistant');
    return;
  }

  if (orderIntent.kind === 'too_long' || orderIntent.kind === 'invalid') {
    await postOfficeChat('Nara',
      `Order belum dikirim: ${orderIntent.reason}.\n\n` +
      'Aku tidak memotong brief Kak Caca. Ringkas sedikit, atau pecah jadi dua order ya.',
      'assistant');
    return;
  }

  if (orderIntent.kind === 'suggest') {
    const hint = chip('Jadikan order video', `/buat-video ${orderIntent.payload}`)
      || '\n\nAwali dengan `/buat-video` supaya aku bisa meneruskannya ke mesin produksi.';
    await postOfficeChat('Nara',
      'Sepertinya Kak Caca mau order video ya? Aku belum mengirim apa pun.' + hint,
      'assistant');
    return;
  }

  // `/engine` — inspect or switch the production machine from chat.
  if (/^\/engine(\s|$)/i.test(text)) {
    const wanted = text.replace(/^\/engine\s*/i, '').trim();

    if (/^inbox$/i.test(wanted)) {
      const orders = listOrders(5);
      const lines = orders.length
        ? orders.map((o) => `• \`${o.id}\` — ${o.status || '?'} • ${o.chars || '?'} karakter`).join('\n')
        : 'Belum ada order tersimpan.';
      await postOfficeChat('Nara', `**Kotak order terakhir:**\n\n${lines}`, 'assistant');
      return;
    }

    if (!wanted || /^(status|cek)$/i.test(wanted)) {
      const info = describeEngine();
      const ping = await pingEngine();
      const clean = (value) => String(value || '').replace(/[.\s]+$/, '');
      const health = ping.ok
        ? `siap${ping.detail ? ` — ${clean(ping.detail)}` : ''}`
        : `belum siap — ${clean(ping.error)}`;
      const label = { antigravity: 'Antigravity (AGY)', opencode: 'OpenCode', deepseek: 'DeepSeek' }[info.active] || info.active;
      await postOfficeChat('Nara',
        `**Mesin produksi aktif:** ${label} (${health})\n\n` +
        `Pilihan: ${info.available.filter((key) => key !== 'none').join(', ')}\n` +
        `Engine Inbox: \`${ENGINE_INBOX_DIR}\`\n` +
        `AGY Inbox: \`${AGY_INBOX_DIR}\`\n\n` +
        `Ganti mesin: \`/engine deepseek\` atau \`/engine agy\`. ` +
        `Kirim order dengan \`/buat-video <topik>\`.`,
        'assistant');
      return;
    }

    const switched = await switchEngine(wanted);
    if (!switched.ok) {
      await postOfficeChat('Nara', switched.error, 'assistant');
      return;
    }
    await postOfficeChat('Nara',
      `Mesin produksi sekarang **${switched.active}**.`,
      'assistant');
    return;
  }

  // Progress & Status Query
  if (/\b(sampai mana|proses|progres|progress|status tugas|status proyek|update kerjaan|laporan)\b/i.test(lower)) {
    let tasksSummary = '';
    const tasksPath = path.join(WORKSPACE, 'naskah', 'active_tasks.json');
    if (fs.existsSync(tasksPath)) {
      try {
        const tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf8'));
        const done = tasks.filter(t => t.status === 'done');
        const inProg = tasks.filter(t => t.status === 'in_progress');
        const todo = tasks.filter(t => t.status === 'todo');
        const projectTitle = done[0]?.subject || inProg[0]?.subject || 'Proyek Video Studio NARA';
        tasksSummary = `📊 **LAPORAN PROGRES STUDIO NARA (Kak Caca):**\n\n` +
          `🎬 **Proyek Aktif:** ${projectTitle}\n` +
          `✅ **Selesai (${done.length}):**\n${done.map(t => `  - [${t.owner}] ${t.subject}`).join('\n') || '  - (Belum ada)'}\n\n` +
          `⚡ **Sedang Berjalan (${inProg.length}):**\n${inProg.map(t => `  - [${t.owner}] ${t.subject}`).join('\n') || '  - (Belum ada)'}\n\n` +
          `⏳ **Tahap Berikutnya (${todo.length}):**\n${todo.map(t => `  - [${t.owner}] ${t.subject}`).join('\n') || '  - (Belum ada)'}\n\n` +
          `💡 *Bisa dilihat detailnya di Papan Tugas (ToDo) & Screening Room!*\n\n` +
          `[📋 Buka Papan Tugas](/todo) [🎬 Buka Screening Room](/screen) [⚙️ Pengaturan](/settings)`;
      } catch {}
    }

    if (tasksSummary) {
      await postOfficeChat('Nara', tasksSummary, 'assistant');
      return;
    }
  }

  // Voiceover Action (/vo)
  if (lower.startsWith('/vo') || (lower.includes('opi') && (lower.includes('buatkan vo') || lower.includes('rekam suara')))) {
    await postOfficeEvent({
      type: 'agent_working',
      agent: { id: 'opi-vo', name: 'Ardi', role: 'voiceover' },
      tool: 'edge_tts',
      text: 'Merekam voiceover dengan Edge-TTS...',
    });

    let speechText = text
      .replace(/^\/vo\s*/i, '')
      .replace(/^opi\s*[,:]?\s*/i, '')
      .replace(/tolong\s+(buatkan|rekam)\s+(vo|audio|suara)\s*[:]?\s*/i, '')
      .trim();

    if (!speechText) {
      speechText = 'Halo semuanya! Ini Ardi dari studio NARA. Audio Edge-TTS siap digunakan!';
    }

    const timestamp = Date.now();
    const outputPath = path.join(WORKSPACE, 'public', 'audio', `office_vo_${timestamp}.mp3`);

    execFile(PYTHON_BIN, [TTS_CLI_SCRIPT, '--text', speechText, '--output', outputPath], { env: PYTHON_ENV }, async (err) => {
      if (err) {
        await postOfficeChat('Ardi', `Maaf Kak Caca, rekaman audio gagal: ${err.message}`, 'voiceover');
      } else {
        await postOfficeChat('Ardi', `🎙️ Siap Kak Caca! Voiceover selesai direkam: "${speechText.slice(0, 50)}..."\n\n` +
          `[🎬 Screening Room](/screen) [🎬 Render Video Jeje](/render) [📋 Cek ToDo](/todo)`, 'voiceover');
        await postOfficeEvent({
          type: 'agent_completed',
          agentId: 'opi-vo',
          result: 'VO Generated successfully',
        });
      }
    });
    return;
  }

  // Remotion Render Action (/render)
  if (lower.startsWith('/render') || (lower.includes('jeje') && (lower.includes('render video') || lower.includes('export mp4')))) {
    await postOfficeEvent({
      type: 'agent_working',
      agent: { id: 'jeje-edit', name: 'Jeje', role: 'video-editor' },
      tool: 'remotion:render',
      text: 'Merender video Remotion MP4...',
    });

    await postOfficeChat('Jeje', '🎬 Siap Kak Caca! Jeje mulai proses rendering Remotion MP4...', 'video-editor');

    const outDir = path.join(WORKSPACE, 'out');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const compArg = text.replace(/^\/render\s*/i, '').trim() || latestCompositionName();
    const safeComp = compArg.replace(/[^a-zA-Z0-9_-]/g, '') || latestCompositionName();
    const outFile = path.join(outDir, `${safeComp}.mp4`);

    exec(`npx remotion render src/remotion/index.ts ${safeComp} "${outFile}" --gl=angle`, async (err) => {
      if (err) {
        await postOfficeChat('Jeje', `Waduh Kak Caca, render gagal: ${err.message}`, 'video-editor');
      } else {
        await postOfficeChat('Jeje', `✅ Render MP4 ${safeComp} selesai 100%! Tersimpan di out/${safeComp}.mp4.\n\n` +
          `[🎬 Tonton di Screening Room](/screen) [📋 Update ToDo](/todo)`, 'video-editor');
        await postOfficeEvent({
          type: 'agent_completed',
          agentId: 'jeje-edit',
          result: 'Render completed',
        });
      }
    });
    return;
  }

  // Script Creation Action (/script)
  if (lower.startsWith('/script') || (lower.includes('lumi') && (lower.includes('buatkan naskah') || lower.includes('buat skrip')))) {
    await postOfficeEvent({
      type: 'agent_working',
      agent: { id: 'lumi-script', name: 'Lumi', role: 'scriptwriter' },
      tool: 'nara_director:script',
      text: 'Menyusun naskah video sinematik Anti-PPT...',
    });

    let topic = text
      .replace(/^lumi\s*[,:]?\s*/i, '')
      .replace(/buatkan\s+(naskah|skrip|cerita)\s*(tentang)?\s*/i, '')
      .trim();
    if (!topic) topic = 'Pemanasan Global & Dampak Ekosistem';

    const naskahContent = `# 🎬 NASKAH VIDEO EKSPLAINER: ${topic.toUpperCase()}
Dibuat oleh: Lumi (NARA Studio Scriptwriter)
Format: 16:9 / 60 FPS Anti-PPT Kinetic Motion

---

## SCENE 1: THE COLD HOOK (00:00 - 00:04)
- **Visual:** Latar bergerak partikel dinamis, teks kinetik tipografi tebal.
- **Voiceover:** "Bumi sedang mengirim sinyal darurat yang paling sering diabaikan manusia."
- **SFX:** Low cinematic boom + sound whoosh.

## SCENE 2: THE PROBLEM (00:04 - 00:08)
- **Visual:** Perubahan skala grafik ekstrem, warna beralih dari biru dingin ke merah membara.
- **Voiceover:** "Dalam hitungan dekade, apa yang dulunya kokoh abadi kini mencair di depan mata."
- **SFX:** Retakan es dramatis.

## SCENE 3: THE TURNING POINT (00:08 - 00:12)
- **Visual:** Peta topografi 3D dengan visualisasi aliran krisis menuju miliaran populasi.
- **Voiceover:** "Bukan hanya puncak es yang hilang, tapi sumber kehidupan seluruh peradaban."
- **SFX:** Ambient wind howl.

## SCENE 4: CLIMAX & CALL TO ACTION (00:12 - 00:15)
- **Visual:** Tipografi besar berdenyut dengan countdown kinetik.
- **Voiceover:** "Waktu terus berputar. Apakah kita akan bertindak, atau hanya menonton dunia terbakar?"
- **SFX:** Climax riser drop.
`;

    const naskahFile = path.join(NASKAH_DIR, 'latest_naskah.md');
    fs.writeFileSync(naskahFile, naskahContent, 'utf8');

    await postOfficeChat('Lumi', `✍️ Naskah "${topic}" selesai dibuat, Kak Caca! Tersimpan di naskah/latest_naskah.md.\n\nLangkah berikutnya:\n` +
      `[🎙️ Rekam Voiceover Ardi](/vo) [🎬 Render Video Jeje](/render) [📋 Cek ToDo](/todo) [🎬 Screening](/screen)`, 'scriptwriter');
    await postOfficeEvent({
      type: 'agent_completed',
      agentId: 'lumi-script',
      result: 'Script completed',
    });
    return;
  }

  // General Persona Routing
  const isLumi = lower.includes('lumi') ||
    /\b(naskah|skrip|script|cerita|ide|konsep|sinopsis|plot|karakter|buku|tulisan|penulis|riset)\b/i.test(lower);

  const isOpi = (lower.includes('ardi') || lower.includes('opi')) ||
    /\b(suara|audio|vo|voice|voiceover|dubbing|rekam|musik|sound|soundtrack|lagu|artikulasi|vokal|bicara)\b/i.test(lower);

  const isJeje = lower.includes('jeje') ||
    /\b(video|render|editing|editor|remotion|animasi|motion|timeline|visual|mp4|fps|frame|grafis|cut)\b/i.test(lower);

  const isNara = lower.includes('nara') ||
    /\b(asisten|jadwal|tugas|koordinasi|agenda|todo|papan|proyek|project|strategi)\b/i.test(lower);

  const isBroadcast = /\b(semua|tim|kalian|halo|hai|selamat|pagi|siang|malam|guys|team|everyone|kabar|standby|ngapain)\b/i.test(lower);

  let persona = 'nara';
  let targetName = 'Nara';
  let targetRole = 'assistant';
  let targetId = 'assistant-claude';

  if (isLumi && !isOpi && !isJeje) {
    persona = 'lumi';
    targetName = 'Lumi';
    targetRole = 'scriptwriter';
    targetId = 'lumi-script';
  } else if (isOpi && !isLumi && !isJeje) {
    persona = 'opi';
    targetName = 'Ardi';
    targetRole = 'voiceover';
    targetId = 'opi-vo';
  } else if (isJeje && !isLumi && !isOpi) {
    persona = 'jeje';
    targetName = 'Jeje';
    targetRole = 'video-editor';
    targetId = 'jeje-edit';
  } else if (!isNara && !isBroadcast) {
    const roster = [
      { persona: 'nara', name: 'Nara', role: 'assistant', id: 'assistant-claude' },
      { persona: 'lumi', name: 'Lumi', role: 'scriptwriter', id: 'lumi-script' },
      { persona: 'opi', name: 'Ardi', role: 'voiceover', id: 'opi-vo' },
      { persona: 'jeje', name: 'Jeje', role: 'video-editor', id: 'jeje-edit' },
    ];
    global.__rosterIndex = ((global.__rosterIndex || 0) + 1) % roster.length;
    const chosen = roster[global.__rosterIndex];
    persona = chosen.persona;
    targetName = chosen.name;
    targetRole = chosen.role;
    targetId = chosen.id;
  }

  await postOfficeEvent({
    type: 'agent_working',
    agent: { id: targetId, name: targetName, role: targetRole },
    tool: 'ai_brain',
    text: `${targetName} sedang berpikir...`,
  });

  const aiArgs = [AI_SERVICE_SCRIPT, '--prompt', text, '--persona', persona];
  if (attachedFilePath && fs.existsSync(attachedFilePath)) {
    aiArgs.push('--file', attachedFilePath);
  }

  execFile(PYTHON_BIN, aiArgs, { timeout: 50000, windowsHide: true, maxBuffer: 4 * 1024 * 1024, env: PYTHON_ENV }, async (err, stdout) => {
    let reply = (stdout || '').trim();
    if (!reply || err) {
      reply = generateNaturalReply(targetName, targetRole, text);
    }

    await postOfficeChat(targetName, reply, targetRole);
    await postOfficeEvent({
      type: 'agent_completed',
      agentId: targetId,
      result: 'standby menunggu tugas',
    });

    if (isBroadcast) {
      const chimes = [
        { name: 'Lumi', role: 'scriptwriter', id: 'lumi-script', text: '✍️ Lumi standby di meja naskah! Lagi asyik ngulik naskah nih, Kak Caca! Siap racik konsep seru kapan pun kamu butuh!' },
        { name: 'Ardi', role: 'voiceover', id: 'opi-vo', text: '🎙️ Ardi mic sudah on! Siap rekam voiceover Edge-TTS kapan saja Kak Caca butuhkan!' },
        { name: 'Jeje', role: 'video-editor', id: 'jeje-edit', text: '🎬 Jeje timeline ready! Siap render Remotion MP4 kapan pun naskah & audio siap!' },
      ];
      const chime = chimes[Math.floor(Math.random() * chimes.length)];
      setTimeout(async () => {
        await postOfficeChat(chime.name, chime.text, chime.role);
      }, 1800);
    }
  });
}

setInterval(processOfficeChat, 600);

console.log('[NARA Studio Bridge] Persona routing & unified order courier active!');
