import { describe, it, expect } from 'vitest'
import { fisherYates } from '@/lib/adhkarUtils'
import { clampAdhkarSettings } from '@/hooks/useAdhkarSettings'

// ────────────────────────────────────────────────────────────────────────────
// Fisher-Yates shuffle
// ────────────────────────────────────────────────────────────────────────────

describe('fisherYates', () => {
  it('returns array of same length', () => {
    const input = [1, 2, 3, 4, 5]
    expect(fisherYates(input)).toHaveLength(5)
  })

  it('contains exactly the same elements (no loss, no duplication)', () => {
    const input = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
    const result = fisherYates(input)
    expect(result.sort()).toEqual([...input].sort())
  })

  it('does not mutate the original array', () => {
    const input = [1, 2, 3, 4]
    const copy = [...input]
    fisherYates(input)
    expect(input).toEqual(copy)
  })

  it('handles empty array', () => {
    expect(fisherYates([])).toEqual([])
  })

  it('handles single-element array', () => {
    expect(fisherYates([42])).toEqual([42])
  })

  it('produces a valid permutation for two-element array', () => {
    const result = fisherYates([1, 2])
    expect(result).toHaveLength(2)
    expect(result).toContain(1)
    expect(result).toContain(2)
  })

  it('produces different orderings across many runs (statistical)', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8]
    const results = new Set<string>()
    for (let i = 0; i < 50; i++) {
      results.add(JSON.stringify(fisherYates(input)))
    }
    // With 8 elements (40320 permutations) and 50 runs, extremely unlikely to get < 5 unique orders
    expect(results.size).toBeGreaterThan(4)
  })
})

// ────────────────────────────────────────────────────────────────────────────
// clampAdhkarSettings — timer minimum bounds
// ────────────────────────────────────────────────────────────────────────────

describe('clampAdhkarSettings', () => {
  it('clamps display_duration_ms below minimum (2000ms)', () => {
    const result = clampAdhkarSettings({ display_duration_ms: 500 })
    expect(result.display_duration_ms).toBe(2000)
  })

  it('passes through valid values unchanged', () => {
    const result = clampAdhkarSettings({ display_duration_ms: 10000 })
    expect(result.display_duration_ms).toBe(10000)
  })

  it('fills defaults for missing fields', () => {
    const result = clampAdhkarSettings({})
    expect(result.display_duration_ms).toBe(8000)
  })

  it('rejects zero display_duration_ms — uses default then clamps', () => {
    const result = clampAdhkarSettings({ display_duration_ms: 0 })
    expect(result.display_duration_ms).toBeGreaterThanOrEqual(2000)
  })

  it('exact boundary: display 2000ms passes through', () => {
    expect(clampAdhkarSettings({ display_duration_ms: 2000 }).display_duration_ms).toBe(2000)
  })
})
