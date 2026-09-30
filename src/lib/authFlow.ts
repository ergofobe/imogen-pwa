import { ImogenClient, OAuthClient, type PendingAuthorization } from '@imogen/sdk'
import { addAccount } from './accounts.ts'
import { setConfiguredServerUrl } from './serverUrl.ts'

/**
 * Sign-in is the server's, via the SDK's authorization-code client. Same scopes
 * the Android app asks for. This file does not collect a password.
 *
 * Not done, because the server does not do it yet: a browser on another origin
 * cannot complete `OAuthClient.register` or `completeAuthorization`. Those hit
 * `/oauth/register` and `/oauth/token`, and the server sends
 * `Access-Control-Allow-Origin` only on the well-known discovery documents, not
 * on those routes or on `/api/v1/*`. The SDK calls are real. Nothing here stubs
 * a token or adds a header the server does not send. Same-origin still works,
 * because a same-origin fetch does not need CORS.
 *
 * Also not wrapped by the SDK, so this app still fetches them itself (pointed at
 * the configured server) and does not invent methods:
 *   GET  /api/v1/share/:slug
 *   GET  /api/v1/share/:slug/timeline
 *   GET  /api/v1/share/:slug/timeline/bucket
 *   GET  /api/v1/share/:slug/assets/:id
 *   POST /api/v1/share/:slug/unlock
 * People thumbnails have `People.thumbnailUrl` (an `<img src>` URL, no token)
 * and no byte method. A bearer session loads those bytes with `HttpClient.send`,
 * which the SDK already exposes. No new SDK method.
 */

const SCOPES = ['library:read', 'library:write', 'albums:read', 'albums:write', 'profile']
const PENDING_KEY = 'imogen.pendingSignIn'

type PendingSignIn = PendingAuthorization & { serverUrl: string }

export function redirectUri(): string {
  return `${location.origin}/oauth/callback`
}

export async function beginSignIn(serverInput: string): Promise<void> {
  const serverUrl = setConfiguredServerUrl(serverInput)
  if (!serverUrl) throw new Error('Enter the server address')

  const oauth = new OAuthClient(serverUrl)
  const resource = (await oauth.discoverProtectedResource()).resource
  const registered = await oauth.register('imogen', [redirectUri()], SCOPES)
  const pending = await oauth.beginAuthorization(
    registered.client_id,
    redirectUri(),
    SCOPES,
    resource,
  )
  const stored: PendingSignIn = { ...pending, serverUrl }
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(stored))
  location.assign(pending.authorizationUrl)
}

export async function completeSignIn(callbackUrl: string): Promise<void> {
  const raw = sessionStorage.getItem(PENDING_KEY)
  if (!raw) throw new Error('There is no sign-in waiting for this callback')
  const pending = JSON.parse(raw) as PendingSignIn
  const oauth = new OAuthClient(pending.serverUrl)
  const tokens = await oauth.completeAuthorization(pending, callbackUrl)
  sessionStorage.removeItem(PENDING_KEY)

  const user = await new ImogenClient({
    baseUrl: pending.serverUrl,
    token: tokens.access_token,
  }).auth.me()

  addAccount({
    id: crypto.randomUUID(),
    serverUrl: pending.serverUrl,
    userId: user.id,
    email: user.email,
    name: user.name,
    clientId: pending.clientId,
    tokens,
  })
}
