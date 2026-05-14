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
  }
  return labels[action.toLowerCase()] || action
}

export const getEntityLabel = (entity: string) => {
  const labels: Record<string, string> = {
    employee: 'موظف',
    company: 'مؤسسة',
    user: 'مستخدم',
    settings: 'إعدادات',
    notification: 'تنبيه',
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

  try {
    if (typeof log.old_data === 'string') {
      oldData = JSON.parse(log.old_data) as Record<string, unknown>
    } else if (log.old_data && typeof log.old_data === 'object') {
      oldData = log.old_data as Record<string, unknown>
    }

    if (typeof log.new_data === 'string') {
      newData = JSON.parse(log.new_data) as Record<string, unknown>
    } else if (log.new_data && typeof log.new_data === 'object') {
      newData = log.new_data as Record<string, unknown>
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

  let changedFieldLabels: string[] = []

  try {
    if (details.changes && typeof details.changes === 'object') {
      const detailsChanges = details.changes as Record<string, unknown>
      changedFieldLabels = Object.keys(detailsChanges)
    } else {
      let oldData: Record<string, unknown> | null = null
      let newData: Record<string, unknown> | null = null

      if (typeof log.old_data === 'string') {
        oldData = JSON.parse(log.old_data) as Record<string, unknown>
      } else if (log.old_data && typeof log.old_data === 'object') {
        oldData = log.old_data as Record<string, unknown>
      }

      if (typeof log.new_data === 'string') {
        newData = JSON.parse(log.new_data) as Record<string, unknown>
      } else if (log.new_data && typeof log.new_data === 'object') {
        newData = log.new_data as Record<string, unknown>
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
      return `تم إنشاء موظف جديد باسم "${employeeName}"${companyName ? ` في المؤسسة "${companyName}"` : ''}.`
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
        return `تم تحديث موظف "${employeeName}" - تحديث ${fieldNames}${companyName ? ` من ${companyName}` : ''}.`
      } else if (entityType === 'company' && companyName) {
        const companyDisplay = unifiedNumber ? `${companyName} (${unifiedNumber})` : companyName
        return `تم تحديث مؤسسة "${companyDisplay}" - تحديث ${fieldNames}.`
      }
    }
    return renderUpdateDetails(log)
  }

  if (action.includes('delete') || action.includes('remove') || action.includes('حذف')) {
    if (entityType === 'employee' && employeeName) {
      return `تم حذف الموظف "${employeeName}"${companyName ? ` من المؤسسة "${companyName}"` : ''}.`
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
    return `تم تنفيذ العملية "${getActionLabel(log.action)}" على الموظف "${employeeName}".`
  } else if (companyName) {
    return `تم تنفيذ العملية "${getActionLabel(log.action)}" على المؤسسة "${companyName}".`
  } else {
    return `تم تنفيذ العملية "${getActionLabel(log.action)}" على ${entityLabel}.`
  }
}
