/**
 * StatusStrip — pipeline health along the bottom of the office.
 * Responsively renders 2 clean rows on mobile so status items don't collide.
 */

import React, { useEffect, useState } from 'react'
import { hookVerdict, initialHealth, HOOK_WARN_MS, type HealthState, type HookVerdict, type OfficeState, type ConnectionPhase } from '../officeReducer'
import { needsYouLabel, stripCounts, type StripCounts } from '../mainState'
import type { SessionInfo } from '../types'
import { pillLabel } from './SessionStrip'
import { officeHttpBase } from '../serverUrl'
import '../styles/strip.css'

const params = new URLSearchParams(window.location.search)
const MODE: 'live' | 'sim' | 'video' = params.has('video') ? 'video' : params.has('sim') ? 'sim' : 'live'
const WARN_MS = Number(import.meta.env.VITE_HOOK_WARN_MS) || HOOK_WARN_MS

const SERVER_URL  = officeHttpBase()
const START_CMD   = 'npm run server'
const START_ALT   = 'bash scripts/start-office.sh'
const INSTALL_CMD = 'npm run install-hooks'
const DOCTOR_CMD  = 'npm run doctor'
const OPEN_CMD    = 'npm run open'
const READ_ONLY_HINT = [
  'Read-only: this page has no office token (or an old one), so the server shows the office',
  'without prompts, replies or command lines, and permission dialogs are answered in the terminal.',
  `Open the link the server printed when it started, or run ${OPEN_CMD} in the checkout:`,
  'it opens the office with the token, which this browser then remembers.',
].join('\n')

const CONNECTION_LABEL: Record<ConnectionPhase, string> = {
  connecting:   'menghubungkan…',
  online:       'ONLINE',
  reconnecting: 'menghubungkan ulang…',
  offline:      'OFFLINE',
}

interface StatusStripProps {
  office: { readonly current: OfficeState | null }
  sessions?: SessionInfo[]
  readOnly?: boolean
}

export function formatAgo(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 2) return 'baru saja'
  if (s < 60) return `${s} dtk lalu`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} mnt lalu`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h} jam lalu`
  return `${Math.floor(h / 24)} hari lalu`
}

export function formatSpan(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s} dtk`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} mnt`
  const h = Math.floor(m / 60)
  return `${h} jam ${String(m % 60).padStart(2, '0')} mnt`
}

