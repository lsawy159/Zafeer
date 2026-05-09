/**
 * RLS tests for `saved_searches` table
 * - owner-only: each user sees only their own rows
 * - anon: no access
 */
import { createClient } from '@supabase/supabase-js'
import { describe, it, expect } from 'vitest'

const url = process.env.SUPABASE_URL!
const anonKey = process.env.SUPABASE_ANON_KEY!

const anonClient = createClient(url, anonKey)

describe('saved_searches RLS', () => {
  it('anon cannot SELECT saved_searches', async () => {
    const { data, error } = await anonClient.from('saved_searches').select('id').limit(1)
    expect(error || data?.length === 0).toBeTruthy()
  })

  it('anon cannot INSERT saved_search', async () => {
    const { error } = await anonClient.from('saved_searches').insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      name: 'test',
    })
    expect(error).not.toBeNull()
  })
})
