import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../config/routes'

/**
 * Browser back with fallback to dashboard. Shown in Layout on non-dashboard routes.
 */
export default function HomeNavLink({ className = '' }) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(ROUTES.DASHBOARD)
    }
  }


  return (

    <button

      type="button"

      onClick={handleBack}

      className={`inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400 transition-colors ${className}`}

    >

      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>

        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />

      </svg>

      Back

    </button>

  )

}

