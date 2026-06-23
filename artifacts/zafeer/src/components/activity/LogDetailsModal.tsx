import React from 'react'
import { X, AlertCircle } from 'lucide-react'
import { ActivityLog, User } from '@/lib/supabase'
import { HijriDateDisplay } from '@/components/ui/HijriDateDisplay'

interface LogDetailsModalProps {
  open: boolean
  log: ActivityLog | null
  usersMap: Map<string, User>
  onClose: () => void
  getActionColor: (action: string) => {
    bg: string
    border: string
    text: string
    badge: string
    icon: string
  }
  getActionIcon: (action: string) => React.JSX.Element
  getActionLabel: (action: string) => string
  getEntityLabel: (entity: string) => string
  formatDateTimeWithHijri: (date: string) => string
  generateActivityDescription: (log: ActivityLog) => string | React.JSX.Element
}

// Helper functions for processing update details
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
  // UUID أو معرفات طويلة بدون معنى للمستخدم
  if (strValue.length > 20 && /^[a-f0-9-]{20,}$/.test(strValue)) return true
  if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}/.test(strValue)) return true
  return false
}

const formatDisplayValue = (value: unknown, key?: string): string | null => {
  // تجاهل حقول الميتاداتا غير المفيدة للمستخدم
  if (key && ['updated_at', 'created_at', 'createdAt', 'updatedAt'].includes(key)) {
    return null
  }

  // إذا كانت القيمة معرف نظام بدون فائدة
  if (isUselessSystemId(value)) {
    return null
  }

  if (value === null || value === undefined) return null

  // إذا كانت القيمة كائن أو مصفوفة: حوّلها لنص JSON قابل للقراءة
  if (typeof value === 'object') {
    try {
      const json = JSON.stringify(value)
      if (!json || json === '{}' || json === '[]') return null
      return json.length <= 200 ? json : `${json.slice(0, 197)}...`
    } catch {
      return null
    }
  }

  // تحويل إلى string
  const strValue = String(value).trim()
  if (!strValue) return null

  // حالات خاصة:
  // 1. تاريخ ISO (YYYY-MM-DD أو مشابه)
  if (/^\d{4}-\d{2}-\d{2}/.test(strValue)) {
    return strValue
  }

  // 2. قيمة عادية وواضحة - عرضها كما هي
  if (strValue.length < 200) {
    return strValue
  }

  // 3. نص طويل جداً - اقتطاعه
  return `${strValue.slice(0, 197)}...`
}

