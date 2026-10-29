import React from 'react'

interface FormattedMessageProps {
  text: string
  isSystem?: boolean
  onAction?: (actionText: string) => void
}

/**
 * Parses inline formatting: **bold**, *italic*, `code`, [link](url), [chip](action:...), [🔘 Option]
 */
function parseInline(str: string, onAction?: (actionText: string) => void): React.ReactNode[] {
  // Regex pattern matching:
  // 1: `code`
  // 2: **bold** or __bold__
  // 3: *italic* or _italic_
  // 4: [text](url/action)
  // 5: [🔘 Option] or [👉 Option] etc.
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|(?<!\*)\*[^*]+\*(?!\*)|(?<!_)_[^_]+_(?!_)|\[[^\]]+\]\([^)]+\)|\[[🔘👉⚡🎬📋💡✓•][^\]]+\])/gu

  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      parts.push(str.substring(lastIndex, match.index))
    }

    const token = match[0]
    if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={match.index} className="chat-inline-code">
          {token.slice(1, -1)}
        </code>
      )
    } else if ((token.startsWith('**') && token.endsWith('**')) || (token.startsWith('__') && token.endsWith('__'))) {
      parts.push(
        <strong key={match.index} className="chat-bold">
          {token.slice(2, -2)}
        </strong>
      )
    } else if ((token.startsWith('*') && token.endsWith('*')) || (token.startsWith('_') && token.endsWith('_'))) {
      parts.push(
        <em key={match.index} className="chat-italic">
          {token.slice(1, -1)}
        </em>
      )
    } else if (token.startsWith('[') && token.includes('](')) {
      const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/)
      if (linkMatch) {
        const label = linkMatch[1]
        const href = linkMatch[2].trim()

        const isAction =
          href.startsWith('action:') ||
          href.startsWith('chat:') ||
          href.startsWith('#action:') ||
          href.startsWith('#choice:') ||
          href.startsWith('#click:') ||
          href.startsWith('cmd:') ||
          href.startsWith('/')

        if (isAction) {
          const actionText = href.replace(/^(action:|chat:|#action:|#choice:|#click:|cmd:)/, '').trim() || href
          parts.push(
            <button
              key={match.index}
              type="button"
              className="chat-action-chip"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onAction?.(actionText || label)
              }}
              title={
                (actionText || label).startsWith('/')
                  ? `Klik untuk mengetik perintah: "${actionText || label}"`
                  : `Klik untuk mengirim: "${actionText || label}"`
              }
            >
              {label}
            </button>
          )
        } else {
          parts.push(
            <a
              key={match.index}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="chat-link"
            >
              {label}
            </a>
          )
        }
      } else {
        parts.push(token)
      }
    } else if (token.startsWith('[') && token.endsWith(']')) {
      // Standalone chip like [🔘 Pilihan A] or [👉 Buat Naskah]
      const label = token.slice(1, -1).trim()
      const cleanAction = label.replace(/^[🔘👉⚡🎬📋💡✓•]\s*/, '').trim()
      parts.push(
        <button
          key={match.index}
          type="button"
          className="chat-action-chip"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onAction?.(cleanAction || label)
          }}
          title={
            (cleanAction || label).startsWith('/')
              ? `Klik untuk mengetik perintah: "${cleanAction || label}"`
              : `Klik untuk mengirim: "${cleanAction || label}"`
          }
        >
          {label}
        </button>
      )
    } else {
      parts.push(token)
    }

    lastIndex = match.index + token.length
  }

  if (lastIndex < str.length) {
    parts.push(str.substring(lastIndex))
  }

  return parts
}

/**
 * Normalizes squashed text from LLM/chat (e.g. when headers or lists have missing newlines)
 */
