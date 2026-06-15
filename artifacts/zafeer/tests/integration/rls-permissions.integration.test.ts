import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createIntegrationClient,
  signInAs,
  signOut,
  getNopermCredentials,
} from './_client'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('Surface 3 — RLS Permissions Integration', () => {
  let client: SupabaseClient

  beforeAll(async () => {
    client = createIntegrationClient()
    const { email, password } = getNopermCredentials()
    await signInAs(client, email, password)
  })

  afterAll(async () => {
    if (client) await signOut(client)
  })

  it('denies SELECT on employees for user with no permissions (RLS blocks → 0 rows)', async () => {
    const { data, error } = await client
      .from('employees')
      .select('id')
      .limit(10)

    // RLS silently filters rows — no error, but 0 results
    expect(error, `Unexpected RLS error: ${error?.message}`).toBeNull()
    expect(
      data?.length ?? 0,
      'RLS LEAK: noperm user can see employees — user_has_permission policy may be broken'
    ).toBe(0)
  })

  it('denies SELECT on companies for user with no permissions', async () => {
    const { data, error } = await client
      .from('companies')
      .select('id')
      .limit(10)

    expect(error).toBeNull()
    expect(
      data?.length ?? 0,
      'RLS LEAK: noperm user can see companies'
    ).toBe(0)
  })

  it('denies INSERT on employees for user with no permissions', async () => {
    const { error } = await client
      .from('employees')
      .insert({
        name: 'IT-061-RLS-PROBE',
        company_id: '00000000-0000-0000-0000-000000000000',
        residence_number: 9999999,
        salary: 0,
      })

    // RLS INSERT policy violation returns a policy error
    expect(error, 'RLS LEAK: noperm user could INSERT into employees').not.toBeNull()
  })

  it('user_has_permission RPC returns false for noperm user on employees/view', async () => {
    const { data, error } = await client
      .rpc('user_has_permission', { section: 'employees', action: 'view' })

    expect(error, `user_has_permission RPC failed: ${error?.message}`).toBeNull()
    expect(
      data,
      'RLS LEAK: user_has_permission returned true for noperm user'
    ).toBe(false)
  })

  it('is_admin RPC returns false for noperm user', async () => {
    const { data, error } = await client.rpc('is_admin')

    expect(error, `is_admin RPC failed: ${error?.message}`).toBeNull()
    expect(
      data,
      'RLS LEAK: is_admin returned true for noperm user'
    ).toBe(false)
  })
})
