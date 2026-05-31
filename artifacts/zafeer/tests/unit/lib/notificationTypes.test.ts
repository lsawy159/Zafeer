import { describe, it, expect, vi } from 'vitest'
import {
  validateConfig,
  getRecipientsForNotificationType,
  safeParseConfig,
  createDefaultConfig,
  type NotificationRecipientsConfig,
  type AdditionalRecipient,
} from '@/lib/notificationTypes'

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeRecipient(overrides: Partial<AdditionalRecipient> = {}): AdditionalRecipient {
  return {
    id: 'r1',
    email: 'user@example.com',
    expiryAlerts: true,
    backupNotifications: true,
    dailyDigest: false,
    added_at: '2026-01-01T00:00:00Z',
    added_by: 'system',
    ...overrides,
  }
}

function makeConfig(overrides: Partial<NotificationRecipientsConfig> = {}): NotificationRecipientsConfig {
  return {
    primary_admin: 'admin@example.com',
    primary_admin_locked: true,
    additional_recipients: [],
    version: '1.0',
    last_modified: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

// ─── validateConfig ───────────────────────────────────────────────────────────

describe('validateConfig', () => {
  it('null → valid=false + default config', () => {
    const { valid, config } = validateConfig(null)
    expect(valid).toBe(false)
    expect(config.primary_admin).toBe('')
    expect(config.additional_recipients).toEqual([])
  })

  it('non-object → valid=false', () => {
    const { valid } = validateConfig('not-an-object')
    expect(valid).toBe(false)
  })

  it('valid config → valid=true, data preserved', () => {
    const input = makeConfig({ primary_admin: 'admin@test.com' })
    const { valid, config } = validateConfig(input)
    expect(valid).toBe(true)
    expect(config.primary_admin).toBe('admin@test.com')
  })

  it('primary_admin without @ → sanitized to empty string', () => {
    const { valid, config } = validateConfig(makeConfig({ primary_admin: 'notanemail' }))
    expect(valid).toBe(true)
    expect(config.primary_admin).toBe('')
  })

  it('primary_admin with leading/trailing spaces → trimmed', () => {
    const { valid, config } = validateConfig(makeConfig({ primary_admin: '  admin@test.com  ' }))
    expect(valid).toBe(true)
    expect(config.primary_admin).toBe('admin@test.com')
  })

  it('primary_admin_locked non-boolean → defaults to true', () => {
    const { config } = validateConfig(makeConfig({ primary_admin_locked: 'yes' as unknown as boolean }))
    expect(config.primary_admin_locked).toBe(true)
  })

  it('additional_recipients not array → set to []', () => {
    const { config } = validateConfig(makeConfig({ additional_recipients: 'invalid' as unknown as AdditionalRecipient[] }))
    expect(config.additional_recipients).toEqual([])
  })

  it('filters out recipients missing @ in email', () => {
    const { config } = validateConfig(makeConfig({
      additional_recipients: [
        makeRecipient({ email: 'bademail' }),
        makeRecipient({ email: 'good@test.com' }),
      ],
    }))
    expect(config.additional_recipients).toHaveLength(1)
    expect(config.additional_recipients[0].email).toBe('good@test.com')
  })

  it('filters out recipients with non-boolean flag fields', () => {
    const { config } = validateConfig(makeConfig({
      additional_recipients: [
        makeRecipient({ expiryAlerts: 'yes' as unknown as boolean }),
        makeRecipient({ email: 'valid@test.com', expiryAlerts: true }),
      ],
    }))
    expect(config.additional_recipients).toHaveLength(1)
  })

  it('version non-string → set to 1.0', () => {
    const { config } = validateConfig(makeConfig({ version: 2 as unknown as string }))
    expect(config.version).toBe('1.0')
  })
})

// ─── getRecipientsForNotificationType ────────────────────────────────────────

describe('getRecipientsForNotificationType', () => {
  it('primary_admin included when valid email', () => {
    const config = makeConfig({ primary_admin: 'admin@test.com' })
    const result = getRecipientsForNotificationType(config, 'expiryAlerts')
    expect(result).toContain('admin@test.com')
  })

  it('primary_admin excluded when no @', () => {
    const config = makeConfig({ primary_admin: '' })
    const result = getRecipientsForNotificationType(config, 'expiryAlerts')
    expect(result).not.toContain('')
    expect(result).toHaveLength(0)
  })

  it('additional recipients filtered by type expiryAlerts=true', () => {
    const config = makeConfig({
      primary_admin: '',
      additional_recipients: [
        makeRecipient({ email: 'a@test.com', expiryAlerts: true }),
        makeRecipient({ email: 'b@test.com', expiryAlerts: false }),
      ],
    })
    const result = getRecipientsForNotificationType(config, 'expiryAlerts')
    expect(result).toContain('a@test.com')
    expect(result).not.toContain('b@test.com')
  })

  it('additional recipients filtered by type backupNotifications', () => {
    const config = makeConfig({
      primary_admin: '',
      additional_recipients: [
        makeRecipient({ email: 'c@test.com', backupNotifications: false }),
        makeRecipient({ email: 'd@test.com', backupNotifications: true }),
      ],
    })
    const result = getRecipientsForNotificationType(config, 'backupNotifications')
    expect(result).toContain('d@test.com')
    expect(result).not.toContain('c@test.com')
  })

  it('deduplicates — primary_admin in additional_recipients appears once', () => {
    const config = makeConfig({
      primary_admin: 'shared@test.com',
      additional_recipients: [
        makeRecipient({ email: 'shared@test.com', expiryAlerts: true }),
      ],
    })
    const result = getRecipientsForNotificationType(config, 'expiryAlerts')
    expect(result.filter(e => e === 'shared@test.com')).toHaveLength(1)
  })
})

// ─── safeParseConfig ──────────────────────────────────────────────────────────

describe('safeParseConfig', () => {
  it('null → default config', () => {
    const result = safeParseConfig(null)
    expect(result).toEqual(createDefaultConfig())
  })

  it('undefined → default config', () => {
    const result = safeParseConfig(undefined)
    expect(result).toEqual(createDefaultConfig())
  })

  it('valid JSON string → parsed and validated', () => {
    const config = makeConfig({ primary_admin: 'parsed@test.com' })
    const result = safeParseConfig(JSON.stringify(config))
    expect(result.primary_admin).toBe('parsed@test.com')
  })

  it('double-encoded JSON string → parsed correctly', () => {
    const config = makeConfig({ primary_admin: 'double@test.com' })
    const result = safeParseConfig(JSON.stringify(JSON.stringify(config)))
    expect(result.primary_admin).toBe('double@test.com')
  })

  it('already-object → validated directly', () => {
    const config = makeConfig({ primary_admin: 'obj@test.com' })
    const result = safeParseConfig(config)
    expect(result.primary_admin).toBe('obj@test.com')
  })

  it('invalid JSON string → default config', () => {
    const result = safeParseConfig('{not valid json')
    const { last_modified: _lm, ...rest } = result
    const { last_modified: _lm2, ...defaultRest } = createDefaultConfig()
    expect(rest).toEqual(defaultRest)
    expect(typeof result.last_modified).toBe('string')
  })

  it('JSON with invalid primary_admin → sanitized', () => {
    const config = makeConfig({ primary_admin: 'notanemail' })
    const result = safeParseConfig(JSON.stringify(config))
    expect(result.primary_admin).toBe('')
  })
})
