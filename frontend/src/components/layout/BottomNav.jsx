import React, { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ROUTES } from '../../config/routes'

function IconJobs({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )
}

function IconScan({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7V5a1 1 0 011-1h2M20 7V5a1 1 0 00-1-1h-2M4 17v2a1 1 0 001 1h2M20 17v2a1 1 0 01-1 1h-2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 12h10" />
    </svg>
  )
}

function IconAdd({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
    </svg>
  )
}

function IconPayments({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12l-2-2m2 2l-2 2m2-2H9" />
    </svg>
  )
}

function IconSettings({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.065 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.065c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.065-2.572c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.573-1.066z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

export default function BottomNav() {
  const location = useLocation()
  const { isAdmin } = useAuth()

  const path = location.pathname

  const items = useMemo(() => {
    return [
      {
        key: 'jobs',
        label: 'Jobs',
        to: ROUTES.CLIENTS,
        active: path === ROUTES.CLIENTS || path.startsWith(`${ROUTES.CLIENTS}/`),
        Icon: IconJobs,
      },
      {
        key: 'scan',
        label: 'Scan',
        to: ROUTES.SCAN,
        active: path === ROUTES.SCAN || path.startsWith(`${ROUTES.SCAN}/`),
        Icon: IconScan,
      },
      {
        key: 'add',
        label: 'Add',
        to: ROUTES.LOCATIONS,
        active: path === ROUTES.LOCATIONS || path.startsWith(`${ROUTES.LOCATIONS}/`),
        Icon: IconAdd,
      },
      {
        key: 'payments',
        label: 'Payments',
        to: ROUTES.HISTORY,
        active: path === ROUTES.HISTORY || path.startsWith(`${ROUTES.HISTORY}/`),
        Icon: IconPayments,
      },
      {
        key: 'settings',
        label: 'Settings',
        to: ROUTES.SETTINGS,
        active: path === ROUTES.SETTINGS || path.startsWith(`${ROUTES.SETTINGS}/`),
        Icon: IconSettings,
      },
    ]
  }, [path])

  if (isAdmin) return null

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-slate-800 bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/75 pb-[env(safe-area-inset-bottom)]"
      aria-label="Bottom navigation"
    >
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const activeColor = 'text-white'
          const inactiveColor = 'text-slate-400'
          const isAdd = item.key === 'add'

          return (
            <Link
              key={item.key}
              to={item.to}
              className={`min-h-[60px] px-1 flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                item.active ? activeColor : inactiveColor
              } ${isAdd ? '-mt-6' : ''}`}
              aria-current={item.active ? 'page' : undefined}
            >
              {isAdd ? (
                <span
                  className={`h-12 w-12 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                    item.active ? 'bg-blue-600 text-white' : 'bg-slate-800/90 text-slate-200'
                  }`}
                  aria-hidden="true"
                >
                  <item.Icon className="h-6 w-6" />
                </span>
              ) : (
                <>
                  <item.Icon className="h-5 w-5" />
                  <span className="leading-tight">{item.label}</span>
                </>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

