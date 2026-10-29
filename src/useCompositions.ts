/**
 * useCompositions - what the studio has on disk, right now.
 *
 * GET /api/compositions scans src/remotion/compositions every few seconds. The
 * browser bundle only knows the drafts that existed when it was built, so this
 * hook is how the UI notices "there is a newer draft than this page can play".
 */
import { useEffect, useState } from 'react'

export interface ServerComposition {
  id: string
  compName: string
  title?: string
  duration?: number
  frames?: number
  fps?: number
  width?: number
  height?: number
  order?: number
  /** File name on disk, e.g. ManfaatBuahJeruk.tsx */
  file: string
  /** mtime, used to tell a fresh draft from an old one. */
  updatedAt: number
}

export interface ServerCompositions {
  compositions: ServerComposition[]
  /** False until the first successful answer: avoids hiding drafts on startup. */
  loaded: boolean
}

export function useServerCompositions(pollMs = 4000): ServerCompositions {
  const [state, setState] = useState<ServerCompositions>({ compositions: [], loaded: false })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/compositions')
        const data = await res.json()
        if (cancelled) return
        if (data?.ok && Array.isArray(data.compositions)) {
          setState({ compositions: data.compositions as ServerComposition[], loaded: true })
        }
      } catch (_) {
        // Server restarting or offline: keep the last answer.
      }
    }
    load()
    const timer = setInterval(load, pollMs)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [pollMs])

  return state
}
