import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createIntegrationClient, signInAs, signOut, getAdminCredentials } from './_client'
import type { SupabaseClient } from '@supabase/supabase-js'

// Keys that must exist in notification_thresholds JSONB (mirrors alertThresholds.ts DEFAULT_THRESHOLDS)
const REQUIRED_THRESHOLD_KEYS = [
  'residence_urgent_days',
  'residence_high_days',
  'residence_medium_days',
  'contract_urgent_days',
  'contract_high_days',
  'contract_medium_days',
  'commercial_reg_urgent_days',
  'commercial_reg_high_days',
  'commercial_reg_medium_days',
  'health_insurance_urgent_days',
  'health_insurance_high_days',
  'health_insurance_medium_days',
  'power_subscription_urgent_days',
  'power_subscription_high_days',
  'power_subscription_medium_days',
  'moqeem_subscription_urgent_days',
  'moqeem_subscription_high_days',
  'moqeem_subscription_medium_days',
] as const

type ThresholdKey = (typeof REQUIRED_THRESHOLD_KEYS)[number]

function classifyDaysUntilExpiry(
  daysUntil: number,
  urgentDays: number,
  mediumDays: number
): 'urgent' | 'medium' | 'ok' {
  if (daysUntil <= urgentDays) return 'urgent'
  if (daysUntil <= mediumDays) return 'medium'
  return 'ok'
}

describe('Surface 2 — Alert Thresholds Integration', () => {
  let client: SupabaseClient
  let thresholds: Record<ThresholdKey, number>

  beforeAll(async () => {
    client = createIntegrationClient()
    const { email, password } = getAdminCredentials()
    await signInAs(client, email, password)
  })

  afterAll(async () => {
    if (client) await signOut(client)
  })

  it('reads notification_thresholds JSONB from system_settings', async () => {
    const { data, error } = await client
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'notification_thresholds')
      .maybeSingle()

    expect(error, `system_settings read failed: ${error?.message}`).toBeNull()
    expect(data, 'notification_thresholds row not found — run Phase 2 seed (T007)').toBeTruthy()
    expect(typeof data!.setting_value).toBe('object')

    thresholds = data!.setting_value as Record<ThresholdKey, number>
  })

  it('verifies all required JSONB keys exist and are numeric (fails on schema drift)', () => {
    expect(thresholds, 'thresholds not loaded — previous test failed').toBeTruthy()

    for (const key of REQUIRED_THRESHOLD_KEYS) {
      expect(
        thresholds,
        `Missing JSONB key: ${key} — key was renamed or removed from notification_thresholds`
      ).toHaveProperty(key)

      expect(
        typeof thresholds[key],
        `Expected numeric value for key ${key}, got ${typeof thresholds[key]}`
      ).toBe('number')
    }
  })

  it('classifies alert severity correctly against stored thresholds', () => {
    expect(thresholds).toBeTruthy()

    const urgentDays = thresholds['residence_urgent_days']
    const mediumDays = thresholds['residence_medium_days']

    // Days within urgent threshold → URGENT
    expect(classifyDaysUntilExpiry(urgentDays - 1, urgentDays, mediumDays)).toBe('urgent')
    // Days at urgent threshold → URGENT
    expect(classifyDaysUntilExpiry(urgentDays, urgentDays, mediumDays)).toBe('urgent')
    // Days between urgent and medium → MEDIUM
    expect(classifyDaysUntilExpiry(urgentDays + 1, urgentDays, mediumDays)).toBe('medium')
    // Days beyond medium → OK
    expect(classifyDaysUntilExpiry(mediumDays + 1, urgentDays, mediumDays)).toBe('ok')
  })

  it('urgent threshold is strictly less than or equal to medium threshold', () => {
    expect(thresholds).toBeTruthy()

    const groups = [
      ['residence_urgent_days', 'residence_medium_days'],
      ['contract_urgent_days', 'contract_medium_days'],
      ['commercial_reg_urgent_days', 'commercial_reg_medium_days'],
      ['health_insurance_urgent_days', 'health_insurance_medium_days'],
      ['power_subscription_urgent_days', 'power_subscription_medium_days'],
      ['moqeem_subscription_urgent_days', 'moqeem_subscription_medium_days'],
    ] as const

    for (const [urgentKey, mediumKey] of groups) {
      expect(
        thresholds[urgentKey],
        `${urgentKey} (${thresholds[urgentKey]}) must be ≤ ${mediumKey} (${thresholds[mediumKey]})`
      ).toBeLessThanOrEqual(thresholds[mediumKey])
    }
  })
})
