import React, { useState, useEffect, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import api from '../../services/api'
import { unwrapList } from '../../utils/unwrapList'
import HomeNavLink from '../shared/HomeNavLink'
import { ROUTES } from '../../config/routes'

function isUserDetailPath(pathname) {
  return pathname.startsWith(`${ROUTES.USERS}/`) && pathname.length > ROUTES.USERS.length + 1
}

const NAV_ITEMS = [
  {
    path: ROUTES.DASHBOARD, label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
      </svg>
    ),
  },
  {
    path: ROUTES.SCAN, label: 'Scan',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zM3 12h18" />
      </svg>
    ),
  },
  {
    path: ROUTES.HISTORY, label: 'History',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    path: ROUTES.SUPPLIES, label: 'Inventory',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    path: ROUTES.SETTINGS, label: 'Settings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

const ADMIN_NAV_ITEMS = [
  {
    path: '/print-labels', label: 'Print Labels',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
      </svg>
    ),
  },
  {
    path: ROUTES.CLIENTS, label: 'Clients',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
]

const JOBS_SECTION_ICON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
)

const LOCATIONS_ICON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const TEAM_ICON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
)

const PROFILE_ICON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)

const TECH_GROUP_ICON = (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
    />
  </svg>
)

function jobsSectionActive(pathname) {
  return (
    pathname === ROUTES.JOBS ||
    pathname.startsWith(`${ROUTES.JOBS}/`) ||
    pathname.startsWith(ROUTES.LOCATIONS)
  )
}

function jobListLinkActive(pathname) {
  return pathname === ROUTES.JOBS || pathname.startsWith(`${ROUTES.JOBS}/`)
}

function teamSectionActive(pathname) {
  return pathname.startsWith(ROUTES.PROFILE) || pathname.startsWith(ROUTES.USERS)
}

/** Small dot instead of a chevron; slightly larger / brighter when expanded. */
function DropdownDot({ open, isContrast }) {
  return (
    <span
      className={`shrink-0 rounded-full transition-all duration-200 ${
        open ? 'w-2 h-2' : 'w-1.5 h-1.5'
      } ${
        isContrast
          ? open
            ? 'bg-yellow-200'
            : 'bg-yellow-400/50'
          : open
            ? 'bg-indigo-300'
            : 'bg-slate-500 group-hover:bg-slate-400'
      }`}
      aria-hidden
    />
  )
}

function nestedLinkClass(active, isContrast) {
  return `flex items-center gap-2 pl-3 pr-3 py-2 rounded-md text-sm transition-all duration-150 ${
    active
      ? isContrast
        ? 'bg-yellow-400/20 text-yellow-200 font-medium'
        : 'bg-indigo-600/90 text-white font-medium'
      : isContrast
        ? 'text-yellow-100/80 hover:bg-yellow-400/10'
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
  }`
}

function JobsNavSection({ location, isContrast, onNavigate }) {
  const [jobsOpen, setJobsOpen] = useState(() => jobsSectionActive(location.pathname))

  useEffect(() => {
    if (jobsSectionActive(location.pathname)) setJobsOpen(true)
  }, [location.pathname])

  const parentActive = jobsSectionActive(location.pathname)
  const jobsChildActive = jobListLinkActive(location.pathname)
  const locChildActive = location.pathname.startsWith(ROUTES.LOCATIONS)

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setJobsOpen((o) => !o)}
        aria-expanded={jobsOpen}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left group ${
          parentActive
            ? isContrast
              ? 'bg-yellow-400/15 text-yellow-100'
              : 'bg-slate-800 text-white'
            : isContrast
              ? 'text-yellow-100/80 hover:bg-yellow-400/10'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
      >
        <span
          className={
            parentActive
              ? isContrast
                ? 'text-yellow-100'
                : 'text-white'
              : 'text-slate-500 group-hover:text-white'
          }
        >
          {JOBS_SECTION_ICON}
        </span>
        <span className="flex-1">Jobs</span>
        <DropdownDot open={jobsOpen} isContrast={isContrast} />
      </button>

      {jobsOpen && (
        <div
          className={`mt-0.5 ml-3 pl-3 space-y-0.5 border-l ${
            isContrast ? 'border-yellow-400/40' : 'border-slate-600'
          }`}
        >
          <Link
            to={ROUTES.JOBS}
            onClick={onNavigate}
            className={nestedLinkClass(jobsChildActive, isContrast)}
          >
            <span className={jobsChildActive ? 'text-white' : 'text-slate-500'}>{JOBS_SECTION_ICON}</span>
            <span>Jobs</span>
          </Link>
          <Link
            to={ROUTES.LOCATIONS}
            onClick={onNavigate}
            className={nestedLinkClass(locChildActive, isContrast)}
          >
            <span className={locChildActive ? 'text-white' : 'text-slate-500'}>{LOCATIONS_ICON}</span>
            <span>Locations & stations</span>
          </Link>
        </div>
      )}
    </div>
  )
}

