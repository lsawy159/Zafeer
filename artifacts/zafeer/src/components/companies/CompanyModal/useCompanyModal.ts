import { useState, useCallback, useEffect } from 'react'
import { useModalScrollLock } from '@/hooks/useModalScrollLock'
import { supabase, Company } from '@/lib/supabase'
import { logActivity as writeActivity } from '@/utils/logActivity'
import { toast } from 'sonner'
import { normalizeDate } from '@/utils/dateParser'
import { logger } from '@/utils/logger'
import { validateUnifiedNumber, validateLaborSubscription } from '@/utils/companyNumberValidation'

interface UseCompanyModalProps {
  isOpen: boolean
  company?: Company | null
  onClose: () => void
  onSuccess: () => void
}

const EMPTY_FORM = {
  name: '',
  unified_number: '',
  social_insurance_number: '',
  labor_subscription_number: '',
  commercial_registration_expiry: '',
  ending_subscription_power_date: '',
  ending_subscription_moqeem_date: '',
  max_employees: '',
  exemptions: '',
  company_type: '',
  notes: '',
}

const FIELD_LABELS: Record<string, string> = {
  name: 'اسم المؤسسة',
  unified_number: 'الرقم الموحد',
  social_insurance_number: 'رقم التأمينات الاجتماعية',
  labor_subscription_number: 'رقم اشتراك التأمينات',
  commercial_registration_expiry: 'تاريخ انتهاء السجل التجاري',
  ending_subscription_power_date: 'تاريخ انتهاء اشتراك قوى',
  ending_subscription_moqeem_date: 'تاريخ انتهاء اشتراك المقيم',
  max_employees: 'الحد الأقصى للموظفين',
  exemptions: 'الإعفاءات',
  company_type: 'نوع المؤسسة',
  notes: 'الملاحظات',
}

