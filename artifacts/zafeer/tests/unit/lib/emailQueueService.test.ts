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

// ─── Activity logging ─────────────────────────────────────────────────────────

describe('emailQueueService activity logging', () => {
  let insertMock: any
  let catchMock: any

  beforeEach(() => {
    vi.stubEnv('VITE_EMAIL_QUEUE_MODE', 'normal')
    vi.clearAllMocks()
    catchMock = vi.fn(() => Promise.resolve({}))
    insertMock = vi.fn(() => ({
      catch: catchMock,
    }))
  })

  describe('digest-only mode guards', () => {
    it('blocks non-digest general emails in digest-only mode', async () => {
      vi.stubEnv('VITE_EMAIL_QUEUE_MODE', 'digest-only')

      const result = await enqueueEmail({
        toEmails: ['team@example.com'],
        subject: 'Team update',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('digest-only mode')
      expect(mockFrom).not.toHaveBeenCalled()
    })

    it('allows backup category emails in digest-only mode', async () => {
      vi.stubEnv('VITE_EMAIL_QUEUE_MODE', 'digest-only')
      const mockData = { id: 'backup-email-id' }

      mockFrom.mockImplementation((table: string) => {
        if (table === 'email_queue') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
              }),
            }),
          }
        }
        if (table === 'activity_log') {
          return { insert: vi.fn(() => ({ catch: vi.fn() })) }
        }
        return undefined
      })

      const result = await enqueueEmail({
        toEmails: ['ops@example.com'],
        subject: 'Backup completed successfully',
        category: 'backup',
      })

      expect(result.success).toBe(true)
      expect(result.id).toBe('backup-email-id')
    })
  })

  describe('success path logs create_success', () => {
    it('should log successful email enqueue to activity_log', async () => {
      const mockData = { id: 'test-email-id' }

      mockFrom.mockImplementation((table: string) => {
        if (table === 'email_queue') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
              }),
            }),
          }
        }
        if (table === 'activity_log') {
          return { insert: insertMock }
        }
        return undefined
      })

      const result = await enqueueEmail({
        toEmails: ['test@example.com'],
        subject: 'Test Email',
        htmlContent: '<p>Test</p>',
      })

      expect(result.success).toBe(true)
      expect(result.id).toBe('test-email-id')
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: 'email_queue',
          action: 'create_success',
          entity_id: 'test-email-id',
        })
      )
    })
  })

  describe('failure path logs create_failed', () => {
    it('should log DB error to activity_log with create_failed action', async () => {
      const mockError = { message: 'Database connection failed' }

      mockFrom.mockImplementation((table: string) => {
        if (table === 'email_queue') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
              }),
            }),
          }
        }
        if (table === 'activity_log') {
          return { insert: insertMock }
        }
        return undefined
      })

      const result = await enqueueEmail({
        toEmails: ['test@example.com'],
        subject: 'Test Email',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to enqueue email.')
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: 'email_queue',
          action: 'create_failed',
          details: 'Database connection failed',
        })
      )
    })
  })

  describe('exception path logs create_exception', () => {
    it('should log unexpected exception to activity_log with create_exception action', async () => {
      const mockError = new Error('Network timeout')

      mockFrom.mockImplementation((table: string) => {
        if (table === 'email_queue') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockRejectedValue(mockError),
              }),
            }),
          }
        }
        if (table === 'activity_log') {
          return { insert: insertMock }
        }
        return undefined
      })

      const result = await enqueueEmail({
        toEmails: ['test@example.com'],
        subject: 'Test Email',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('An unexpected error occurred.')
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: 'email_queue',
          action: 'create_exception',
          details: 'Network timeout',
        })
      )
    })
  })

  describe('non-blocking error handling', () => {
    it('should not fail email enqueue if activity_log insert fails', async () => {
      const mockData = { id: 'test-email-id' }

      mockFrom.mockImplementation((table: string) => {
        if (table === 'email_queue') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
              }),
            }),
          }
        }
        if (table === 'activity_log') {
          return {
            insert: vi.fn().mockReturnValue({
              catch: vi.fn().mockImplementation((fn) => {
                fn(new Error('activity_log insert failed'))
                return Promise.resolve({})
              }),
            }),
          }
        }
        return undefined
      })

      const result = await enqueueEmail({
        toEmails: ['test@example.com'],
        subject: 'Test Email',
      })

      expect(result.success).toBe(true)
      expect(result.id).toBe('test-email-id')
    })
  })

  describe('queue mode constraint', () => {
    it('should allow emails in normal mode (production: digest-only constraint enforced separately)', async () => {
      const mockData = { id: 'normal-mode-email-id' }

      mockFrom.mockImplementation((table: string) => {
        if (table === 'email_queue') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
              }),
            }),
          }
        }
        if (table === 'activity_log') {
          return { insert: vi.fn(() => ({ catch: vi.fn() })) }
        }
        return undefined
      })

      const result = await enqueueEmail({
        toEmails: ['any@example.com'],
        subject: 'Any Email Subject',
      })

      expect(result.success).toBe(true)
      expect(result.id).toBe('normal-mode-email-id')
    })
  })
})
