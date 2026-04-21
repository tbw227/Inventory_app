import React, { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({
  theme: 'light',
  setTheme: () => {},
})

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('firetrack-theme') || 'light')

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark', 'high-contrast')
    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'contrast') {
      root.classList.add('high-contrast')
    }
    localStorage.setItem('firetrack-theme', theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
