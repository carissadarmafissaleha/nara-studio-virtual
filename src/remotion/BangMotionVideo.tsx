/**
 * BangMotionVideo — the shared renderer for generated explainer compositions.
 *
 * A composition file only carries its `compositionMeta` and an array of scenes;
 * this component turns that array into an 8-scene kinetic-typography video:
 * living background, staggered word reveals, spring physics, a scene counter
 * and a progress bar.
 *
 * Scenes may also carry audio that Opi recorded for them:
 *   durationInFrames  length of the scene, measured from the narration
 *   audio             public path of the VO clip (staticFile-relative)
 *   sfx               transition effect name from public/audio/sfx/
 * When those fields are present every scene plays its own clip and the visual
 * timing follows the voice, so the preview and the MP4 are in sync.
 *
 * Kept dependency-free on purpose: the Remotion CLI bundles this with webpack,
 * where Vite-only helpers (import.meta.glob) do not exist.
 */
import React from 'react'
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'

export interface BangMotionScene {
  /** Small label above the headline, e.g. "MANFAAT 01". */
  kicker: string
  /** The big kinetic headline. Rendered word by word. */
  headline: string
  /** One or two supporting lines. */
  body: string
  /** Accent colour for this scene. */
  accent: string
  /** Measured length of this scene, derived from the recorded voiceover. */
  durationInFrames?: number
  /** Voiceover clip, relative to public/ (e.g. "audio/vo/<comp>/scene-1.mp3"). */
  audio?: string
  /** Transition effect from public/audio/sfx/: whoosh | riser | impact | tick. */
  sfx?: string
}

/** SFX sit under the narration; they accent a cut, they never compete with it. */
const SFX_VOLUME: Record<string, number> = {
  impact: 0.22,
  riser: 0.16,
  whoosh: 0.14,
  tick: 0.12,
}

export interface BangMotionVideoProps {
  scenes: BangMotionScene[]
  brand?: string
  tagline?: string
}

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

const FONT = '"Segoe UI", "Helvetica Neue", Inter, system-ui, sans-serif'

/** Deterministic floating dots: same layout on every render, no randomness. */
const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  x: ((i * 137.5) % 1000) + 40,
  y: ((i * 269.3) % 1800) + 60,
  r: 6 + ((i * 7) % 18),
  speed: 0.15 + ((i * 3) % 10) / 40,
  phase: (i * 0.9) % (Math.PI * 2),
}))

