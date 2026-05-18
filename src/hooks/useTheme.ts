import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
    root.classList.remove('light')
  } else if (theme === 'light') {
    root.classList.add('light')
    root.classList.remove('dark')
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
    root.classList.remove('light')
  }
}

function resolvedTheme(theme: Theme): 'dark' | 'light' {
  if (theme !== 'system') return theme
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
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
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => applyTheme('system')
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    } else {
      localStorage.setItem('theme', theme)
    }
  }, [theme])

  function toggle() {
    setTheme(prev => (resolvedTheme(prev) === 'dark' ? 'light' : 'dark'))
  }

  return { theme, resolvedTheme: resolvedTheme(theme), toggle }
}
