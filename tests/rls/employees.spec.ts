/**
 * RLS tests for `employees` table
 * - authenticated users: full access (current policy)
 * - anon users: no access
 */
import { createClient } from '@supabase/supabase-js'
import { describe, it, expect, beforeAll } from 'vitest'

const url = process.env.SUPABASE_URL!
const anonKey = process.env.SUPABASE_ANON_KEY!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// anon client — unauthenticated
const anonClient = createClient(url, anonKey)
// service client — bypasses RLS
const serviceClient = createClient(url, serviceKey, {
  auth: { persistSession: false },
})

describe('employees RLS', () => {
  it('anon cannot SELECT employees', async () => {
    const { data, error } = await anonClient.from('employees').select('id').limit(1)
    // RLS blocks → empty data or permission error
    expect(error || data?.length === 0).toBeTruthy()
  })

  it('anon cannot INSERT employee', async () => {
    const { error } = await anonClient.from('employees').insert({
      company_id: '00000000-0000-0000-0000-000000000000',
      name: 'test',
    })
    expect(error).not.toBeNull()
  })

  it('service role can SELECT employees', async () => {
    const { error } = await serviceClient.from('employees').select('id').limit(1)
    expect(error).toBeNull()
  })
})
