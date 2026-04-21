import React from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../config/routes'
import Avatar from '../ui/Avatar'
import WeatherWidget from './WeatherWidget'

export default function DashboardHero({
  accent,
  user,
  greeting,
  firstName,
  displayName,
  isAdmin,
  heroAvatarSrc,
  onJump,
}) {
  return (
    <section className={`rounded-2xl bg-gradient-to-br px-6 py-6 shadow-lg ${accent.hero}`}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-5 sm:gap-6">
          <Avatar name={user?.name} size="xl" square src={heroAvatarSrc} alt="" className="ml-1 sm:ml-2" />
          <div className="min-w-0 space-y-1.5 sm:space-y-2">
            <p id="dashboard-greeting" className={`${accent.greeting} text-base font-medium sm:text-lg`}>
              {greeting}, {firstName}
            </p>
            <h1 className="text-3xl font-bold text-white tracking-tight sm:text-4xl" aria-describedby="dashboard-greeting">
              {displayName}
            </h1>
            <p className="text-sm text-white/75">FireTrack operations dashboard</p>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold mt-0.5 ${
                isAdmin ? accent.adminBadge : accent.techBadge
              }`}
            >
              {isAdmin ? 'Administrator' : 'Technician'}
            </span>
          </div>
        </div>
        <div className="w-full lg:w-auto lg:min-w-[16rem]">
          <WeatherWidget />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to={ROUTES.JOBS}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors ${accent.primaryBtn}`}
        >
          View Jobs
        </Link>
        <Link
          to={ROUTES.SUPPLIES}
          className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-white transition-colors ${accent.linkOutline}`}
        >
          Manage Inventory
        </Link>
        <Link
          to={ROUTES.SETTINGS}
          className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-white transition-colors ${accent.linkOutline}`}
        >
          Settings
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onJump('today')}
          className="text-xs font-medium text-white/90 px-2 py-1 rounded-md border border-white/20 hover:bg-white/10"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => onJump('schedule')}
          className="text-xs font-medium text-white/90 px-2 py-1 rounded-md border border-white/20 hover:bg-white/10"
        >
          Schedule
        </button>
        <button
          type="button"
          onClick={() => onJump('analytics')}
          className="text-xs font-medium text-white/90 px-2 py-1 rounded-md border border-white/20 hover:bg-white/10"
        >
          Analytics
        </button>
      </div>
    </section>
  )
}
