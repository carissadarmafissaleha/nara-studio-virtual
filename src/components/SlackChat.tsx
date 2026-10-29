import React, { useEffect, useRef, useState, useCallback } from 'react'
import { ROLE_TO_CHAR } from '../config'
import { getSpritePath, useTheme, toggleTheme, getTheme, themedDisplayName } from '../theme'
import IncidentBadge from './IncidentBadge'
import FormattedMessage from './FormattedMessage'
import { postSetting } from '../permissions'
import { officeHttpBase } from '../serverUrl'

export function getAvatarSrc(role: string, agentId?: string): string {
  const charBase = ROLE_TO_CHAR[role] ?? 'employee-3'
  // Why: avatars in chat use agent.id when available so Office casting stays consistent
  return getSpritePath(agentId ?? `role-${role}`, role, charBase, 'front-right')
}

// Proactive message detection: agent announcements about starting/completing work
const PROACTIVE_PATTERN = /\b(starting|started|done|finished|completed|ready|working on|picking up|taking over)\b/i

export interface ChatMessage {
  /** The server's chat row id for rows it broadcast; negative for local-only lines */
  id: number
  sender: string
  senderSprite: string
  senderColor: string
  text: string
  channel: string
  timestamp: string
  createdAt?: number
  isSystem?: boolean
  reactions?: string[]
  /** Name and avatar as they were when the line was posted (the Office cast may change later) */
  displayName?: string
  avatarSrc?: string
  /** A prompt the boss typed in a terminal, or the session's Claude's reply (session_prompt / session_turn_end) */
  tag?: 'prompt' | 'reply'
}

const EMOJI_PICKER = ['👍', '👎', '😊', '🎉', '😡', '🔥', '💯']

// The server's prompt-logging level (GET /settings). How much of the
// conversation is kept is changed from a terminal, with the office token, so
// the chat header only shows the level and how to change it. Absent until
// the route exists.
const SETTINGS_URL = `${officeHttpBase()}/settings`
const LOG_PROMPTS_WHAT: Record<string, string> = {
  off:     'state only — no prompt or reply text is stored, broadcast or shown',
  summary: 'the first 200 characters of each prompt and reply',
  full:    'prompts and replies up to 2000 characters',
}
function logPromptsHint(level: string): string {
  return [
    `Prompt logging: ${level} — ${LOG_PROMPTS_WHAT[level] ?? 'unknown level'}.`,
    'A server setting (~/.agent-office/settings.json); change it with the office token:',
    `curl -X POST ${SETTINGS_URL} -H "Authorization: Bearer $(cat ~/.agent-office/auth-token)" -H 'Content-Type: application/json' -d '{"logPrompts":"${level === 'off' ? 'summary' : 'off'}"}'`,
  ].join('\n')
}

const SLASH_COMMANDS = [
  { cmd: '/buat-video', label: '🚚 /buat-video', desc: 'Kirim order video ke mesin produksi (brief utuh)' },
  { cmd: '/engine', label: '⚙️ /engine', desc: 'Cek / ganti mesin produksi (deepseek, opencode, claude, chatgpt)' },
  { cmd: '/status', label: '⚡ /status', desc: 'Status tim studio & server' },
  { cmd: '/agents', label: '👥 /agents', desc: 'Daftar semua agen kantor' },
  { cmd: '/settings', label: '⚙️ /settings', desc: 'Pusat pengaturan, karakter, & skills' },
  { cmd: '/skills', label: '🧩 /skills', desc: 'Daftar & tambah Agent Skills' },
  { cmd: '/hire', label: '➕ /hire', desc: 'Rekrut kru freelance / sub-agent baru' },
  { cmd: '/render', label: '🎬 /render', desc: 'Buka Screening Room video' },
  { cmd: '/screen', label: '📺 /screen', desc: 'Buka Screening Room video (/screen)' },
  { cmd: '/tasks', label: '📋 /tasks', desc: 'Buka papan ToDo Kanban' },
  { cmd: '/todo', label: '📋 /todo', desc: 'Buka papan ToDo Kanban' },
  { cmd: '/naskah', label: '✍️ /naskah', desc: 'Minta naskah panggung ke Lumi' },
  { cmd: '/vo', label: '🎙️ /vo', desc: 'Generate sulih suara (Voiceover) TTS' },
  { cmd: '/wardrobe', label: '👔 /wardrobe', desc: 'Pengaturan karakter dev' },
  { cmd: '/the-office', label: '🧻 /the-office', desc: 'Mode Dunder Mifflin ON/OFF' },
  { cmd: '/incident', label: '🚨 /incident', desc: 'Simulasi mode insiden darurat' },
  { cmd: '/all-clear', label: '✅ /all-clear', desc: 'Kembali normal (all clear)' },
  { cmd: '/help', label: '❓ /help', desc: 'Bantuan & panduan perintah' },
  { cmd: '/clear-chat', label: '🧹 /clear-chat', desc: 'Bersihkan riwayat obrolan kantor' },
  { cmd: '/clear', label: '🧹 /clear', desc: 'Bersihkan riwayat obrolan' },
]

