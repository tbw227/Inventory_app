import { LOGO_URL, PRODUCT_NAME, productInitials } from '../../config/brand'

export default function BrandLogo({ size = 'md', showName = false, nameClassName = 'text-white', className = '' }) {
  const sizes = {
    sm: { box: 'h-8 w-8 text-xs', name: 'text-sm' },
    md: { box: 'h-10 w-10 text-sm', name: 'text-lg' },
    lg: { box: 'h-16 w-16 text-lg', name: 'text-2xl' },
  }
  const s = sizes[size] || sizes.md

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {LOGO_URL ? (
        <img
          src={LOGO_URL}
          alt=""
          className={`${s.box} rounded-md object-cover shrink-0`}
          loading="eager"
          decoding="async"
        />
      ) : (
        <div
          className={`${s.box} rounded-md bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0`}
          aria-hidden
        >
          {productInitials()}
        </div>
      )}
      {showName && (
        <span className={`font-bold tracking-tight ${s.name} ${nameClassName}`}>{PRODUCT_NAME}</span>
      )}
    </div>
  )
}
