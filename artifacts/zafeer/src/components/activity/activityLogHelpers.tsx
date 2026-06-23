import React from 'react'
import { Plus, Edit, Trash2, Eye, LogIn, LogOut, Activity, AlertCircle } from 'lucide-react'
import { ActivityLog } from '@/lib/supabase'

export const getActionIcon = (action: string) => {
  const actionLower = action.toLowerCase()
  if (
    actionLower.includes('create') ||
    actionLower.includes('add') ||
    actionLower.includes('إنشاء') ||
    actionLower.includes('إضافة')
  )
    return <Plus className="w-5 h-5" />
  if (
    actionLower.includes('update') ||
    actionLower.includes('edit') ||
    actionLower.includes('تحديث') ||
    actionLower.includes('تعديل')
  )
    return <Edit className="w-5 h-5" />
  if (
    actionLower.includes('delete') ||
    actionLower.includes('remove') ||
    actionLower.includes('حذف')
  )
    return <Trash2 className="w-5 h-5" />
  if (actionLower.includes('view') || actionLower.includes('read') || actionLower.includes('عرض'))
    return <Eye className="w-5 h-5" />
  if (actionLower.includes('login') || actionLower.includes('دخول'))
    return <LogIn className="w-5 h-5" />
  if (actionLower.includes('logout') || actionLower.includes('خروج'))
    return <LogOut className="w-5 h-5" />
  return <Activity className="w-5 h-5" />
}

export const getActionColor = (action: string) => {
  const actionLower = action.toLowerCase()
  if (
    actionLower.includes('create') ||
    actionLower.includes('add') ||
    actionLower.includes('إنشاء') ||
    actionLower.includes('إضافة')
  )
    return {
      bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
      border: 'border-l-4 border-green-500',
      text: 'text-success-700',
      badge: 'bg-green-100 text-success-800',
      icon: 'bg-green-100 text-success-600',
    }
  if (
    actionLower.includes('update') ||
    actionLower.includes('edit') ||
    actionLower.includes('تحديث') ||
    actionLower.includes('تعديل')
  )
    return {
      bg: 'bg-primary/10',
      border: 'border-l-4 border-primary',
      text: 'text-foreground',
      badge: 'bg-primary/15 text-foreground',
      icon: 'bg-primary/15 text-foreground',
    }
  if (
    actionLower.includes('delete') ||
    actionLower.includes('remove') ||
    actionLower.includes('حذف')
  )
    return {
      bg: 'bg-gradient-to-br from-red-50 to-rose-50',
      border: 'border-l-4 border-red-500',
      text: 'text-red-700',
      badge: 'bg-red-100 text-red-800',
      icon: 'bg-red-100 text-red-600',
    }
  if (actionLower.includes('login') || actionLower.includes('دخول'))
    return {
      bg: 'bg-surface-secondary-100',
      border: 'border-l-4 border-border-500',
      text: 'text-foreground-secondary',
      badge: 'bg-surface-secondary-200 text-foreground-secondary',
      icon: 'bg-surface-secondary-200 text-foreground-secondary',
    }
  if (actionLower.includes('logout') || actionLower.includes('خروج'))
    return {
      bg: 'bg-gradient-to-br from-orange-50 to-amber-50',
      border: 'border-l-4 border-orange-500',
      text: 'text-warning-700',
      badge: 'bg-orange-100 text-warning-800',
      icon: 'bg-orange-100 text-warning-600',
    }
  return {
    bg: 'bg-neutral-50',
    border: 'border-l-4 border-neutral-300',
    text: 'text-neutral-700',
    badge: 'bg-neutral-100 text-neutral-800',
    icon: 'bg-neutral-100 text-neutral-600',
  }
}

export const isImportantAction = (action: string) => {
  const actionLower = action.toLowerCase()
  return (
    actionLower.includes('delete') ||
    actionLower.includes('remove') ||
    actionLower.includes('حذف')
  )
}