interface SlackChatProps {
  messages: ChatMessage[]
  onlineStaffCount?: number
  muted: boolean
  volume: number
  onToggleMute: () => void
  onVolumeChange: (v: number) => void
  onSendMessage?: (text: string) => void
  onReaction?: (messageId: number, reactions: string[]) => void
  /** For video mode: auto-type text into the input box */
  autoTypeText?: string
  dayPhase: string
  /** Role/name currently typing — shows animated dots below the message list */
  typingUser?: string | null
  /** ID of the last message seen by the assistant — renders a tiny seen avatar */
  lastSeenId?: number | null
  /** The page has no office token: the "Answer here" toggle is hidden (the server would refuse it) */
  readOnly?: boolean
}

const SlackChat: React.FC<SlackChatProps> = ({ messages, onlineStaffCount, muted, volume, onToggleMute, onVolumeChange, onSendMessage, onReaction, autoTypeText, dayPhase, typingUser, lastSeenId, readOnly = false }) => {
  const theme = useTheme()
  void theme // Why: subscribe so avatars re-render when /the-office toggles
  const bodyRef = useRef<HTMLDivElement>(null)
  const [inputText, setInputText] = useState('')
  const [showSlashHint, setShowSlashHint] = useState(false)
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState<number | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const onSendRef = useRef(onSendMessage)
  onSendRef.current = onSendMessage

  const fileInputRef = useRef<HTMLInputElement>(null)
  const composerRef = useRef<HTMLInputElement>(null)
const slashWrapRef = useRef<HTMLDivElement>(null)
  const [attachedFile, setAttachedFile] = useState<{ name: string; url: string; path?: string } | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const base64Data = reader.result as string
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: file.name, data: base64Data, type: file.type }),
        })
        const json = await res.json()
        if (json.ok) {
          setAttachedFile({ name: file.name, url: json.url, path: json.path })
        }
      }
      reader.readAsDataURL(file)
    } catch (err) {
      console.error('File upload failed:', err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSendMessage = () => {
    const trimmed = inputText.trim()
    if (!trimmed && !attachedFile) return

    // A video order is forwarded verbatim to the production engine, so keep the
    // boss's own outer spacing. Chat lines stay trimmed as before.
    const orderLike = /^\s*\/\S*(video|buat|bik)/i.test(inputText)
    let fullText = orderLike ? inputText : trimmed
    if (attachedFile) {
      const label = trimmed ? `${trimmed} ` : 'Tolong analisis file ini: '
      fullText = `${label}📎 [Lampiran: ${attachedFile.name} | ${attachedFile.path || attachedFile.url}]`
      setAttachedFile(null)
    }

    if (fullText === '/the-office' || fullText === '/theoffice') {
      toggleTheme()
      const nowOn = getTheme() === 'office'
      onSendMessage?.(nowOn ? '🧻 Dunder Mifflin mode: ON. Identity theft is not a joke.' : '🔁 Office theme: OFF')
    } else {
      onSendMessage?.(fullText)
    }
    setInputText('')
    setShowSlashHint(false)
  }
  const handleQuickExecute = (cmd: string) => {
    setShowSlashHint(false)
    // Semua fitur slash command (/) bila diklik tidak langsung dieksekusi,
    // melainkan ditempel ke kolom input pesan (typing) dengan trailing space dan autofocus.
    const trimmed = cmd.trim()
    const textToInsert = trimmed.endsWith(' ') ? trimmed : `${trimmed} `
    setInputText(textToInsert)
    requestAnimationFrame(() => {
      if (composerRef.current) {
        composerRef.current.focus()
        const len = textToInsert.length
        composerRef.current.setSelectionRange?.(len, len)
      }
    })
  }

  // Close emoji picker on click outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (slashWrapRef.current && !slashWrapRef.current.contains(e.target as Node)) {
        setShowSlashHint(false)
      }
    }
    document.addEventListener('pointerdown', handleOutside)
    return () => document.removeEventListener('pointerdown', handleOutside)
  }, [])
  useEffect(() => {
    if (emojiPickerMsgId === null) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setEmojiPickerMsgId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [emojiPickerMsgId])

  const handleReaction = useCallback((msg: ChatMessage, emoji: string) => {
    const existing = msg.reactions || []
    const updated = existing.includes(emoji)
      ? existing.filter(r => r !== emoji)
      : [...existing, emoji]
    onReaction?.(msg.id, updated)
    setEmojiPickerMsgId(null)
  }, [onReaction])

  // Prompt-logging level — read-only in the UI (see logPromptsHint); silent when the route is missing.
  // The same GET /settings also says whether permission dialogs may be answered here.
  const [logPrompts, setLogPrompts] = useState<string | null>(null)
  const [answerHere, setAnswerHere] = useState<boolean | null>(null)
  useEffect(() => {
    fetch(SETTINGS_URL, { signal: AbortSignal.timeout(2000) })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d && typeof d.logPrompts === 'string') setLogPrompts(d.logPrompts)
        if (d && typeof d.answerPermissions === 'boolean') setAnswerHere(d.answerPermissions)
      })
      .catch(() => {})
  }, [])

  // Answer permissions from the office (answerPermissions) — the one setting
  // the page may change: POST /settings with the UI token from the snapshot
  // (src/permissions.ts). Optimistic; put back if the server said no.
  const toggleAnswerHere = useCallback(() => {
    if (answerHere === null) return
    const next = !answerHere
    setAnswerHere(next)
    postSetting({ answerPermissions: next }).then(ok => { if (!ok) setAnswerHere(answerHere) })
  }, [answerHere])

  // Cron/chat-monitor pause toggle
  const [cronPaused, setCronPaused] = useState(false)

  // Load initial state from server
  useEffect(() => {
    fetch(`${officeHttpBase()}/chat/cron-state`)
      .then(r => r.json())
      .then(d => setCronPaused(!!d.paused))
      .catch(() => {})
  }, [])

  const toggleCron = useCallback(() => {
    const newState = !cronPaused
    setCronPaused(newState)
    // Update the state file via a simple POST
    fetch(`${officeHttpBase()}/chat/cron-state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paused: newState }),
    }).catch(() => {})
  }, [cronPaused])

  // Auto-type effect for video mode
  useEffect(() => {
    if (!autoTypeText) {
      setInputText('')
      return
    }
    setInputText('')
    let i = 0
    const interval = setInterval(() => {
      i++
      if (i <= autoTypeText.length) {
        setInputText(autoTypeText.slice(0, i))
      } else {
        clearInterval(interval)
        // Auto-send after typing finishes
        setTimeout(() => {
          onSendRef.current?.(autoTypeText)
          setInputText('')
        }, 400)
      }
    }, 50 + Math.random() * 30) // slightly random typing speed
    return () => clearInterval(interval)
  }, [autoTypeText])

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, typingUser])

  const displayed = messages
  const onlineCount = onlineStaffCount ?? new Set(messages.slice(-20).filter(m => !m.isSystem).map(m => m.sender)).size

  return (
    <div className="slack-panel">
      <div className="slack-header">
        <div className="slack-header-left">
          <span className="slack-channel-icon">#</span>
          <span className="slack-channel-name">office-general</span>
          <div className="slack-online-badge" title={`${onlineCount} kru studio aktif`}>
            <div className="slack-online-dot" />
            <span className="slack-online-count">{onlineCount}</span>
          </div>
        </div>

        <div className="slack-header-right">
          <button
            type="button"
            className={`slack-cron-badge ${cronPaused ? 'paused' : 'active'}`}
            onClick={toggleCron}
            title={cronPaused ? 'AI Agent dijeda — klik untuk aktifkan' : 'AI Agent aktif merespon chat — klik untuk jeda'}
          >
            <span className="slack-cron-indicator" />
            <span className="slack-cron-label">{cronPaused ? 'AI Off' : 'AI On'}</span>
          </button>

          <div className="slack-audio-box" title={`Volume: ${Math.round(volume * 100)}%`}>
            <button
              type="button"
              className="slack-mute-btn"
              onClick={onToggleMute}
              title={muted ? 'Unmute Suara' : 'Mute Suara'}
            >
              {muted ? '🔇' : volume < 0.4 ? '🔈' : '🔊'}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(volume * 100)}
              onChange={e => onVolumeChange(Number(e.target.value) / 100)}
              className="slack-volume-slider"
              title={`Volume: ${Math.round(volume * 100)}%`}
            />
          </div>

          {!readOnly && answerHere !== null && (
            <button
              type="button"
              className={`slack-answer-toggle ${answerHere ? 'on' : 'off'}`}
              onClick={toggleAnswerHere}
              title={answerHere
                ? 'Izin terminal dijawab langsung dari kantor'
                : 'Izin terminal dijawab manual di terminal'}
              data-testid="answer-permissions"
            >
              Ans: {answerHere ? 'on' : 'off'}
            </button>
          )}
        </div>
      </div>



      <IncidentBadge />

      <div className="slack-body" ref={bodyRef}>
        {displayed.map((msg) => {
          const isProactive = !msg.isSystem && PROACTIVE_PATTERN.test(msg.text)
          const senderLower = (msg.sender || '').toLowerCase()
          const isAgent = !msg.isSystem && senderLower !== 'caca' && senderLower !== 'boss' && !senderLower.includes('caca') && !senderLower.includes('boss')
          return (
            <React.Fragment key={msg.id}>
              <div
                className={`slack-msg${msg.isSystem ? ' slack-msg-system' : ''}${isProactive ? ' slack-msg-proactive' : ''}${isAgent ? ' slack-msg-agent-reply' : ''}${msg.tag ? ` slack-msg-${msg.tag}` : ''}`}
                onDoubleClick={() => !msg.isSystem && setEmojiPickerMsgId(prev => prev === msg.id ? null : msg.id)}
              >
                {!msg.isSystem && (
                  <div className="slack-avatar" style={{ border: `2px solid ${msg.senderColor}`, boxShadow: `0 0 6px ${msg.senderColor}40` }}>
                    <img
                      src={msg.avatarSrc ?? getAvatarSrc(msg.senderSprite)}
                      alt={msg.sender}
                      className="slack-avatar-img"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                    <div
                      className="slack-avatar-fallback"
                      style={{ background: msg.senderColor }}
                    />
                  </div>
                )}
                <div className="slack-msg-content">
                  {!msg.isSystem && (
                    <div className="slack-msg-header">
                      <span className="slack-sender" style={{ color: msg.senderColor }}>
                        {msg.displayName ?? themedDisplayName(msg.senderSprite, msg.sender)}
                      </span>
                      {msg.tag && <span className={`slack-tag ${msg.tag}`}>{msg.tag}</span>}
                      <span className="slack-time">{msg.timestamp}</span>
                    </div>
                  )}
                  <div className={`slack-msg-text${msg.isSystem ? ' slack-system-text' : ''}`}>
                    <FormattedMessage
                      text={msg.text}
                      isSystem={msg.isSystem}
                      onAction={(actionText) => {
                        if (actionText.startsWith('/')) {
                          handleQuickExecute(actionText)
                        } else {
                          onSendMessage?.(actionText)
                        }
                      }}
                    />
                  </div>
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="slack-reactions">
                      {msg.reactions.map((r, i) => (
                        <span
                          key={i}
                          className="slack-reaction"
                          onClick={() => handleReaction(msg, r)}
                          title="Click to remove"
                        >{r}</span>
                      ))}
                    </div>
                  )}
                  {emojiPickerMsgId === msg.id && (
                    <div className="slack-emoji-picker" ref={pickerRef}>
                      {EMOJI_PICKER.map(emoji => (
                        <button
                          key={emoji}
                          className={`slack-emoji-btn${msg.reactions?.includes(emoji) ? ' active' : ''}`}
                          onClick={() => handleReaction(msg, emoji)}
                        >{emoji}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {lastSeenId != null && msg.id === lastSeenId && (
                <div className="slack-seen-row">
                  <span className="slack-seen-label">Seen</span>
                  <img src={getAvatarSrc('assistant')} className="slack-seen-avatar" alt="seen" />
                </div>
              )}
            </React.Fragment>
          )
        })}
        {typingUser && (
          <div className="slack-msg slack-typing-row">
            <div className="slack-avatar" style={{ border: '2px solid #cc785c', boxShadow: '0 0 6px #cc785c40' }}>
              <img src={getAvatarSrc('assistant')} alt="typing" className="slack-avatar-img" />
            </div>
            <div className="slack-msg-content">
              <div className="slack-typing-label">{typingUser} is typing</div>
              <div className="slack-typing-dots"><span/><span/><span/></div>
            </div>
          </div>
        )}
      </div>

      <div className="slack-input-wrap" ref={slashWrapRef}>
        {showSlashHint && (
          <div className="slack-slash-hint">
            {SLASH_COMMANDS.filter(q => {
              const qStr = inputText.trim().toLowerCase()
              if (!qStr || qStr === '/') return true
              const qWord = qStr.startsWith('/') ? qStr.slice(1) : qStr
              return q.cmd.slice(1).startsWith(qWord) || q.desc.toLowerCase().includes(qWord)
            }).map(q => (
              <button
                key={q.cmd}
                type="button"
                className="slack-slash-item"
                onClick={() => handleQuickExecute(q.cmd)}
              >
                <span className="slack-slash-cmd">{q.cmd}</span>
                <span className="slack-slash-desc">{q.desc}</span>
              </button>
            ))}
          </div>
        )}
        {attachedFile && (
          <div style={{ padding: '4px 10px', background: 'rgba(249, 115, 22, 0.2)', borderTop: '1px solid #ea580c', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#fed7aa' }}>
            <span>📄 {attachedFile.name}</span>
            <button type="button" onClick={() => setAttachedFile(null)} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', fontWeight: 700 }}>✕</button>
          </div>
        )}
        <div className="slack-input-bar">
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{ background: 'none', border: 'none', fontSize: '15px', cursor: 'pointer', padding: '0 6px', color: '#94a3b8', lineHeight: 1 }}
            title="Lampirkan File (Gambar, Dokumen, Audio, Naskah, Code)"
          >
            {uploading ? '⏳' : '📎'}
          </button>
          <input
            type="text"
            ref={composerRef}
            className="slack-input-field"
            placeholder="Tanya apa saja ke Nara atau ketik pesan..."
            value={inputText}
            onChange={e => {
              const val = e.target.value
              setInputText(val)
              setShowSlashHint(val.startsWith('/'))
            }}
            onKeyDown={e => {
              if (e.key === 'Escape') {
                setShowSlashHint(false)
                return
              }
              if (e.key === 'Enter') {
                handleSendMessage()
              }
            }}

          />
          <button
            type="button"
            onClick={handleSendMessage}
            style={{
              background: '#f97316',
              border: 'none',
              color: '#ffffff',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              marginLeft: '4px',
              flexShrink: 0,
            }}
            title="Kirim pesan"
          >
            Kirim
          </button>
        </div>
      </div>
    </div>
  )
}

// Why: App re-renders every animation frame while anyone walks; the panel only
// needs to when a message, the typing indicator or a control changes
export default React.memo(SlackChat)
