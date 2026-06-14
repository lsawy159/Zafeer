import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createIntegrationClient, signInAs, signOut, getAdminCredentials } from './_client'
import { deleteByPrefix } from './_cleanup'
import type { SupabaseClient } from '@supabase/supabase-js'

const PREFIX = 'IT-061-email-queue'

describe('Surface 4 — Email Queue Integration', () => {
  let client: SupabaseClient
  let insertedId: string | null = null

  beforeAll(async () => {
    client = createIntegrationClient()
    const { email, password } = getAdminCredentials()
    await signInAs(client, email, password)
  })

  afterAll(async () => {
    if (!client) return
    try {
      await deleteByPrefix(client, 'email_queue', 'subject', PREFIX)
    } finally {
      await signOut(client)
    }
  })

  it('inserts a row into email_queue with correct column structure', async () => {
    const testSubject = `${PREFIX}-test-${Date.now()}`

    const { data, error } = await client
      .from('email_queue')
      .insert({
        to_emails: ['it-061-test@example.com'],
        subject: testSubject,
        html_content: '<p>IT-061 integration test</p>',
        text_content: 'IT-061 integration test',
        priority: 'medium',
        status: 'pending',
        scheduled_at: null,
      })
      .select('id, to_emails, subject, html_content, text_content, priority, status')
      .single()

    expect(error, `email_queue insert failed: ${error?.message}`).toBeNull()
    expect(data).toBeTruthy()
    insertedId = data!.id
  })

  it('reads back the inserted row and verifies all required columns exist', async () => {
    expect(insertedId, 'Insert test must succeed first').toBeTruthy()

    const { data, error } = await client
      .from('email_queue')
      .select('id, to_emails, subject, html_content, text_content, priority, status')
      .eq('id', insertedId!)
      .single()

    expect(error, `email_queue read failed: ${error?.message}`).toBeNull()
    expect(data).toBeTruthy()

    // Verify required columns are present and correctly stored
    expect(Array.isArray(data!.to_emails)).toBe(true)
    expect(data!.to_emails[0]).toBe('it-061-test@example.com')
    expect(data!.subject).toContain(PREFIX)
    expect(data!.priority).toBe('medium')
    expect(data!.status).toBe('pending')
  })

  it('fails if email_queue column names change (schema drift detection)', async () => {
    // Column existence verified by the select above succeeding.
    // Explicit check: all columns from emailQueueService.ts must be selectable.
    const { data, error } = await client
      .from('email_queue')
      .select(
        'id, to_emails, cc_emails, bcc_emails, subject, html_content, text_content, priority, status, scheduled_at'
      )
      .eq('id', insertedId!)
      .single()

    expect(
      error,
      `Schema drift in email_queue: ${error?.message} — a column may have been renamed or removed`
    ).toBeNull()
    expect(data).toBeTruthy()
  })
})
