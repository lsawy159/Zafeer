import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useThemeMode,
  useFontMode,
  useCardColumns,
} from '@/hooks/useUiPreferences'

// localStorage stub — the test environment has no real localStorage
const store: Record<string, string> = {}
const localStorageMock = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { delete store[k] },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
  get length() { return Object.keys(store).length },
  key: (i: number) => Object.keys(store)[i] ?? null,
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true })

beforeEach(() => {
  localStorageMock.clear()
  document.documentElement.classList.remove('dark')
  document.documentElement.removeAttribute('data-font-mode')
})

// ─── useThemeMode ─────────────────────────────────────────────────────────────

describe('useThemeMode', () => {
  it('defaults to light when no localStorage value', () => {
    const { result } = renderHook(() => useThemeMode())
    expect(result.current.theme).toBe('light')
    expect(result.current.isDark).toBe(false)
  })

  it('reads saved theme from localStorage', () => {
    localStorage.setItem('zafeer-theme-mode', 'dark')
    const { result } = renderHook(() => useThemeMode())
    expect(result.current.theme).toBe('dark')
    expect(result.current.isDark).toBe(true)
  })

  it('toggleTheme switches light → dark', () => {
    const { result } = renderHook(() => useThemeMode())
    act(() => { result.current.toggleTheme() })
    expect(result.current.theme).toBe('dark')
    expect(result.current.isDark).toBe(true)
  })

  it('toggleTheme switches dark → light', () => {
    localStorage.setItem('zafeer-theme-mode', 'dark')
    const { result } = renderHook(() => useThemeMode())
    act(() => { result.current.toggleTheme() })
    expect(result.current.theme).toBe('light')
    expect(result.current.isDark).toBe(false)
  })

  it('setTheme updates theme directly', () => {
    const { result } = renderHook(() => useThemeMode())
    act(() => { result.current.setTheme('dark') })
    expect(result.current.theme).toBe('dark')
  })

  it('persists theme to localStorage on change', () => {
    const { result } = renderHook(() => useThemeMode())
    act(() => { result.current.setTheme('dark') })
    expect(localStorage.getItem('zafeer-theme-mode')).toBe('dark')
  })

  it('adds dark class to documentElement when dark', () => {
    const { result } = renderHook(() => useThemeMode())
    act(() => { result.current.setTheme('dark') })
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('removes dark class when light', () => {
    document.documentElement.classList.add('dark')
    const { result } = renderHook(() => useThemeMode())
    act(() => { result.current.setTheme('light') })
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})

// ─── useFontMode ──────────────────────────────────────────────────────────────

describe('useFontMode', () => {
  it('defaults to ibm-plex when no localStorage value', () => {
    const { result } = renderHook(() => useFontMode())
    expect(result.current.fontMode).toBe('ibm-plex')
  })

  it('reads saved font from localStorage', () => {
    localStorage.setItem('zafeer-font-mode', 'cairo')
    const { result } = renderHook(() => useFontMode())
    expect(result.current.fontMode).toBe('cairo')
  })

  it('setFontMode updates fontMode', () => {
    const { result } = renderHook(() => useFontMode())
    act(() => { result.current.setFontMode('tajawal') })
    expect(result.current.fontMode).toBe('tajawal')
  })

  it('persists fontMode to localStorage', () => {
    const { result } = renderHook(() => useFontMode())
    act(() => { result.current.setFontMode('cairo') })
    expect(localStorage.getItem('zafeer-font-mode')).toBe('cairo')
  })

  it('sets data-font-mode attribute on documentElement', () => {
    const { result } = renderHook(() => useFontMode())
    act(() => { result.current.setFontMode('tajawal') })
    expect(document.documentElement.getAttribute('data-font-mode')).toBe('tajawal')
  })

  it('ignores invalid localStorage value → defaults to ibm-plex', () => {
    localStorage.setItem('zafeer-font-mode', 'comic-sans') // invalid
    const { result } = renderHook(() => useFontMode())
    expect(result.current.fontMode).toBe('ibm-plex')
  })

  it('accepts all 3 valid font modes', () => {
    const fonts = ['ibm-plex', 'tajawal', 'cairo'] as const
    for (const font of fonts) {
      localStorage.setItem('zafeer-font-mode', font)
      const { result } = renderHook(() => useFontMode())
      expect(result.current.fontMode).toBe(font)
    }
  })
})

// ─── useCardColumns ───────────────────────────────────────────────────────────

describe('useCardColumns', () => {
  it('returns gridClass string', () => {
    const { result } = renderHook(() => useCardColumns())
    expect(typeof result.current.gridClass).toBe('string')
    expect(result.current.gridClass.length).toBeGreaterThan(0)
  })

  it('gridClass contains grid and gap classes', () => {
    const { result } = renderHook(() => useCardColumns())
    expect(result.current.gridClass).toContain('grid')
    expect(result.current.gridClass).toContain('gap')
  })
})
