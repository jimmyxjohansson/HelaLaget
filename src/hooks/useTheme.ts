import { useState, useEffect, useCallback } from 'react'

type Theme = 'light' | 'dark'

// Ny nyckel: ljust tema är standard, och bara ett eget val sparas.
// (Den gamla nyckeln sparade även systemets läge automatiskt.)
const STORAGE_KEY = 'hl-theme'

function safeGetStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // localStorage may be unavailable (e.g. sandboxed iframe without allow-same-origin)
  }
  return null
}

function safeSetStoredTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // ignore
  }
}

function getInitialTheme(): Theme {
  return safeGetStoredTheme() ?? 'light'
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)

  // Apply on mount and whenever theme changes
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Bara när användaren själv väljer sparas temat
  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      safeSetStoredTheme(next)
      return next
    })
  }, [])

  const setTheme = useCallback((next: Theme) => {
    safeSetStoredTheme(next)
    setThemeState(next)
  }, [])

  return { theme, toggleTheme, setTheme }
}
