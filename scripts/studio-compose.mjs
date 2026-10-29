/**
 * studio-compose.mjs — turns a topic into a renderable Remotion draft.
 *
 * The chat flow ("buatkan video <topik>") used to stop at naskah/latest_naskah.md
 * and never produced a composition, so there was nothing to render. This module
 * closes that gap:
 *
 *   spec  ->  public/audio/vo/<comp>/scene-N.mp3   (Opi, Edge-TTS)
 *          ->  src/remotion/compositions/<CompName>.tsx
 *          ->  src/remotion/registry.ts (regenerated, static imports)
 *          ->  naskah/latest_naskah.md
 *
 * Scene text comes from the studio's own AI service (Lumi, scripts/ai-service.py)
 * when it answers with usable JSON; otherwise a deterministic 8-scene template
 * is used, so the pipeline never dead-ends offline.
 *
 * Audio is measured, not guessed: each scene's narration is synthesised first,
 * its real length is read back (ffprobe, falling back to Edge-TTS boundary
 * metadata), and the scene's frame count is derived from that length. So the
 * voiceover can never drift out of sync with the visuals, and a silent draft is
 * no longer produced by accident.
 *
 * CLI:
 *   node scripts/studio-compose.mjs --topic "manfaat buah jeruk"
 *   node scripts/studio-compose.mjs --topic "..." --no-audio
 *   node scripts/studio-compose.mjs --spec ./spec.json
 */
import fs from 'fs'
import path from 'path'
import { execFile } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const WORKSPACE = path.resolve(__dirname, '..')
const COMPOSITIONS_DIR = path.join(WORKSPACE, 'src', 'remotion', 'compositions')
const REGISTRY_PATH = path.join(WORKSPACE, 'src', 'remotion', 'registry.ts')
const NASKAH_PATH = path.join(WORKSPACE, 'naskah', 'latest_naskah.md')
const AI_SERVICE = path.join(WORKSPACE, 'scripts', 'ai-service.py')
const PYTHON_BIN = fs.existsSync(path.join(WORKSPACE, '.venv', 'Scripts', 'python.exe'))
  ? path.join(WORKSPACE, '.venv', 'Scripts', 'python.exe')
  : fs.existsSync(path.join(WORKSPACE, '.venv', 'bin', 'python'))
    ? path.join(WORKSPACE, '.venv', 'bin', 'python')
    : 'python'

const PALETTE = ['#FF8A1F', '#FFC24B', '#B7E04A', '#FF6B3D', '#FFB020', '#FF9F1C', '#7BC96F', '#FF5C00']

export function slugify(text) {
  return String(text || 'video')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'video'
}

