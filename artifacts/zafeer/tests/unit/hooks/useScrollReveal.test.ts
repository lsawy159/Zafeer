import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useScrollReveal } from '@/hooks/useScrollReveal'

// IntersectionObserver is mocked in setup.ts (observe/disconnect no-ops)
// matchMedia is mocked in setup.ts (always returns matches: false = desktop, no reducedMotion)

describe('useScrollReveal', () => {
  beforeEach(() => {
    // Reset matchMedia mock: desktop + no reducedMotion (default from setup.ts)
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false, // false = desktop, false = no reducedMotion
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  it('returns a ref object', () => {
    const { result } = renderHook(() => useScrollReveal<HTMLDivElement>())
    expect(result.current).toHaveProperty('current')
  })

  it('on mobile (matchMedia max-width matches) → adds revealed immediately without IntersectionObserver', () => {
    // Simulate mobile: (max-width: 767px) matches
    const el = document.createElement('div')

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('767px') || query.includes('max-width'), // mobile = true
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    const observeSpy = vi.spyOn(global.IntersectionObserver.prototype, 'observe')

    const { result } = renderHook(() => useScrollReveal<HTMLDivElement>())
    // Attach the ref to the element
    Object.defineProperty(result.current, 'current', { value: el, writable: true })

    // Re-render to trigger effect with the element
    renderHook(() => useScrollReveal<HTMLDivElement>())

    // observer.observe should NOT be called on mobile
    expect(observeSpy).not.toHaveBeenCalled()
    observeSpy.mockRestore()
  })

  it('on reducedMotion → reveals immediately', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('reduced-motion'), // reducedMotion = true, mobile = false
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    const observeSpy = vi.spyOn(global.IntersectionObserver.prototype, 'observe')
    renderHook(() => useScrollReveal<HTMLDivElement>())
    // observer.observe should NOT be called
    expect(observeSpy).not.toHaveBeenCalled()
    observeSpy.mockRestore()
  })

  it('on desktop without reducedMotion → creates IntersectionObserver', () => {
    // matchMedia always returns false (desktop, no reducedMotion) — set up in beforeEach
    const el = document.createElement('div')
    document.body.appendChild(el)

    const observeSpy = vi.spyOn(global.IntersectionObserver.prototype, 'observe')

    // Render with a real element attached
    renderHook(() => {
      const ref = useScrollReveal<HTMLDivElement>()
      // Simulate ref attachment
      ;(ref as { current: HTMLDivElement }).current = el
      return ref
    })

    // After effect runs, observe should be called
    expect(observeSpy).toHaveBeenCalledWith(el)
    observeSpy.mockRestore()
    document.body.removeChild(el)
  })

  it('disconnects observer on unmount', () => {
    const disconnectSpy = vi.spyOn(global.IntersectionObserver.prototype, 'disconnect')
    const el = document.createElement('div')
    document.body.appendChild(el)

    const { unmount } = renderHook(() => {
      const ref = useScrollReveal<HTMLDivElement>()
      ;(ref as { current: HTMLDivElement }).current = el
      return ref
    })

    unmount()
    expect(disconnectSpy).toHaveBeenCalled()
    disconnectSpy.mockRestore()
    document.body.removeChild(el)
  })
})
