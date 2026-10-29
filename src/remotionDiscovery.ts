/**
 * remotionDiscovery - the compositions THIS bundle actually contains.
 *
 * Vite resolves the glob when the page is built (or when a dev server reloads),
 * so a draft written to src/remotion/compositions/ a minute ago is invisible to
 * an already-open tab: the JS bundle has no import for it. Keeping the lookup in
 * one module lets every surface agree on "is this draft playable right now?".
 *
 * The server side of the answer lives in GET /api/compositions (live disk scan);
 * ui = bundle registry, disk = source of truth.
 */
import type { ComponentType } from 'react'

export interface MotionItem {
  id: string
  title: string
  duration: number
  frames: number
  fps: number
  compName: string
  width?: number
  height?: number
  order?: number
}

const compositionModules = import.meta.glob<Record<string, any>>(
  './remotion/compositions/*.tsx',
  { eager: true },
)

export const COMPONENT_REGISTRY: Record<string, ComponentType<any>> = {}
export const DISCOVERED_PROJECTS: MotionItem[] = []

for (const [filePath, mod] of Object.entries(compositionModules)) {
  if (mod) {
    if (mod.compositionMeta) {
      const meta = mod.compositionMeta as MotionItem
      const Comp = mod[meta.compName] || mod.default
      if (Comp) {
        COMPONENT_REGISTRY[meta.compName] = Comp
        if (!DISCOVERED_PROJECTS.some((project) => project.id === meta.id)) {
          DISCOVERED_PROJECTS.push(meta)
        }
      }
    } else {
      // Fallback auto-discovery
      const fileName = filePath.split('/').pop()?.replace(/\.tsx?$/, '')
      const Comp = (fileName && mod[fileName]) || mod.default
      if (fileName && Comp) {
        const meta: MotionItem = {
          id: fileName,
          compName: fileName,
          title: fileName.replace(/([A-Z])/g, ' $1').trim(),
          duration: 30,
          frames: 900,
          fps: 30,
          width: 1080,
          height: 1920,
          order: 1,
        }
        COMPONENT_REGISTRY[fileName] = Comp
        if (!DISCOVERED_PROJECTS.some((project) => project.id === meta.id)) {
          DISCOVERED_PROJECTS.push(meta)
        }
      }
    }
  }
}

DISCOVERED_PROJECTS.sort((a, b) => (a.order ?? 50) - (b.order ?? 50))

/** True when this bundle can play the composition right now. */
export function hasComposition(compName?: string | null): boolean {
  return !!compName && !!COMPONENT_REGISTRY[compName]
}