export function compNameFromTopic(topic) {
  const words = String(topic || 'Video')
    .replace(/[^a-zA-Z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
  const name = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('')
  return /^[A-Za-z]/.test(name) ? name : `Video${name}`
}

/** Deterministic 8-scene skeleton, used when the AI service is unavailable. */
function templateScenes(topic) {
  const t = String(topic || 'topik ini')
  return [
    { kicker: 'Pembuka', headline: t, body: `Yang jarang dibahas soal ${t}.`, accent: PALETTE[0] },
    { kicker: 'Kenapa Penting', headline: 'Ini Bukan Hal Kecil', body: `Dampaknya terasa jauh lebih besar dari yang kita kira.`, accent: PALETTE[1] },
    { kicker: 'Fakta 01', headline: 'Fakta Pertama', body: `Data dan riset menunjukkan hal yang berbeda dari anggapan umum.`, accent: PALETTE[2] },
    { kicker: 'Fakta 02', headline: 'Fakta Kedua', body: `Poin ini yang paling sering terlewat saat orang membahas ${t}.`, accent: PALETTE[3] },
    { kicker: 'Fakta 03', headline: 'Fakta Ketiga', body: `Efeknya bertumpuk dan baru terasa setelah rutin dilakukan.`, accent: PALETTE[4] },
    { kicker: 'Miskonsepsi', headline: 'Jangan Salah Paham', body: `Banyak orang berhenti di satu asumsi yang tidak lengkap.`, accent: PALETTE[5] },
    { kicker: 'Langkah Praktis', headline: 'Mulai Hari Ini', body: `Satu langkah kecil, dilakukan konsisten, lebih kuat dari rencana besar.`, accent: PALETTE[6] },
    { kicker: 'Penutup', headline: 'Siap Mulai?', body: `Simpan video ini dan bagikan ke orang yang perlu tahu.`, accent: PALETTE[7] },
  ]
}

function runPython(args, timeout = 90_000) {
  return new Promise((resolve) => {
    execFile(PYTHON_BIN, args, { cwd: WORKSPACE, timeout, maxBuffer: 4 * 1024 * 1024 }, (err, stdout) => {
      resolve(err ? '' : String(stdout || ''))
    })
  })
}

// ---------------------------------------------------------------------------
// Audio track: Opi's narration (Edge-TTS) + a small SFX library
// ---------------------------------------------------------------------------

const AUDIO_DIR = path.join(WORKSPACE, 'public', 'audio')
const VO_DIR = path.join(AUDIO_DIR, 'vo')
const SFX_DIR = path.join(AUDIO_DIR, 'sfx')
const TTS_CLI = path.join(WORKSPACE, 'scripts', 'tts-cli.py')
const SFX_SCRIPT = path.join(WORKSPACE, 'scripts', 'generate-sfx-library.py')
export const DEFAULT_VOICE = 'id-ID-ArdiNeural'
export const SFX_NAMES = ['whoosh', 'riser', 'impact', 'tick']

/** Breathing room around the narration inside a scene, in seconds. */
const VO_LEAD_SEC = 0.35
const VO_TAIL_SEC = 0.55
const MIN_SCENE_SEC = 2.6

/** Run an executable with argv (no shell quoting traps) and never throw. */
function runFile(file, args, timeout = 60_000) {
  return new Promise((resolve) => {
    execFile(file, args, { cwd: WORKSPACE, timeout, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({ ok: !err, stdout: String(stdout || ''), stderr: String(stderr || ''), error: err })
    })
  })
}

/** ffprobe from Remotion's own compositor package, or from PATH. */
function ffprobeBinary() {
  if (process.env.FFPROBE && fs.existsSync(process.env.FFPROBE)) return process.env.FFPROBE
  const platform =
    process.platform === 'win32' ? 'win32-x64-msvc'
      : process.platform === 'darwin' ? (process.arch === 'arm64' ? 'darwin-arm64' : 'darwin-x64')
        : 'linux-x64-gnu'
  const bundled = path.join(
    WORKSPACE,
    'node_modules',
    '@remotion',
    `compositor-${platform}`,
    process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe'
  )
  return fs.existsSync(bundled) ? bundled : 'ffprobe'
}

/** Real length of an audio file, in seconds; null when it cannot be measured. */
export async function probeAudioSeconds(file) {
  if (!fs.existsSync(file)) return null
  const result = await runFile(
    ffprobeBinary(),
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file],
    20_000
  )
  if (!result.ok) return null
  const value = Number.parseFloat(result.stdout.trim())
  return Number.isFinite(value) && value > 0 ? value : null
}

/**
 * Record one narration line with Edge-TTS.
 * Returns { file, duration } where duration comes from ffprobe (exact file
 * length) or Edge-TTS boundary metadata (spoken length), or null on failure.
 */
export async function synthesizeVoice(text, output, voice = DEFAULT_VOICE) {
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.rmSync(output, { force: true })

  const result = await runFile(
    PYTHON_BIN,
    [TTS_CLI, '--text', text, '--output', output, '--voice', voice],
    60_000
  )
  if (!result.ok) return null

  const lastLine = result.stdout.trim().split(/\r?\n/).filter(Boolean).pop()
  let reported = 0
  try {
    const parsed = JSON.parse(lastLine || '{}')
    if (parsed?.ok === false) return null
    reported = Number(parsed.duration) || 0
  } catch {
    reported = 0
  }

  const duration = (await probeAudioSeconds(output)) || reported
  if (!duration) return null
  return { file: output, duration }
}

/** Build the four WAV files once; false means "render without SFX". */
export async function ensureSfxLibrary() {
  const present = () => SFX_NAMES.every((name) => fs.existsSync(path.join(SFX_DIR, `${name}.wav`)))
  if (present()) return true
  const result = await runFile(PYTHON_BIN, [SFX_SCRIPT], 60_000)
  return result.ok && present()
}

/** Opening hit, whooshes on scene changes, riser into the closing card. */
function sfxForScene(index, total) {
  if (index === 0) return 'impact'
  if (index === total - 1) return 'riser'
  return 'whoosh'
}

/** Narration line for a scene: the body, with the headline as a fallback. */
function narrationFor(scene) {
  const body = String(scene?.body || '').trim()
  const headline = String(scene?.headline || '').trim()
  const text = body.split(/\s+/).filter(Boolean).length >= 3 ? body : `${headline}. ${body}`.trim()
  return /[.!?]$/.test(text) ? text : `${text}.`
}

/**
 * Record every scene, measure it, and derive the scene's frame count from the
 * audio. This is where "sinkron" is enforced: the visuals follow the voice, not
 * a fixed 4-second guess.
 */
export async function buildAudioTrack({
  compName,
  scenes,
  fps = 30,
  secondsPerScene = 4,
  voice = DEFAULT_VOICE,
  sfx = true,
  report = () => {},
}) {
  const slug = slugify(compName)
  const outDir = path.join(VO_DIR, slug)
  fs.mkdirSync(outDir, { recursive: true })

  const sfxReady = sfx ? await ensureSfxLibrary() : false
  const timings = []
  let generated = 0
  let failed = 0

  for (let i = 0; i < scenes.length; i += 1) {
    const rel = `audio/vo/${slug}/scene-${i + 1}.mp3`
    const outFile = path.join(WORKSPACE, 'public', rel)
    report({
      stage: 'voiceover',
      percent: 34 + Math.round(((i + 1) / scenes.length) * 30),
      message: `Ardi merekam VO scene ${i + 1}/${scenes.length} (${voice})`,
    })

    const clip = await synthesizeVoice(narrationFor(scenes[i]), outFile, voice)
    if (clip) generated += 1
    else failed += 1

    const seconds = clip
      ? Math.max(MIN_SCENE_SEC, clip.duration + VO_LEAD_SEC + VO_TAIL_SEC)
      : secondsPerScene

    timings.push({
      frames: Math.max(1, Math.round(seconds * fps)),
      seconds,
      audio: clip ? rel : null,
      voiceSeconds: clip ? Number(clip.duration.toFixed(3)) : null,
      sfx: sfxReady ? sfxForScene(i, scenes.length) : null,
    })
  }

  if (sfxReady) {
    report({
      stage: 'sfx',
      percent: 72,
      message: `SFX transisi siap (${SFX_NAMES.join(', ')})`,
    })
  }

  report({
    stage: 'mix',
    percent: 78,
    message:
      generated === scenes.length
        ? `VO ${generated}/${scenes.length} scene + SFX tersinkron ke timeline`
        : generated > 0
          ? `VO ${generated}/${scenes.length} scene tersinkron, sisanya tanpa narasi`
          : 'VO tidak tersedia - draf tetap dibuat, tapi belum bersuara',
  })

  const totalFrames = timings.reduce((sum, item) => sum + item.frames, 0)
  let cursor = 0
  const manifest = {
    compName,
    voice,
    sfx: sfxReady,
    fps,
    totalSeconds: Number((totalFrames / fps).toFixed(2)),
    scenes: timings.map((item, i) => {
      const row = {
        index: i + 1,
        startSec: Number((cursor / fps).toFixed(2)),
        seconds: Number(item.seconds.toFixed(2)),
        frames: item.frames,
        audio: item.audio,
        voiceSeconds: item.voiceSeconds,
        sfx: item.sfx,
      }
      cursor += item.frames
      return row
    }),
  }
  const manifestFile = path.join(outDir, 'mix.json')
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8')

  return {
    timings,
    totalFrames,
    voice,
    sfx: sfxReady,
    voiceGenerated: generated,
    voiceFailed: failed,
    manifestFile,
  }
}

/** Ask Lumi for the eight scenes; returns null when the answer is unusable. */
export async function generateScenesWithAI(topic) {
  const prompt = [
    `Buat naskah video explainer pendek tentang: "${topic}".`,
    'Balas HANYA dengan JSON array berisi tepat 8 objek, tanpa penjelasan, tanpa markdown.',
    'Setiap objek: {"kicker":"2-3 kata","headline":"3-6 kata tebal","body":"1 kalimat 12-20 kata"}.',
    'Gunakan Bahasa Indonesia. headline harus spesifik dan faktual tentang topik, bukan kalimat generik.',
    'Alur: hook, kenapa penting, tiga fakta, satu miskonsepsi, langkah praktis, penutup.',
  ].join('\n')

  const raw = await runPython([AI_SERVICE, '--prompt', prompt, '--persona', 'lumi'])
  if (!raw.trim()) return null
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')
  if (start === -1 || end <= start) return null
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1))
    if (!Array.isArray(parsed) || parsed.length !== 8) return null
    const scenes = parsed.map((item, i) => ({
      kicker: String(item?.kicker || `Bagian ${i + 1}`).slice(0, 40),
      headline: String(item?.headline || '').slice(0, 90),
      body: String(item?.body || '').slice(0, 220),
      accent: PALETTE[i % PALETTE.length],
    }))
    if (scenes.some((s) => !s.headline || !s.body)) return null
    return scenes
  } catch {
    return null
  }
}

