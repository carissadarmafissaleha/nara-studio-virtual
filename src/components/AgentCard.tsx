/**
 * AgentCard — the inspector: click a character and this card says what it
 * is and what it has done. It fetches GET /agents/:id when it opens and
 * every INSPECT_POLL_MS while open (and stops when closed), and falls back to
 * the office's own record for a character the server does not know (?sim,
 * the boss, a worker already forgotten). It closes on Esc, its button, or
 * clicking the backdrop outside.
 */

import React, { useEffect, useRef, useState } from 'react'
import type { Agent, SessionInfo } from '../types'
import { AGENT_CONFIGS } from '../types'
import { shortModel, formatTokensShort } from '../mainState'
import {
  type Inspection, type InspectSource,
  inspectUrl, INSPECT_POLL_MS, HISTORY_SHOWN,
  mainStateLabel, workerStateLabel, toolCountRows, recentHistory, clockTime, atItFor, finishedStats,
  historyMark, transcriptEmptyText, transcriptLine, fallbackInspection, promptAndReply, shortSession, derivedNote, cardSide,
} from '../inspector'
import { getUiToken } from '../permissions'
import '../styles/inspector.css'

interface AgentCardProps {
  /** The clicked character, or null when the card is closed */
  agentId: string | null
  /** The office's own record of it (undefined once it has left) */
  agent?: Agent
  /** The sessions the socket knows (their main record carries the prompt text) */
  sessions?: SessionInfo[]
  onClose: () => void
}

