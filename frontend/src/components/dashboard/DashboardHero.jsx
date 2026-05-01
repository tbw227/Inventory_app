import React from 'react'
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
}) {
  return (
    <section
      className={`rounded-2xl bg-gradient-to-br px-4 py-4 shadow-lg sm:px-5 sm:py-5 md:px-6 md:py-6 ${accent.hero}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-5">
        {/*
          @container: cqi in clamp() tracks this block’s width (sidebar + main width + weather)
        */}
        <div
          className="@container flex min-w-0 flex-1 flex-col gap-3 @[20rem]:flex-row @[20rem]:items-center @[20rem]:gap-3 @[28rem]:gap-4 @[40rem]:gap-5"
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
        <div className="w-full min-w-0 lg:max-w-[min(100%,20rem)] lg:shrink-0 lg:self-start">
          <WeatherWidget variant="hero" />
        </div>
      </div>
    </section>
  )
}
