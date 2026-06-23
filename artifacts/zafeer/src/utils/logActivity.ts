import { supabase } from '@/lib/supabase'
import { logger } from '@/utils/logger'

/**
 * طبقة كتابة موحّدة لسجل النشاطات (activity_log).
 *
 * مصدر الحقيقة الوحيد لكتابة النشاطات من الفرونت. لا تكتب من فورمة مباشرة —
 * استخدم الدوال هنا لضمان:
 *   - تسجيل الفاعل الحقيقي (الـ DB trigger يملأ user_id = auth.uid()) — لا نمرره من هنا.
 *   - حفظ القيم القديمة/الجديدة في الأعمدة top-level (old_data / new_data) حيث يقرأها العارض.
 *   - استبعاد البيانات الحساسة.
 *   - عدم كسر العملية الأساسية (non-blocking).
 *
 * @see supabase/migrations/074_activity_log_actor_enforcement.sql
 */

/** نوع الفاعل — يميّز فعل المستخدم عن أفعال النظام/الأتمتة/الخدمة. */
export type ActorType = 'user' | 'system' | 'automation' | 'service'

/** حقول لا يجوز تسجيلها إطلاقاً في سجل النشاط (أمان). */
const SENSITIVE_KEYS = new Set([
  'password', 'password_hash', 'token', 'access_token', 'refresh_token',
  'secret', 'api_key', 'apikey', 'service_role', 'otp', 'private_key',
])

/** حقول ميتاداتا لا فائدة منها في الـ diff للمستخدم. */
const METADATA_KEYS = new Set([
  'id', 'created_at', 'updated_at', 'createdAt', 'updatedAt',
  'is_deleted', 'deleted_at',
])

function isSensitive(key: string): boolean {
  const k = key.toLowerCase()
  return SENSITIVE_KEYS.has(k) || k.includes('password') || k.includes('secret') || k.includes('token')
}

/** ينظّف كائن قبل التسجيل: يشيل الحساس + الميتاداتا. */
function sanitize(obj: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!obj || typeof obj !== 'object') return {}
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (isSensitive(k)) continue
    out[k] = v
  }
  return out
}

export interface LogActivityInput {
  entity_type: string
  entity_id: string
  action: string
  /** القيم القبلية (الصف كامل أو الحقول المعنية). تُكتب في عمود old_data بعد التنظيف. */
  old?: Record<string, unknown> | null
  /** القيم البعدية. تُكتب في عمود new_data بعد التنظيف. */
  new?: Record<string, unknown> | null
  /** بيانات وصفية إضافية للعرض (اسم الموظف، رقم الإقامة، ...). */
  details?: Record<string, unknown>
  /** لربط الأفعال الثانوية التلقائية بالفعل الأصلي في نفس العملية. */
  correlation_id?: string | null
  /** افتراضي 'user'. مرّر 'system'/'automation' للأفعال غير المباشرة. */
  actor_type?: ActorType
  /** حالة العملية — 'success' افتراضياً. للفشل المقصود تسجيله مرّر 'failed'. */
  operation_status?: 'success' | 'failed'
}

/**
 * يحسب الحقول المتغيّرة فعلياً بين old و new (مع تجاهل الميتاداتا).
 * يُرجع خريطة { fieldKey: { old, new } } للحقول المختلفة فقط.
 */
export function computeChanges(
  oldObj: Record<string, unknown> | null | undefined,
  newObj: Record<string, unknown> | null | undefined
): Record<string, { old: unknown; new: unknown }> {
  const changes: Record<string, { old: unknown; new: unknown }> = {}
  if (!oldObj && !newObj) return changes
  const keys = new Set([...Object.keys(oldObj ?? {}), ...Object.keys(newObj ?? {})])
  for (const key of keys) {
    if (METADATA_KEYS.has(key) || isSensitive(key)) continue
    const o = oldObj?.[key]
    const n = newObj?.[key]
    if (o !== n) changes[key] = { old: o, new: n }
  }
  return changes
}

/**
 * يسجّل نشاطاً واحداً في activity_log.
 * non-blocking: لا يرمي استثناء — يسجّل الخطأ فقط حتى لا يكسر العملية الأساسية.
 * لا يمرّر user_id إطلاقاً — الـ DB trigger يختم الفاعل الحقيقي من الجلسة.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    const oldData = input.old ? sanitize(input.old) : null
    const newData = input.new ? sanitize(input.new) : null

    await supabase.from('activity_log').insert({
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      action: input.action,
      old_data: oldData,
      new_data: newData,
      actor_type: input.actor_type ?? 'user',
      correlation_id: input.correlation_id ?? null,
      operation_status: input.operation_status ?? 'success',
      details: {
        ...(input.details ?? {}),
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    logger.error('logActivity failed:', error)
  }
}
