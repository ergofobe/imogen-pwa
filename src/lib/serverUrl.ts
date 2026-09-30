/**
 * Where the server lives.
 *
 * The build's `VITE_IMOGEN_SERVER_URL` is the default. Whatever the user types
 * over it is kept in the browser and wins, which is how an installed copy points
 * at a different server without a rebuild.
 *
 * An empty result means "this origin": the app is being served by the server, and
 * relative `/api` URLs keep working, including the dev proxy.
 */

const STORAGE_KEY = 'imogen.serverUrl'

export function normalizeServerUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  const loopback =
    trimmed.startsWith('localhost') ||
    trimmed.startsWith('127.0.0.1') ||
    trimmed.startsWith('[::1]')
  return loopback ? `http://${trimmed}` : `https://${trimmed}`
}

function envDefault(): string {
  const env = import.meta.env as { VITE_IMOGEN_SERVER_URL?: string } | undefined
  const value = env?.VITE_IMOGEN_SERVER_URL
  return typeof value === 'string' ? value.trim() : ''
}

/** The address a new sign-in uses: the saved one, else the deploy-time default. */
export function configuredServerUrl(): string {
  let saved = ''
  try {
    saved = localStorage.getItem(STORAGE_KEY)?.trim() ?? ''
  } catch {
    saved = ''
  }
  return normalizeServerUrl(saved || envDefault())
}

export function setConfiguredServerUrl(input: string): string {
  const normalized = normalizeServerUrl(input)
  localStorage.setItem(STORAGE_KEY, normalized)
  return normalized
}

/**
 * A URL the browser can request.
 *
 * Same-origin stays relative so a cookie session and the dev proxy keep working.
 * Anywhere else is absolute, because `/api` on the app's own host is not the server.
 */
export function serverPath(path: string): string {
  const base = configuredServerUrl()
  if (!base) return path
  try {
    if (typeof location !== 'undefined' && new URL(base).origin === location.origin) return path
  } catch {
    return path
  }
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`
}

export function serverLabel(serverUrl: string): string {
  try {
    return new URL(serverUrl).host
  } catch {
    return serverUrl
  }
}
