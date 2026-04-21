/**
 * Dashboard hero + primary actions keyed to user preferences.dashboard_accent
 */

export const DASHBOARD_ACCENT_IDS = ['teal', 'ocean', 'violet', 'ember', 'forest', 'slate']

export const DASHBOARD_ACCENTS = {
  teal: {
    hero: 'from-slate-800 via-slate-700 to-teal-800',
    greeting: 'text-teal-300',
    primaryBtn: 'bg-teal-500 hover:bg-teal-400',
    adminBadge: 'border bg-teal-500/30 text-teal-200 border-teal-500/40',
    techBadge: 'border bg-blue-500/30 text-blue-200 border-blue-500/40',
    chartSelected: 'bg-teal-600 text-white',
    linkOutline: 'border border-white/20 bg-white/10 hover:bg-white/20',
    spinner: 'border-teal-500',
    pageLink: 'text-teal-800 dark:text-teal-300',
    pageLinkStrong: 'text-teal-800 dark:text-teal-300',
    pageLinkIconWrap: 'bg-teal-50 dark:bg-teal-950',
    pageLinkIcon: 'text-teal-600 dark:text-teal-400',
  },
  ocean: {
    hero: 'from-slate-900 via-blue-900 to-cyan-900',
    greeting: 'text-cyan-300',
    primaryBtn: 'bg-cyan-500 hover:bg-cyan-400',
    adminBadge: 'border bg-cyan-500/30 text-cyan-100 border-cyan-500/40',
    techBadge: 'border bg-sky-500/30 text-sky-100 border-sky-500/40',
    chartSelected: 'bg-cyan-600 text-white',
    linkOutline: 'border border-white/20 bg-white/10 hover:bg-white/20',
    spinner: 'border-cyan-500',
    pageLink: 'text-cyan-800 dark:text-cyan-300',
    pageLinkStrong: 'text-cyan-800 dark:text-cyan-300',
    pageLinkIconWrap: 'bg-cyan-50 dark:bg-cyan-950',
    pageLinkIcon: 'text-cyan-600 dark:text-cyan-400',
  },
  violet: {
    hero: 'from-slate-900 via-violet-900 to-indigo-950',
    greeting: 'text-violet-300',
    primaryBtn: 'bg-violet-500 hover:bg-violet-400',
    adminBadge: 'border bg-violet-500/30 text-violet-100 border-violet-500/40',
    techBadge: 'border bg-indigo-500/30 text-indigo-100 border-indigo-500/40',
    chartSelected: 'bg-violet-600 text-white',
    linkOutline: 'border border-white/20 bg-white/10 hover:bg-white/20',
    spinner: 'border-violet-500',
    pageLink: 'text-violet-800 dark:text-violet-300',
    pageLinkStrong: 'text-violet-800 dark:text-violet-300',
    pageLinkIconWrap: 'bg-violet-50 dark:bg-violet-950',
    pageLinkIcon: 'text-violet-600 dark:text-violet-400',
  },
  ember: {
    hero: 'from-stone-900 via-orange-900 to-red-950',
    greeting: 'text-orange-300',
    primaryBtn: 'bg-orange-500 hover:bg-orange-400',
    adminBadge: 'border bg-orange-500/30 text-orange-100 border-orange-500/40',
    techBadge: 'border bg-amber-500/30 text-amber-100 border-amber-500/40',
    chartSelected: 'bg-orange-600 text-white',
    linkOutline: 'border border-white/20 bg-white/10 hover:bg-white/20',
    spinner: 'border-orange-500',
    pageLink: 'text-orange-800 dark:text-orange-300',
    pageLinkStrong: 'text-orange-800 dark:text-orange-300',
    pageLinkIconWrap: 'bg-orange-50 dark:bg-orange-950',
    pageLinkIcon: 'text-orange-600 dark:text-orange-400',
  },
  forest: {
    hero: 'from-slate-900 via-emerald-900 to-green-950',
    greeting: 'text-emerald-300',
    primaryBtn: 'bg-emerald-500 hover:bg-emerald-400',
    adminBadge: 'border bg-emerald-500/30 text-emerald-100 border-emerald-500/40',
    techBadge: 'border bg-green-500/30 text-green-100 border-green-500/40',
    chartSelected: 'bg-emerald-600 text-white',
    linkOutline: 'border border-white/20 bg-white/10 hover:bg-white/20',
    spinner: 'border-emerald-500',
    pageLink: 'text-emerald-800 dark:text-emerald-300',
    pageLinkStrong: 'text-emerald-800 dark:text-emerald-300',
    pageLinkIconWrap: 'bg-emerald-50 dark:bg-emerald-950',
    pageLinkIcon: 'text-emerald-600 dark:text-emerald-400',
  },
  slate: {
    hero: 'from-slate-950 via-slate-800 to-slate-900',
    greeting: 'text-slate-300',
    primaryBtn: 'bg-slate-600 hover:bg-slate-500',
    adminBadge: 'border bg-slate-500/30 text-slate-200 border-slate-500/40',
    techBadge: 'border bg-slate-600/30 text-slate-200 border-slate-600/40',
    chartSelected: 'bg-slate-700 text-white',
    linkOutline: 'border border-white/20 bg-white/10 hover:bg-white/20',
    spinner: 'border-slate-400',
    pageLink: 'text-slate-800 dark:text-slate-300',
    pageLinkStrong: 'text-slate-800 dark:text-slate-300',
    pageLinkIconWrap: 'bg-slate-100 dark:bg-slate-800',
    pageLinkIcon: 'text-slate-600 dark:text-slate-400',
  },
}

export function getDashboardAccent(id) {
  const key = DASHBOARD_ACCENT_IDS.includes(id) ? id : 'teal'
  return DASHBOARD_ACCENTS[key]
}