export const getActionLabel = (action: string) => {
  const labels: Record<string, string> = {
    create: 'إنشاء',
    update: 'تحديث',
    delete: 'حذف',
    login: 'تسجيل دخول',
    logout: 'تسجيل خروج',
    view: 'عرض',
    export: 'تصدير',
    import: 'استيراد',
    'إنشاء مستخدم': 'إنشاء مستخدم',
    'تحديث مستخدم': 'تحديث مستخدم',
    'إعادة ضبط كلمة المرور': 'إعادة ضبط كلمة المرور',
    'تحديث إعدادات النظام': 'تحديث إعدادات',
    'تحديث إعدادات البريد': 'تحديث إعدادات البريد',
    'إنشاء نسخة احتياطية': 'نسخة احتياطية',
    'استعادة نسخة احتياطية': 'استعادة نسخة',
    'حذف دور': 'حذف دور',
    'إنهاء جلسة': 'إنهاء جلسة',
    'إنهاء كل الجلسات': 'إنهاء جلسات',
    'إنشاء مستخلص': 'إنشاء مستخلص',
    'حذف مستخلص': 'حذف مستخلص',
    'تصدير مستخلص': 'تصدير مستخلص',
    'إنشاء التزام': 'إنشاء التزام',
    'تحديث التزام': 'تحديث التزام',
    'إلغاء التزام': 'إلغاء التزام',
    'إنشاء مشروع': 'إنشاء مشروع',
    'تحديث مشروع': 'تحديث مشروع',
    'استيراد موظفين': 'استيراد موظفين',
    'استيراد مؤسسات': 'استيراد مؤسسات',
    'استيراد إجراءات نقل': 'استيراد إجراءات',
  }
  return labels[action] || labels[action.toLowerCase()] || action
}

export const getEntityLabel = (entity: string) => {
  const labels: Record<string, string> = {
    employee: 'موظف',
    company: 'مؤسسة',
    user: 'مستخدم',
    settings: 'إعدادات',
    notification: 'تنبيه',
    project: 'مشروع',
    payroll: 'مسير رواتب',
    email_queue: 'قائمة البريد',
    email_settings: 'إعدادات البريد',
    backup: 'نسخة احتياطية',
    role: 'دور',
    session: 'جلسة',
    extract: 'مستخلص',
    obligation: 'التزام',
    import: 'استيراد',
  }
  return labels[entity?.toLowerCase()] || entity
}

const getFieldLabel = (key: string): string => {
  const fieldLabels: Record<string, string> = {
    name: 'الاسم',
    phone: 'رقم الهاتف',
    profession: 'المهنة',
    nationality: 'الجنسية',
    residence_number: 'رقم الإقامة',
    passport_number: 'رقم الجواز',
    bank_account: 'الحساب البنكي',
    salary: 'الراتب',
    project_id: 'المشروع',
    company_id: 'المؤسسة',
    birth_date: 'تاريخ الميلاد',
    joining_date: 'تاريخ الالتحاق',
    residence_expiry: 'تاريخ انتهاء الإقامة',
    contract_expiry: 'تاريخ انتهاء العقد',
    hired_worker_contract_expiry: 'تاريخ انتهاء عقد أجير',
    ending_subscription_insurance_date: 'تاريخ انتهاء اشتراك التأمين',
    health_insurance_expiry: 'تاريخ انتهاء التأمين الصحي',
    notes: 'الملاحظات',
    unified_number: 'الرقم الموحد',
    tax_number: 'الرقم الضريبي',
    commercial_registration_number: 'رقم السجل التجاري',
    exemptions: 'الاعفاءات',
    additional_fields: 'حقول إضافية',
    residence_image_url: 'صورة الإقامة',
  }
  return fieldLabels[key] || key
}

const isUselessSystemId = (value: unknown): boolean => {
  if (value === null || value === undefined || value === '') return true
  const strValue = String(value).trim()
  if (strValue.length > 20 && /^[a-f0-9-]{20,}$/.test(strValue)) return true
  if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}/.test(strValue)) return true
  return false
}

const formatDisplayValue = (value: unknown): string | null => {
  if (isUselessSystemId(value)) {
    return null
  }

  const strValue = String(value).trim()

  if (/^\d{4}-\d{2}-\d{2}/.test(strValue)) {
    return strValue
  }

  if (strValue && strValue.length < 200) {
    return strValue
  }

  if (strValue.startsWith('{') || strValue.startsWith('[')) {
    return null
  }

  return strValue
}

