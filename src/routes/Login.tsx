import { useState } from 'react'
import { Wordmark } from '../components/Wordmark.tsx'
import { beginSignIn } from '../lib/authFlow.ts'
import { configuredServerUrl, normalizeServerUrl } from '../lib/serverUrl.ts'

/**
 * Sign-in happens on the server. This screen only asks which server, then hands
 * the browser to that server's login. Passwords are not collected here.
 */
export function Login(_props: { onSignedIn?: () => void }) {
  const [server, setServer] = useState(configuredServerUrl)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const params = new URLSearchParams(window.location.search)
  const returnTo = params.get('returnTo')
  const invite = params.get('invite')
  const sentBackByServer = returnTo?.startsWith('/oauth/') ?? false

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    const serverUrl = normalizeServerUrl(server)
    if (!serverUrl) {
      setError('Enter the server address')
      return
    }

    // The server's own login page creates the first account and accepts invites.
    // Following it only makes sense when that page is not this app.
    if (invite) {
      if (new URL(serverUrl).origin === window.location.origin) {
        setError('Creating an account stays on the server. This app does not take a password.')
        return
      }
      window.location.assign(
        `${serverUrl}/login?invite=${encodeURIComponent(invite)}`,
      )
      return
    }

    if (sentBackByServer) return

    setBusy(true)
    try {
      await beginSignIn(serverUrl)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not reach that server')
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-[22rem]">
        <div className="mb-9">
          <Wordmark />
        </div>
        <h1 className="heading-display mb-2 text-2xl">Sign in</h1>
        <p className="mb-7 text-sm leading-relaxed text-muted">
          Your photo library, on your own server. You will sign in there, not in this app.
        </p>

        {sentBackByServer && (
          <p className="mb-5 text-sm leading-relaxed text-muted">
            This server sent sign-in back here. This app does not collect a password. Host it on
            another origin, or serve the server&apos;s own login page at this one.
          </p>
        )}

        <form onSubmit={submit} className="space-y-3.5">
          <label className="block">
            <span className="label-micro mb-1.5 block">Server</span>
            <input
              type="text"
              value={server}
              onChange={(event) => setServer(event.target.value)}
              autoComplete="url"
              inputMode="url"
              placeholder="photos.example.com"
              required
              className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-safelight"
            />
          </label>
          {error && <p className="text-sm text-safelight">{error}</p>}
          <button
            type="submit"
            disabled={busy || sentBackByServer}
            className="w-full rounded-lg bg-ink py-2.5 text-sm font-medium text-paper transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Working' : invite ? 'Continue on the server' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
