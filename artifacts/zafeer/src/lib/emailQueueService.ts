import { supabase } from './supabase'
import { logActivity as writeActivity } from '@/utils/logActivity'

interface EnqueueEmailOptions {
  toEmails: string[]
  subject: string
  htmlContent?: string
  textContent?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  category?: 'general' | 'alert-digest' | 'backup'
  ccEmails?: string[]
  bccEmails?: string[]
  scheduledAt?: Date
}

interface EnqueueEmailResult {
  success: boolean
  id?: string
  error?: string
}

// Basic email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Maximum recipients per email
const MAX_RECIPIENTS = 100

function resolveQueueMode(): 'normal' | 'digest-only' {
  const viteMode = (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_EMAIL_QUEUE_MODE
  const processMode = (
    globalThis as {
      process?: {
        env?: Record<string, string | undefined>
      }
    }
  ).process?.env?.VITE_EMAIL_QUEUE_MODE

  const mode = (processMode || viteMode || 'normal').trim().toLowerCase()
  return mode === 'digest-only' ? 'digest-only' : 'normal'
}

// Check if email is allowed by current queue mode constraint
function validateQueueModeConstraint(options: EnqueueEmailOptions): {
  allowed: boolean
  error?: string
} {
  const mode = resolveQueueMode()

  if (mode === 'digest-only') {
    const normalizedCategory = (options.category || 'general').toLowerCase()

    // Backup notifications are operationally critical and should not be blocked by digest mode.
    if (normalizedCategory === 'backup') {
      return { allowed: true }
    }

    const isDigest =
      typeof options.subject === 'string' && options.subject.toLowerCase().includes('daily digest')

    const isLegacyBackupSubject =
      typeof options.subject === 'string' && options.subject.toLowerCase().includes('backup')

    if (isLegacyBackupSubject) {
      return { allowed: true }
    }

    const singleRecipient = options.toEmails.length === 1

    if (!isDigest || !singleRecipient) {
      return {
        allowed: false,
        error: 'Email queue is in digest-only mode. Only a single Daily Digest email is allowed.',
      }
    }
  }

  return { allowed: true }
}

export async function enqueueEmail(options: EnqueueEmailOptions): Promise<EnqueueEmailResult> {
  const {
    toEmails,
    subject,
    htmlContent,
    textContent,
    priority = 'medium',
    ccEmails,
    bccEmails,
    scheduledAt,
  } = options

  // Validate queue mode constraint (digest-only or normal)
  const modeCheck = validateQueueModeConstraint(options)
  if (!modeCheck.allowed) {
    return { success: false, error: modeCheck.error }
  }

  // 1. Email validation
  const allRecipients = [...toEmails, ...(ccEmails || []), ...(bccEmails || [])]
  for (const email of allRecipients) {
    if (!emailRegex.test(email)) {
      return { success: false, error: `Invalid email address: ${email}` }
    }
  }

  // 2. Max recipients check
  if (allRecipients.length === 0) {
    return { success: false, error: 'No recipients provided.' }
  }
  if (allRecipients.length > MAX_RECIPIENTS) {
    return { success: false, error: `Too many recipients. Maximum allowed is ${MAX_RECIPIENTS}.` }
  }

  try {
    const { data, error } = await supabase
      .from('email_queue')
      .insert({
        to_emails: toEmails,
        cc_emails: ccEmails,
        bcc_emails: bccEmails,
        subject,
        html_content: htmlContent,
        text_content: textContent,
        priority,
        scheduled_at: scheduledAt ? scheduledAt.toISOString() : null,
        status: 'pending', // Always pending on insertion
      })
      .select('id')
      .single()

    if (error) {
      // Non-blocking activity log: failure case (مُعلَّم كفشل صراحةً)
      void writeActivity({
        entity_type: 'email_queue',
        action: 'create_failed',
        operation_status: 'failed',
        details: { error_message: error.message },
      })
      return { success: false, error: 'Failed to enqueue email.' }
    }

    // Non-blocking activity log: success case
    void writeActivity({
      entity_type: 'email_queue',
      action: 'create_success',
      entity_id: data.id as unknown as string,
    })

    return { success: true, id: data.id }
  } catch (err) {
    // Non-blocking activity log: exception case (مُعلَّم كفشل صراحةً)
    void writeActivity({
      entity_type: 'email_queue',
      action: 'create_exception',
      operation_status: 'failed',
      details: { error_message: (err as Error).message },
    })
    return { success: false, error: 'An unexpected error occurred.' }
  }
}