export const renderUpdateDetails = (log: ActivityLog): React.JSX.Element => {
  const entityType = log.entity_type?.toLowerCase() || ''
  const entityLabel = getEntityLabel(entityType)
  const details = log.details || {}
  const employeeName = details.employee_name || details.name
  const companyName = details.company_name || details.company

  let oldData: Record<string, unknown> | null = null
  let newData: Record<string, unknown> | null = null
  let hasValidData = false

  // المصدر: الأعمدة top-level أولاً، ثم fallback لـ details.old_data/new_data
  // (صفوف تاريخية أو كُتّاب قدامى كانوا يحفظون داخل details).
  const rawOld = log.old_data ?? (details as Record<string, unknown>).old_data
  const rawNew = log.new_data ?? (details as Record<string, unknown>).new_data

  try {
    if (typeof rawOld === 'string') {
      oldData = JSON.parse(rawOld) as Record<string, unknown>
    } else if (rawOld && typeof rawOld === 'object') {
      oldData = rawOld as Record<string, unknown>
    }

    if (typeof rawNew === 'string') {
      newData = JSON.parse(rawNew) as Record<string, unknown>
    } else if (rawNew && typeof rawNew === 'object') {
      newData = rawNew as Record<string, unknown>
    }

    hasValidData =
      Boolean((oldData && Object.keys(oldData).length > 0) || (newData && Object.keys(newData).length > 0))
  } catch {
    // تجاهل أخطاء التحليل
  }

  const changeList: Array<{
    field: string
    fieldKey: string
    oldValue: string | null
    newValue: string | null
    hasActualChange: boolean
  }> = []

  if (oldData && newData) {
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)])

    allKeys.forEach((key) => {
      const oldValue = oldData?.[key]
      const newValue = newData?.[key]

      if (isUselessSystemId(oldValue) && isUselessSystemId(newValue)) {
        return
      }

      if (oldValue !== newValue) {
        const fieldLabel = getFieldLabel(key)
        const displayedOldValue = formatDisplayValue(oldValue)
        const displayedNewValue = formatDisplayValue(newValue)

        const oldEmpty = !oldValue || oldValue === '' || displayedOldValue === null
        const newEmpty = !newValue || newValue === '' || displayedNewValue === null

        if (!changeList.some((c) => c.field === fieldLabel)) {
          changeList.push({
            field: fieldLabel,
            fieldKey: key,
            oldValue: displayedOldValue,
            newValue: displayedNewValue,
            hasActualChange: !oldEmpty || !newEmpty,
          })
        }
      }
    })
  }

  const actualChanges = changeList.filter((c) => c.hasActualChange)

  let entityName = ''
  let changedFieldsText = ''

  if (actualChanges.length > 0) {
    const fieldNames = actualChanges.map((c) => c.field).join(' و ')
    changedFieldsText = ` (تحديث ${fieldNames})`
  }

  if (entityType === 'employee' && employeeName) {
    entityName = String(employeeName)
  } else if (entityType === 'company' && companyName) {
    entityName = String(companyName)
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-lg font-semibold text-neutral-900 mb-2">
          {entityName
            ? `تم تحديث ${entityLabel} "${entityName}"${changedFieldsText}`
            : `تم تحديث ${entityLabel}${changedFieldsText}`}
        </h4>
      </div>

      {actualChanges.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-info-600 flex-shrink-0" />
            <p className="text-sm text-info-800 font-medium">التفاصيل ({actualChanges.length})</p>
          </div>
          <div className="space-y-3">
            {actualChanges.map((change, index) => (
              <div
                key={index}
                className="border-r-4 border-purple-400 bg-purple-50 p-4 rounded-lg"
              >
                <div className="font-semibold text-neutral-900 mb-3 text-base">
                  ✏️ {change.field}
                </div>
                <div className="space-y-3 ml-4">
                  {change.oldValue && change.newValue && (
                    <>
                      <div>
                        <span className="text-xs font-medium text-neutral-600 block mb-2">
                          كان:
                        </span>
                        <div className="px-3 py-2 bg-red-50 text-red-700 rounded-md text-sm border border-red-200 font-medium break-words">
                          {change.oldValue}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="inline-block text-neutral-400 text-lg">↓</div>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-neutral-600 block mb-2">
                          أصبح:
                        </span>
                        <div className="px-3 py-2 bg-green-50 text-success-700 rounded-md text-sm border border-green-200 font-medium break-words">
                          {change.newValue}
                        </div>
                      </div>
                    </>
                  )}

                  {!change.oldValue && change.newValue && (
                    <div>
                      <span className="text-xs font-medium text-neutral-600 block mb-2">
                        تم الإضافة (لم يكن هناك قيمة من قبل)
                      </span>
                      <div className="px-3 py-2 bg-green-50 text-success-700 rounded-md text-sm border border-green-200 font-medium break-words">
                        {change.newValue}
                      </div>
                    </div>
                  )}

                  {change.oldValue && !change.newValue && (
                    <div>
                      <span className="text-xs font-medium text-neutral-600 block mb-2">
                        تم الحذف
                      </span>
                      <div className="px-3 py-2 bg-orange-50 text-warning-700 rounded-md text-sm border border-orange-200 font-medium">
                        (تم مسح القيمة: {change.oldValue})
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : !hasValidData ? (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-900 text-sm mb-1">
                ⚠️ لم يتم حفظ تفاصيل التغييرات
              </p>
              <p className="text-yellow-800 text-xs leading-relaxed">
                تم تسجيل عملية التحديث لكن لم يتم حفظ البيانات القديمة والجديدة. تأكد من أن النظام
                يحفظ old_data و new_data بشكل صحيح.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-neutral-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-neutral-700 text-sm mb-1">تم التحديث</p>
              <p className="text-neutral-600 text-xs leading-relaxed">
                لم يتم العثور على حقول محددة تم تغييرها، لكن تم تسجيل العملية بنجاح.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export const generateActivityDescription = (log: ActivityLog): string | React.JSX.Element => {
  const action = log.action.toLowerCase()
  const entityType = log.entity_type?.toLowerCase() || ''
  const entityLabel = getEntityLabel(entityType)

  const details = log.details || {}
  const employeeName = details.employee_name || details.name
  const companyName = details.company_name || details.company
  const unifiedNumber = details.unified_number
  const residenceNumber = details.residence_number

  // ── handlers للـ entity types الجديدة ──

  if (entityType === 'user') {
    const n = details.user_name || '—'
    const e = details.user_email ? ` (${details.user_email})` : ''
    if (log.action.includes('إنشاء')) return `تم إنشاء مستخدم جديد "${n}"${e}${details.user_role ? ` — دور: ${details.user_role}` : ''}`
    if (log.action.includes('إعادة ضبط')) return `تم إعادة ضبط كلمة مرور المستخدم "${n}"${e}`
    if (log.action.includes('تحديث') || log.action.includes('تعديل')) return `تم تحديث بيانات المستخدم "${n}"${e}`
  }

  if (entityType === 'role') {
    return `تم حذف الدور "${details.role_name || '—'}"`
  }

  if (entityType === 'session') {
    const n = details.target_user_name || '—'
    const e = details.target_user_email ? ` (${details.target_user_email})` : ''
    if (log.action.includes('كل')) return `تم إنهاء ${details.session_count ?? 0} جلسة للمستخدم "${n}"`
    return `تم إنهاء جلسة المستخدم "${n}"${e}`
  }

  if (entityType === 'settings') {
    const changed = (details.changed_settings as Array<{ key_label: string; old_value: string; new_value: string }> | undefined) ?? []
    const count = changed.length || (details.changed_count as number | undefined) || 0
    const preview = changed.slice(0, 2).map((s) => `${s.key_label}: ${s.old_value} ← ${s.new_value}`).join(' | ')
    return `تم تحديث ${count} إعداد${preview ? ` — ${preview}${changed.length > 2 ? '...' : ''}` : ''}`
  }

  if (entityType === 'email_settings') {
    const count = (details.changed_count as number | undefined) ?? 0
    return `تم تحديث إعدادات البريد الإلكتروني${count ? ` (${count} إعداد)` : ''}`
  }

  if (entityType === 'backup') {
    const ts = details.timestamp ? new Date(String(details.timestamp)).toLocaleDateString('ar-SA') : '—'
    const emp = details.total_employees ?? 0
    const comp = details.total_companies ?? 0
    const verb = log.action.includes('استعادة') ? 'استعادة' : 'إنشاء'
    return `تم ${verb} نسخة احتياطية بتاريخ ${ts} — ${emp} موظف، ${comp} مؤسسة`
  }

  if (entityType === 'extract') {
    const title = details.extract_title || '—'
    const emp = details.employee_count ?? 0
    const amount = details.total_amount ?? 0
    const verb = log.action.includes('حذف') ? 'حذف' : log.action.includes('تصدير') ? 'تصدير' : 'إنشاء'
    return `تم ${verb} مستخلص "${title}" — ${emp} موظف — إجمالي: ${amount} ريال`
  }

  if (entityType === 'payroll') {
    const statusMap: Record<string, string> = { draft: 'مسودة', finalized: 'معتمد', cancelled: 'ملغي' }
    const from = statusMap[String(details.from_status)] ?? String(details.from_status ?? '—')
    const to = statusMap[String(details.to_status)] ?? String(details.to_status ?? '—')
    const month = details.payroll_month
      ? new Date(String(details.payroll_month)).toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })
      : '—'
    return `تم تغيير حالة مسير راتب ${month} من "${from}" إلى "${to}"${details.entry_count !== undefined ? ` — ${details.entry_count} موظف` : ''}`
  }

  if (entityType === 'obligation') {
    const emp = details.employee_name || '—'
    const residence = details.residence_number ? ` (${details.residence_number})` : ''
    const type = details.obligation_type || '—'
    if (log.action.includes('إنشاء')) return `تم إنشاء التزام للموظف "${emp}"${residence} — نوع: ${type}${details.amount ? ` — مبلغ: ${details.amount} ريال` : ''}`
    if (log.action.includes('إلغاء')) return `تم إلغاء التزام للموظف "${emp}"${residence} — نوع: ${type}${details.amount ? ` — مبلغ: ${details.amount} ريال` : ''}`
    return `تم تحديث التزام للموظف "${emp}"${residence} — نوع: ${type}`
  }

  if (entityType === 'project') {
    const name = details.project_name || '—'
    const emp = details.employee_count ?? 0
    if (log.action.includes('إنشاء') || log.action === 'create') return `تم إنشاء مشروع "${name}" — ${emp} موظف`
    if (log.action.includes('حذف') || log.action === 'delete') return `تم حذف مشروع "${name}"`
    return `تم تحديث مشروع "${name}"`
  }

  if (entityType === 'import') {
    const added = details.added ?? 0
    const updated = details.updated ?? 0
    const failed = details.failed ?? 0
    if (log.action.includes('موظفين')) return `تم استيراد موظفين — ${added} مضاف، ${updated} محدّث، ${failed} فاشل`
    if (log.action.includes('مؤسسات')) return `تم استيراد مؤسسات — ${added} مضاف، ${updated} محدّث، ${failed} فاشل`
    return `تم استيراد ${added} إجراء نقل${failed ? ` (${failed} فاشل)` : ''}`
  }

  let changedFieldLabels: string[] = []

  try {
    if (details.changes && typeof details.changes === 'object') {
      const detailsChanges = details.changes as Record<string, unknown>
      changedFieldLabels = Object.keys(detailsChanges)
    } else {
      let oldData: Record<string, unknown> | null = null
      let newData: Record<string, unknown> | null = null

      const rawOld = log.old_data ?? (details as Record<string, unknown>).old_data
      const rawNew = log.new_data ?? (details as Record<string, unknown>).new_data

      if (typeof rawOld === 'string') {
        oldData = JSON.parse(rawOld) as Record<string, unknown>
      } else if (rawOld && typeof rawOld === 'object') {
        oldData = rawOld as Record<string, unknown>
      }

      if (typeof rawNew === 'string') {
        newData = JSON.parse(rawNew) as Record<string, unknown>
      } else if (rawNew && typeof rawNew === 'object') {
        newData = rawNew as Record<string, unknown>
      }

      if (oldData && newData) {
        const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)])
        allKeys.forEach((key) => {
          const oldValue = oldData?.[key]
          const newValue = newData?.[key]

          if (isUselessSystemId(oldValue) && isUselessSystemId(newValue)) {
            return
          }

          if (oldValue !== newValue) {
            changedFieldLabels.push(getFieldLabel(key))
          }
        })
      }
    }
  } catch {
    // تجاهل الأخطاء
  }

  if (
    action.includes('create') ||
    action.includes('add') ||
    action.includes('إنشاء') ||
    action.includes('إضافة')
  ) {
    if (entityType === 'employee' && employeeName) {
      const empDisplay = residenceNumber ? `${employeeName} (${residenceNumber})` : employeeName
      return `تم إنشاء موظف جديد "${empDisplay}"${companyName ? ` في المؤسسة "${companyName}"` : ''}.`
    } else if (entityType === 'company' && companyName) {
      const companyDisplay = unifiedNumber ? `${companyName} (${unifiedNumber})` : companyName
      return `تم إنشاء مؤسسة جديدة باسم "${companyDisplay}".`
    } else if (entityType === 'user') {
      return `تم إنشاء مستخدم جديد.`
    } else {
      return `تم إنشاء ${entityLabel} جديد.`
    }
  }

  if (
    action.includes('update') ||
    action.includes('edit') ||
    action.includes('تحديث') ||
    action.includes('تعديل')
  ) {
    if (changedFieldLabels.length > 0) {
      const fieldNames = changedFieldLabels.join(' و ')
      if (entityType === 'employee' && employeeName) {
        const empDisplay = residenceNumber ? `${employeeName} (${residenceNumber})` : employeeName
        return `تم تحديث موظف "${empDisplay}" - تحديث ${fieldNames}${companyName ? ` من ${companyName}` : ''}.`
      } else if (entityType === 'company' && companyName) {
        const companyDisplay = unifiedNumber ? `${companyName} (${unifiedNumber})` : companyName
        return `تم تحديث مؤسسة "${companyDisplay}" - تحديث ${fieldNames}.`
      }
    }
    return renderUpdateDetails(log)
  }

  if (action.includes('delete') || action.includes('remove') || action.includes('حذف')) {
    if (entityType === 'employee' && employeeName) {
      const empDisplay = residenceNumber ? `${employeeName} (${residenceNumber})` : employeeName
      return `تم حذف الموظف "${empDisplay}"${companyName ? ` من المؤسسة "${companyName}"` : ''}.`
    } else if (entityType === 'company' && companyName) {
      const companyDisplay = unifiedNumber ? `${companyName} (${unifiedNumber})` : companyName
      return `تم حذف المؤسسة "${companyDisplay}".`
    } else if (entityType === 'user') {
      return `تم حذف مستخدم.`
    } else {
      return `تم حذف ${entityLabel}.`
    }
  }

  if (action.includes('login') || action.includes('دخول')) {
    return `تم تسجيل دخول المستخدم.`
  }

  if (action.includes('logout') || action.includes('خروج')) {
    return `تم تسجيل خروج المستخدم.`
  }

  if (action.includes('export') || action.includes('تصدير')) {
    return `تم تصدير البيانات.`
  }

  if (action.includes('import') || action.includes('استيراد')) {
    return `تم استيراد البيانات.`
  }

  if (employeeName) {
    const empDisplay = residenceNumber ? `${employeeName} (${residenceNumber})` : employeeName
    return `تم تنفيذ العملية "${getActionLabel(log.action)}" على الموظف "${empDisplay}".`
  } else if (companyName) {
    return `تم تنفيذ العملية "${getActionLabel(log.action)}" على المؤسسة "${companyName}".`
  } else {
    return `تم تنفيذ العملية "${getActionLabel(log.action)}" على ${entityLabel}.`
  }
}
