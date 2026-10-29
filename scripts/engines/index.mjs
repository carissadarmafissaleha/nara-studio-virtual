/**
 * Engine registry — Exclusive for DeepSeek & Antigravity (AGY).
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import * as none from './none.mjs'
import * as deepseek from './deepseek.mjs'
import * as antigravity from './antigravity.mjs'
import * as opencode from './opencode.mjs'

/** Alias yang diterima di chat / `engine.json` → kunci engine sebenarnya. */
export const ENGINE_ALIASES = {
  agy: 'antigravity',
  antigravity: 'antigravity',
  ds: 'deepseek',
  deepseek: 'deepseek',
  oc: 'opencode',
  opencode: 'opencode',
}

/** Nama kunci engine dari alias apa pun; null bila tidak dikenal. */
export function resolveEngineKey(raw) {
  const key = String(raw || '').trim().toLowerCase()
  return ENGINE_ALIASES[key] || (ENGINES[key] ? key : null)
}

export const ENGINES = { none, deepseek, antigravity, opencode }

export function engineConfigPath() {
  const home = process.env.AGENT_OFFICE_HOME || path.join(os.homedir(), '.agent-office')
  return path.join(home, 'engine.json')
}

const DEFAULTS = {
  active: 'deepseek',
  targets: {
    deepseek: { url: '' },
    antigravity: {},
    opencode: {},
  },
}

export function loadEngineConfig() {
  let onDisk = {}
  try {
    onDisk = JSON.parse(fs.readFileSync(engineConfigPath(), 'utf8')) || {}
  } catch {}
  const targets = { ...DEFAULTS.targets, ...(onDisk.targets || {}) }
  const active = resolveEngineKey(onDisk.active) || DEFAULTS.active
  return { active, targets, found: !!onDisk.active }
}

/** Resolve the configured engine, falling back to the harmless "none". */
export function activeEngine(conf = loadEngineConfig()) {
  const key = ENGINES[conf.active] ? conf.active : 'none'
  return { mod: ENGINES[key], key, target: conf.targets[key] || {} }
}

export async function sendToEngine({ text, orderId, directory }) {
  const conf = loadEngineConfig()
  const { mod, key, target } = activeEngine(conf)
  const result = await mod.send(target, { text, orderId, directory })
  return { ...result, engine: key }
}

export async function pingEngine() {
  const conf = loadEngineConfig()
  const { mod, key, target } = activeEngine(conf)
  const res = await mod.ping(target)
  return { ...res, engine: key }
}