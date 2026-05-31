import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useModalScrollLock } from '@/hooks/useModalScrollLock'

// Module-level state (lockCount, savedOverflow) resets between test files
// but NOT between tests in the same file.
// Each test must clean up by unmounting (triggers cleanup fn) when isOpen=true.

beforeEach(() => {
  document.body.style.overflow = ''
})

describe('useModalScrollLock', () => {
  it('no effect when isOpen=false', () => {
    const { unmount } = renderHook(() => useModalScrollLock(false))
    expect(document.body.style.overflow).toBe('')
    unmount()
    expect(document.body.style.overflow).toBe('')
  })

  it('sets overflow=hidden when isOpen=true', () => {
    const { unmount } = renderHook(() => useModalScrollLock(true))
    expect(document.body.style.overflow).toBe('hidden')
    unmount() // triggers cleanup
  })

  it('restores overflow to "" on unmount (no prior value)', () => {
    document.body.style.overflow = ''
    const { unmount } = renderHook(() => useModalScrollLock(true))
    expect(document.body.style.overflow).toBe('hidden')
    act(() => { unmount() })
    expect(document.body.style.overflow).toBe('')
  })

  it('restores original overflow when it was set before lock', () => {
    document.body.style.overflow = 'auto'
    const { unmount } = renderHook(() => useModalScrollLock(true))
    expect(document.body.style.overflow).toBe('hidden')
    act(() => { unmount() })
    expect(document.body.style.overflow).toBe('auto')
    document.body.style.overflow = '' // restore for other tests
  })

  it('handles isOpen toggling: false→true→false via rerender', () => {
    const { rerender, unmount } = renderHook(
      ({ open }) => useModalScrollLock(open),
      { initialProps: { open: false } }
    )
    expect(document.body.style.overflow).toBe('')

    act(() => { rerender({ open: true }) })
    expect(document.body.style.overflow).toBe('hidden')

    act(() => { rerender({ open: false }) })
    // closed → cleanup ran → overflow restored
    expect(document.body.style.overflow).toBe('')
    unmount()
  })

  it('nested modals: overflow stays hidden until last closes', () => {
    const { unmount: u1 } = renderHook(() => useModalScrollLock(true))
    const { unmount: u2 } = renderHook(() => useModalScrollLock(true))

    expect(document.body.style.overflow).toBe('hidden')

    act(() => { u1() }) // first modal closes — still 1 open
    expect(document.body.style.overflow).toBe('hidden')

    act(() => { u2() }) // last modal closes
    expect(document.body.style.overflow).toBe('')
  })
})
