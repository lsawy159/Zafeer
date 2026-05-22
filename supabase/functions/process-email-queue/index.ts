// @author ZaFeer System
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { Resend } from 'https://esm.sh/resend@4.0.0'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

interface EmailQueueRow {
  id: string
  to_emails: string[]
  cc_emails: string[] | null
  bcc_emails: string[] | null
  subject: string
  html_content: string | null
  text_content: string | null
  priority: string
  retry_count: number
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'onboarding@resend.dev'

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return jsonResponse({ success: false, error: 'Server misconfigured: missing Supabase env vars' }, 500)
  }
  if (!RESEND_API_KEY) {
    return jsonResponse({ success: false, error: 'Server misconfigured: missing RESEND_API_KEY' }, 500)
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const resend = new Resend(RESEND_API_KEY)

  // Atomic claim: mark up to 50 pending emails as 'processing' (FOR UPDATE SKIP LOCKED)
  const { data: claimed, error: claimError } = await admin.rpc('claim_email_queue_batch', {
    batch_size: 50,
  })

  // Fallback: if RPC doesn't exist yet, use direct query
  let emails: EmailQueueRow[] = []
  if (claimError || !claimed) {
    const { data: fallbackData, error: fallbackError } = await admin
      .from('email_queue')
      .select('id, to_emails, cc_emails, bcc_emails, subject, html_content, text_content, priority, retry_count')
      .eq('status', 'pending')
      .lt('retry_count', 3)
      .or('scheduled_at.is.null,scheduled_at.lte.' + new Date().toISOString())
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(50)

    if (fallbackError) {
      return jsonResponse({ success: false, error: 'Failed to fetch email queue: ' + fallbackError.message }, 500)
    }
    emails = fallbackData ?? []

    // Mark as processing
    if (emails.length > 0) {
      await admin
        .from('email_queue')
        .update({ status: 'processing' })
        .in('id', emails.map((e) => e.id))
    }
  } else {
    emails = claimed ?? []
  }

  if (emails.length === 0) {
    return jsonResponse({ success: true, processed: 0, sent: 0, failed: 0, errors: [] })
  }

  let sent = 0
  let failed = 0
  const errors: string[] = []

  for (const email of emails) {
    try {
      const { error: sendError } = await resend.emails.send({
        from: FROM_EMAIL,
        to: email.to_emails,
        cc: email.cc_emails ?? undefined,
        bcc: email.bcc_emails ?? undefined,
        subject: email.subject,
        html: email.html_content ?? undefined,
        text: email.text_content ?? undefined,
      })

      if (sendError) {
        throw new Error(String((sendError as { message?: string }).message ?? sendError))
      }

      await admin
        .from('email_queue')
        .update({ status: 'sent', sent_at: new Date().toISOString(), completed_at: new Date().toISOString() })
        .eq('id', email.id)

      sent++
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      errors.push(`${email.id}: ${errMsg}`)

      const newRetryCount = (email.retry_count ?? 0) + 1
      const newStatus = newRetryCount >= 3 ? 'failed' : 'pending'

      await admin
        .from('email_queue')
        .update({
          status: newStatus,
          error_message: errMsg,
          retry_count: newRetryCount,
          last_attempt: new Date().toISOString(),
        })
        .eq('id', email.id)

      failed++
    }
  }

  return jsonResponse({
    success: true,
    processed: emails.length,
    sent,
    failed,
    errors,
  })
})
