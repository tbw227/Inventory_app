import React from 'react'

export default function ErrorMessage({ message }) {
  if (!message) return null
  return (
    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
      {message}
    </div>
  )
}
