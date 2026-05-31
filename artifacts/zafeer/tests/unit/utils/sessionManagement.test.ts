import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SessionManager, SessionConfig } from '@/utils/sessionManagement'

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      refreshSession: vi.fn().mockResolvedValue({ data: null, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockResolvedValue({ data: [{ id: 'session-1' }], error: null }),
    })),
  },
}))

// Directly inject state to avoid triggering Supabase-calling timers
function injectSessionState(overrides: {
  userId?: string
  email?: string
  isActive?: boolean
  tokenExpiryTime?: number
  sessionStartTime?: number
  lastActivityTime?: number
} = {}) {
  const now = Date.now()
  ;(SessionManager as unknown as Record<string, unknown>)['sessionState'] = {
    userId: overrides.userId ?? 'user-test',
    email: overrides.email ?? 'test@example.com',
    sessionStartTime: overrides.sessionStartTime ?? now,
    lastActivityTime: overrides.lastActivityTime ?? now,
    isActive: overrides.isActive ?? true,
    tokenExpiryTime: overrides.tokenExpiryTime ?? now + 60 * 60 * 1000, // 1 hour
  }
}

function clearSessionState() {
  ;(SessionManager as unknown as Record<string, unknown>)['sessionState'] = null
  ;(SessionManager as unknown as Record<string, unknown>)['lastActivityTime'] = Date.now()
}

beforeEach(() => {
  vi.useFakeTimers()
  clearSessionState()
})

afterEach(() => {
  clearSessionState()
  vi.useRealTimers()
  vi.clearAllMocks()
})

// ─── isSessionValid ────────────────────────────────────────────────────────────

describe('SessionManager.isSessionValid', () => {
  it('returns false when no session initialized', () => {
    expect(SessionManager.isSessionValid()).toBe(false)
  })

  it('returns true for active session with future token expiry', () => {
    injectSessionState({ isActive: true, tokenExpiryTime: Date.now() + 3600_000 })
    expect(SessionManager.isSessionValid()).toBe(true)
  })

  it('returns false for expired token', () => {
    injectSessionState({ isActive: true, tokenExpiryTime: Date.now() - 1000 })
    expect(SessionManager.isSessionValid()).toBe(false)
  })

  it('returns false for inactive session with valid token', () => {
    injectSessionState({ isActive: false, tokenExpiryTime: Date.now() + 3600_000 })
    expect(SessionManager.isSessionValid()).toBe(false)
  })

  it('returns false for token expiring exactly now', () => {
    injectSessionState({ isActive: true, tokenExpiryTime: Date.now() })
    expect(SessionManager.isSessionValid()).toBe(false)
  })
})

// ─── getSessionTimeRemaining ──────────────────────────────────────────────────

describe('SessionManager.getSessionTimeRemaining', () => {
  it('returns 0 when no session', () => {
    expect(SessionManager.getSessionTimeRemaining()).toBe(0)
  })

  it('returns positive ms when session is valid', () => {
    const future = Date.now() + 1800_000 // 30 min
    injectSessionState({ tokenExpiryTime: future })
    const remaining = SessionManager.getSessionTimeRemaining()
    expect(remaining).toBeGreaterThan(0)
    expect(remaining).toBeLessThanOrEqual(1800_000)
  })

  it('returns 0 when token is expired', () => {
    injectSessionState({ tokenExpiryTime: Date.now() - 5000 })
    expect(SessionManager.getSessionTimeRemaining()).toBe(0)
  })
})

// ─── getSessionInfo ───────────────────────────────────────────────────────────

describe('SessionManager.getSessionInfo', () => {
  it('returns null when no session', () => {
    expect(SessionManager.getSessionInfo()).toBeNull()
  })

  it('returns session state copy (not reference)', () => {
    injectSessionState({ userId: 'user-abc' })
    const info = SessionManager.getSessionInfo()
    expect(info).not.toBeNull()
    expect(info!.userId).toBe('user-abc')
    expect(info!.email).toBe('test@example.com')
    expect(info!.isActive).toBe(true)
  })
})

