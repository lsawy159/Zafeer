import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createIntegrationClient, getAdminCredentials, signInAs, signOut } from './_client'
import type { SupabaseClient } from '@supabase/supabase-js'

const PREFIX = 'IT-061-email-queue'

describe('Surface 4 - Email Queue Integration', () => {
  let client: SupabaseClient

  beforeAll(async () => {
    client = createIntegrationClient()
    const { email, password } = getAdminCredentials()
    await signInAs(client, email, password)
  })

  afterAll(async () => {
    if (client) await signOut(client)
  })

  it('denies authenticated admin inserts because email_queue is service-only', async () => {
    const { error } = await client
      .from('email_queue')
      .insert({
        to_emails: ['it-061-test@example.com'],
        subject: `${PREFIX}-test-${Date.now()}`,
        html_content: '<p>IT-061 integration test</p>',
        text_content: 'IT-061 integration test',
        priority: 'medium',
        status: 'pending',
        scheduled_at: null,
      })

    expect(
      error,
      'RLS LEAK: authenticated admin should not insert into service-only email_queue'
    ).not.toBeNull()
    expect(error?.code).toBe('42501')
  })
})
