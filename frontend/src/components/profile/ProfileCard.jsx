import React from 'react'
import { getInitials, avatarColor } from '../../utils/initials'
import AuthedImg from '../ui/AuthedImg'

/** Use on header action links for a consistent, polished button row. */
export function profileActionClass(variant = 'secondary') {
  const base =
    'inline-flex cursor-pointer items-center justify-center gap-2 min-h-[2.5rem] px-5 text-sm font-medium rounded-full transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
  switch (variant) {
    case 'primary':
      return `${base} bg-teal-600 text-white shadow-md shadow-teal-600/20 hover:bg-teal-500 hover:shadow-lg hover:shadow-teal-600/25 focus-visible:outline-teal-500 active:scale-[0.98]`
    case 'accent':
      return `${base} bg-indigo-600 text-white shadow-md shadow-indigo-600/15 hover:bg-indigo-500 focus-visible:outline-indigo-500 active:scale-[0.98]`
    default:
      return `${base} border border-slate-200/90 dark:border-slate-600 bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-500 focus-visible:outline-slate-400 active:scale-[0.98]`
  }
}

function SectionLabel({ children }) {
  return (
    <h3 className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
      {children}
    </h3>
  )
}

function MetaTile({ icon, label, value }) {
  return (
    <div className="group rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-gradient-to-b from-slate-50/90 to-white/60 dark:from-slate-800/50 dark:to-slate-900/40 px-4 py-4 transition-colors hover:border-teal-200/60 dark:hover:border-teal-800/50">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10 group-hover:text-teal-500">
          {icon}
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
          <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100 leading-snug">{value}</p>
        </div>
      </div>
    </div>
  )
}

const iconPin = (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)
const iconCalendar = (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)
const iconBuilding = (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
)

function SocialIconButton({ href, label, children }) {
  const inner = (
    <span className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/90 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 shadow-sm transition-all duration-200 hover:border-teal-300/70 dark:hover:border-teal-700 hover:text-teal-600 dark:hover:text-teal-300 hover:shadow-md hover:-translate-y-0.5">
      {children}
    </span>
  )
  if (!href) {
    return (
      <span className="inline-flex opacity-40 grayscale" title={label} aria-hidden>
        {inner}
      </span>
    )
  }
  return (
    <a href={href} className="inline-flex" title={label} aria-label={label}>
      {inner}
    </a>
  )
}

/**
 * Polished team / member profile: editorial hierarchy, soft depth, icon meta tiles, refined actions.
 */