/** Escape a value for embedding in generated TSX source. */
const str = (value) => JSON.stringify(String(value))

function sceneSource(scenes, timings) {
  return scenes
    .map((s, i) => {
      const timing = timings?.[i]
      const extra = []
      if (timing?.frames) extra.push(`    durationInFrames: ${timing.frames},`)
      if (timing?.audio) extra.push(`    audio: ${str(timing.audio)},`)
      if (timing?.sfx) extra.push(`    sfx: ${str(timing.sfx)},`)
      const tail = extra.length ? `\n${extra.join('\n')}` : ''
      return `  {\n    kicker: ${str(s.kicker)},\n    headline: ${str(s.headline)},\n    body: ${str(s.body)},\n    accent: ${str(s.accent)},${tail}\n  },`
    })
    .join('\n')
}

/**
 * Read the scene list back out of a file this generator wrote. Used only to add
 * audio to an older silent draft; hand-written files are never touched.
 */
function readGeneratedScenes(source) {
  if (!source.includes('generated by scripts/studio-compose.mjs') && !source.includes('generated by scripts/bang-motion-compose.mjs')) return []
  const re =
    /kicker:\s*("(?:[^"\\]|\\.)*"),\s*headline:\s*("(?:[^"\\]|\\.)*"),\s*body:\s*("(?:[^"\\]|\\.)*"),\s*accent:\s*("(?:[^"\\]|\\.)*")/g
  const scenes = []
  let match
  while ((match = re.exec(source))) {
    try {
      scenes.push({
        kicker: JSON.parse(match[1]),
        headline: JSON.parse(match[2]),
        body: JSON.parse(match[3]),
        accent: JSON.parse(match[4]),
      })
    } catch {
      return []
    }
  }
  return scenes
}