const AgentCard: React.FC<AgentCardProps> = ({ agentId, agent, sessions = [], onClose }) => {
  const [data, setData] = useState<Inspection | null>(null)
  const [missing, setMissing] = useState<'unknown' | 'unreachable' | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const [side, setSide] = useState<'left' | 'right'>('left')
  const agentRef = useRef(agent)
  agentRef.current = agent
  useEffect(() => {
    setSide(cardSide(agentRef.current?.position.x))
  }, [agentId])

  // Fetch on open, then every INSPECT_POLL_MS; nothing runs once closed
  useEffect(() => {
    if (!agentId) return
    setData(null)
    setMissing(null)
    let cancelled = false
    const load = async () => {
      try {
        const token = getUiToken()
        const res = await fetch(inspectUrl(agentId), {
          signal: AbortSignal.timeout(1500),
          ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
        })
        if (cancelled) return
        if (res.status === 404) { setMissing('unknown'); return }
        if (!res.ok) { setMissing('unreachable'); return }
        setData(await res.json() as Inspection)
        setMissing(null)
      } catch {
        if (!cancelled) setMissing('unreachable')
      } finally {
        if (!cancelled) setNow(Date.now())
      }
    }
    void load()
    const timer = setInterval(() => void load(), INSPECT_POLL_MS)
    return () => { cancelled = true; clearInterval(timer) }
  }, [agentId])

  // Esc or clicking outside closes
  const cardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!agentId) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current() }
    const onClickOutside = (e: Event) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onCloseRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    const timer = setTimeout(() => {
      window.addEventListener('click', onClickOutside)
      window.addEventListener('pointerdown', onClickOutside)
      window.addEventListener('touchstart', onClickOutside)
    }, 80)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('click', onClickOutside)
      window.removeEventListener('pointerdown', onClickOutside)
      window.removeEventListener('touchstart', onClickOutside)
    }
  }, [agentId])

  // The character has left the office and the server has forgotten it: nothing left to show
  useEffect(() => {
    if (agentId && !agent && missing === 'unknown') onCloseRef.current()
  }, [agentId, agent, missing])

  if (!agentId) return null

  const source: InspectSource = data ? 'server' : agent ? 'office' : 'loading'
  const insp: Inspection | null = data ?? (agent ? fallbackInspection(agent, sessions) : null)
  if (!insp) {
    return (
      <>
        <div
          className="agent-card-backdrop"
          onClick={onClose}
          onTouchEnd={(e) => {
            e.preventDefault()
            onClose()
          }}
          aria-hidden="true"
        />
        <div ref={cardRef} className={`agent-card side-${side}`} role="dialog" aria-label="Agent inspector" data-testid="agent-card" onClick={(e) => e.stopPropagation()}>
          <div className="ac-head">
            <span className="ac-name">Memuat…</span>
            <button className="ac-close" onClick={onClose} aria-label="Close">×</button>
          </div>
        </div>
      </>
    )
  }

  const isMain = insp.kind === 'main'
  const session = sessions.find(s => s.id === insp.sessionId)
  const color = agent?.color ?? AGENT_CONFIGS[insp.role]?.color ?? AGENT_CONFIGS['default'].color
  const stateText = isMain ? mainStateLabel(insp.main ?? session?.main) : workerStateLabel(insp.state)
  const elapsed = atItFor(insp, now)
  const counts = toolCountRows(insp.toolCounts)
  const calls = counts.reduce((sum, r) => sum + r.n, 0)
  const history = recentHistory(insp.history, HISTORY_SHOWN)
  const done = isMain ? false : insp.state === 'completed' || typeof insp.stats.completedAt === 'number'
  const { prompt, reply } = isMain ? promptAndReply(insp, session) : { prompt: undefined, reply: undefined }
  const isBoss = insp.role === 'boss'

  return (
    <>
      <div
        className="agent-card-backdrop"
        onClick={onClose}
        onTouchEnd={(e) => {
          e.preventDefault()
          onClose()
        }}
        aria-hidden="true"
      />
      <div
        ref={cardRef}
        className={`agent-card side-${side}${isMain ? ' main' : ''}${done ? ' done' : ''}`}
        role="dialog"
        aria-label={`${insp.name} — inspector`}
        data-testid="agent-card"
        data-agent-id={insp.id}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ac-head">
          <span className="ac-dot" style={{ background: color }} aria-hidden="true" />
          <span className="ac-name">{isMain ? 'Nara' : insp.name}</span>
          <span className="ac-role">({isMain ? 'Asisten Sutradara' : insp.role})</span>
          <span className={`ac-state state-${isMain ? (insp.main?.state ?? session?.main?.state ?? 'unknown') : insp.state}`}>• {stateText}</span>
          <button className="ac-close" onClick={onClose} aria-label="Close" title="Tutup (Esc)">×</button>
        </div>

        {isBoss ? (
          <div className="ac-section"><div className="ac-text">👑 Lead Studio (Anda)</div></div>
        ) : (
          <>
            {/* Combined Turn: Prompt & Reply in single compact box */}
            {(prompt || reply) && (
              <div className="ac-section ac-compact-turn">
                {prompt && (
                  <div className="ac-turn-row">
                    <span className="ac-turn-label">💬</span>
                    <span className="ac-turn-val">{prompt}</span>
                  </div>
                )}
                {reply && (
                  <div className="ac-turn-row">
                    <span className="ac-turn-label">✨</span>
                    <span className="ac-turn-val">{reply}</span>
                  </div>
                )}
              </div>
            )}

            {/* Combined Metadata Badges */}
            <div className="ac-section ac-meta-strip">
              <span className="ac-badge">📍 {insp.project || 'nara-studio'}</span>
              {calls > 0 && <span className="ac-badge">🛠️ {calls} tools</span>}
              {insp.task && !isMain && <span className="ac-badge" title={insp.task}>📋 {insp.task}</span>}
              {elapsed && <span className="ac-badge">⏱️ {elapsed}</span>}
              {typeof insp.stats.contextTokens === 'number' && <span className="ac-badge">🧠 {formatTokensShort(insp.stats.contextTokens)} tok</span>}
              {insp.session && <span className="ac-badge">👥 {insp.session.agentCount ?? 1} tim</span>}
            </div>

            {/* Compact Tools Chips (if any) */}
            {counts.length > 0 && (
              <div className="ac-chips">
                {counts.slice(0, 4).map(r => <span key={r.tool} className="ac-chip" title={r.tool}>{r.tool} <b>{r.n}</b></span>)}
              </div>
            )}

            {/* Compact Recent log (max 2 entries) */}
            {history.length > 0 && (
              <div className="ac-hist-compact">
                {history.slice(0, 2).map((h, i) => (
                  <div key={`${h.at}-${i}`} className="ac-hist-mini-row" title={h.text}>
                    <span className="ac-time">{clockTime(h.at)}</span>
                    <span className="ac-hist-mini-text">› {h.tool || h.text}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div className="ac-foot">
          {source === 'server'
            ? (missing === 'unknown' ? 'server selesai — data terakhir' : missing === 'unreachable' ? 'server tidak terjangkau — data terakhir' : 'live · sinkron tiap 2 detik')
            : missing === 'unreachable' ? 'server tidak terjangkau — status lokal'
            : missing === 'unknown' ? 'agen studio lokal'
            : 'memuat…'}
        </div>
      </div>
    </>
  )
}

export default AgentCard
