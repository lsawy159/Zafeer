import { describe, it, expect, vi, beforeEach } from 'vitest'
import { enqueueEmail } from '@/lib/emailQueueService'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockInsert = vi.hoisted(() => vi.fn())
const mockFrom = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
}))

// Default: successful insert
function setupSuccessInsert(id = 'email-uuid-1') {
  mockFrom.mockReturnValue({
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id }, error: null }),
      }),
    }),
  })
}

function setupInsertError(message = 'db error') {
  mockFrom.mockReturnValue({
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: { message } }),
      }),
    }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  setupSuccessInsert()
})

// ─── Email validation ─────────────────────────────────────────────────────────

describe('enqueueEmail — email validation', () => {
  it('valid email + content → success', async () => {
    const result = await enqueueEmail({
      toEmails: ['user@example.com'],
      subject: 'Test',
      textContent: 'Hello',
    })
    expect(result.success).toBe(true)
    expect(result.id).toBe('email-uuid-1')
  })

  it('invalid email format → failure with message', async () => {
    const result = await enqueueEmail({
      toEmails: ['not-an-email'],
      subject: 'Test',
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('not-an-email')
  })

  it('invalid CC email → failure', async () => {
    const result = await enqueueEmail({
      toEmails: ['user@example.com'],
      ccEmails: ['bad-email'],
      subject: 'Test',
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('bad-email')
  })

  it('invalid BCC email → failure', async () => {
    const result = await enqueueEmail({
      toEmails: ['user@example.com'],
      bccEmails: ['@nodomain'],
      subject: 'Test',
    })
    expect(result.success).toBe(false)
  })
})

// ─── Recipients validation ────────────────────────────────────────────────────

describe('enqueueEmail — recipients validation', () => {
  it('empty toEmails → failure (no recipients)', async () => {
    const result = await enqueueEmail({
      toEmails: [],
      subject: 'Test',
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('No recipients')
  })

  it('exactly 100 recipients → allowed', async () => {
    const emails = Array.from({ length: 100 }, (_, i) => `user${i}@example.com`)
    const result = await enqueueEmail({ toEmails: emails, subject: 'Test' })
    expect(result.success).toBe(true)
  })

  it('101 recipients → failure (too many)', async () => {
    const emails = Array.from({ length: 101 }, (_, i) => `user${i}@example.com`)
    const result = await enqueueEmail({ toEmails: emails, subject: 'Test' })
    expect(result.success).toBe(false)
    expect(result.error).toContain('Too many recipients')
  })

  it('recipients spread across to/cc/bcc counted together', async () => {
    // 34 + 34 + 34 = 102 → over limit
    const make = (n: number) => Array.from({ length: n }, (_, i) => `u${i}@x.com`)
    const result = await enqueueEmail({
      toEmails: make(34),
      ccEmails: make(34),
      bccEmails: make(34),
      subject: 'Test',
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('Too many recipients')
  })
})

// ─── Supabase error passthrough ───────────────────────────────────────────────

describe('enqueueEmail — Supabase error', () => {
  it('Supabase insert error → returns failure', async () => {
    setupInsertError('unique constraint violation')
    const result = await enqueueEmail({
      toEmails: ['user@example.com'],
      subject: 'Test',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })
})

// ─── Queue mode: normal (default) ────────────────────────────────────────────

describe('enqueueEmail — normal mode', () => {
  it('any valid email is allowed in normal mode', async () => {
    const result = await enqueueEmail({
      toEmails: ['any@example.com', 'another@example.com'],
      subject: 'Bulk notification',
      category: 'general',
    })
    expect(result.success).toBe(true)
  })
})
