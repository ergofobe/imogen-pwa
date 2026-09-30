import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { completeSignIn } from '../lib/authFlow.ts'

/** The redirect the server sends back to. The code is exchanged by the SDK, then dropped. */
export function OAuthCallback() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    completeSignIn(window.location.href)
      .then(() => {
        window.location.replace('/')
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Could not sign in')
      })
  }, [])

  return (
    <div className="grid min-h-dvh place-items-center px-5">
      {error ? (
        <div className="w-full max-w-sm">
          <p className="mb-4 text-sm text-safelight">{error}</p>
          <Link to="/login" className="text-sm underline">
            Back
          </Link>
        </div>
      ) : (
        <p className="text-sm text-muted">Signing in</p>
      )}
    </div>
  )
}
