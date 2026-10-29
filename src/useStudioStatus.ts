/**
 * useStudioStatus — one source of truth for the studio's live jobs.
 *
 * Two things can be in flight, and both now report progress to the server:
 *
 *   render  GET /api/render-status   Remotion exporting an MP4 (frames, ETA)
 *   draft   GET /api/draft-status    the bridge assembling a visual draft for the
 *                                    Screening Room (naskah -> scene -> komposisi
 *                                    -> registry -> build)
 *
 * The footer, the Screening Room and the ToDo board all read them through this
 * hook, so every surface tells the same story about the same job.
 */

import { useEffect, useState } from 'react'

export type JobState = 'idle' | 'starting' | 'bundling' | 'rendering' | 'working' | 'done' | 'failed'

export interface StudioJob {
  kind?: 'render' | 'draft'
  state: JobState
  taskId?: string
  compositionId?: string
  topic?: string
  title?: string
  outputFileName?: string
  /** Draft only: which step of the build is running (script, composition, build...). */
  stage?: string
  source?: 'ai' | 'template' | 'existing'
  /** Draft only: the bridge confirmed the draft is loadable in the Screening Room. */
  previewReady?: boolean
  sceneCount?: number
  frame?: number
  totalFrames?: number
  percent?: number
  etaSeconds?: number | null
  startedAt?: number
  updatedAt?: number
  finishedAt?: number | null
  exitCode?: number | null
  message?: string
  tail?: string[]
}

export interface StudioStatus {
  render: StudioJob | null
  draft: StudioJob | null
}

const ACTIVE_STATES = new Set<JobState>(['starting', 'bundling', 'rendering', 'working'])

/** A finished job stays on screen long enough to actually be read. */
export const HOLD_AFTER_FINISH_MS = 10 * 60_000

const STAGE_LABEL: Record<string, string> = {
  script: 'NASKAH',
  scenes: 'SCENE',
  voiceover: 'VOICE',
  sfx: 'SFX',
  mix: 'MIX AUDIO',
  composition: 'KOMPOSISI',
  registry: 'REGISTRY',
  naskah: 'NASKAH MD',
  build: 'BUILD UI',
  preview: 'PREVIEW',
  existing: 'DRAF LAMA',
}

export function isJobActive(state?: JobState): boolean {
  return !!state && ACTIVE_STATES.has(state)
}

function loadJson(url: string): Promise<any> {
  return fetch(url).then((res) => res.json()).catch(() => null)
}

/**
 * Poll both channels. Render keeps its own shape; a draft is tagged with
 * kind:'draft' so the two can share one presenter.
 */
export function useStudioStatus(pollMs = 1200): StudioStatus {
  const [status, setStatus] = useState<StudioStatus>({ render: null, draft: null })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const [renderRes, draftRes] = await Promise.all([
        loadJson('/api/render-status'),
        loadJson('/api/draft-status'),
      ])
      if (cancelled) return
      const renderJob = renderRes?.ok ? renderRes.job ?? renderRes.render ?? null : null
      const draftJob = draftRes?.ok ? draftRes.job ?? null : null
      setStatus({
        render: renderJob ? { ...renderJob, kind: 'render' as const } : null,
        draft: draftJob ? { ...draftJob, kind: 'draft' as const } : null,
      })
    }
    load()
    const timer = setInterval(load, pollMs)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [pollMs])

  return status
}

/** The one-line verdict used by chat replies and the ToDo board. */
export function renderSummary(job: StudioJob | null): string | null {
  if (!job || job.state === 'idle') return null
  if (isJobActive(job.state)) {
    const frames = job.totalFrames
      ? `${job.frame || 0}/${job.totalFrames} (${job.percent || 0}%)`
      : `${job.percent || 0}%`
    const eta = job.etaSeconds != null ? ` · ETA ${job.etaSeconds}s` : ''
    return `${job.compositionId || job.topic} · ${frames}${eta}`
  }
  if (job.state === 'done') {
    return job.kind === 'draft'
      ? `Draf siap: ${job.compositionId || job.topic}`
      : `MP4 siap: out/${job.outputFileName}`
  }
  return `Gagal (exit ${job.exitCode ?? '—'})`
}