/** Write <CompName>.tsx for this spec. */
export function writeCompositionFile(spec) {
  if (!fs.existsSync(COMPOSITIONS_DIR)) fs.mkdirSync(COMPOSITIONS_DIR, { recursive: true })
  const {
    compName,
    id,
    title,
    scenes,
    fps = 30,
    secondsPerScene = 4,
    width = 1080,
    height = 1920,
    order = 10,
    sceneTimings,
    audioMeta,
  } = spec
  const frames = sceneTimings?.length
    ? sceneTimings.reduce((sum, item) => sum + item.frames, 0)
    : Math.round(scenes.length * secondsPerScene * fps)
  const file = path.join(COMPOSITIONS_DIR, `${compName}.tsx`)

  const source = `/**
 * ${compName} — generated by scripts/studio-compose.mjs
 * Topic: ${title}
 * Regenerate instead of hand-editing; the scene list below is the source of truth.
 */
import React from 'react'
import { BangMotionVideo, type BangMotionScene } from '../BangMotionVideo'

export const compositionMeta = {
  id: ${str(id)},
  compName: ${str(compName)},
  title: ${str(title)},
  duration: ${(frames / fps).toFixed(2)},
  frames: ${frames},
  fps: ${fps},
  width: ${width},
  height: ${height},
  order: ${order},${audioMeta ? `\n  audio: ${JSON.stringify(audioMeta)},` : ''}
}

const scenes: BangMotionScene[] = [
${sceneSource(scenes, sceneTimings)}
]

export const ${compName}: React.FC = () => (
  <BangMotionVideo scenes={scenes} brand="NARA STUDIO" tagline="Virtual Video Production" />
)
`
  fs.writeFileSync(file, source, 'utf8')
  return { file, frames }
}