function clock(t: number): string {
  return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function hooksPill(v: HookVerdict): { text: string; tone: 'ok' | 'warn' | 'dim' } {
  switch (v.kind) {
    case 'unknown': return { text: 'studio: standby', tone: 'dim' }
    case 'seen':    return { text: `bridge: aktif ${formatAgo(v.agoMs)}`, tone: v.agoMs < 10 * 60_000 ? 'ok' : 'dim' }
    case 'waiting': return { text: 'bridge: siap produksi', tone: 'dim' }
    case 'missing': return { text: 'studio: standby', tone: 'ok' }
  }
}

function describe(h: HealthState, v: HookVerdict, now: number, c: StripCounts): string {
  const s = h.server
  const lines: Array<string | null> = []
  switch (h.connection) {
    case 'online':       lines.push(`Server Studio ${SERVER_URL}: online sejak ${clock(h.connectionSince)}`); break
    case 'connecting':   lines.push(`Server Studio ${SERVER_URL}: menghubungkan…`); break
    case 'reconnecting': lines.push(`Server Studio ${SERVER_URL}: terputus ${formatAgo(now - h.connectionSince)}, mencoba kembali`); break
    case 'offline':      lines.push(`Server Studio ${SERVER_URL}: tidak aktif`); break
  }
  if (h.connection === 'offline' || h.connection === 'reconnecting') {
    lines.push(`Jalankan dari terminal: ${START_CMD}  (atau ${START_ALT})`)
  }
  if (s) {
    lines.push(`Sesi: ${s.sessions} · agen: ${s.agents} · klien: ${s.clients}`)
    lines.push(`Server v${s.version}, aktif ${formatSpan(s.uptimeMs + Math.max(0, now - (h.reportedAt ?? now)))}`)
  }
  return lines.filter(Boolean).join('\n')
}

const StatusStrip: React.FC<StatusStripProps> = ({ office, sessions = [], readOnly = false }) => {
  const [view, setView] = useState(() => ({ health: office.current?.health ?? null, now: Date.now() }))
  const [listenerStatus, setListenerStatus] = useState<{
    active: boolean
    engine: string
    wake: boolean
    wakeEngine: string
  }>({ active: false, engine: '', wake: false, wakeEngine: '' })

  useEffect(() => {
    let mounted = true
    const checkListener = () => {
      fetch(`${SERVER_URL}/api/listener-status`)
        .then(r => r.json())
        .then(d => {
          if (mounted && d && typeof d.active === 'boolean') {
            setListenerStatus({
              active: d.active,
              engine: d.engine || '',
              wake: Boolean(d.wake?.active),
              wakeEngine: d.wake?.engine || '',
            })
          }
        })
        .catch(() => {
          if (mounted) setListenerStatus({ active: false, engine: '', wake: false, wakeEngine: '' })
        })
    }
    checkListener()
    const timer = setInterval(checkListener, 2000)
    return () => { mounted = false; clearInterval(timer) }
  }, [])

  useEffect(() => {
    if (MODE !== 'live') return
    const sample = () => setView({ health: office.current?.health ?? null, now: Date.now() })
    const timer = setInterval(sample, 1000)
    return () => clearInterval(timer)
  }, [office])

  if (MODE !== 'live') {
    return (
      <div className="status-badge sim" title={`?${MODE}: simulasi`} data-mode={MODE}>
        SIM
      </div>
    )
  }

  const h = view.health ?? initialHealth(view.now)
  const v = hookVerdict(h, view.now, WARN_MS)
  const pill = hooksPill(v)
  const s = h.server
  const down = h.connection === 'offline' || h.connection === 'reconnecting'
  const c = stripCounts(sessions)

  return (
    <div
      className="status-strip"
      role="status"
      aria-label="Status studio"
      title={describe(h, v, view.now, c)}
      data-connection={h.connection}
      data-hooks={v.kind}
    >
      {/* Row 1: Status Koneksi & Hook */}
      <div className="status-strip-row status-strip-row-1">
        <span className="strip-item strip-conn">
          <span className="strip-dot" />
          {CONNECTION_LABEL[h.connection]}
        </span>
        <span className="strip-sep" />
        <span
          className={`strip-item strip-listener ${listenerStatus.active ? 'active' : 'inactive'}`}
          title={
            listenerStatus.active
              ? `Listener daemon (${listenerStatus.engine}) AKTIF: order /buat-video bisa masuk antrean`
              : 'Listener daemon TIDAK AKTIF: order tidak akan tercatat'
          }
        >
          <span className="strip-listener-dot" />
          LISTENER: {listenerStatus.active ? 'AKTIF' : 'OFF'}
        </span>
        <span className="strip-sep" />
        <span
          className={`strip-item strip-listener ${listenerStatus.wake ? 'active' : 'inactive'}`}
          title={
            listenerStatus.wake
              ? `Watcher sesi (${listenerStatus.wakeEngine}) SIAP: order berikutnya akan membangunkan mesin`
              : 'Belum ada watcher sesi: order akan menumpuk sampai `npm run wake:ds` / `wake:agy` dipasang di sesi AI'
          }
        >
          <span className="strip-listener-dot" />
          WAKE: {listenerStatus.wake ? 'SIAP' : 'OFF'}
        </span>
        {readOnly && (
          <>
            <span className="strip-sep" />
            <span className="strip-item strip-readonly">
              read-only: <code>{OPEN_CMD}</code>
            </span>
          </>
        )}
        <span className="strip-sep" />
        <span className={`strip-item strip-hooks ${pill.tone}`}>{pill.text}</span>
      </div>

      {/* Row 2: Sesi Tim Studio & Versi Server */}
      <div className="status-strip-row status-strip-row-2">
        <span className="strip-item strip-sessions">
          {c.sessionsText || '1 sesi aktif'}
          {c.notHookedText && <><span className="strip-mid">·</span><span className="strip-unhooked">{c.notHookedText}</span></>}
          {c.needYouText && <><span className="strip-mid">·</span><span className="strip-needs-you">{c.needYouText}</span></>}
        </span>
        <span className="strip-spacer" />
        {down ? (
          <span className="strip-item strip-hint">jalankan: <code>{START_CMD}</code></span>
        ) : (
          <span className="strip-item strip-version" title={`NARA Studio v${s?.version ?? '1.1.2'}`}>
            NARA Studio v{s?.version ?? '1.1.2'}
          </span>
        )}
      </div>
    </div>
  )
}

export default StatusStrip
