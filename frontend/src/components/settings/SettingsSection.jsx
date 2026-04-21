import React from 'react'

export default function SettingsSection({
  id,
  headingId,
  title,
  description,
  className = '',
  children,
}) {
  return (
    <section id={id} className={className} aria-labelledby={headingId}>
      <h2 id={headingId} className="text-base font-semibold text-slate-900 dark:text-white">
        {title}
      </h2>
      {description && (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      )}
      {children}
    </section>
  )
}
