import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoizationOptimization } from '@/utils/memoization'

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { ComputationCache } = MemoizationOptimization

// ─── ComputationCache ─────────────────────────────────────────────────────────

describe('ComputationCache', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('get on empty cache returns undefined', () => {
    const cache = new ComputationCache()
    expect(cache.get('key')).toBeUndefined()
  })

  it('set then get returns stored value', () => {
    const cache = new ComputationCache()
    cache.set('k1', 42)
    expect(cache.get('k1')).toBe(42)
  })

  it('size() reflects number of entries', () => {
    const cache = new ComputationCache()
    expect(cache.size()).toBe(0)
    cache.set('a', 1)
    cache.set('b', 2)
    expect(cache.size()).toBe(2)
  })

  it('clear() removes all entries and size becomes 0', () => {
    const cache = new ComputationCache()
    cache.set('x', 'val1')
    cache.set('y', 'val2')
    cache.clear()
    expect(cache.size()).toBe(0)
    expect(cache.get('x')).toBeUndefined()
  })

  it('multiple distinct keys store independently', () => {
    const cache = new ComputationCache<string, number>()
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    expect(cache.get('a')).toBe(1)
    expect(cache.get('b')).toBe(2)
    expect(cache.get('c')).toBe(3)
  })

  it('overwrite existing key — get returns new value', () => {
    const cache = new ComputationCache<string, string>()
    cache.set('k', 'old')
    cache.set('k', 'new')
    expect(cache.get('k')).toBe('new')
  })

  it('get returns value before default TTL (5 min) expires', () => {
    const cache = new ComputationCache()
    cache.set('k', 'data')
    vi.advanceTimersByTime(4 * 60 * 1000) // 4 minutes
    expect(cache.get('k')).toBe('data')
  })

  it('get returns undefined after default TTL (5 min) expires', () => {
    const cache = new ComputationCache()
    cache.set('k', 'data')
    vi.advanceTimersByTime(5 * 60 * 1000 + 1) // just past 5 minutes
    expect(cache.get('k')).toBeUndefined()
  })

  it('expired entry is evicted — size decrements after get', () => {
    const cache = new ComputationCache()
    cache.set('k', 'data')
    expect(cache.size()).toBe(1)
    vi.advanceTimersByTime(5 * 60 * 1000 + 1)
    cache.get('k') // triggers lazy eviction
    expect(cache.size()).toBe(0)
  })

  it('custom maxAge respected — expires earlier than default', () => {
    const cache = new ComputationCache(1000) // 1 second TTL
    cache.set('k', 'data')
    vi.advanceTimersByTime(999)
    expect(cache.get('k')).toBe('data')
    vi.advanceTimersByTime(2)
    expect(cache.get('k')).toBeUndefined()
  })

  it('non-expired entry in same cache coexists with expired one', () => {
    const cache = new ComputationCache(1000)
    cache.set('short', 'gone')
    vi.advanceTimersByTime(500)
    cache.set('long', 'still here') // timestamp is now t+500ms
    vi.advanceTimersByTime(600) // total 1100ms: short expired, long has 400ms left
    expect(cache.get('short')).toBeUndefined()
    expect(cache.get('long')).toBe('still here')
  })

  it('stores object values correctly', () => {
    const cache = new ComputationCache<string, { x: number; y: string }>()
    const val = { x: 99, y: 'test' }
    cache.set('obj', val)
    expect(cache.get('obj')).toEqual(val)
  })
})
