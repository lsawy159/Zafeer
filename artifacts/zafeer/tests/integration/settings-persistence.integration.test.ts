import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createIntegrationClient, signInAs, signOut, getAdminCredentials } from './_client'
import { restoreSettings } from './_cleanup'
import type { SupabaseClient } from '@supabase/supabase-js'

const SETTINGS_KEY = 'notification_thresholds'

describe('Surface 5 — Settings Persistence Integration', () => {
  let client: SupabaseClient
  let originalValue: unknown = null

  beforeAll(async () => {
    client = createIntegrationClient()
    const { email, password } = getAdminCredentials()
    await signInAs(client, email, password)

    // Save original setting value before any test modifies it
    const { data, error } = await client
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', SETTINGS_KEY)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to read original setting: ${error.message}`)
    }
    originalValue = data?.setting_value ?? null
  })

  afterAll(async () => {
    if (!client) return
    try {
      // D-045n: always restore original value
      await restoreSettings(client, SETTINGS_KEY, originalValue)
    } finally {
      await signOut(client)
    }
  })

  it('reads current notification_thresholds setting', async () => {
    const { data, error } = await client
      .from('system_settings')
      .select('setting_key, setting_value')
      .eq('setting_key', SETTINGS_KEY)
      .maybeSingle()

    expect(error, `system_settings read failed: ${error?.message}`).toBeNull()
    expect(data, 'notification_thresholds not found — run Phase 2 seed (T007)').toBeTruthy()
    expect(data!.setting_key).toBe(SETTINGS_KEY)
    expect(typeof data!.setting_value).toBe('object')
  })

  it('writes a modified JSONB value and reads it back correctly', async () => {
    const testValue = {
      residence_urgent_days: 5,
      residence_high_days: 10,
      residence_medium_days: 20,
      contract_urgent_days: 5,
      contract_high_days: 10,
      contract_medium_days: 20,
      commercial_reg_urgent_days: 5,
      commercial_reg_high_days: 10,
      commercial_reg_medium_days: 20,
      health_insurance_urgent_days: 25,
      health_insurance_high_days: 35,
      health_insurance_medium_days: 50,
      power_subscription_urgent_days: 5,
      power_subscription_high_days: 10,
      power_subscription_medium_days: 20,
      moqeem_subscription_urgent_days: 5,
      moqeem_subscription_high_days: 10,
      moqeem_subscription_medium_days: 20,
      _it061_marker: 'IT-061-settings-test',
    }

    // Write
    const { error: writeError } = await client
      .from('system_settings')
      .upsert({ setting_key: SETTINGS_KEY, setting_value: testValue }, { onConflict: 'setting_key' })

    expect(writeError, `settings write failed: ${writeError?.message}`).toBeNull()

    // Read back
    const { data, error: readError } = await client
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', SETTINGS_KEY)
      .single()

    expect(readError, `settings read-back failed: ${readError?.message}`).toBeNull()
    expect(data).toBeTruthy()

    const stored = data!.setting_value as Record<string, unknown>
    expect(typeof stored).toBe('object')
    expect(stored['residence_urgent_days']).toBe(5)
    expect(stored['_it061_marker']).toBe('IT-061-settings-test')
  })

  it('verifies system_settings table has setting_key and setting_value columns (schema drift)', async () => {
    const { data, error } = await client
      .from('system_settings')
      .select('setting_key, setting_value')
      .eq('setting_key', SETTINGS_KEY)
      .single()

    expect(
      error,
      `Schema drift in system_settings: ${error?.message} — setting_key or setting_value column may have changed`
    ).toBeNull()
    expect(data).toBeTruthy()
  })
})
