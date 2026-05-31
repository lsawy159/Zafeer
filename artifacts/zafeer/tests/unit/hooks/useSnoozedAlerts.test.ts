import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getUser: vi.fn() }, from: vi.fn() } }))

import { supabase } from '@/lib/supabase'
import { useSnoozedAlerts } from '@/hooks/useSnoozedAlerts'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
  return Wrapper
}

function setupSupabaseMock(rows: object[]) {
  vi.mocked(supabase.auth.getUser).mockResolvedValue({
    data: { user: { id: 'user-1' } },
    error: null,
  } as ReturnType<typeof supabase.auth.getUser> extends Promise<infer R> ? R : never)

  const orderMock = vi.fn().mockResolvedValue({ data: rows, error: null })
  const eqMock = vi.fn().mockReturnValue({ order: orderMock })
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
  vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as ReturnType<typeof supabase.from>)
}

function setupNoUser() {
  vi.mocked(supabase.auth.getUser).mockResolvedValue({
    data: { user: null },
    error: null,
  } as ReturnType<typeof supabase.auth.getUser> extends Promise<infer R> ? R : never)
}

// Dates that are always future/past relative to real NOW (not faked)
const FUTURE = '2030-01-01T00:00:00.000Z'  // always in future
const PAST = '2020-01-01T00:00:00.000Z'    // always in past

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
})

// ─── useSnoozedAlerts ─────────────────────────────────────────────────────────

describe('useSnoozedAlerts', () => {
  it('returns empty snoozedAlerts when user not authenticated', async () => {
    setupNoUser()

    const { result } = renderHook(() => useSnoozedAlerts(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.snoozedAlerts).toHaveLength(0)
  })

  it('keeps deferred alerts (is_deferred=true) regardless of snoozed_until', async () => {
    setupSupabaseMock([
      { id: 1, alert_id: 'a1', is_deferred: true, snoozed_until: null, user_id: 'user-1', created_at: '2026-01-01T00:00:00Z' },
    ])

    const { result } = renderHook(() => useSnoozedAlerts(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.snoozedAlerts).toHaveLength(1)
  })

  it('keeps alert with future snoozed_until', async () => {
    setupSupabaseMock([
      { id: 2, alert_id: 'a2', is_deferred: false, snoozed_until: FUTURE, user_id: 'user-1', created_at: '2026-01-01T00:00:00Z' },
    ])

    const { result } = renderHook(() => useSnoozedAlerts(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.snoozedAlerts).toHaveLength(1)
  })

  it('filters out expired snooze (snoozed_until in past, is_deferred=false)', async () => {
    setupSupabaseMock([
      { id: 3, alert_id: 'a3', is_deferred: false, snoozed_until: PAST, user_id: 'user-1', created_at: '2026-01-01T00:00:00Z' },
    ])

    const { result } = renderHook(() => useSnoozedAlerts(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.snoozedAlerts).toHaveLength(0)
  })

  it('filters out non-deferred alert with null snoozed_until', async () => {
    setupSupabaseMock([
      { id: 4, alert_id: 'a4', is_deferred: false, snoozed_until: null, user_id: 'user-1', created_at: '2026-01-01T00:00:00Z' },
    ])

    const { result } = renderHook(() => useSnoozedAlerts(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.snoozedAlerts).toHaveLength(0)
  })

  it('snoozedAlertIds set contains only active alert IDs', async () => {
    setupSupabaseMock([
      { id: 1, alert_id: 'keep-1', is_deferred: true, snoozed_until: null, user_id: 'user-1', created_at: '2026-01-01T00:00:00Z' },
      { id: 2, alert_id: 'keep-2', is_deferred: false, snoozed_until: FUTURE, user_id: 'user-1', created_at: '2026-01-01T00:00:00Z' },
      { id: 3, alert_id: 'drop-1', is_deferred: false, snoozed_until: PAST, user_id: 'user-1', created_at: '2026-01-01T00:00:00Z' },
    ])

    const { result } = renderHook(() => useSnoozedAlerts(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const ids = result.current.snoozedAlertIds
    expect(ids.has('keep-1')).toBe(true)
    expect(ids.has('keep-2')).toBe(true)
    expect(ids.has('drop-1')).toBe(false)
  })
})
