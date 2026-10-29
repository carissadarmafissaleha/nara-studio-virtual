/**
 * StudioStatusBar — live log of what the studio is doing, above the status strip.
 *
 * Two kinds of job land here:
 *   RENDER  Remotion exporting an MP4 (frames, ETA, elapsed).
 *   DRAF    the bridge assembling a visual draft for the Screening Room
 *           (naskah -> scene -> komposisi -> registry -> build).
 *
 * Both used to be invisible: the button said "dimulai" and then nothing until
 * chat announced the result. Click the bar to expand the last log lines.
 */

import React, { useEffect, useState } from 'react'
import { pickJob, useStudioStatus } from '../useStudioStatus'
import { hasComposition } from '../remotionDiscovery'
import '../styles/studio-status.css'

interface StudioStatusBarProps {
  /** Opens the Screening Room; a finished draft has nowhere else to go. */
  onOpenScreening?: () => void
}

function clock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export const StudioStatusBar: React.FC<StudioStatusBarProps> = ({ onOpenScreening }) => {
  const status = useStudioStatus()
  const [open, setOpen] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  // Finished jobs can be dismissed; the server forgets them too, so a reload
  // does not bring the same log back.
  const [dismissed, setDismissed] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(timer)
  }, [])

  const job = pickJob(status, now)
  const hidden = !!job && !job.active && dismissed > 0 && (job.finishedAt || 0) <= dismissed
  if (!job || hidden) return null

  const dismiss = () => {
    const finishedAt = job.finishedAt || Date.now()
    setDismissed(finishedAt)
    fetch(job.kind === 'draft' ? '/api/draft-status' : '/api/render-status', { method: 'DELETE' }).catch(() => {})
  }

  const elapsed = clock((job.active ? now : job.finishedAt || now) - job.startedAt)

  // The draft is on disk but this bundle was compiled before it existed.
  const needsReload =
    job.kind === 'draft' &&
    job.draftReady &&
    !!job.compositionId &&
    !hasComposition(job.compositionId)

  const openScreening = () => {
    try {
      if (job.compositionId) sessionStorage.setItem('nara_focus_comp', job.compositionId)
    } catch (_) {}
    onOpenScreening?.()
  }

  return (
    <div className={`studio-bar kind-${job.kind} state-${job.state}${open ? ' open' : ''}`} role="status" aria-live="polite">
      <div className="studio-bar-row">
        <button
          type="button"
          className="studio-bar-main"
          onClick={() => setOpen((v) => !v)}
          title={open ? 'Sembunyikan log' : 'Klik untuk melihat log'}
        >
          <span className="studio-bar-label">{job.label}</span>
          <span className="studio-bar-comp">{job.title}</span>
          <span className="studio-bar-track" aria-hidden="true">
            <span className="studio-bar-fill" style={{ width: `${job.percent}%` }} />
          </span>
          <span className="studio-bar-stat">{job.stat}</span>
          {job.eta != null && <span className="studio-bar-stat">ETA {job.eta}s</span>}
          <span className="studio-bar-stat">{elapsed}</span>
          <span className="studio-bar-msg">{job.message}</span>
          <span className="studio-bar-caret">{open ? '▾' : '▴'}</span>
        </button>

        {job.mp4Url && (
          <a
            className="studio-bar-action"
            href={job.mp4Url}
            target="_blank"
            rel="noreferrer"
            title="Buka hasil MP4 di tab baru"
          >
            ▶ Putar MP4
          </a>
        )}

        {job.draftReady && needsReload && (
          <button
            type="button"
            className="studio-bar-action"
            onClick={() => window.location.reload()}
            title="Draf sudah dibuat tetapi halaman ini memakai bundle lama - muat ulang untuk memuat preview"
          >
            ⟳ Muat ulang
          </button>
        )}

        {job.draftReady && !needsReload && onOpenScreening && (
          <button
            type="button"
            className="studio-bar-action"
            onClick={openScreening}
            title="Buka Screening Room untuk preview draf"
          >
            ▶ Buka Screening
          </button>
        )}

        {!job.active && (
          <button
            type="button"
            className="studio-bar-close"
            onClick={dismiss}
            title="Sembunyikan log ini"
            aria-label="Sembunyikan log"
          >
            ×
          </button>
        )}
      </div>

      {open && (
        <div className="studio-bar-log">
          {job.tail.length === 0 ? (
            <div className="studio-bar-log-line dim">Belum ada output…</div>
          ) : (
            job.tail.map((line, i) => (
              <div className="studio-bar-log-line" key={`${i}-${line.slice(0, 24)}`}>{line}</div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default StudioStatusBar
