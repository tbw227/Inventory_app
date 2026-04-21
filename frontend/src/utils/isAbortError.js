/**
 * True when axios/fetch aborted due to AbortController (navigated away, deps changed, etc.).
 * Do not treat as a user-visible or auth failure.
 */
export function isAbortError(err) {
  if (!err || typeof err !== 'object') return false
  if (err.code === 'ERR_CANCELED') return true
  if (err.name === 'CanceledError' || err.name === 'AbortError') return true
  return false
}
