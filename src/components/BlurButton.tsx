import { useState } from 'react'

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

/**
 * Persists a blur-toggle state in localStorage.
 * @param storageKey  e.g. 'homepage:blur-packages'
 * @param onBlur      optional callback fired when transitioning to blurred
 */
export function useBlur(storageKey: string, onBlur?: () => void): [boolean, () => void] {
  const [blurred, setBlurred] = useState(() => localStorage.getItem(storageKey) === '1')

  function toggle() {
    setBlurred(b => {
      if (!b) onBlur?.()
      localStorage.setItem(storageKey, b ? '0' : '1')
      return !b
    })
  }

  return [blurred, toggle]
}

interface BlurButtonProps {
  blurred: boolean
  onToggle: () => void
  className?: string
}

export function BlurButton({ blurred, onToggle, className = '' }: BlurButtonProps) {
  return (
    <button
      onClick={onToggle}
      title={blurred ? 'Show' : 'Hide'}
      className={`rounded p-1 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] ${className}`}
    >
      {blurred ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  )
}