export const BangMotionVideo: React.FC<BangMotionVideoProps> = ({
  scenes,
  brand = 'NARA STUDIO',
  tagline = 'Virtual Video Production',
}) => {
  const frame = useCurrentFrame()
  const { fps, width, height, durationInFrames } = useVideoConfig()

  const safeScenes = scenes.length > 0 ? scenes : [{ kicker: '', headline: brand, body: tagline, accent: '#FF8A1F' }]

  // Scenes with measured audio win; a silent draft still uses an even split so
  // older compositions keep rendering exactly as before.
  const measured = safeScenes.map((s) => Math.round(s.durationInFrames || 0))
  const hasTimings = measured.every((value) => value > 0)
  const fallbackPer = Math.max(1, Math.floor(durationInFrames / safeScenes.length))
  const sceneFrames = hasTimings ? measured : safeScenes.map(() => fallbackPer)
  const sceneStarts = sceneFrames.reduce<number[]>((acc, value, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + sceneFrames[i - 1])
    return acc
  }, [])

  let index = 0
  for (let i = 0; i < sceneStarts.length; i += 1) {
    if (frame >= sceneStarts[i]) index = i
  }
  const perScene = sceneFrames[index]
  const scene = safeScenes[index]
  const local = Math.max(0, Math.min(perScene - 1, frame - sceneStarts[index]))

  // Scale everything from a 1080px-wide canvas so 16:9 and 9:16 both fit.
  const unit = width / 1080
  const progress = interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 1], CLAMP)

  const sceneOpacity = interpolate(
    local,
    [0, Math.min(10, perScene / 3), Math.max(11, perScene - 10), perScene],
    [0, 1, 1, 0],
    CLAMP
  )

  const glowPulse = 0.5 + 0.5 * Math.sin((frame / fps) * 1.6 + index)
  const bgShift = interpolate(frame, [0, Math.max(1, durationInFrames)], [0, 1], CLAMP)
  const ringRotation = frame * 0.35 + index * 40

  const kickerSpring = spring({ frame: local - 2, fps, config: { damping: 16, mass: 0.6, stiffness: 140 } })
  const bodySpring = spring({ frame: local - 14, fps, config: { damping: 18, mass: 1, stiffness: 90 } })
  const isLandscape = width > height
  const words = scene.headline.split(/\s+/).filter(Boolean)
  const baseFontSize = (words.length > 7 ? 68 : words.length > 4 ? 86 : 106) * (isLandscape ? 0.72 : 1)
  const bodyFontSize = (words.length > 6 ? 32 : 38) * (isLandscape ? 0.8 : 1) * unit

  return (
    <AbsoluteFill style={{ backgroundColor: '#08060A', fontFamily: FONT, overflow: 'hidden' }}>
      {/* Audio layer: Opi's narration per scene, plus a short transition accent. */}
      {safeScenes.map((s, i) => (
        <React.Fragment key={`scene-audio-${i}`}>
          {s.audio ? (
            <Sequence from={sceneStarts[i]} durationInFrames={sceneFrames[i]} name={`VO ${i + 1}`}>
              <Audio src={staticFile(s.audio)} volume={1} />
            </Sequence>
          ) : null}
          {s.sfx ? (
            <Sequence
              from={sceneStarts[i]}
              durationInFrames={Math.max(1, Math.min(sceneFrames[i], 42))}
              name={`SFX ${i + 1}`}
            >
              <Audio src={staticFile(`audio/sfx/${s.sfx}.wav`)} volume={SFX_VOLUME[s.sfx] ?? 0.14} />
            </Sequence>
          ) : null}
        </React.Fragment>
      ))}

      {/* Living background: two drifting glows in the scene's accent colour. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${28 + Math.sin(bgShift * 3.1) * 8}% ${22 + Math.cos(bgShift * 2.2) * 6}%, ${scene.accent}33 0%, transparent 55%),
                       radial-gradient(circle at ${74 - Math.sin(bgShift * 2.4) * 8}% ${76 + Math.sin(bgShift * 1.7) * 6}%, ${scene.accent}22 0%, transparent 50%),
                       linear-gradient(160deg, #140B06 0%, #0A0710 55%, #060509 100%)`,
          opacity: 0.95 + glowPulse * 0.05,
        }}
      />

      {/* Concentric rings, slowly turning. */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        {[0, 1, 2].map((ring) => {
          const size = (620 + ring * 190) * unit
          return (
            <div
              key={ring}
              style={{
                position: 'absolute',
                width: size,
                height: size,
                borderRadius: '50%',
                border: `${Math.max(1, 2 - ring * 0.5)}px solid ${scene.accent}`,
                opacity: (0.22 - ring * 0.05) * (0.6 + glowPulse * 0.4),
                transform: `rotate(${ringRotation * (ring % 2 === 0 ? 1 : -0.7)}deg) scale(${1 + Math.sin(frame / 50 + ring) * 0.03})`,
              }}
            />
          )
        })}
      </AbsoluteFill>

      {/* Floating dust, drifting upward with the current. */}
      <AbsoluteFill>
        {PARTICLES.map((p, i) => {
          const drift = Math.sin(frame / 60 * p.speed * 4 + p.phase) * 26
          const rise = (frame * p.speed) % 220
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: p.x * unit + drift,
                top: p.y * unit - rise,
                width: p.r * unit,
                height: p.r * unit,
                borderRadius: '50%',
                backgroundColor: i % 3 === 0 ? scene.accent : '#FFFFFF',
                opacity: 0.05 + (i % 4) * 0.02,
              }}
            />
          )
        })}
      </AbsoluteFill>

      {/* Scene counter + chapter dots */}
      <div
        style={{
          position: 'absolute',
          top: 96 * unit,
          left: 84 * unit,
          right: 84 * unit,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: sceneOpacity,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 * unit }}>
          <span style={{ color: scene.accent, fontSize: 34 * unit, fontWeight: 800, letterSpacing: 2 }}>
            {String(index + 1).padStart(2, '0')}
          </span>
          <span style={{ color: '#FFFFFF66', fontSize: 24 * unit, fontWeight: 600, letterSpacing: 4 }}>
            / {String(safeScenes.length).padStart(2, '0')}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10 * unit }}>
          {safeScenes.map((_, i) => (
            <div
              key={i}
              style={{
                width: (i === index ? 46 : 14) * unit,
                height: 6 * unit,
                borderRadius: 999,
                backgroundColor: i === index ? scene.accent : '#FFFFFF2E',
                transition: 'none',
              }}
            />
          ))}
        </div>
      </div>

      {/* The scene itself */}
      <div
        style={{
          position: 'absolute',
          left: 84 * unit,
          right: 84 * unit,
          top: height * 0.28,
          bottom: height * 0.22,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          opacity: sceneOpacity,
        }}
      >
        <div
          style={{
            alignSelf: 'flex-start',
            padding: `${12 * unit}px ${22 * unit}px`,
            borderRadius: 999,
            border: `${Math.max(1, 2 * unit)}px solid ${scene.accent}88`,
            backgroundColor: `${scene.accent}1A`,
            color: scene.accent,
            fontSize: 24 * unit,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: 'uppercase',
            opacity: kickerSpring,
            transform: `translateY(${(1 - kickerSpring) * 30 * unit}px)`,
          }}
        >
          {scene.kicker}
        </div>

        <div
          style={{
            marginTop: 40 * unit,
            display: 'flex',
            flexWrap: 'wrap',
            columnGap: 22 * unit,
            rowGap: 4 * unit,
          }}
        >
          {words.map((word, i) => {
            const wordSpring = spring({
              frame: local - 6 - i * 4,
              fps,
              config: { damping: 13, mass: 0.7, stiffness: 130 },
            })
            return (
              <span
                key={`${word}-${i}`}
                style={{
                  display: 'inline-block',
                  color: '#FFFFFF',
                  fontSize: (word.length > 10 ? baseFontSize * 0.88 : baseFontSize) * unit,
                  lineHeight: 1.08,
                  fontWeight: 900,
                  letterSpacing: -2,
                  textShadow: `0 0 ${60 * unit}px ${scene.accent}55`,
                  opacity: wordSpring,
                  transform: `translateY(${(1 - wordSpring) * 70 * unit}px) scale(${0.92 + wordSpring * 0.08})`,
                }}
              >
                {word}
              </span>
            )
          })}
        </div>

        <div
          style={{
            marginTop: 36 * unit,
            maxWidth: 820 * unit,
            color: '#FFFFFFB8',
            fontSize: bodyFontSize,
            lineHeight: 1.35,
            fontWeight: 500,
            opacity: bodySpring,
            transform: `translateY(${(1 - bodySpring) * 34 * unit}px)`,
          }}
        >
          {scene.body}
        </div>

        <div
          style={{
            marginTop: 54 * unit,
            height: Math.max(2, 4 * unit),
            width: 160 * unit,
            borderRadius: 999,
            background: `linear-gradient(90deg, ${scene.accent}, ${scene.accent}00)`,
            opacity: bodySpring,
          }}
        />
      </div>

      {/* Brand mark, always present, quiet */}
      <div
        style={{
          position: 'absolute',
          left: 84 * unit,
          bottom: 92 * unit,
          display: 'flex',
          flexDirection: 'column',
          gap: 4 * unit,
        }}
      >
        <span style={{ color: '#FFFFFF', fontSize: 28 * unit, fontWeight: 800, letterSpacing: 5 }}>{brand}</span>
        <span style={{ color: '#FFFFFF55', fontSize: 20 * unit, fontWeight: 600, letterSpacing: 3 }}>{tagline}</span>
      </div>

      {/* Progress bar */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 8 * unit, backgroundColor: '#FFFFFF14' }}>
        <div
          style={{
            width: `${progress * 100}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${scene.accent}, #FFD37A)`,
            boxShadow: `0 0 ${24 * unit}px ${scene.accent}`,
          }}
        />
      </div>
    </AbsoluteFill>
  )
}
