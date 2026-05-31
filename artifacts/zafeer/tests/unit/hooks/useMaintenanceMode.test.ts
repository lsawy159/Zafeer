import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }))
vi.mock('@/lib/restoreService', () => ({ checkMaintenanceActive: vi.fn() }))

import { supabase } from '@/lib/supabase'
import { checkMaintenanceActive } from '@/lib/restoreService'
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode'

beforeEach(() => {
  vi.clearAllMocks()
})

function setupDb(settingValue: object | null) {
  vi.mocked(supabase.from).mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: settingValue ? { setting_value: settingValue } : null,
          error: null,
        }),
      }),
    }),
  } as ReturnType<typeof supabase.from>)
}

// ─── state tests (real timers — waitFor works correctly) ──────────────────────

describe('useMaintenanceMode — state', () => {
  it('active=false and executorId=null when maintenance is not active', async () => {
    vi.mocked(checkMaintenanceActive).mockResolvedValue(false)
    const { result } = renderHook(() => useMaintenanceMode())
    await waitFor(() => expect(vi.mocked(checkMaintenanceActive)).toHaveBeenCalled())
    expect(result.current.active).toBe(false)
    expect(result.current.executorId).toBeNull()
  })

  it('active=true with executorId when maintenance is active', async () => {
    vi.mocked(checkMaintenanceActive).mockResolvedValue(true)
    setupDb({ executor_id: 'user-admin-123' })
    const { result } = renderHook(() => useMaintenanceMode())
    await waitFor(() => expect(result.current.active).toBe(true))
    expect(result.current.executorId).toBe('user-admin-123')
  })

  it('active=true with null executorId when setting has no executor_id field', async () => {
    vi.mocked(checkMaintenanceActive).mockResolvedValue(true)
    setupDb({ started_at: '2026-01-15T10:00:00Z' })
    const { result } = renderHook(() => useMaintenanceMode())
    await waitFor(() => expect(result.current.active).toBe(true))
    expect(result.current.executorId).toBeNull()
  })

  it('active=true when DB query throws — graceful fallback', async () => {
    vi.mocked(checkMaintenanceActive).mockResolvedValue(true)
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockRejectedValue(new Error('DB error')),
        }),
      }),
    } as ReturnType<typeof supabase.from>)

    const { result } = renderHook(() => useMaintenanceMode())
    await waitFor(() => expect(result.current.active).toBe(true))
    expect(result.current.executorId).toBeNull()
  })
})

// ─── polling tests (fake timers needed) ──────────────────────────────────────

describe('useMaintenanceMode — polling', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('polls every 10 seconds', async () => {
    vi.mocked(checkMaintenanceActive).mockResolvedValue(false)

    renderHook(() => useMaintenanceMode())
    // Let initial check run
    await vi.advanceTimersByTimeAsync(50)

    const callsBefore = vi.mocked(checkMaintenanceActive).mock.calls.length
    expect(callsBefore).toBeGreaterThanOrEqual(1)

    // Advance one interval
    await vi.advanceTimersByTimeAsync(10_000)
    expect(vi.mocked(checkMaintenanceActive).mock.calls.length).toBeGreaterThan(callsBefore)
  })

  it('stops polling on unmount', async () => {
    vi.mocked(checkMaintenanceActive).mockResolvedValue(false)

    const { unmount } = renderHook(() => useMaintenanceMode())
    await vi.advanceTimersByTimeAsync(50) // let initial check fire

    unmount()
    const callsAfterUnmount = vi.mocked(checkMaintenanceActive).mock.calls.length

    await vi.advanceTimersByTimeAsync(30_000)
    expect(vi.mocked(checkMaintenanceActive).mock.calls.length).toBe(callsAfterUnmount)
  })
})