export default function ProfileCard({
  name = '',
  role = '',
  avatarUrl = '',
  fallbackName,
  bio = '',
  location = '',
  birthday = '',
  company = '',
  skills = [],
  email = '',
  phone = '',
  headerActions = null,
  avatarActions = null,
  socialExtra = null,
  detailRow = null,
  className = '',
}) {
  const forInitials = fallbackName || name
  const initials = getInitials(forInitials)
  const avColor = avatarColor(forInitials)
  const displayBio = bio?.trim() || 'No biography has been added yet.'
  const displayLocation = location?.trim() || '—'
  const displayBirthday = birthday?.trim() || '—'
  const displayCompany = company?.trim() || '—'
  const skillList = Array.isArray(skills) ? skills.filter(Boolean) : []
  const mailto = email?.trim() ? `mailto:${email.trim()}` : ''
  const tel = phone?.trim() ? `tel:${phone.trim()}` : ''
  const isAdminRole = /admin/i.test(role)

  return (
    <article
      className={`relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-xl shadow-slate-900/[0.04] dark:shadow-black/30 ring-1 ring-slate-900/[0.06] dark:ring-white/[0.08] ${className}`}
    >
      <div
        className="h-1 w-full bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-500"
        aria-hidden
      />

      <div className="relative px-6 py-8 sm:px-10 sm:py-10">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-teal-400/[0.07] dark:bg-teal-400/[0.05] blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-20 bottom-0 h-48 w-48 rounded-full bg-indigo-500/[0.06] dark:bg-indigo-500/[0.05] blur-3xl"
          aria-hidden
        />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-col gap-6 sm:flex-row sm:items-start">
            <div className="flex shrink-0 flex-col items-center gap-3 sm:items-start">
              <div className="relative">
                <div
                  className="absolute -inset-1 rounded-full bg-gradient-to-br from-teal-400/50 via-cyan-400/30 to-indigo-500/40 opacity-90 blur-md"
                  aria-hidden
                />
                <div className="relative rounded-full p-1 ring-4 ring-white dark:ring-slate-900">
                  {avatarUrl ? (
                    <AuthedImg
                      src={avatarUrl}
                      alt={name || 'Profile'}
                      className="h-40 w-40 rounded-full object-cover sm:h-44 sm:w-44 lg:h-48 lg:w-48"
                    />
                  ) : (
                    <div
                      className={`flex h-40 w-40 items-center justify-center rounded-full text-3xl font-semibold text-white sm:h-44 sm:w-44 sm:text-4xl lg:h-48 lg:w-48 ${avColor}`}
                    >
                      {initials}
                    </div>
                  )}
                </div>
              </div>
              {avatarActions ? (
                <div className="w-full max-w-[12rem] text-center sm:text-left">{avatarActions}</div>
              ) : null}
            </div>

            <div className="min-w-0 flex-1 pt-1 text-center sm:text-left">
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                  {name || '—'}
                </h2>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    isAdminRole
                      ? 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-200 ring-1 ring-violet-200/80 dark:ring-violet-800/50'
                      : 'bg-teal-100 text-teal-900 dark:bg-teal-950/50 dark:text-teal-200 ring-1 ring-teal-200/80 dark:ring-teal-800/50'
                  }`}
                >
                  {role}
                </span>
              </div>
            </div>
          </div>

          {headerActions ? (
            <div className="relative flex flex-wrap items-center justify-center gap-2 lg:max-w-md lg:justify-end">
              {headerActions}
            </div>
          ) : null}
        </div>

        <section className="relative mt-10 border-t border-slate-100 pt-10 dark:border-slate-800">
          <SectionLabel>About</SectionLabel>
          <p className="mt-3 max-w-2xl border-l-2 border-teal-500/40 pl-5 text-base leading-relaxed text-slate-600 dark:text-slate-300">
            {displayBio}
          </p>
        </section>

        <section className="relative mt-10">
          <SectionLabel>Details</SectionLabel>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <MetaTile icon={iconPin} label="Location" value={displayLocation} />
            <MetaTile icon={iconCalendar} label="Birthday" value={displayBirthday} />
            <MetaTile icon={iconBuilding} label="Company" value={displayCompany} />
          </div>
          {detailRow ? <div className="mt-4">{detailRow}</div> : null}
        </section>

        <section className="relative mt-10">
          <SectionLabel>Connect</SectionLabel>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <SocialIconButton href={mailto} label="Email">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.65} viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </SocialIconButton>
            <SocialIconButton href={tel} label="Phone">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.65} viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </SocialIconButton>
            {socialExtra != null ? (
              <span className="inline-flex [&>a]:flex [&>a]:h-11 [&>a]:w-11 [&>a]:items-center [&>a]:justify-center [&>a]:rounded-full [&>a]:border [&>a]:border-slate-200/90 [&>a]:dark:border-slate-600 [&>a]:bg-white [&>a]:dark:bg-slate-800 [&>a]:text-slate-500 [&>a]:dark:text-slate-400 [&>a]:shadow-sm [&>a]:transition-all [&>a]:duration-200 [&>a]:hover:border-teal-300/70 [&>a]:dark:hover:border-teal-700 [&>a]:hover:text-teal-600 [&>a]:dark:hover:text-teal-300 [&>a]:hover:shadow-md [&>a]:hover:-translate-y-0.5">
                {socialExtra}
              </span>
            ) : (
              <span className="inline-flex opacity-40 grayscale" aria-hidden>
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800" />
              </span>
            )}
          </div>
        </section>

        <section className="relative mt-10 pb-1">
          <SectionLabel>Expertise</SectionLabel>
          {skillList.length === 0 ? (
            <p className="mt-3 text-sm italic text-slate-400 dark:text-slate-500">Skills will appear here when added.</p>
          ) : (
            <ul className="mt-4 flex flex-wrap gap-2">
              {skillList.map((skill) => (
                <li key={skill}>
                  <span className="inline-flex items-center rounded-full bg-gradient-to-r from-slate-100 to-slate-50 px-3.5 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200/90 dark:from-slate-800 dark:to-slate-800/80 dark:text-slate-200 dark:ring-slate-600/80">
                    {skill}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </article>
  )
}
