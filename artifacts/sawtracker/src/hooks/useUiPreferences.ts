import { useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark'
export type FontMode = 'ibm-plex' | 'tajawal' | 'cairo'

// Legacy keys (sawtracker era) — kept for migration only, remove after 30 days from Phase A deploy
const LEGACY_THEME = 'sawtracker-theme-mode'
const LEGACY_FONT  = 'sawtracker-font-mode'

const THEME_STORAGE_KEY = 'zafeer-theme-mode'
const FONT_STORAGE_KEY  = 'zafeer-font-mode'

const UNIFIED_CARD_GRID_CLASS =
  'grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3.5 md:gap-4'

// Migrate a localStorage key from legacy name to new name (idempotent, one-shot on module load)
function migrateLegacyKey(legacy: string, current: string) {
  if (typeof window === 'undefined') return
  try {
    const v = window.localStorage.getItem(legacy)
    if (v !== null) {
      if (window.localStorage.getItem(current) === null) {
        window.localStorage.setItem(current, v)
      }
      window.localStorage.removeItem(legacy)
    }
  } catch { /* private mode or SecurityError */ }
}

// Run migration eagerly before any read
migrateLegacyKey(LEGACY_THEME, THEME_STORAGE_KEY)
migrateLegacyKey(LEGACY_FONT, FONT_STORAGE_KEY)

function readStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (savedTheme === 'dark' || savedTheme === 'light') {
    return savedTheme
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readStoredFont(): FontMode {
  if (typeof window === 'undefined') {
    return 'ibm-plex'
  }

  const savedFont = window.localStorage.getItem(FONT_STORAGE_KEY)
  if (savedFont === 'ibm-plex' || savedFont === 'tajawal' || savedFont === 'cairo') {
    return savedFont
  }

  return 'ibm-plex'
}

export function useThemeMode() {
  const [theme, setTheme] = useState<ThemeMode>(readStoredTheme)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
  }
}

export function useFontMode() {
  const [fontMode, setFontMode] = useState<FontMode>(readStoredFont)

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-font-mode', fontMode)
    window.localStorage.setItem(FONT_STORAGE_KEY, fontMode)
  }, [fontMode])

  return {
    fontMode,
    setFontMode,
  }
}

export function useCardColumns() {
  return {
    gridClass: UNIFIED_CARD_GRID_CLASS,
  }
}