export interface JobView {
  kind: 'render' | 'draft'
  state: JobState
  active: boolean
  done: boolean
  failed: boolean
  /** Short radio label: DRAF, RENDER, DRAF SIAP, RENDER GAGAL... */
  label: string
  /** Composition name, or the topic while the composition has no name yet. */
  title: string
  /** Exact composition id, for checking whether this bundle can play it. */
  compositionId: string | null
  percent: number
  /** Compact telemetry: "452/960 · 47%" or "KOMPOSISI · 62%". */
  stat: string
  eta: number | null
  startedAt: number
  finishedAt: number | null
  message: string
  tail: string[]
  /** Finished MP4, when this was a render. */
  mp4Url: string | null
  /** True when a finished draft is waiting in the Screening Room. */
  draftReady: boolean
  /** True when that draft was built and registered, not merely queued. */
  previewReady: boolean
}

/** Normalise either channel into the shape the footer paints. */
export function toJobView(job: StudioJob | null): JobView | null {
  if (!job || job.state === 'idle') return null

  const kind: 'render' | 'draft' = job.kind === 'draft' ? 'draft' : 'render'
  const active = isJobActive(job.state)
  const done = job.state === 'done'
  const failed = job.state === 'failed'

  const total = job.totalFrames || 0
  const frame = job.frame || 0
  const percent = active
    ? kind === 'render'
      ? total
        ? Math.min(100, Math.round((frame / total) * 100))
        : 0
      : Math.round(job.percent || 0)
    : done
      ? 100
      : Math.round(job.percent || 0)

  const stage = STAGE_LABEL[job.stage || ''] || 'DRAF'

  const label = kind === 'draft'
    ? active
      ? job.state === 'starting' ? 'SIAPKAN' : 'DRAF'
      : done ? 'DRAF SIAP' : 'DRAF GAGAL'
    : active
      ? job.state === 'rendering' ? 'RENDER' : 'SIAPKAN'
      : done ? 'RENDER SELESAI' : 'RENDER GAGAL'

  const stat = kind === 'draft'
    ? active
      ? `${stage} · ${percent}%`
      : done
        ? `${job.sceneCount || 8} SCENE · 100%`
        : `${percent}%`
    : active
      ? total ? `${frame}/${total} · ${percent}%` : 'menyiapkan…'
      : `${percent}%`

  return {
    kind,
    state: job.state,
    active,
    done,
    failed,
    label,
    title: String(job.compositionId || job.topic || job.title || '—'),
    compositionId: job.compositionId ? String(job.compositionId) : null,
    percent,
    stat,
    eta: active && kind === 'render' ? (job.etaSeconds ?? null) : null,
    startedAt: job.startedAt || job.updatedAt || Date.now(),
    finishedAt: job.finishedAt ?? null,
    message: job.message || '',
    tail: job.tail || [],
    mp4Url: kind === 'render' && done && job.outputFileName ? `/out/${job.outputFileName}` : null,
    draftReady: kind === 'draft' && done,
    previewReady: kind === 'draft' && done && job.previewReady !== false,
  }
}

/**
 * Pick the job the footer should show: a running job wins, otherwise the most
 * recent finished one — but only while it is still fresh enough to matter.
 */
export function pickJob(status: StudioStatus, now = Date.now()): JobView | null {
  const views = [toJobView(status.render), toJobView(status.draft)].filter(Boolean) as JobView[]
  if (views.length === 0) return null

  const running = views.filter((v) => v.active)
  if (running.length > 0) {
    return running.sort((a, b) => b.startedAt - a.startedAt)[0]
  }

  const fresh = views.filter(
    (v) => v.finishedAt != null && now - v.finishedAt <= HOLD_AFTER_FINISH_MS,
  )
  if (fresh.length === 0) return null
  return fresh.sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0))[0]
}