function normalizeText(raw: string): string {
  let s = raw.replace(/\r\n/g, '\n')

  // Un-squash headers that are attached to previous sentence
  // e.g. "Asia. ## 🐻 8 jenis" -> "Asia.\n\n## 🐻 8 jenis"
  s = s.replace(/([^\n])\s*(#{1,4}\s+)/g, '$1\n\n$2')

  // Un-squash headers attached to first list item
  // e.g. "## 8 jenis 1. Beruang" -> "## 8 jenis\n\n1. Beruang"
  s = s.replace(/(#{1,4}\s+[^\n]+?)\s+(\d+\.\s+)/g, '$1\n\n$2')

  // Un-squash numbered lists following periods
  // e.g. "cokelat. 2. Beruang kutub" -> "cokelat.\n\n2. Beruang kutub"
  s = s.replace(/([.!?])\s+(\d+\.\s+[A-Z0-9])/g, '$1\n\n$2')

  // Un-squash bullet lists
  // e.g. "selesai. - Poin satu" -> "selesai.\n\n- Poin satu"
  s = s.replace(/([.!?])\s+([*•-]\s+)/g, '$1\n\n$2')

  return s
}

export const FormattedMessage: React.FC<FormattedMessageProps> = ({ text, isSystem = false, onAction }) => {
  if (isSystem) {
    return <span className="slack-system-text">{text}</span>
  }

  if (!text) return null

  const normalized = normalizeText(text)

  // Split out code blocks ```lang ... ``` first
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g
  const blocks: Array<{ type: 'code'; lang: string; content: string } | { type: 'text'; content: string }> = []
  let lastIndex = 0
  let codeMatch: RegExpExecArray | null

  while ((codeMatch = codeBlockRegex.exec(normalized)) !== null) {
    if (codeMatch.index > lastIndex) {
      blocks.push({
        type: 'text',
        content: normalized.substring(lastIndex, codeMatch.index),
      })
    }
    blocks.push({
      type: 'code',
      lang: codeMatch[1] || 'text',
      content: codeMatch[2].replace(/\n$/, ''),
    })
    lastIndex = codeMatch.index + codeMatch[0].length
  }

  if (lastIndex < normalized.length) {
    blocks.push({
      type: 'text',
      content: normalized.substring(lastIndex),
    })
  }

  return (
    <div className="chat-formatted-body">
      {blocks.map((block, bIdx) => {
        if (block.type === 'code') {
          return (
            <div key={bIdx} className="chat-code-block-wrap">
              <div className="chat-code-header">
                <span className="chat-code-lang">{block.lang}</span>
                <button
                  type="button"
                  className="chat-code-copy"
                  onClick={() => navigator.clipboard?.writeText(block.content)}
                  title="Salin Kode"
                >
                  Salin
                </button>
              </div>
              <pre className="chat-code-pre">
                <code>{block.content}</code>
              </pre>
            </div>
          )
        }

        // Process text paragraphs and lists
        const rawParas = block.content.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)

        return (
          <React.Fragment key={bIdx}>
            {rawParas.map((para, pIdx) => {
              // 1. Heading check
              const headingMatch = para.match(/^(#{1,4})\s+(.+)$/s)
              if (headingMatch) {
                const level = headingMatch[1].length
                const headingText = headingMatch[2].trim()
                const HeadingTag = (`h${Math.min(level + 1, 4)}` as keyof JSX.IntrinsicElements)
                return (
                  <HeadingTag key={pIdx} className={`chat-heading chat-heading-${level}`}>
                    {parseInline(headingText, onAction)}
                  </HeadingTag>
                )
              }

              // 2. Blockquote check
              if (para.startsWith('>')) {
                const quoteText = para.split('\n').map(l => l.replace(/^>\s?/, '')).join('\n')
                return (
                  <blockquote key={pIdx} className="chat-blockquote">
                    {parseInline(quoteText, onAction)}
                  </blockquote>
                )
              }

              // 3. Numbered List or Bullet List check
              const lines = para.split('\n').map(l => l.trim()).filter(Boolean)
              const isNumberedList = lines.length > 0 && lines.every(l => /^\d+\.\s+/.test(l))
              const isBulletList = lines.length > 0 && lines.every(l => /^[-*•]\s+/.test(l))

              if (isNumberedList) {
                return (
                  <div key={pIdx} className="chat-list-ordered">
                    {lines.map((line, lIdx) => {
                      const m = line.match(/^(\d+)\.\s+(.*)$/)
                      const num = m ? m[1] : `${lIdx + 1}`
                      const content = m ? m[2] : line
                      return (
                        <div key={lIdx} className="chat-list-item-num">
                          <span className="chat-num-badge">{num}</span>
                          <div className="chat-list-content">
                            {parseInline(content, onAction)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              }

              if (isBulletList) {
                return (
                  <div key={pIdx} className="chat-list-unordered">
                    {lines.map((line, lIdx) => {
                      const content = line.replace(/^[-*•]\s+/, '')
                      return (
                        <div key={lIdx} className="chat-list-item-bullet">
                          <span className="chat-bullet-dot">▪</span>
                          <div className="chat-list-content">
                            {parseInline(content, onAction)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              }

              // 4. Regular paragraph (may have single newlines inside)
              return (
                <p key={pIdx} className="chat-paragraph">
                  {para.split('\n').map((line, lIdx, arr) => (
                    <React.Fragment key={lIdx}>
                      {parseInline(line, onAction)}
                      {lIdx < arr.length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </p>
              )
            })}
          </React.Fragment>
        )
      })}
    </div>
  )
}

export default FormattedMessage
