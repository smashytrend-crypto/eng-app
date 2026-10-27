import type { Theme } from '../db/db'

const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null
let currentTheme: Theme = 'system'

function apply() {
  const dark = currentTheme === 'dark' || (currentTheme === 'system' && !!media?.matches)
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#09090b' : '#7c3aed')
}

media?.addEventListener('change', apply)

export function applyTheme(theme: Theme): void {
  currentTheme = theme
  try {
    localStorage.setItem('theme', theme)
  } catch {
    // brak dostępu do localStorage — motyw i tak zadziała do zamknięcia aplikacji
  }
  apply()
}