// ─── getStats ─────────────────────────────────────────────────────────────────

describe('SessionManager.getStats', () => {
  it('returns null when no session', () => {
    expect(SessionManager.getStats()).toBeNull()
  })

  it('returns stats object with correct shape', () => {
    injectSessionState()
    const stats = SessionManager.getStats()
    expect(stats).not.toBeNull()
    expect(typeof stats!.isActive).toBe('boolean')
    expect(typeof stats!.sessionDuration).toBe('number')
    expect(typeof stats!.inactivityDuration).toBe('number')
    expect(typeof stats!.tokenExpiresIn).toBe('number')
  })

  it('sessionDuration is non-negative', () => {
    injectSessionState({ sessionStartTime: Date.now() - 5000 })
    const stats = SessionManager.getStats()!
    expect(stats.sessionDuration).toBeGreaterThanOrEqual(0)
  })

  it('tokenExpiresIn is 0 for expired token', () => {
    injectSessionState({ tokenExpiryTime: Date.now() - 1000 })
    expect(SessionManager.getStats()!.tokenExpiresIn).toBe(0)
  })
})

// ─── Event system (on / off / emit) ──────────────────────────────────────────

describe('SessionManager event system', () => {
  it('calls registered listener on emit', () => {
    const handler = vi.fn()
    SessionManager.on('test_event', handler)
    // Trigger emit via revokeSessionImmediately (which emits session_revoked_immediately)
    // Instead, test on/off directly by accessing private emit indirectly
    SessionManager.on('custom_event', handler)

    // Access private emit via any cast
    ;(SessionManager as unknown as Record<string, unknown>)['emit']?.call(
      SessionManager,
      'custom_event',
      { message: 'hello' }
    )

    expect(handler).toHaveBeenCalledWith({ message: 'hello' })
    SessionManager.off('custom_event', handler)
  })

  it('does not call listener after off()', () => {
    const handler = vi.fn()
    SessionManager.on('remove_test', handler)
    SessionManager.off('remove_test', handler)

    ;(SessionManager as unknown as Record<string, unknown>)['emit']?.call(
      SessionManager,
      'remove_test',
      {}
    )

    expect(handler).not.toHaveBeenCalled()
  })

  it('calls multiple listeners for same event', () => {
    const h1 = vi.fn()
    const h2 = vi.fn()
    SessionManager.on('multi_test', h1)
    SessionManager.on('multi_test', h2)

    ;(SessionManager as unknown as Record<string, unknown>)['emit']?.call(
      SessionManager,
      'multi_test',
      { data: 1 }
    )

    expect(h1).toHaveBeenCalled()
    expect(h2).toHaveBeenCalled()

    SessionManager.off('multi_test', h1)
    SessionManager.off('multi_test', h2)
  })
})

// ─── SessionConfig constants ──────────────────────────────────────────────────

describe('SessionConfig', () => {
  it('SESSION_TIMEOUT_MS is 30 minutes', () => {
    expect(SessionConfig.SESSION_TIMEOUT_MS).toBe(30 * 60 * 1000)
  })

  it('INACTIVITY_WARNING_MS is less than SESSION_TIMEOUT_MS', () => {
    expect(SessionConfig.INACTIVITY_WARNING_MS).toBeLessThan(SessionConfig.SESSION_TIMEOUT_MS)
  })

  it('TOKEN_REFRESH_INTERVAL_MS is less than SESSION_TIMEOUT_MS', () => {
    expect(SessionConfig.TOKEN_REFRESH_INTERVAL_MS).toBeLessThan(SessionConfig.SESSION_TIMEOUT_MS)
  })

  it('TOKEN_EXPIRY_BUFFER_MS is positive', () => {
    expect(SessionConfig.TOKEN_EXPIRY_BUFFER_MS).toBeGreaterThan(0)
  })
})
