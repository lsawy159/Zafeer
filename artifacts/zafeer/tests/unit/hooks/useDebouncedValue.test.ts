import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useDebouncedValue', () => {
  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('initial', 300))
    expect(result.current).toBe('initial')
  })

  it('does NOT update before delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'first' } }
    )

    rerender({ value: 'second' })
    act(() => { vi.advanceTimersByTime(299) })

    expect(result.current).toBe('first') // still old value
  })

  it('updates after delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'first' } }
    )

    rerender({ value: 'second' })
    act(() => { vi.advanceTimersByTime(300) })

    expect(result.current).toBe('second')
  })

  it('only last value wins when changed rapidly', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'a' } }
    )

    rerender({ value: 'b' })
    act(() => { vi.advanceTimersByTime(100) })
    rerender({ value: 'c' })
    act(() => { vi.advanceTimersByTime(100) })
    rerender({ value: 'd' })
    act(() => { vi.advanceTimersByTime(300) })

    expect(result.current).toBe('d') // only final value
  })

  it('respects custom delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 1000),
      { initialProps: { value: 'start' } }
    )

    rerender({ value: 'end' })
    act(() => { vi.advanceTimersByTime(999) })
    expect(result.current).toBe('start')

    act(() => { vi.advanceTimersByTime(1) })
    expect(result.current).toBe('end')
  })

  it('default delay is 300ms', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value),
      { initialProps: { value: 'x' } }
    )

    rerender({ value: 'y' })
    act(() => { vi.advanceTimersByTime(299) })
    expect(result.current).toBe('x')

    act(() => { vi.advanceTimersByTime(1) })
    expect(result.current).toBe('y')
  })

  it('works with number type', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 200),
      { initialProps: { value: 0 } }
    )

    rerender({ value: 42 })
    act(() => { vi.advanceTimersByTime(200) })

    expect(result.current).toBe(42)
  })

  it('works with object type', () => {
    const obj1 = { id: 1 }
    const obj2 = { id: 2 }
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 200),
      { initialProps: { value: obj1 } }
    )

    rerender({ value: obj2 })
    act(() => { vi.advanceTimersByTime(200) })

    expect(result.current).toBe(obj2)
  })
})
