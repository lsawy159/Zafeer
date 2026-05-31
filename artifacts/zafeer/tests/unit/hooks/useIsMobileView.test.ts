import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIsMobileView } from '@/hooks/useIsMobileView'

// jsdom default: window.innerWidth = 1024 (desktop)
describe('useIsMobileView', () => {
  const originalWidth = window.innerWidth

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: originalWidth })
  })

  it('returns false on desktop (1024px)', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1024 })
    const { result } = renderHook(() => useIsMobileView())
    act(() => {}) // flush effects
    expect(result.current).toBe(false)
  })

  it('returns true on mobile (375px)', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 375 })
    const { result } = renderHook(() => useIsMobileView())
    act(() => {})
    expect(result.current).toBe(true)
  })

  it('returns false at exactly 768px (boundary)', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 768 })
    const { result } = renderHook(() => useIsMobileView())
    act(() => {})
    expect(result.current).toBe(false) // < 768 is mobile, 768 is not
  })

  it('returns true at 767px', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 767 })
    const { result } = renderHook(() => useIsMobileView())
    act(() => {})
    expect(result.current).toBe(true)
  })

  it('reacts to resize event', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1024 })
    const { result } = renderHook(() => useIsMobileView())
    act(() => {})
    expect(result.current).toBe(false)

    act(() => {
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 375 })
      window.dispatchEvent(new Event('resize'))
    })
    expect(result.current).toBe(true)
  })

  it('removes resize listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useIsMobileView())
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    removeSpy.mockRestore()
  })
})
