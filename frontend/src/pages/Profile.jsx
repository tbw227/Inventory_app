import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import ProfileCard, { profileActionClass } from '../components/profile/ProfileCard'

function parseSkillsInput(raw) {
  if (!raw || typeof raw !== 'string') return []
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30)
}

export default function Profile() {
  const { user, refreshUser } = useAuth()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saveOk, setSaveOk] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    bio: '',
    location: '',
    birthday: '',
    skillsText: '',
  })

  const syncFormFromUser = useCallback(() => {
    if (!user) return
    setForm({
      name: user.name || '',
      phone: user.phone || '',
      bio: user.bio || '',
      location: user.location || '',
      birthday: user.birthday || '',
      skillsText: Array.isArray(user.skills) ? user.skills.join(', ') : '',
    })
  }, [user])

  useEffect(() => {
    syncFormFromUser()
  }, [syncFormFromUser])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaveError(null)
    setSaveOk(false)
    setSaving(true)
    try {
      const skills = parseSkillsInput(form.skillsText)
      await api.put('/users/me', {
        name: form.name.trim(),
        phone: form.phone.trim(),
        bio: form.bio.trim(),
        location: form.location.trim(),
        birthday: form.birthday.trim(),
        skills,
      })
      await refreshUser()
      setSaveOk(true)
    } catch (err) {
      const d = err?.response?.data
      setSaveError(d?.details?.map((x) => x.message).join(', ') || d?.error || 'Could not save profile')
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    )
  }

  const roleLabel = user.role === 'admin' ? 'Administrator' : 'Technician'

  const inputClass =
    'w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-500/50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-600 dark:bg-slate-800/80 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-teal-500/40 dark:focus:ring-teal-500/15'

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-10">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
          Account
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Profile
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Your public team card and the fields coworkers see. Email and role are managed by an administrator.
        </p>
      </header>

      <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 lg:max-w-xl">
          <ProfileCard
            name={user.name}
            role={roleLabel}
            avatarUrl={user.photo_url || ''}
            fallbackName={user.name}
            bio={user.bio}
            location={user.location}
            birthday={user.birthday}
            company={user.company_name || ''}
            skills={user.skills}
            email={user.email}
            phone={user.phone || ''}
            socialExtra={
              <Link to="/settings" title="Settings" aria-label="Settings">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.65} viewBox="0 0 24 24" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
            }
            headerActions={
              <>
                <Link to="/settings" className={profileActionClass('secondary')}>
                  Settings
                </Link>
                <a href={`mailto:${user.email}`} className={profileActionClass('primary')}>
                  Message
                </a>
              </>
            }
          />
        </div>

        <form
          onSubmit={handleSubmit}
          className="w-full max-w-xl flex-1 rounded-2xl bg-white p-6 shadow-xl shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.06] dark:bg-slate-900 dark:shadow-black/30 dark:ring-white/[0.08] sm:p-8"
        >
          <div className="border-b border-slate-100 pb-5 dark:border-slate-800">
            <h2 className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
              Edit
            </h2>
            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">Profile details</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Changes apply to your team card immediately after save.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {saveError && (
              <div className="rounded-xl border border-red-200/80 bg-red-50/90 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                {saveError}
              </div>
            )}
            {saveOk && (
              <div className="rounded-xl border border-teal-200/80 bg-teal-50/90 px-3 py-2.5 text-sm text-teal-800 dark:border-teal-900/50 dark:bg-teal-950/40 dark:text-teal-200">
                Profile saved.
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  minLength={2}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">Birthday</label>
                <input
                  value={form.birthday}
                  onChange={(e) => setForm((f) => ({ ...f, birthday: e.target.value }))}
                  placeholder="e.g. December 21"
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">Location</label>
                <input
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">Biography</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  rows={4}
                  className={`${inputClass} resize-y`}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Skills <span className="font-normal text-slate-400">(comma or line separated)</span>
                </label>
                <textarea
                  value={form.skillsText}
                  onChange={(e) => setForm((f) => ({ ...f, skillsText: e.target.value }))}
                  rows={3}
                  placeholder="Inspections, compliance, reporting…"
                  className={`${inputClass} resize-y`}
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-100 pt-6 dark:border-slate-800">
            <button
              type="submit"
              disabled={saving}
              className={`${profileActionClass('primary')} disabled:pointer-events-none disabled:opacity-50`}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={() => {
                syncFormFromUser()
                setSaveOk(false)
                setSaveError(null)
              }}
              className={profileActionClass('secondary')}
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
