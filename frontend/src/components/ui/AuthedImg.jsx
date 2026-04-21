import React, { useEffect, useState } from 'react'
import { mediaUrl, isProtectedUploadPath } from '../../utils/mediaUrl'

/**
 * Renders upload URLs with Bearer auth via blob URL. Pass-through for external http(s) URLs.
 */
export default function AuthedImg({ src, alt = '', className = '', loading = 'lazy', ...rest }) {
  const [blobUrl, setBlobUrl] = useState('')
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!src || !isProtectedUploadPath(src)) {
      setBlobUrl('')
      setFetching(false)
      return
    }

    setFetching(true)
    let objectUrl = ''
    const abs = mediaUrl(src)
    const token = localStorage.getItem('token')
    const ctrl = new AbortController()

    fetch(abs, {
      signal: ctrl.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    })
      .then((r) => {
        if (!r.ok) throw new Error('fetch failed')
        return r.blob()
      })
      .then((b) => {
        objectUrl = URL.createObjectURL(b)
        setBlobUrl(objectUrl)
      })
      .catch(() => setBlobUrl(''))
      .finally(() => setFetching(false))

    return () => {
      ctrl.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src])

  if (!src) return null

  if (!isProtectedUploadPath(src)) {
    return <img src={mediaUrl(src)} alt={alt} className={className} loading={loading} {...rest} />
  }

  if (fetching || !blobUrl) {
    return <div className={`${className} animate-pulse bg-slate-300/40 dark:bg-slate-600/40`} aria-hidden />
  }

  return <img src={blobUrl} alt={alt} className={className} loading={loading} {...rest} />
}
