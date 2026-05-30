/**
 * DashboardHero — top-of-page greeting card with avatar, name, and role badge.
 *
 * Props come from Dashboard.new.jsx and the user-selectable accent theme.
 */
import React from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../config/routes'
import Avatar from '../ui/Avatar'

const invoiceIcon = (
  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m-7 6h8a2 2 0 002-2V6l-4-4H8a2 2 0 00-2 2v16a2 2 0 002 2z" />
  </svg>
)

export default function DashboardHero({
  accent,
  user,
  greeting,
  firstName,
  displayName,
  isAdmin,
  heroAvatarSrc,
  showSendInvoice = false,
}) {
  return (
    <section className="flex flex-col gap-3 sm:flex-row sm:items-stretch min-w-0">
      <div
        className={`@container flex min-w-0 w-full sm:w-fit gap-3 rounded-2xl bg-gradient-to-br px-4 py-4 shadow-lg sm:px-5 sm:py-5 md:px-6 md:py-6 @[20rem]:flex-row @[20rem]:items-center @[20rem]:gap-3 @[28rem]:gap-4 @[40rem]:gap-5 ${accent.hero}`}
      >
        <Avatar
          name={user?.name}
          size="xl"
          square
          src={heroAvatarSrc}
          alt=""
          className="shrink-0 self-start @[20rem]:self-center ml-0 @[20rem]:ml-0.5 md:ml-1.5"
        />
        <div className="min-w-0 max-w-full flex-1 space-y-1.5 @[32rem]:space-y-2">
          <p
            id="dashboard-greeting"
            className={`${accent.greeting} font-medium leading-snug [font-size:clamp(0.75rem,0.1rem+2.2cqi,1.125rem)]`}
          >
            {greeting}, {firstName}
          </p>
          <h1
            className="max-w-full break-words font-bold leading-[1.1] text-white tracking-tight [font-size:clamp(1.1rem,0.2rem+4.3cqi,2.5rem)] [overflow-wrap:anywhere]"
            aria-describedby="dashboard-greeting"
          >
            {displayName}
          </h1>
          <p className="text-white/75 leading-snug [font-size:clamp(0.65rem,0.08rem+1.1cqi,0.875rem)]">
            Your work dashboard
          </p>
          <span
            className={`mt-0.5 inline-flex max-w-full min-w-0 items-center break-words rounded-full px-2.5 py-0.5 font-semibold [font-size:clamp(0.6rem,0.05rem+0.85cqi,0.8125rem)] @[22rem]:px-3 @[22rem]:py-1 ${
              isAdmin ? accent.adminBadge : accent.techBadge
            }`}
          >
            {isAdmin ? 'Administrator' : 'Technician'}
          </span>
        </div>
      </div>
      {showSendInvoice && (
        <Link
          to={`${ROUTES.JOBS}?status=completed`}
          className={`inline-flex shrink-0 self-start items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-white shadow-md transition-all hover:brightness-110 active:scale-[0.98] sm:self-center ${accent.primaryBtn}`}
          title="Send an invoice for a completed job"
        >
          {invoiceIcon}
          <span>Send invoice</span>
        </Link>
      )}
    </section>
  )
}
