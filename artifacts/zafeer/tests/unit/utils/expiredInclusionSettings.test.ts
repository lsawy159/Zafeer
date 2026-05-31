import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getExpiredInclusionSettings,
  saveExpiredInclusionSettings,
  DEFAULT_EXPIRED_INCLUSION,
  type ExpiredInclusionSettings,
} from '@/utils/expiredInclusionSettings'

// Hoisted so available inside vi.mock factory
const mockState = vi.hoisted(() => ({
  data: null as { setting_value: unknown } | null,
  error: null as { message: string } | null,
  upsertError: null as { message: string } | null,
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(() =>
        Promise.resolve({ data: mockState.data, error: mockState.error })
      ),
      upsert: vi.fn(() =>
        Promise.resolve({ error: mockState.upsertError })
      ),
    })),
  },
}))

beforeEach(() => {
  mockState.data = null
  mockState.error = null
  mockState.upsertError = null
})

// ─── getExpiredInclusionSettings ──────────────────────────────────────────────

describe('getExpiredInclusionSettings', () => {
  it('returns DEFAULT when no row found (data null)', async () => {
    mockState.data = null
    const result = await getExpiredInclusionSettings()
    expect(result).toEqual(DEFAULT_EXPIRED_INCLUSION)
  })

  it('returns DEFAULT when supabase error', async () => {
    mockState.error = { message: 'network error' }
    const result = await getExpiredInclusionSettings()
    expect(result).toEqual(DEFAULT_EXPIRED_INCLUSION)
  })

  it('returns DEFAULT when setting_value is null', async () => {
    mockState.data = { setting_value: null }
    const result = await getExpiredInclusionSettings()
    expect(result).toEqual(DEFAULT_EXPIRED_INCLUSION)
  })

  it('returns DEFAULT when setting_value is a string', async () => {
    mockState.data = { setting_value: 'invalid' }
    const result = await getExpiredInclusionSettings()
    expect(result).toEqual(DEFAULT_EXPIRED_INCLUSION)
  })

  it('returns DEFAULT when setting_value is a number', async () => {
    mockState.data = { setting_value: 42 }
    const result = await getExpiredInclusionSettings()
    expect(result).toEqual(DEFAULT_EXPIRED_INCLUSION)
  })

  it('returns DEFAULT when setting_value is an array', async () => {
    mockState.data = { setting_value: [] }
    const result = await getExpiredInclusionSettings()
    expect(result).toEqual(DEFAULT_EXPIRED_INCLUSION)
  })

  it('returns full settings when all fields present', async () => {
    const full: ExpiredInclusionSettings = {
      include_in_alerts: false,
      include_in_notifications: false,
      include_in_daily_email: false,
      include_in_notification_emails: false,
    }
    mockState.data = { setting_value: full }
    const result = await getExpiredInclusionSettings()
    expect(result).toEqual(full)
  })

  it('fills missing field with default (partial object)', async () => {
    mockState.data = {
      setting_value: { include_in_alerts: false },
    }
    const result = await getExpiredInclusionSettings()
    expect(result.include_in_alerts).toBe(false)
    // Missing fields fall back to DEFAULT (true)
    expect(result.include_in_notifications).toBe(DEFAULT_EXPIRED_INCLUSION.include_in_notifications)
    expect(result.include_in_daily_email).toBe(DEFAULT_EXPIRED_INCLUSION.include_in_daily_email)
    expect(result.include_in_notification_emails).toBe(DEFAULT_EXPIRED_INCLUSION.include_in_notification_emails)
  })

  it('all false overrides → returns all false (not defaults)', async () => {
    mockState.data = {
      setting_value: {
        include_in_alerts: false,
        include_in_notifications: false,
        include_in_daily_email: false,
        include_in_notification_emails: false,
      },
    }
    const result = await getExpiredInclusionSettings()
    expect(result.include_in_alerts).toBe(false)
    expect(result.include_in_notifications).toBe(false)
    expect(result.include_in_daily_email).toBe(false)
    expect(result.include_in_notification_emails).toBe(false)
  })

  it('partial: only include_in_daily_email false → others default to true', async () => {
    mockState.data = { setting_value: { include_in_daily_email: false } }
    const result = await getExpiredInclusionSettings()
    expect(result.include_in_daily_email).toBe(false)
    expect(result.include_in_alerts).toBe(true)
    expect(result.include_in_notifications).toBe(true)
    expect(result.include_in_notification_emails).toBe(true)
  })
})

// ─── saveExpiredInclusionSettings ─────────────────────────────────────────────

describe('saveExpiredInclusionSettings', () => {
  it('resolves without error on success', async () => {
    await expect(saveExpiredInclusionSettings(DEFAULT_EXPIRED_INCLUSION)).resolves.toBeUndefined()
  })

  it('throws when supabase returns error', async () => {
    mockState.upsertError = { message: 'unique constraint violation' }
    await expect(saveExpiredInclusionSettings(DEFAULT_EXPIRED_INCLUSION)).rejects.toEqual({
      message: 'unique constraint violation',
    })
  })
})
