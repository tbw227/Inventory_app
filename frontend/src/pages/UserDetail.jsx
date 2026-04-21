import React, { useEffect, useState, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import ProfileCard, { profileActionClass } from '../components/profile/ProfileCard'

export default function UserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/users/${id}`)
      setMember(res.data)
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not load team member')
      setMember(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file || !member) return
    setSaveError(null)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('photo', file)
      const up = await api.post('/upload', formData)
      const url = up.data?.url
      if (!url) throw new Error('Upload failed')
      const res = await api.put(`/users/${id}`, { photo_url: url })
      setMember(res.data)
    } catch (err) {
      setSaveError(err?.response?.data?.error || err.message || 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function removePhoto() {
    if (!member || !window.confirm('Remove this profile photo?')) return
    setSaveError(null)
    setUploading(true)
    try {
      const res = await api.put(`/users/${id}`, { photo_url: '' })
      setMember(res.data)
    } catch (err) {
      setSaveError(err?.response?.data?.error || 'Could not update profile')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    )
  }

  if (error || !member) {
    return (
      <div className="max-w-lg">
        <p className="rounded-2xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {error || 'Not found'}
        </p>
        <Link
          to="/users"
          className="mt-4 inline-block text-sm font-medium text-teal-600 transition-colors hover:text-teal-500 dark:text-teal-400"
        >
          ← Back to team
        </Link>
      </div>
    )
  }

  const hasPhoto = Boolean(member.photo_url?.trim())
  const roleLabel = member.role === 'admin' ? 'Administrator' : 'Technician'
  const skills = Array.isArray(member.skills) ? member.skills : []

  const avatarActions =
    isAdmin ? (
      <div className="flex flex-col items-center gap-2 sm:items-start">
        <label className="cursor-pointer">
          <span className="inline-flex justify-center rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200/90 transition-colors hover:bg-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600">
            {uploading ? '…' : hasPhoto ? 'Change photo' : 'Add photo'}
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={handlePhotoChange}
          />
        </label>
        {photoSrc && (
          <button
            type="button"
            onClick={removePhoto}
            disabled={uploading}
            className="text-[11px] font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
          >
            Remove photo
          </button>
        )}
      </div>
    ) : null

  return (
    <div className="mx-auto max-w-4xl">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-6 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
      >
        ← Back
      </button>

      {saveError && (
        <div className="mb-6 rounded-2xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {saveError}
        </div>
      )}

      <ProfileCard
        name={member.name}
        role={roleLabel}
        avatarUrl={member.photo_url || ''}
        fallbackName={member.name}
        bio={member.bio}
        location={member.location}
        birthday={member.birthday}
        company={member.company_name || ''}
        skills={skills}
        email={member.email}
        phone={member.phone || ''}
        avatarActions={avatarActions}
        socialExtra={
          <Link to="/users" title="Team" aria-label="Team list">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.65} viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </Link>
        }
        detailRow={
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/90 to-white/60 px-4 py-4 dark:border-slate-700/80 dark:from-slate-800/50 dark:to-slate-900/40">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Email
              </p>
              <a
                href={`mailto:${member.email}`}
                className="mt-2 block truncate text-sm font-medium text-teal-700 hover:text-teal-600 dark:text-teal-400 dark:hover:text-teal-300"
              >
                {member.email}
              </a>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/90 to-white/60 px-4 py-4 dark:border-slate-700/80 dark:from-slate-800/50 dark:to-slate-900/40">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Member since
              </p>
              <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-100">
                {member.createdAt
                  ? new Date(member.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })
                  : '—'}
              </p>
            </div>
          </div>
        }
        headerActions={
          <>
            <a href={`mailto:${member.email}`} className={profileActionClass('primary')}>
              Email
            </a>
            {member.phone ? (
              <a href={`tel:${member.phone}`} className={profileActionClass('secondary')}>
                Call
              </a>
            ) : null}
            <Link to="/users" className={profileActionClass('secondary')}>
              Team
            </Link>
            {isAdmin && (
              <Link to="/users" state={{ editUserId: member._id }} className={profileActionClass('accent')}>
                Edit
              </Link>
            )}
          </>
        }
      />
    </div>
  )
}