/**
 * Regenerate src/remotion/registry.ts from the files on disk.
 *
 * Root.tsx must not use import.meta.glob: the Remotion CLI bundles with webpack,
 * where that Vite-only helper throws "{}.glob is not a function" and every render
 * dies before the first frame.
 */
export function regenerateRegistry() {
  const entries = fs.existsSync(COMPOSITIONS_DIR)
    ? fs.readdirSync(COMPOSITIONS_DIR).filter((f) => f.endsWith('.tsx'))
    : []

  const comps = []
  for (const file of entries) {
    const source = fs.readFileSync(path.join(COMPOSITIONS_DIR, file), 'utf8')
    const compName = /compName:\s*['"]([A-Za-z0-9_]+)['"]/.exec(source)?.[1]
    const id = /id:\s*['"]([^'"]+)['"]/.exec(source)?.[1]
    if (!compName || !id) continue
    const orderMatch = /order:\s*(-?\d+)/.exec(source)
    comps.push({ file, compName, id, order: orderMatch ? Number(orderMatch[1]) : 50 })
  }

  comps.sort((a, b) => a.order - b.order || a.compName.localeCompare(b.compName))

  const imports = comps
    .map((c, i) => `import { compositionMeta as meta${i}, ${c.compName} } from './compositions/${c.file.replace(/\.tsx$/, '')}'`)
    .join('\n')
  const items = comps
    .map((c, i) => `  { meta: meta${i}, component: ${c.compName} },`)
    .join('\n')

  const source = `/**
 * registry.ts — statically registered Remotion compositions.
 *
 * GENERATED by scripts/studio-compose.mjs; re-run the generator after
 * adding or removing a composition. A static list is required: the Remotion CLI
 * bundles with webpack, which has no import.meta.glob.
 */
import type { ComponentType } from 'react'
${imports || '// (no compositions yet)'}

export interface RegisteredComposition {
  meta: {
    id: string
    compName: string
    title?: string
    duration?: number
    frames?: number
    fps?: number
    width?: number
    height?: number
    order?: number
  }
  component: ComponentType<Record<string, unknown>>
}

export const compositions: RegisteredComposition[] = [${
    items ? `\n${items}\n` : ''
  }]
`
  fs.writeFileSync(REGISTRY_PATH, source, 'utf8')
  return comps
}

/** Write naskah/latest_naskah.md so the script and the video stay in step. */
export function writeNaskah(spec) {
  const { title, scenes, secondsPerScene = 4, sceneTimings } = spec
  const lines = [
    `# 🍊 NASKAH VIDEO EKSPLAINER: ${String(title).toUpperCase()}`,
    `Dibuat oleh: Lumi (NARA Studio Scriptwriter)`,
    `Standar: Bang-Motion Anti-PPT (Living Background, Kinetic Typography, 8 Scene)`,
    sceneTimings?.length
      ? `Audio: Ardi (Edge-TTS ${spec.audioMeta?.voice || DEFAULT_VOICE}) + SFX transisi. Durasi scene mengikuti panjang VO.`
      : 'Audio: (draf ini belum bersuara)',
    '',
    '---',
    '',
  ]
  const fmt = (value) => {
    const total = Math.max(0, Math.round(value))
    const minutes = Math.floor(total / 60)
    const seconds = total % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  scenes.forEach((scene, i) => {
    const timing = sceneTimings?.[i]
    const start = sceneTimings
      ? sceneTimings.slice(0, i).reduce((sum, item) => sum + item.seconds, 0)
      : i * secondsPerScene
    const end = start + (timing?.seconds ?? secondsPerScene)
    lines.push(`## SCENE ${i + 1}: ${String(scene.kicker).toUpperCase()} (${fmt(start)} - ${fmt(end)})`)
    lines.push(`- **Headline:** ${scene.headline}`)
    lines.push(`- **Visual:** Tipografi kinetik + living background, aksen ${scene.accent}.`)
    const audioNote = timing?.audio
      ? ` (\`${timing.audio}\`, ${timing.voiceSeconds}s VO + SFX ${timing.sfx || '-'})`
      : ''
    lines.push(`- **Voiceover:** "${scene.body}"${audioNote}`)
    lines.push('')
  })

  fs.mkdirSync(path.dirname(NASKAH_PATH), { recursive: true })
  fs.writeFileSync(NASKAH_PATH, lines.join('\n'), 'utf8')
  return NASKAH_PATH
}

/** Name of the composition most recently written to disk (fallback for /render). */
export function latestCompositionName() {
  if (!fs.existsSync(COMPOSITIONS_DIR)) return 'MainVideo'
  const files = fs
    .readdirSync(COMPOSITIONS_DIR)
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => ({ f, mtime: fs.statSync(path.join(COMPOSITIONS_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
  if (files.length === 0) return 'MainVideo'
  const source = fs.readFileSync(path.join(COMPOSITIONS_DIR, files[0].f), 'utf8')
  return /compName:\s*['"]([A-Za-z0-9_]+)['"]/.exec(source)?.[1] || 'MainVideo'
}

/**
 * The whole package: composition file, registry entry, script.
 * `useAI` asks Lumi first and falls back to the template silently.
 */
export async function buildVideoPackage(topic, options = {}) {
  const {
    useAI = true,
    secondsPerScene = 4,
    fps = 30,
    width = 1080,
    height = 1920,
    onStage,
    audio = true,
    voice = DEFAULT_VOICE,
    sfx = true,
  } = options
  const cleanTopic = String(topic || '').trim() || 'Video NARA Studio'
  const compName = compNameFromTopic(cleanTopic)
  // The chat bridge forwards each step to the office footer. A callback here
  // keeps this module free of HTTP details and usable from the CLI.
  const report = (patch) => {
    if (typeof onStage !== 'function') return
    try { onStage({ ...patch, topic: cleanTopic, compositionId: compName }) } catch (_) {}
  }

  // Never overwrite a draft that already exists for this topic: the boss (or an
  // agent) may have refined it by hand. Delete it in the Screening Room first if
  // a fresh generation is really wanted.
  //
  // One exception: drafts written by this generator before audio existed get
  // their voiceover added in place. Those files are ours (the header says so),
  // and the boss asked for a preview that already has picture + VO + SFX.
  const existing = path.join(COMPOSITIONS_DIR, `${compName}.tsx`)
  if (fs.existsSync(existing)) {
    const source = fs.readFileSync(existing, 'utf8')
    const existingFps = Number(/fps:\s*(\d+)/.exec(source)?.[1]) || fps
    const existingWidth = Number(/width:\s*(\d+)/.exec(source)?.[1]) || width
    const existingHeight = Number(/height:\s*(\d+)/.exec(source)?.[1]) || height
    const alreadyHasAudio = /\baudio:\s*"/.test(source)
    const oldScenes = alreadyHasAudio ? [] : readGeneratedScenes(source)

    if (audio && !alreadyHasAudio && oldScenes.length > 0) {
      report({
        state: 'working',
        stage: 'existing',
        percent: 18,
        message: `Draf ${compName} ada tanpa suara - Ardi melengkapi VO + SFX`,
      })
      const track = await buildAudioTrack({
        compName,
        scenes: oldScenes,
        fps: existingFps,
        secondsPerScene,
        voice,
        sfx,
        report,
      })
      const spec = {
        id: slugify(cleanTopic),
        compName,
        title: cleanTopic,
        scenes: oldScenes,
        fps: existingFps,
        secondsPerScene,
        width: existingWidth,
        height: existingHeight,
        sceneTimings: track.timings,
        audioMeta: {
          voice: track.voice,
          sfx: track.sfx,
          scenes: track.voiceGenerated,
          totalSeconds: Number((track.totalFrames / existingFps).toFixed(2)),
        },
      }
      report({ state: 'working', stage: 'composition', percent: 84, message: `Menulis ulang ${compName}.tsx dengan VO + SFX` })
      const { file, frames } = writeCompositionFile(spec)
      report({ state: 'working', stage: 'registry', percent: 88, message: 'Mendaftarkan komposisi ke registry Remotion' })
      regenerateRegistry()
      report({ state: 'working', stage: 'naskah', percent: 92, message: 'Memperbarui naskah dengan timecode audio' })
      const naskah = writeNaskah(spec)
      return {
        ...spec,
        frames,
        compositionFile: file,
        naskahFile: naskah,
        source: 'upgraded',
        audio: track,
      }
    }

    const frames = Number(/frames:\s*(\d+)/.exec(source)?.[1]) || 0
    report({ state: 'working', stage: 'existing', percent: 70, message: `Draf ${compName} sudah ada - memakai ulang tanpa menimpa` })
    regenerateRegistry()
    report({ state: 'working', stage: 'registry', percent: 92, message: 'Registry Remotion disegarkan' })
    return {
      id: slugify(cleanTopic),
      compName,
      title: cleanTopic,
      scenes: [],
      fps: existingFps,
      width: existingWidth,
      height: existingHeight,
      frames,
      compositionFile: existing,
      naskahFile: NASKAH_PATH,
      source: 'existing',
      audio: alreadyHasAudio ? { existing: true } : null,
    }
  }

  report({ state: 'working', stage: 'script', percent: 10, message: `Lumi menyusun 8 scene: ${cleanTopic}` })

  let scenes = null
  if (useAI) {
    try {
      scenes = await generateScenesWithAI(cleanTopic)
    } catch {
      scenes = null
    }
  }
  const source = scenes ? 'ai' : 'template'
  report({
    state: 'working',
    stage: 'scenes',
    percent: 30,
    sceneCount: 8,
    source,
    message: scenes
      ? 'Naskah AI siap: 8 scene sinematik'
      : 'Naskah template siap: 8 scene (AI tidak tersedia)',
  })

  const spec = {
    id: slugify(cleanTopic),
    compName: compNameFromTopic(cleanTopic),
    title: cleanTopic,
    scenes: scenes || templateScenes(cleanTopic),
    fps,
    secondsPerScene,
    width,
    height,
  }

  // Ardi records before Jeje assembles: scene frames come from the narration, so
  // the preview in the Screening Room already has picture + voice + SFX.
  let track = null
  if (audio) {
    try {
      track = await buildAudioTrack({
        compName: spec.compName,
        scenes: spec.scenes,
        fps,
        secondsPerScene,
        voice,
        sfx,
        report,
      })
      spec.sceneTimings = track.timings
      spec.audioMeta = {
        voice: track.voice,
        sfx: track.sfx,
        scenes: track.voiceGenerated,
        totalSeconds: Number((track.totalFrames / fps).toFixed(2)),
      }
    } catch (err) {
      console.error('[compose] audio track failed:', err?.message || err)
      report({
        state: 'working',
        stage: 'voiceover',
        percent: 66,
        message: `VO gagal disiapkan: ${err?.message || err}`,
      })
    }
  }

  report({ state: 'working', stage: 'composition', percent: 84, message: `Menulis komposisi ${spec.compName}.tsx` })
  const { file, frames } = writeCompositionFile(spec)
  report({ state: 'working', stage: 'registry', percent: 88, message: 'Mendaftarkan komposisi ke registry Remotion' })
  regenerateRegistry()
  report({ state: 'working', stage: 'naskah', percent: 92, message: 'Menyimpan naskah ke naskah/latest_naskah.md' })
  const naskah = writeNaskah(spec)

  return {
    ...spec,
    frames,
    compositionFile: file,
    naskahFile: naskah,
    source,
    audio: track,
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
if (isMain) {
  const args = process.argv.slice(2)
  const arg = (flag) => {
    const i = args.indexOf(flag)
    return i >= 0 ? args[i + 1] : undefined
  }

  const run = async () => {
    const specPath = arg('--spec')
    let result
    if (specPath) {
      const spec = JSON.parse(fs.readFileSync(path.resolve(specPath), 'utf8'))
      const full = {
        id: spec.id || slugify(spec.title),
        compName: spec.compName || compNameFromTopic(spec.title),
        title: spec.title,
        scenes: spec.scenes,
        fps: spec.fps || 30,
        secondsPerScene: spec.secondsPerScene || 4,
        width: spec.width || 1080,
        height: spec.height || 1920,
      }
      const { file, frames } = writeCompositionFile(full)
      regenerateRegistry()
      const naskahFile = writeNaskah(full)
      result = { ...full, frames, compositionFile: file, naskahFile, source: 'spec' }
    } else {
      const topic = arg('--topic') || 'Video NARA Studio'
      result = await buildVideoPackage(topic, {
        useAI: !args.includes('--no-ai'),
        audio: !args.includes('--no-audio'),
        sfx: !args.includes('--no-sfx'),
        voice: arg('--voice') || DEFAULT_VOICE,
        secondsPerScene: Number(arg('--seconds-per-scene')) || 4,
        fps: Number(arg('--fps')) || 30,
        width: Number(arg('--width')) || 1080,
        height: Number(arg('--height')) || 1920,
      })
    }
    console.log(JSON.stringify({
      ok: true,
      compName: result.compName,
      id: result.id,
      frames: result.frames,
      seconds: result.frames / (result.fps || 30),
      source: result.source,
      audio: result.audio || null,
      compositionFile: path.relative(WORKSPACE, result.compositionFile),
      naskahFile: path.relative(WORKSPACE, result.naskahFile),
    }, null, 2))
  }

  run().catch((err) => {
    console.error(err?.stack || String(err))
    process.exitCode = 1
  })
}
