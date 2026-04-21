import React from 'react'
import { getInitials, avatarColor } from '../../utils/initials'
import AuthedImg from './AuthedImg'

export default function Avatar({ name, size = 'md', square = false, src, alt, className = '' }) {
  const sizeClass =
    size === 'xl'
      ? 'w-[6.25rem] h-[6.25rem] sm:w-28 sm:h-28 md:w-32 md:h-32 text-2xl sm:text-3xl'
      : size === 'lg'
        ? 'w-14 h-14 text-lg'
        : size === 'sm'
          ? 'w-7 h-7 text-xs'
          : 'w-9 h-9 text-sm'
  const shapeClass = square
    ? 'rounded-2xl sm:rounded-3xl ring-1 ring-white/20'
    : 'rounded-full'
  const imgAlt = alt !== undefined ? alt : name || 'Profile'

  if (src) {
    return (
      <div className={`${sizeClass} ${shapeClass} shrink-0 overflow-hidden shadow-sm bg-slate-800 ${className}`}>
        <AuthedImg src={src} alt={imgAlt} className="h-full w-full object-cover object-top" loading="lazy" />
      </div>
    )
  }

  return (
    <div className={`${sizeClass} ${avatarColor(name)} ${shapeClass} flex items-center justify-center font-bold text-white shrink-0 select-none shadow-sm ${className}`}>
      {getInitials(name)}
    </div>
  )
}