function TeamNavSection({ location, isAdmin, isContrast, onNavigate }) {
  const [teamOpen, setTeamOpen] = useState(() => teamSectionActive(location.pathname))
  const [techsOpen, setTechsOpen] = useState(() => isUserDetailPath(location.pathname))
  const [technicians, setTechnicians] = useState([])

  useEffect(() => {
    if (teamSectionActive(location.pathname)) setTeamOpen(true)
    if (isUserDetailPath(location.pathname)) setTechsOpen(true)
  }, [location.pathname])

  const loadTechnicians = useCallback(() => {
    if (!isAdmin) return
    api
      .get('/users')
      .then((r) => {
        const list = unwrapList(r.data).filter((u) => u.role === 'technician')
        setTechnicians(list.sort((a, b) => (a.name || '').localeCompare(b.name || '')))
      })
      .catch(() => setTechnicians([]))
  }, [isAdmin])

  useEffect(() => {
    if (isAdmin && teamOpen) loadTechnicians()
  }, [isAdmin, teamOpen, loadTechnicians])

  const teamRowActive = teamSectionActive(location.pathname)

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setTeamOpen((o) => !o)}
        aria-expanded={teamOpen}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left group ${
          teamRowActive
            ? isContrast
              ? 'bg-yellow-400/15 text-yellow-100'
              : 'bg-slate-800 text-white'
            : isContrast
              ? 'text-yellow-100/80 hover:bg-yellow-400/10'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
      >
        <span
          className={
            teamRowActive
              ? isContrast
                ? 'text-yellow-100'
                : 'text-white'
              : 'text-slate-500 group-hover:text-white'
          }
        >
          {TEAM_ICON}
        </span>
        <span className="flex-1">Team</span>
        <DropdownDot open={teamOpen} isContrast={isContrast} />
      </button>

      {teamOpen && (
        <div
          className={`mt-0.5 ml-3 pl-3 space-y-0.5 border-l ${
            isContrast ? 'border-yellow-400/40' : 'border-slate-600'
          }`}
        >
          <Link
            to={ROUTES.PROFILE}
            onClick={onNavigate}
            className={nestedLinkClass(location.pathname === ROUTES.PROFILE, isContrast)}
          >
            <span className={location.pathname === ROUTES.PROFILE ? 'text-white' : 'text-slate-500'}>{PROFILE_ICON}</span>
            <span>My profile</span>
          </Link>

          {isAdmin && (
            <>
              <Link
                to={ROUTES.USERS}
                onClick={onNavigate}
                className={nestedLinkClass(location.pathname === ROUTES.USERS, isContrast)}
              >
                <span className={location.pathname === ROUTES.USERS ? 'text-white' : 'text-slate-500'}>{TEAM_ICON}</span>
                <span>Manage team</span>
              </Link>

              <div>
                <button
                  type="button"
                  onClick={() => setTechsOpen((o) => !o)}
                  aria-expanded={techsOpen}
                  className={`group w-full flex items-center gap-2 pl-3 pr-2 py-2 rounded-md text-sm font-medium text-left transition-colors ${
                    isContrast
                      ? 'text-yellow-100/90 hover:bg-yellow-400/10'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {TECH_GROUP_ICON}
                  <span className="flex-1">Technicians</span>
                  <DropdownDot open={techsOpen} isContrast={isContrast} />
                </button>

                {techsOpen && (
                  <div
                    className={`ml-2 pl-2 mt-0.5 space-y-0.5 border-l ${
                      isContrast ? 'border-yellow-400/30' : 'border-slate-600/80'
                    }`}
                  >
                    {technicians.length === 0 ? (
                      <p className="py-2 pl-2 text-xs text-slate-500">No technicians yet</p>
                    ) : (
                      technicians.map((t) => {
                        const href = `${ROUTES.USERS}/${t._id}`
                        const active = location.pathname === href
                        return (
                          <Link
                            key={t._id}
                            to={href}
                            onClick={onNavigate}
                            className={`block py-1.5 pl-2 pr-2 rounded-md text-xs truncate ${
                              active
                                ? isContrast
                                  ? 'bg-yellow-400/20 text-yellow-100 font-medium'
                                  : 'bg-indigo-600/80 text-white font-medium'
                                : isContrast
                                  ? 'text-yellow-100/70 hover:bg-yellow-400/10'
                                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                            }`}
                            title={t.name}
                          >
                            {t.name}
                          </Link>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

const SETTINGS_NAV_ITEM = NAV_ITEMS.find((i) => i.path === ROUTES.SETTINGS)
const DASHBOARD_NAV_ITEM = NAV_ITEMS.find((i) => i.path === ROUTES.DASHBOARD)
const NAV_MAIN_ITEMS = NAV_ITEMS.filter(
  (i) => ![ROUTES.DASHBOARD, ROUTES.SETTINGS].includes(i.path)
)

export default function Layout({ children }) {
  const { user, logout, isAdmin } = useAuth()
  const { theme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const isContrast = theme === 'contrast'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const NavLink = ({ item }) => {
    const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
    return (
      <Link
        to={item.path}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
          active
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
      >
        <span className={active ? 'text-white' : 'text-slate-500 group-hover:text-white'}>
          {item.icon}
        </span>
        <span>{item.label}</span>
        {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-300" />}
      </Link>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-slate-900 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:bg-slate-900 dark:focus:text-white"
      >
        Skip to main content
      </a>

      {/* Navbar */}
      <header
        style={{ flexShrink: 0 }}
        className={`z-50 border-b ${
          isContrast ? 'bg-black border-yellow-400' : 'bg-slate-900 border-slate-700'
        }`}
      >
        <div className="flex items-center justify-between h-14 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden text-slate-400 hover:text-white transition-colors"
              aria-expanded={mobileOpen}
              aria-controls="app-sidebar"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
            <Link to={ROUTES.DASHBOARD} className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm1 11H9V9h2v4zm0-6H9V5h2v2z" />
                </svg>
              </div>
              <span className="text-white font-bold text-lg tracking-tight">FireTrack</span>
            </Link>
            <span className="hidden sm:inline-flex text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
              Technician Ops
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                {user?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="leading-tight hidden md:block">
                <p className="text-sm text-white font-medium">{user?.name}</p>
                <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Body row: sidebar + content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          id="app-sidebar"
          className={`
            lg:relative fixed inset-y-0 left-0 z-40
            flex flex-col transition-transform duration-300 ease-in-out
            w-60 shrink-0
            ${isContrast ? 'bg-black border-r border-yellow-400' : 'bg-slate-900 border-r border-slate-700'}
            ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
          style={{ paddingTop: mobileOpen ? '3.5rem' : undefined }}
        >
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 px-4 mb-2">
              Main
            </p>
            {DASHBOARD_NAV_ITEM && <NavLink key={DASHBOARD_NAV_ITEM.path} item={DASHBOARD_NAV_ITEM} />}

            <JobsNavSection
              location={location}
              isContrast={isContrast}
              onNavigate={() => setMobileOpen(false)}
            />

            {NAV_MAIN_ITEMS.map((item) => (
              <NavLink key={item.path} item={item} />
            ))}

            <TeamNavSection
              location={location}
              isAdmin={isAdmin}
              isContrast={isContrast}
              onNavigate={() => setMobileOpen(false)}
            />

            {SETTINGS_NAV_ITEM && <NavLink key={SETTINGS_NAV_ITEM.path} item={SETTINGS_NAV_ITEM} />}

            {isAdmin && (
              <>
                <div className="border-t border-slate-700 my-3 mx-1" />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 px-4 mb-2">
                  Admin
                </p>
                {ADMIN_NAV_ITEMS.map(item => <NavLink key={item.path} item={item} />)}
              </>
            )}
          </nav>

          <div className="shrink-0 border-t border-slate-700 p-3">
            <div className="flex items-center gap-3 px-1">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {user?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-slate-400 capitalize truncate">{user?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="text-slate-500 hover:text-red-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main
          className={`flex-1 overflow-y-auto ${
            isContrast ? 'bg-black' : 'bg-slate-50 dark:bg-slate-950'
          }`}
        >
          {isAdmin && user?.subscription_status === 'past_due' && (
            <div
              className={`px-6 pt-4 ${
                isContrast ? 'bg-yellow-950 text-yellow-200 border-b border-yellow-500' : 'bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800'
              }`}
            >
              <p className={`text-sm ${isContrast ? '' : 'text-amber-900 dark:text-amber-100'}`}>
                <span className="font-semibold">Billing issue:</span> your organization subscription is past due.{' '}
                <Link to={ROUTES.SETTINGS} className="underline font-medium">
                  Update payment in Settings
                </Link>
                .
              </p>
            </div>
          )}
          <div className="p-4 sm:p-6">
            {location.pathname !== ROUTES.DASHBOARD && (
              <nav
                className={`mb-4 pb-3 border-b ${
                  isContrast ? 'border-yellow-400/40' : 'border-slate-200 dark:border-slate-800'
                }`}
                aria-label="Back navigation"
              >
                <HomeNavLink />
              </nav>
            )}
            {children}
          </div>

          <footer
            className={`border-t px-6 py-4 mt-auto ${
              isContrast ? 'border-yellow-400' : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <p className={`text-xs ${isContrast ? 'text-yellow-200' : 'text-slate-400 dark:text-slate-500'}`}>
              © {new Date().getFullYear()} FireTrack · Technician Operations Platform
            </p>
          </footer>
        </main>
      </div>
    </div>
  )
}
