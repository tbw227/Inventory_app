/**
 * List endpoints return either a plain array (legacy) or { data: [], pagination }.
 */
export function unwrapList(body) {
  if (body == null) return []
  if (Array.isArray(body)) return body
  if (Array.isArray(body.data)) return body.data
  return []
}
