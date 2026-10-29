/**
 * serverUrl.ts — where the office server is, derived from where the page was
 * loaded instead of a constant.
 *
 * Supports both localhost development and mobile LAN access (e.g. 192.168.1.x:3333 -> 192.168.1.x:3334).
 */

export const DEFAULT_SERVER_PORT = 3334
export const VITE_DEV_PORT = 3333

export interface PageLocation {
  protocol: string
  hostname: string
  host: string
  port: string
  origin: string
}

export interface BuildEnv {
  dev: boolean
  port?: string | number
}

const NO_WINDOW: PageLocation = {
  protocol: 'http:',
  hostname: '127.0.0.1',
  host: `127.0.0.1:${DEFAULT_SERVER_PORT}`,
  port: String(DEFAULT_SERVER_PORT),
  origin: `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
}

function pageLocation(): PageLocation {
  return typeof window !== 'undefined' && window.location ? window.location : NO_WINDOW
}

function buildEnv(): BuildEnv {
  return { dev: !!import.meta.env.DEV, port: import.meta.env.VITE_AGENT_OFFICE_PORT }
}

export function configuredServerPort(env: BuildEnv = buildEnv()): number {
  const n = Number(env.port)
  return Number.isInteger(n) && n >= 1 && n <= 65535 ? n : DEFAULT_SERVER_PORT
}

export function isDevServerPage(loc: PageLocation = pageLocation(), env: BuildEnv = buildEnv()): boolean {
  return env.dev || loc.port === String(VITE_DEV_PORT)
}

/** The server's http(s) origin: fetch(`${officeHttpBase()}/chat`). Uses LAN IP when accessed via LAN. */
export function officeHttpBase(loc: PageLocation = pageLocation(), env: BuildEnv = buildEnv()): string {
  if (!isDevServerPage(loc, env)) return loc.origin
  const host = loc.hostname && loc.hostname !== 'localhost' ? loc.hostname : '127.0.0.1'
  const protocol = loc.protocol || 'http:'
  return `${protocol}//${host}:${configuredServerPort(env)}`
}

/** The WebSocket URL: ws(s)://<host>:<port>/ws. Uses LAN IP when accessed via mobile LAN. */
export function officeWsUrl(loc: PageLocation = pageLocation(), env: BuildEnv = buildEnv()): string {
  if (!isDevServerPage(loc, env)) return `${loc.protocol === 'https:' ? 'wss' : 'ws'}://${loc.host}/ws`
  const proto = loc.protocol === 'https:' ? 'wss' : 'ws'
  const host = loc.hostname && loc.hostname !== 'localhost' ? loc.hostname : '127.0.0.1'
  return `${proto}://${host}:${configuredServerPort(env)}/ws`
}