export function useCompanyModal({ isOpen, company, onClose, onSuccess }: UseCompanyModalProps) {
  const [loading, setLoading] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [originalData, setOriginalData] = useState<Partial<Company> | null>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)

  const isEditing = !!company

  useEffect(() => {
    if (isOpen) {
      if (company) {
        logger.debug('📋 تحميل بيانات المؤسسة للتعديل:', { id: company.id, name: company.name })
        // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing pattern from original CompanyModal.tsx
        setOriginalData(company)
        setFormData({
          name: company.name || '',
          unified_number: company.unified_number?.toString() || '',
          social_insurance_number: company.social_insurance_number || '',
          labor_subscription_number: company.labor_subscription_number || '',
          commercial_registration_expiry: company.commercial_registration_expiry || '',
          ending_subscription_power_date: company.ending_subscription_power_date || '',
          ending_subscription_moqeem_date: company.ending_subscription_moqeem_date || '',
          max_employees: company.max_employees?.toString() || '',
          exemptions: company.exemptions || '',
          company_type: company.company_type || '',
          notes: company.notes || '',
        })
        setIsDirty(false)
      } else {
        logger.debug('🆕 إعادة تعيين النموذج للإضافة الجديدة')
        setOriginalData(null)
        setFormData(EMPTY_FORM)
        setIsDirty(false)
      }
    }
  }, [isOpen, company])

  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  useModalScrollLock(isOpen)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setIsDirty(true)
  }

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error('الرجاء إدخال اسم المؤسسة (حقل إجباري)')
      return false
    }
    if (!formData.unified_number.trim()) {
      toast.error('الرجاء إدخال الرقم الموحد (حقل إجباري)')
      return false
    }
    const unifiedValidation = validateUnifiedNumber(formData.unified_number.trim())
    if (!unifiedValidation.valid) {
      toast.error(unifiedValidation.error || 'الرقم الموحد غير صحيح')
      return false
    }
    if (formData.labor_subscription_number.trim()) {
      const laborValidation = validateLaborSubscription(formData.labor_subscription_number.trim())
      if (!laborValidation.valid) {
        toast.error(laborValidation.error || 'رقم قوى غير صحيح')
        return false
      }
    }
    const dateFields = [
      { key: 'commercial_registration_expiry', name: 'انتهاء السجل التجاري' },
      { key: 'ending_subscription_power_date', name: 'انتهاء اشتراك قوى' },
      { key: 'ending_subscription_moqeem_date', name: 'انتهاء اشتراك مقيم' },
    ]
    for (const field of dateFields) {
      const value = formData[field.key as keyof typeof formData] as string
      if (value && value.trim()) {
        const date = new Date(value.trim())
        if (isNaN(date.getTime())) {
          toast.error(`تاريخ ${field.name} غير صحيح. يرجى التأكد من صيغة التاريخ`)
          return false
        }
      }
    }
    if (formData.max_employees.trim()) {
      const maxEmp = parseInt(formData.max_employees.trim())
      if (isNaN(maxEmp) || maxEmp < 1) {
        toast.error('عدد الموظفين الأقصى يجب أن يكون رقماً صحيحاً أكبر من صفر')
        return false
      }
      if (maxEmp > 10000) {
        toast.error('عدد الموظفين الأقصى لا يمكن أن يتجاوز 10,000 موظف')
        return false
      }
    }
    const today = new Date()
    const allDates: Record<string, string> = {
      'انتهاء السجل التجاري': formData.commercial_registration_expiry,
      'انتهاء اشتراك قوى': formData.ending_subscription_power_date,
      'انتهاء اشتراك مقيم': formData.ending_subscription_moqeem_date,
    }
    const invalidDates = Object.entries(allDates).filter(([, date]) => {
      if (date && date.trim()) {
        const dateObj = new Date(date.trim())
        return dateObj < new Date(today.getFullYear() - 10, 0, 1)
      }
      return false
    })
    if (invalidDates.length > 0) {
      toast.error(`بعض التواريخ تبدو قديمة جداً: ${invalidDates.map(([name]) => name).join(', ')}`)
      return false
    }
    return true
  }

  const logActivity = async (
    action: string,
    changes: Record<string, { old_value: unknown; new_value: unknown }>,
    oldDataFull: Record<string, unknown>,
    newDataFull: Record<string, unknown>,
    companyId: string,
    companyName: string,
    unifiedNumber?: number | string
  ) => {
    try {
      const changedFields = Object.keys(changes)
      const translatedChanges: Record<string, { old_value: unknown; new_value: unknown }> = {}
      changedFields.forEach((field) => {
        translatedChanges[FIELD_LABELS[field] || field] = changes[field]
      })
      let actionName = action
      if (changedFields.length === 1) {
        actionName = `تحديث ${FIELD_LABELS[changedFields[0]] || changedFields[0]}`
      } else if (changedFields.length > 1) {
        actionName = `تحديث متعدد (${changedFields.length} حقول)`
      }
      const oldDataFiltered: Record<string, unknown> = {}
      const newDataFiltered: Record<string, unknown> = {}
      changedFields.forEach((field) => {
        oldDataFiltered[field] = oldDataFull[field]
        newDataFiltered[field] = newDataFull[field]
      })
      await writeActivity({
        entity_type: 'company',
        entity_id: companyId,
        action: actionName,
        old: oldDataFiltered,
        new: newDataFiltered,
        details: {
          company_name: companyName,
          unified_number: unifiedNumber,
          changes: translatedChanges,
        },
      })
    } catch (error) {
      console.error('Error logging activity:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    try {
      const unifiedNumber = formData.unified_number.trim()
        ? (() => {
            const parsed = parseInt(formData.unified_number.trim())
            if (isNaN(parsed)) throw new Error('الرقم الموحد يجب أن يكون رقماً صحيحاً')
            return parsed
          })()
        : (() => {
            if (isEditing && company?.unified_number) return company.unified_number
            throw new Error('الرقم الموحد مطلوب')
          })()

      const maxEmployees = formData.max_employees.trim()
        ? (() => {
            const parsed = parseInt(formData.max_employees.trim())
            return isNaN(parsed) ? null : parsed
          })()
        : null

      const laborSubscriptionNumber =
        formData.labor_subscription_number.trim() ||
        (() => {
          if (isEditing && company?.labor_subscription_number) return company.labor_subscription_number
          throw new Error('رقم اشتراك قوى مطلوب')
        })()

      const companyData: Record<string, unknown> = {
        name: formData.name.trim() || null,
        unified_number: unifiedNumber,
        social_insurance_number: formData.social_insurance_number.trim() || null,
        labor_subscription_number: laborSubscriptionNumber,
        commercial_registration_expiry: normalizeDate(formData.commercial_registration_expiry),
        ending_subscription_power_date: normalizeDate(formData.ending_subscription_power_date),
        ending_subscription_moqeem_date: normalizeDate(formData.ending_subscription_moqeem_date),
        max_employees: maxEmployees,
        exemptions: formData.exemptions.trim() || null,
        company_type: formData.company_type.trim() || null,
        notes: formData.notes.trim() || null,
      }

      const actualUpdateData: Record<string, unknown> = {}
      const changes: Record<string, { old_value: unknown; new_value: unknown }> = {}

      if (isEditing && originalData) {
        const fieldsToCheck = Object.keys(companyData)
        fieldsToCheck.forEach((field) => {
          const oldVal = (originalData[field as keyof typeof originalData] ?? null)
          const newVal = (companyData[field] ?? null)
          if (oldVal !== newVal) {
            actualUpdateData[field] = companyData[field]
            changes[field] = { old_value: oldVal, new_value: newVal }
          }
        })
      } else {
        Object.keys(companyData).forEach((key) => { actualUpdateData[key] = companyData[key] })
      }

      Object.keys(companyData).forEach((key) => {
        if (key === 'name' || key === 'unified_number' || key === 'labor_subscription_number') return
        if (companyData[key] === null || companyData[key] === undefined || companyData[key] === '') {
          delete companyData[key]
        }
      })

      let error
      let result

      if (isEditing && company) {
        if (Object.keys(actualUpdateData).length === 0) {
          toast.info('لم يتم تغيير أي بيانات')
          setLoading(false)
          return
        }
        result = await supabase.from('companies').update(actualUpdateData).eq('id', company.id)
        error = result.error
        if (!error) {
          await logActivity('full_edit', changes, originalData as Record<string, unknown>, actualUpdateData, company.id, formData.name, unifiedNumber)
        }
      } else {
        result = await supabase.from('companies').insert([companyData]).select('id').single()
        error = result.error
        if (!error) {
          const newCompanyData = companyData as Record<string, unknown>
          const createdChanges: Record<string, { old_value: unknown; new_value: unknown }> = {}
          Object.keys(newCompanyData).forEach((field) => {
            createdChanges[FIELD_LABELS[field] || field] = { old_value: null, new_value: newCompanyData[field] }
          })
          await writeActivity({
            entity_type: 'company',
            entity_id: (result.data as { id?: string } | null)?.id ?? null,
            action: 'إضافة مؤسسة جديدة',
            new: newCompanyData,
            details: { company_name: formData.name, unified_number: newCompanyData.unified_number, created_fields: Object.keys(companyData) },
          })
        }
      }

      if (error) {
        let errorMessage = `فشل ${isEditing ? 'تحديث' : 'إضافة'} المؤسسة`
        if (error.message?.includes('duplicate key') || error.code === '23505') {
          errorMessage = 'رقم اشتراك التأمينات أو الرقم الموحد موجود مسبقاً'
        } else if (error.message?.includes('violates') || error.code === '23502') {
          errorMessage = 'بيانات غير صحيحة أو ناقصة - يرجى التحقق من جميع الحقول المطلوبة'
        } else if (error.message?.includes('network') || error.code === 'PGRST301') {
          errorMessage = 'خطأ في الاتصال بالخادم - يرجى المحاولة مرة أخرى'
        } else if (error.message?.includes('invalid input') || error.code === '22P02') {
          errorMessage = 'صيغة البيانات غير صحيحة - يرجى التحقق من الأرقام والتواريخ'
        } else if (error.message) {
          errorMessage += `: ${error.message}`
        }
        throw new Error(errorMessage)
      }

      if (isEditing) {
        toast.success('✅ تم تحديث المؤسسة بنجاح مع جميع البيانات الجديدة')
      } else {
        toast.success('✅ تم إضافة المؤسسة الجديدة بنجاح')
      }

      try {
        onSuccess()
      } catch {
        onClose()
      }
    } catch (error: unknown) {
      const errorMsg =
        (error instanceof Error ? error.message : String(error)) ||
        `حدث خطأ غير متوقع أثناء ${isEditing ? 'تحديث' : 'إضافة'} المؤسسة`
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false)

  const handleOverlayClick = () => {
    if (isDirty) {
      setShowUnsavedConfirm(true)
    } else {
      onClose()
    }
  }

  const handleUnsavedConfirm = useCallback(() => {
    setShowUnsavedConfirm(false)
    onClose()
  }, [onClose])

  const handleUnsavedCancel = useCallback(() => {
    setShowUnsavedConfirm(false)
  }, [])

  return {
    formData, handleChange, handleSubmit, handleOverlayClick, loading, isDirty, isEditing,
    showUnsavedConfirm, handleUnsavedConfirm, handleUnsavedCancel,
  }
}
