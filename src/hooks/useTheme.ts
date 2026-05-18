import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

function isSystemDark(): boolean {
  const h = new Date().getHours()
  return h >= 18 || h < 6
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
    root.classList.remove('light')
  } else if (theme === 'light') {
    root.classList.add('light')
    root.classList.remove('dark')
  } else {
    root.classList.toggle('dark', isSystemDark())
    root.classList.remove('light')
  }
}

function resolvedTheme(theme: Theme): 'dark' | 'light' {
  if (theme !== 'system') return theme
  return isSystemDark() ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    return stored ?? 'system'
  })

  useEffect(() => {
    applyTheme(theme)
    if (theme === 'system') {
      localStorage.removeItem('theme')
      // Re-check every minute so the theme flips exactly at 06:00 and 18:00
      const id = setInterval(() => applyTheme('system'), 60_000)
      return () => clearInterval(id)
    } else {
      localStorage.setItem('theme', theme)
    }
  }, [theme])

  function toggle() {
    setTheme(prev => (resolvedTheme(prev) === 'dark' ? 'light' : 'dark'))
  }

  return { theme, resolvedTheme: resolvedTheme(theme), toggle }
}
