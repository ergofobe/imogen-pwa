import { useEffect, useState } from 'react'
import type { ImgHTMLAttributes } from 'react'
import { useBearer } from '../lib/accounts.ts'

/**
 * An `<img>` cannot send the bearer token the SDK holds. When the session is a
 * token, the bytes come from a call the SDK already makes (`assets.blob`, or
 * `http.send` for a people thumbnail). A cookie session keeps the plain URL.
 */
export function RemoteImage({
  src,
  load,
  ...rest
}: ImgHTMLAttributes<HTMLImageElement> & { load?: () => Promise<Blob> }) {
  const bearer = useBearer()
  const authed = Boolean(bearer && load)
  const url = useObjectUrl(authed, src, load)
  return <img {...rest} src={url} />
}

export function useObjectUrl(
  enabled: boolean,
  src: string | undefined,
  load: (() => Promise<Blob>) | undefined,
): string | undefined {
  const [objectUrl, setObjectUrl] = useState<string | undefined>(enabled ? undefined : src)

  useEffect(() => {
    if (!enabled || !load) {
      setObjectUrl(src)
      return
    }
    let cancelled = false
    let created: string | undefined
    load()
      .then((blob) => {
        if (cancelled) return
        created = URL.createObjectURL(blob)
        setObjectUrl(created)
      })
      .catch(() => {
        if (!cancelled) setObjectUrl(undefined)
      })
    return () => {
      cancelled = true
      if (created) URL.revokeObjectURL(created)
    }
    // `load` is read from this render. Depending on its identity would refetch every paint.
  }, [enabled, src])

  return objectUrl
}