export function LogDetailsModal(props: LogDetailsModalProps) {
  const {
    open,
    log,
    usersMap,
    onClose,
    getActionColor,
    getActionIcon,
    getActionLabel,
    getEntityLabel,
    formatDateTimeWithHijri,
    generateActivityDescription,
  } = props

  if (!open || !log) return null

  // Function to render update details with diff
  const renderUpdateDetails = (): React.JSX.Element | null => {
    const action = log.action.toLowerCase()

    // Only show diff for update actions
    if (
      !action.includes('update') &&
      !action.includes('edit') &&
      !action.includes('تحديث') &&
      !action.includes('تعديل')
    ) {
      return null
    }

    // Extract details for potential future use
    // const entityType = log.entity_type?.toLowerCase() || ''
    // const details = log.details || {}
    // const employeeName = details.employee_name || details.name
    // const companyName = details.company_name || details.company

    // محاولة استخراج old_data و new_data
    let oldData: Record<string, unknown> | null = null
    let newData: Record<string, unknown> | null = null
    let hasValidData = false

    // المصدر: الأعمدة top-level أولاً، ثم fallback لـ details.old_data/new_data
    // (صفوف تاريخية أو كُتّاب قدامى كانوا يحفظون داخل details).
    const rawOld = log.old_data ?? (log.details as Record<string, unknown> | undefined)?.old_data
    const rawNew = log.new_data ?? (log.details as Record<string, unknown> | undefined)?.new_data

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

      // التحقق من أن البيانات صحيحة وليست فارغة
      hasValidData = Boolean(
        (oldData && Object.keys(oldData).length > 0) || (newData && Object.keys(newData).length > 0)
      )
    } catch {
      // تجاهل أخطاء التحليل
    }

    // جمع التغييرات
    const changeList: Array<{
      field: string
      fieldKey: string
      oldValue: string | null
      newValue: string | null
      hasActualChange: boolean
    }> = []

    // استخراج التغييرات من old_data و new_data
    if (oldData && newData) {
      const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)])

      allKeys.forEach((key) => {
        const oldValue = oldData?.[key]
        const newValue = newData?.[key]

        // تخطي معرفات النظام
        if (isUselessSystemId(oldValue) && isUselessSystemId(newValue)) {
          return
        }

        // فقط أضف إذا كانت القيم مختلفة فعلاً
        if (oldValue !== newValue) {
          const fieldLabel = getFieldLabel(key)
          const displayedOldValue = formatDisplayValue(oldValue, key)
          const displayedNewValue = formatDisplayValue(newValue, key)

          // تحديد ما إذا كان هناك تغيير فعلي
          const oldEmpty = !oldValue || oldValue === '' || displayedOldValue === null
          const newEmpty = !newValue || newValue === '' || displayedNewValue === null

          // تجنب التكرار
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

    // تصفية التغييرات الفعلية فقط
    const actualChanges = changeList.filter((c) => c.hasActualChange)

    // تحديد اسم الكيان
    // removed unused variables

    // display changes below; no need to precompute entity name here

    return (
      <div className="space-y-4 mt-4">
        {actualChanges.length > 0 ? (
          <>
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-800 font-medium">
                التغييرات التفصيلية ({actualChanges.length})
              </p>
            </div>
            <div className="space-y-2">
              {actualChanges.map((change, index) => {
                const oldText = change.oldValue ?? '—'
                const newText = change.newValue ?? '—'
                const isAdded = !change.oldValue && change.newValue
                const isDeleted = change.oldValue && !change.newValue

                const oldBadgeClasses = isAdded
                  ? 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                  : 'bg-red-50 text-red-700 border border-red-200'

                const newBadgeClasses = isDeleted
                  ? 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                  : 'bg-green-50 text-success-700 border border-green-200'

                return (
                  <div
                    key={index}
                    className="border border-purple-100 bg-purple-50/60 p-3 rounded-lg flex flex-col gap-1"
                  >
                    <div className="text-sm font-semibold text-neutral-900">✏️ {change.field}</div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium text-neutral-700">{change.field}:</span>
                      <span
                        className={`px-2.5 py-1 rounded-md font-medium break-words ${oldBadgeClasses}`}
                      >
                        {oldText}
                      </span>
                      <span className="text-neutral-400">⬅️</span>
                      <span
                        className={`px-2.5 py-1 rounded-md font-medium break-words ${newBadgeClasses}`}
                      >
                        {newText}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
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
        ) : null}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-primary text-white px-5 py-4 flex justify-between items-center">
          <h3 className="text-xl font-bold">تفاصيل النشاط</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {/* الوصف أولاً */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">وصف النشاط</label>
            <div className="bg-surface-secondary-50 rounded-lg p-4 border border-border-200">
              {(() => {
                const description = generateActivityDescription(log)
                return typeof description === 'string' ? (
                  <p className="text-foreground text-base leading-relaxed">{description}</p>
                ) : (
                  description
                )
              })()}
            </div>
          </div>

          {/* صف مدمج: badge العملية + نوع الكيان + التاريخ */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${getActionColor(log.action)}`}
            >
              {getActionIcon(log.action)}
              {getActionLabel(log.action)}
              {log.entity_type && (
                <span className="text-xs opacity-60">· {getEntityLabel(log.entity_type)}</span>
              )}
            </div>
            <HijriDateDisplay date={log.created_at}>
              <span className="text-sm text-neutral-500">{formatDateTimeWithHijri(log.created_at)}</span>
            </HijriDateDisplay>
          </div>

          {log.user_id && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">المستخدم</label>
              {(() => {
                const user = usersMap.get(log.user_id!)
                return user ? (
                  <p className="text-neutral-900 font-medium">
                    {user.full_name}
                    <span className="text-neutral-500 font-normal text-sm"> · {user.email}</span>
                  </p>
                ) : (
                  <p className="text-neutral-500 text-sm">مستخدم غير معروف</p>
                )
              })()}
            </div>
          )}

          {log.ip_address && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">عنوان IP</label>
              <p className="text-neutral-900 font-mono text-sm">{log.ip_address}</p>
            </div>
          )}

          {/* diff التحديثات */}
          {renderUpdateDetails()}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-neutral-200 px-5 py-4">
          <button
            onClick={onClose}
            className="w-full px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/85 transition"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  )
}
