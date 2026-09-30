import { OAuthClient, type StoredTokens } from '@imogen/sdk'
import { useSyncExternalStore } from 'react'
import { configuredServerUrl, serverLabel } from './serverUrl.ts'

/**
 * Several accounts, switched locally, the way the phone apps do it.
 *
 * The phone apps keep this in an encrypted store. A browser has localStorage.
 * The shape is the same idea: one row per (server, user), a bearer token the SDK
 * already knows how to send, and an active row. Signing in again to a server this
 * browser already has replaces that row instead of adding a second grant.
 *
 * What this file does not do is invent a token. `auth.login` on the SDK returns
 * the user and lets the server set a cookie; it does not hand back a bearer token.
 * Tokens here are only what `OAuthClient` already returns.
 */

const STORAGE_KEY = 'imogen.accounts'

export type Account = {
  id: string
  serverUrl: string
  userId: string
  email: string
  name: string
  clientId: string
  tokens: StoredTokens
}

type Book = {
  accounts: Account[]
  activeAccountId: string | null
}

const empty: Book = { accounts: [], activeAccountId: null }

let book: Book = load()
const listeners = new Set<() => void>()
const refreshing = new Map<string, Promise<string | null>>()

function load(): Book {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...empty, accounts: [] }
    const parsed = JSON.parse(raw) as Partial<Book>
    const accounts = Array.isArray(parsed.accounts) ? parsed.accounts : []
    const activeAccountId =
      typeof parsed.activeAccountId === 'string' ? parsed.activeAccountId : null
    return { accounts, activeAccountId }
  } catch {
    return { ...empty, accounts: [] }
  }
}

function emit() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(book))
  for (const listener of listeners) listener()
}

export function subscribeAccounts(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function accountBook(): Book {
  return book
}

export function activeAccount(): Account | null {
  return (
    book.accounts.find((account) => account.id === book.activeAccountId) ??
    book.accounts[0] ??
    null
  )
}

export function useAccountBook(): Book {
  return useSyncExternalStore(subscribeAccounts, accountBook, () => empty)
}

export function useActiveAccount(): Account | null {
  return useSyncExternalStore(subscribeAccounts, activeAccount, () => null)
}

/** True when calls must carry a bearer token. A cookie-only session is not one of these. */
export function useBearer(): boolean {
  return useSyncExternalStore(
    subscribeAccounts,
    () => Boolean(activeAccount()?.tokens.access_token),
    () => false,
  )
}

export function addAccount(account: Account): Account {
  const kept = book.accounts.find(
    (existing) => existing.serverUrl === account.serverUrl && existing.userId === account.userId,
  )
  const merged: Account = kept ? { ...account, id: kept.id } : account
  const others = book.accounts.filter((existing) => existing.id !== merged.id)
  book = { accounts: [...others, merged], activeAccountId: merged.id }
  emit()
  return merged
}

export function setActiveAccount(accountId: string) {
  if (!book.accounts.some((account) => account.id === accountId)) return
  book = { ...book, activeAccountId: accountId }
  emit()
}

export function removeAccount(accountId: string) {
  const accounts = book.accounts.filter((account) => account.id !== accountId)
  const activeAccountId =
    book.activeAccountId === accountId ? (accounts[0]?.id ?? null) : book.activeAccountId
  book = { accounts, activeAccountId }
  emit()
}

function writeTokens(accountId: string, tokens: StoredTokens) {
  book = {
    ...book,
    accounts: book.accounts.map((account) =>
      account.id === accountId ? { ...account, tokens } : account,
    ),
  }
  emit()
}

/** One refresh in flight per account. A rotated refresh token must not be spent twice. */
export function refreshAccessToken(account: Account): Promise<string | null> {
  const refreshToken = account.tokens.refresh_token
  if (!refreshToken) return Promise.resolve(null)
  const existing = refreshing.get(account.id)
  if (existing) return existing
  const job = (async () => {
    const oauth = new OAuthClient(account.serverUrl)
    const next = await oauth.refresh(account.clientId, refreshToken)
    const latest = book.accounts.find((item) => item.id === account.id)
    if (latest && next.obtainedAt >= latest.tokens.obtainedAt) writeTokens(account.id, next)
    return next.access_token
  })().finally(() => refreshing.delete(account.id))
  refreshing.set(account.id, job)
  return job
}

export function accountLabel(account: Account): string {
  return `${account.name} · ${serverLabel(account.serverUrl)}`
}


/** Library and share URLs for the active account, or the saved default when nobody is signed in. */
export function apiPath(path: string): string {
  const base = activeAccount()?.serverUrl || configuredServerUrl()
  if (!base) return path
  try {
    if (typeof location !== "undefined" && new URL(base).origin === location.origin) return path
  } catch {
    return path
  }
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`
}
