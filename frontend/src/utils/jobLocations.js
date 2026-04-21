/**
 * Resolved station/location docs for a job (API adds `locations` when populated).
 */
export function getJobLocations(job) {
  if (!job) return []
  if (Array.isArray(job.locations) && job.locations.length) {
    return job.locations.filter((l) => l && (l.name || l._id))
  }
  const many = job.location_ids
  if (Array.isArray(many) && many.length) {
    return many.filter((l) => l && typeof l === 'object' && l.name)
  }
  if (job.location_id && typeof job.location_id === 'object' && job.location_id.name) {
    return [job.location_id]
  }
  return []
}

/** Mongo ids for job forms (create/update). */
export function getJobLocationIds(job) {
  if (!job) return []
  const locs = getJobLocations(job)
  if (locs.length) return locs.map((l) => l._id || l).filter(Boolean)
  const raw = job.location_ids
  if (Array.isArray(raw) && raw.length) {
    return raw.map((id) => (typeof id === 'object' ? id._id : id)).filter(Boolean)
  }
  const one = job.location_id
  if (!one) return []
  const id = typeof one === 'object' ? one._id : one
  return id ? [id] : []
}
