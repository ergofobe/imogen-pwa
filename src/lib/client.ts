import { ImogenClient, OAuthClient } from '@imogen/sdk'
import { activeAccount, refreshAccessToken } from './accounts.ts'
import { configuredServerUrl } from './serverUrl.ts'

/**
 * One client for whoever is in front.
 *
 * A stored account sends the bearer token `OAuthClient` already issued. With no
 * account, the client is cookie-only, which is enough when this app is served by
 * the server itself. The SDK attaches the cookie either way (`credentials: 'include'`).
 */

function baseUrl(): string {
  return (
    activeAccount()?.serverUrl ||
    configuredServerUrl() ||
    (typeof location !== 'undefined' ? location.origin : 'http://localhost')
  )
}

function build(): ImogenClient {
  const account = activeAccount()
  return new ImogenClient({
    baseUrl: baseUrl(),
    token: account
      ? async () => {
          const current = activeAccount()
          if (!current) return null
          if (OAuthClient.isExpired(current.tokens)) return refreshAccessToken(current)
          return current.tokens.access_token
        }
      : undefined,
    onUnauthorized: async () => {
      const current = activeAccount()
      if (!current) return null
      return refreshAccessToken(current)
    },
  })
}

let cached: { key: string; client: ImogenClient } | null = null

function currentClient(): ImogenClient {
  const account = activeAccount()
  const key = `${account?.id ?? ''}|${baseUrl()}`
  if (!cached || cached.key !== key) cached = { key, client: build() }
  return cached.client
}

export const imogen: ImogenClient = new Proxy({} as ImogenClient, {
  get(_target, property) {
    const client = currentClient()
    const value: unknown = Reflect.get(client, property, client)
    return typeof value === 'function'
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value
  },
})
