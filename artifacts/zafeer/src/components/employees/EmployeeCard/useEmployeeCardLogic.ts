import { useState, useEffect, useRef } from 'react'
import { Employee, Company, ObligationType, supabase } from '@/lib/supabase'
import {
  RESIDENCE_BUCKET,
  buildResidencePath,
  buildResidenceThumbnailPath,
  isLegacyExternalUrl,
} from '@/lib/residenceFile'
import {
  EMPLOYEE_DOC_BUCKET,
  EMPLOYEE_DOC_TYPES,
  buildEmployeeDocPath,
} from '@/lib/employeeDocFile'
import { useEmployeeCardData } from '@/hooks/useEmployeeCardData'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import {
  useCreateEmployeeObligationPlan,
  useUpdateObligationPlan,
  useDeleteObligationPlan,
  useEmployeeObligations,
  useUpdateObligationLinePayment,
  type EmployeeObligationPlan,
} from '@/hooks/useEmployeeObligations'
import {
  buildEmployeeBusinessAdditionalFields,
  getEmployeeBusinessFields,
} from '@/utils/employeeBusinessFields'
import { getPayrollObligationBucketFromType } from '@/utils/payrollObligationBuckets'

export const formatMoney = (value: number): string =>
  value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const OBLIGATION_TYPE_LABELS: Record<string, string> = {
  advance: 'سلفة',
  transfer: 'نقل كفالة',
  renewal: 'تجديد',
  penalty: 'غرامة',
  other: 'أخرى',
}

const buildInstallmentAmounts = (totalAmount: number, installmentCount: number): number[] => {
  const totalHalalas = Math.round(totalAmount * 100)
  const baseAmount = Math.floor(totalHalalas / installmentCount)
  let remainder = totalHalalas % installmentCount
  return Array.from({ length: installmentCount }, () => {
    const nextAmount = baseAmount + (remainder > 0 ? 1 : 0)
    if (remainder > 0) remainder -= 1
    return nextAmount / 100
  })
}

export type EmployeeFormData = {
  id?: string
  company_id: string
  name?: string
  profession?: string
  nationality?: string
  birth_date?: string
  phone?: string
  passport_number?: string
  residence_number: number
  joining_date?: string
  contract_expiry?: string
  hired_worker_contract_expiry: string
  residence_expiry?: string
  project_id: string | null
  project_name?: string | null
  bank_account?: string
  residence_image_url: string
  residence_thumbnail_url: string
  health_certificate_url: string
  ajeer_contract_url: string
  muqeem_document_url: string
  health_insurance_expiry: string
  salary: number
  notes: string
  additional_fields: Record<string, string | number | boolean | null>
  company?: Company
  created_at?: string
  updated_at?: string
}

interface UseEmployeeCardLogicProps {
  employee: Employee & { company: Company }
  onClose: () => void
  onUpdate: () => void
  onDelete?: (employee: Employee & { company: Company }) => void
  defaultFinancialOverlayOpen?: boolean
}

export function useEmployeeCardLogic({
  employee,
  onClose,
  onUpdate,
  onDelete,
  defaultFinancialOverlayOpen = false,
}: UseEmployeeCardLogicProps) {
  const { companies, projects } = useEmployeeCardData()
  const currentMonth = new Date().toISOString().slice(0, 7)

  const [formData, setFormData] = useState<EmployeeFormData>({
    ...employee,
    company_id: employee?.company_id ?? '',
    project_id: employee?.project_id ?? employee?.project?.id ?? null,
    additional_fields: (employee?.additional_fields ?? {}) as Record<string, string | number | boolean | null>,
    health_insurance_expiry: employee?.health_insurance_expiry ?? '',
    hired_worker_contract_expiry: employee?.hired_worker_contract_expiry ?? '',
    salary: employee?.salary ?? 0,
    notes: employee?.notes ?? '',
    residence_image_url: employee?.residence_image_url ?? '',
    residence_thumbnail_url: employee?.residence_thumbnail_url ?? '',
    health_certificate_url: employee?.health_certificate_url ?? '',
    ajeer_contract_url: employee?.ajeer_contract_url ?? '',
    muqeem_document_url: employee?.muqeem_document_url ?? '',
    birth_date: employee?.birth_date ?? '',
    joining_date: employee?.joining_date ?? '',
    residence_expiry: employee?.residence_expiry ?? '',
    contract_expiry: employee?.contract_expiry ?? '',
    residence_number: employee?.residence_number ?? 0,
  })

  const [originalData] = useState(employee)
  const [saving, setSaving] = useState(false)

  const pendingFilesRef = useRef<{ original: File; thumbnail: File | null } | null>(null)
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null)
  const [hasPendingResidenceFile, setHasPendingResidenceFile] = useState(false)

  // ملفات المستندات الإضافية (مؤجّلة — بدون thumbnail)
  const pendingHealthCertRef = useRef<File | null>(null)
  const pendingAjeerRef = useRef<File | null>(null)
  const pendingMuqeemRef = useRef<File | null>(null)
  const [hasPendingHealthCert, setHasPendingHealthCert] = useState(false)
  const [hasPendingAjeer, setHasPendingAjeer] = useState(false)
  const [hasPendingMuqeem, setHasPendingMuqeem] = useState(false)

  function handleHealthCertReady(file: File) {
    pendingHealthCertRef.current = file
    setHasPendingHealthCert(true)
  }

  function handleAjeerReady(file: File) {
    pendingAjeerRef.current = file
    setHasPendingAjeer(true)
  }

  function handleMuqeemReady(file: File) {
    pendingMuqeemRef.current = file
    setHasPendingMuqeem(true)
  }

  const [isEditMode, setIsEditMode] = useState(false)
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false)
  const [companySearchQuery, setCompanySearchQuery] = useState('')
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false)
  const companyDropdownRef = useRef<HTMLDivElement>(null)
  const [projectSearchQuery, setProjectSearchQuery] = useState('')
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false)
  const projectDropdownRef = useRef<HTMLDivElement>(null)
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [creatingProject, setCreatingProject] = useState(false)
  const [showFinancialOverlay, setShowFinancialOverlay] = useState(defaultFinancialOverlayOpen)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showObligationForm, setShowObligationForm] = useState(false)
  const [editingObligationLineId, setEditingObligationLineId] = useState<string | null>(null)
  const [obligationPaymentForm, setObligationPaymentForm] = useState({ amount_paid: 0, notes: '' })
  const [obligationForm, setObligationForm] = useState<{
    obligation_type: ObligationType
    total_amount: number
    start_month: string
    installment_count: number
    notes: string
  }>({
    obligation_type: 'advance',
    total_amount: employee.salary || 0,
    start_month: currentMonth,
    installment_count: 1,
    notes: '',
  })
  const [startMonthConflict, setStartMonthConflict] = useState(false)
  const [checkingStartMonth, setCheckingStartMonth] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [editPlanForm, setEditPlanForm] = useState<{
    obligation_type: ObligationType
    title: string
    total_amount: number
    notes: string
  }>({ obligation_type: 'advance', title: '', total_amount: 0, notes: '' })
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(event.target as Node)) {
        setIsCompanyDropdownOpen(false)
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
        if (showCreateProjectModal) {
          setShowCreateProjectModal(false)
          setNewProjectName('')
          return
        }
        if (isEditMode) return
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isEditMode, onClose, showCreateProjectModal])

  useEffect(() => {
    const origBody = document.body.style.overflow
    const origHtml = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = origBody
      document.documentElement.style.overflow = origHtml
    }
  }, [])

  useEffect(() => {
    if (formData.company_id && companies.length > 0) {
      const selected = companies.find((c) => c.id === formData.company_id)
      if (selected) {
        const text = `${selected.name} (${selected.unified_number})`
        if (companySearchQuery !== text) setCompanySearchQuery(text)
      }
    } else if (!formData.company_id && companySearchQuery) {
      setCompanySearchQuery('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.company_id, companies])

  useEffect(() => {
    if (formData.project_id && projects.length > 0) {
      const selected = projects.find((p) => p.id === formData.project_id)
      if (selected) {
        if (projectSearchQuery !== selected.name) setProjectSearchQuery(selected.name)
      }
    } else if (!formData.project_id && projectSearchQuery) {
      setProjectSearchQuery('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.project_id, projects])

  const filteredCompanies = companies.filter((company) => {
    if (companySearchQuery.trim()) {
      const q = companySearchQuery.toLowerCase().trim()
      return company.name?.toLowerCase().includes(q) || company.unified_number?.toString().includes(q)
    }
    return true
  })

  const filteredProjects = projects.filter((project) => {
    if (projectSearchQuery.trim()) {
      return project.name?.toLowerCase().includes(projectSearchQuery.toLowerCase().trim())
    }
    return true
  })

  const hasExactMatch =
    projectSearchQuery.trim() &&
    projects.some((p) => p.name.toLowerCase() === projectSearchQuery.toLowerCase().trim())

  const showCreateOption = projectSearchQuery.trim() && !hasExactMatch && isProjectDropdownOpen

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) { toast.error('يرجى إدخال اسم المشروع'); return }
    const existing = projects.find((p) => p.name.toLowerCase() === newProjectName.trim().toLowerCase())
    if (existing) {
      toast.error('يوجد مشروع بنفس الاسم بالفعل')
      setFormData({ ...formData, project_id: existing.id })
      setProjectSearchQuery(existing.name)
      setShowCreateProjectModal(false)
      setNewProjectName('')
      setIsProjectDropdownOpen(false)
      return
    }
    setCreatingProject(true)
    try {
      const { data: newProject, error } = await supabase
        .from('projects')
        .insert({ name: newProjectName.trim(), status: 'active' })
        .select()
        .single()
      if (error) {
        toast.error(error.code === '23505' ? 'يوجد مشروع بنفس الاسم بالفعل' : error.message)
        return
      }
      setFormData({ ...formData, project_id: newProject.id, project_name: newProject.name })
      setProjectSearchQuery(newProject.name)
      setShowCreateProjectModal(false)
      setNewProjectName('')
      setIsProjectDropdownOpen(false)
      try {
        await supabase.from('activity_log').insert({
          entity_type: 'project',
          entity_id: newProject.id,
          action: 'إنشاء مشروع',
          details: { project_name: newProject.name, employee_count: 0 },
        })
      } catch { /* non-blocking */ }
      toast.success('تم إنشاء المشروع بنجاح')
    } catch (error) {
      logger.error('Error creating project:', error)
      toast.error(error instanceof Error ? error.message : 'فشل إنشاء المشروع')
    } finally {
      setCreatingProject(false)
    }
  }

  const getFieldLabel = (key: string): string => {
    const labels: Record<string, string> = {
      name: 'الاسم', phone: 'رقم الهاتف', profession: 'المهنة', nationality: 'الجنسية',
      residence_number: 'رقم الإقامة', passport_number: 'رقم الجواز', bank_account: 'الحساب البنكي',
      salary: 'الراتب', project_id: 'المشروع', birth_date: 'تاريخ الميلاد',
      joining_date: 'تاريخ الالتحاق', residence_expiry: 'تاريخ انتهاء الإقامة',
      contract_expiry: 'تاريخ انتهاء العقد', hired_worker_contract_expiry: 'تاريخ انتهاء عقد أجير',
      health_insurance_expiry: 'تاريخ انتهاء التأمين الصحي', notes: 'الملاحظات', company_id: 'المؤسسة',
    }
    return labels[key] || key
  }

  const logActivity = async (
    action: string,
    changes: Record<string, unknown>,
    oldDataFull: Record<string, unknown>,
    newDataFull: Record<string, unknown>
  ) => {
    try {
      const changedFields = Object.keys(changes)
      const detailedChanges: Record<string, { old: unknown; new: unknown }> = {}
      const translatedChanges: Record<string, unknown> = {}
      let actionName = action

      changedFields.forEach((field) => {
        const label = getFieldLabel(field)
        detailedChanges[label] = { old: oldDataFull[field], new: newDataFull[field] }
        translatedChanges[label] = newDataFull[field]
      })

      if (changedFields.length === 1) {
        actionName = `تحديث ${getFieldLabel(changedFields[0])}`
      } else if (changedFields.length > 1) {
        actionName = `تحديث متعدد (${changedFields.length} حقول)`
      }

      await supabase.from('activity_log').insert({
        entity_type: 'employee',
        entity_id: employee.id,
        action: actionName,
        details: {
          employee_name: employee.name,
          residence_number: employee.residence_number,
          changes: detailedChanges,
          changes_simple: translatedChanges,
          timestamp: new Date().toISOString(),
          old_data: oldDataFull,
          new_data: newDataFull,
        },
      })
    } catch (error) {
      logger.error('Error logging activity:', error)
    }
  }

  function handleFilesReady(original: File, thumbnail: File | null) {
    if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl)
    pendingFilesRef.current = { original, thumbnail }
    setThumbnailPreviewUrl(thumbnail ? URL.createObjectURL(thumbnail) : null)
    setHasPendingResidenceFile(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const normalizeDate = (v: string | null | undefined) => v?.trim() || null

      const normalizedHWCE = normalizeDate(formData.hired_worker_contract_expiry)

      const hiredWorkerStatus = getEmployeeBusinessFields({
        additional_fields: formData.additional_fields,
        hired_worker_contract_expiry: normalizedHWCE,
      }).hired_worker_contract_status

      if (hiredWorkerStatus === 'أجير' && !normalizedHWCE) {
        toast.error('عند اختيار حالة عقد أجير = أجير يجب إدخال تاريخ انتهاء عقد أجير')
        setSaving(false)
        return
      }

      const { data: existingEmployee, error: fetchError } = await supabase
        .from('employees')
        .select(
          'id,company_id,name,profession,nationality,birth_date,phone,passport_number,residence_number,joining_date,contract_expiry,residence_expiry,project_name,bank_account,residence_image_url,residence_thumbnail_url,salary,health_insurance_expiry,additional_fields,created_at,updated_at,notes,hired_worker_contract_expiry,project_id,is_deleted,deleted_at'
        )
        .eq('id', employee.id)
        .single()

      if (fetchError) throw fetchError

      const baselineData: Record<string, unknown> = existingEmployee
        ? (existingEmployee as Record<string, unknown>)
        : (originalData as unknown as Record<string, unknown>)

      const fieldsToCheck = [
        'name', 'phone', 'profession', 'nationality', 'residence_number', 'passport_number',
        'bank_account', 'salary', 'project_id', 'birth_date', 'joining_date', 'residence_expiry',
        'contract_expiry', 'hired_worker_contract_expiry', 'health_insurance_expiry', 'notes', 'company_id',
      ]

      const actualUpdateData: Record<string, unknown> = {}
      const changes: Record<string, { old_value: unknown; new_value: unknown }> = {}

      if (pendingFilesRef.current) {
        const { original, thumbnail } = pendingFilesRef.current
        const newPath = buildResidencePath(employee.id, original)
        const { error: uploadErr } = await supabase.storage.from(RESIDENCE_BUCKET).upload(newPath, original, { upsert: false })
        if (uploadErr) {
          logger.error('فشل رفع الملف الأصلي:', uploadErr)
          toast.error('فشل رفع ملف الإقامة')
          setSaving(false)
          return
        }
        let newThumbnailPath: string | null = null
        if (thumbnail) {
          newThumbnailPath = buildResidenceThumbnailPath(employee.id, thumbnail)
          const { error: thumbErr } = await supabase.storage.from(RESIDENCE_BUCKET).upload(newThumbnailPath, thumbnail, { upsert: false })
          if (thumbErr) {
            await supabase.storage.from(RESIDENCE_BUCKET).remove([newPath]).catch(() => {})
            logger.error('فشل رفع الـ thumbnail:', thumbErr)
            toast.error('فشل رفع الصورة المقتطعة')
            setSaving(false)
            return
          }
        }
        const oldPath = formData.residence_image_url
        const oldThumb = formData.residence_thumbnail_url
        if (oldPath && !isLegacyExternalUrl(oldPath)) await supabase.storage.from(RESIDENCE_BUCKET).remove([oldPath]).catch((err: unknown) => logger.warn('فشل حذف الملف القديم — تجاهل:', err))
        if (oldThumb && !isLegacyExternalUrl(oldThumb)) await supabase.storage.from(RESIDENCE_BUCKET).remove([oldThumb]).catch((err: unknown) => logger.warn('فشل حذف الملف القديم — تجاهل:', err))
        actualUpdateData['residence_image_url'] = newPath
        actualUpdateData['residence_thumbnail_url'] = newThumbnailPath
        pendingFilesRef.current = null
        if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl)
        setThumbnailPreviewUrl(null)
        setHasPendingResidenceFile(false)
      }

      // رفع ملفات المستندات المؤجّلة (شهادة صحية + عقد أجير) عبر helper مشترك
      const uploadPendingDoc = async (
        file: File,
        meta: typeof EMPLOYEE_DOC_TYPES.health,
        oldPath: string,
      ): Promise<string> => {
        const newPath = buildEmployeeDocPath(meta.folder, employee.id, file)
        const { error: uploadErr } = await supabase.storage
          .from(EMPLOYEE_DOC_BUCKET)
          .upload(newPath, file, { upsert: false })
        if (uploadErr) {
          logger.error(`فشل رفع ملف ${meta.labelAr}:`, uploadErr)
          throw new Error(`فشل رفع ملف ${meta.labelAr}`)
        }
        if (oldPath && !isLegacyExternalUrl(oldPath)) {
          await supabase.storage.from(EMPLOYEE_DOC_BUCKET).remove([oldPath])
            .catch((err: unknown) => logger.warn('فشل حذف الملف القديم — تجاهل:', err))
        }
        return newPath
      }

      if (pendingHealthCertRef.current) {
        try {
          const newPath = await uploadPendingDoc(
            pendingHealthCertRef.current,
            EMPLOYEE_DOC_TYPES.health,
            formData.health_certificate_url,
          )
          actualUpdateData['health_certificate_url'] = newPath
          pendingHealthCertRef.current = null
          setHasPendingHealthCert(false)
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'فشل رفع ملف الشهادة الصحية')
          setSaving(false)
          return
        }
      }

      if (pendingAjeerRef.current) {
        try {
          const newPath = await uploadPendingDoc(
            pendingAjeerRef.current,
            EMPLOYEE_DOC_TYPES.ajeer,
            formData.ajeer_contract_url,
          )
          actualUpdateData['ajeer_contract_url'] = newPath
          pendingAjeerRef.current = null
          setHasPendingAjeer(false)
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'فشل رفع ملف عقد الأجير')
          setSaving(false)
          return
        }
      }

      if (pendingMuqeemRef.current) {
        try {
          const newPath = await uploadPendingDoc(
            pendingMuqeemRef.current,
            EMPLOYEE_DOC_TYPES.muqeem,
            formData.muqeem_document_url,
          )
          actualUpdateData['muqeem_document_url'] = newPath
          pendingMuqeemRef.current = null
          setHasPendingMuqeem(false)
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'فشل رفع ملف وثيقة مقيم')
          setSaving(false)
          return
        }
      }

      const normalizedAdditionalFields = buildEmployeeBusinessAdditionalFields(
        formData.additional_fields,
        {
          ...getEmployeeBusinessFields({ additional_fields: formData.additional_fields, hired_worker_contract_expiry: normalizedHWCE }),
          hired_worker_contract_expiry: normalizedHWCE,
        }
      )

      fieldsToCheck.forEach((field) => {
        const oldValue = baselineData[field]
        let newValue: unknown = (formData as Record<string, unknown>)[field]

        const fd = formData as Record<string, unknown>
        if (['birth_date', 'joining_date', 'residence_expiry', 'contract_expiry', 'health_insurance_expiry'].includes(field)) {
          newValue = normalizeDate(fd[field] as string | null | undefined)
        } else if (field === 'residence_number' || field === 'salary') {
          newValue = Number(fd[field]) || 0
        } else if (field === 'residence_image_url' || field === 'notes') {
          newValue = fd[field] || null
        } else if (field === 'hired_worker_contract_expiry') {
          newValue = normalizedHWCE
        } else if (field === 'project_id') {
          newValue = formData.project_id || null
        }

        const oldVal = oldValue ?? null
        const newVal = newValue ?? null
        if (oldVal !== newVal) {
          actualUpdateData[field] = newValue
          changes[field] = { old_value: oldVal, new_value: newVal }
        }
      })

      const baselineAdditionalFields = (baselineData.additional_fields ?? {}) as Record<string, unknown>
      if (JSON.stringify(baselineAdditionalFields) !== JSON.stringify(normalizedAdditionalFields)) {
        actualUpdateData.additional_fields = normalizedAdditionalFields
        changes.additional_fields = { old_value: baselineAdditionalFields, new_value: normalizedAdditionalFields }
      }

      if (Object.keys(actualUpdateData).length === 0) {
        toast.info('لم يتم تغيير أي بيانات')
        setSaving(false)
        return
      }

      if (actualUpdateData.project_id !== undefined) {
        if (actualUpdateData.project_id) {
          const selectedProject = projects.find((p) => p.id === actualUpdateData.project_id)
          if (selectedProject) actualUpdateData.project_name = selectedProject.name
        } else {
          actualUpdateData.project_name = null
        }
      }

      const { data: updatedEmployee, error } = await supabase
        .from('employees')
        .update(actualUpdateData)
        .eq('id', employee.id)
        .select()
        .single()

      if (error) throw error

      const newDataFull: Record<string, unknown> = updatedEmployee
        ? (updatedEmployee as Record<string, unknown>)
        : { ...baselineData, ...actualUpdateData }

      let actionType = 'full_edit'
      if (actualUpdateData.company_id !== undefined && actualUpdateData.company_id !== originalData.company_id) {
        actionType = 'company_transfer'
      }

      await logActivity(actionType, changes, baselineData, newDataFull)

      if (Object.keys(actualUpdateData).length > 0) {
        setFormData((prev) => {
          const next = { ...prev }
          for (const [key, val] of Object.entries(actualUpdateData)) {
            if (key in next) (next as Record<string, unknown>)[key] = val ?? ''
          }
          return next
        })
      }

      toast.success('تم حفظ التعديلات بنجاح')
      setIsEditMode(false)
      onUpdate()
    } catch (error) {
      logger.error('Error saving employee:', error)
      toast.error('فشل حفظ التعديلات')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    pendingFilesRef.current = null
    if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl)
    setThumbnailPreviewUrl(null)
    setHasPendingResidenceFile(false)
    pendingHealthCertRef.current = null
    pendingAjeerRef.current = null
    setHasPendingHealthCert(false)
    setHasPendingAjeer(false)
    setFormData({
      ...employee,
      company_id: employee.company_id,
      project_id: employee.project_id || employee.project?.id || null,
      additional_fields: (employee.additional_fields || {}) as Record<string, string | number | boolean | null>,
      health_insurance_expiry: employee.health_insurance_expiry || '',
      hired_worker_contract_expiry: employee.hired_worker_contract_expiry || '',
      salary: employee.salary || 0,
      notes: employee.notes || '',
      residence_image_url: employee.residence_image_url || '',
      residence_thumbnail_url: employee.residence_thumbnail_url || '',
      health_certificate_url: employee.health_certificate_url || '',
      ajeer_contract_url: employee.ajeer_contract_url || '',
      muqeem_document_url: employee.muqeem_document_url || '',
      residence_number: employee.residence_number || 0,
    })
    setIsEditMode(false)
    setIsCompanyDropdownOpen(false)
  }

  const handleEdit = () => setIsEditMode(true)

  const handleDelete = () => { if (onDelete) onDelete(employee) }

  const employeeBusinessFields = getEmployeeBusinessFields({
    additional_fields: formData.additional_fields,
    hired_worker_contract_expiry: formData.hired_worker_contract_expiry,
  })

  const {
    data: obligationPlans = [],
    isLoading: isLoadingObligations,
    isError: hasObligationsError,
  } = useEmployeeObligations(employee.id)

  const activeObligationPlans = obligationPlans.filter(
    (plan) => plan.status === 'active' || plan.status === 'draft'
  )
  const allObligationLines = activeObligationPlans
    .flatMap((plan) =>
      plan.lines.map((line) => ({
        ...line,
        title: plan.title,
        currency_code: plan.currency_code,
        obligation_type: plan.obligation_type,
      }))
    )
    .sort((a, b) => a.due_month.localeCompare(b.due_month))

  const openObligationLines = allObligationLines.filter(
    (line) => line.line_status === 'unpaid' || line.line_status === 'partial'
  )
  const recentObligationLines = [...allObligationLines]
    .sort((a, b) => a.due_month.localeCompare(b.due_month))

  const remainingObligationAmount = openObligationLines.reduce(
    (total, line) => total + Math.max(line.amount_due - line.amount_paid, 0),
    0
  )
  const paidObligationAmount = allObligationLines.reduce(
    (total, line) => total + Number(line.amount_paid || 0),
    0
  )
  const obligationBucketSummary = activeObligationPlans.reduce(
    (totals, plan) => {
      const bucket = getPayrollObligationBucketFromType(plan.obligation_type)
      const totalAmount = plan.lines.reduce((s, l) => s + Number(l.amount_due || 0), 0)
      const paidAmount = plan.lines.reduce((s, l) => s + Number(l.amount_paid || 0), 0)
      totals[bucket].total += totalAmount
      totals[bucket].paid += paidAmount
      totals[bucket].remaining += Math.max(totalAmount - paidAmount, 0)
      return totals
    },
    {
      transfer_renewal: { total: 0, paid: 0, remaining: 0 },
      penalty: { total: 0, paid: 0, remaining: 0 },
      advance: { total: 0, paid: 0, remaining: 0 },
      other: { total: 0, paid: 0, remaining: 0 },
    }
  )

  const installmentPreview = buildInstallmentAmounts(
    Math.max(obligationForm.total_amount || 0, 0),
    Math.max(obligationForm.installment_count || 1, 1)
  )

  const createEmployeeObligationPlan = useCreateEmployeeObligationPlan()
  const updateObligationPlan = useUpdateObligationPlan()
  const deleteObligationPlan = useDeleteObligationPlan()
  const updateObligationLinePayment = useUpdateObligationLinePayment()

  const handleCreateObligationPlan = async () => {
    const totalAmount = Number(obligationForm.total_amount)
    const installmentCount = Number(obligationForm.installment_count)

    if (!obligationForm.start_month) { toast.error('يرجى اختيار شهر البداية'); return }
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) { toast.error('يرجى إدخال مبلغ صحيح أكبر من صفر'); return }
    if (!Number.isInteger(installmentCount) || installmentCount < 1 || installmentCount > 12) {
      toast.error('عدد الأقساط يجب أن يكون بين 1 و 12'); return
    }

    try {
      await createEmployeeObligationPlan.mutateAsync({
        employee_id: employee.id,
        employee_name: employee.name,
        residence_number: employee.residence_number,
        obligation_type: obligationForm.obligation_type,
        total_amount: totalAmount,
        start_month: `${obligationForm.start_month}-01`,
        installment_amounts: buildInstallmentAmounts(totalAmount, installmentCount),
        notes: obligationForm.notes.trim() || null,
        status: 'active',
      })
      toast.success('تم إنشاء خطة الالتزام بنجاح')
      setShowObligationForm(false)
      setObligationForm({
        obligation_type: 'advance',
        total_amount: employee.salary || 0,
        start_month: currentMonth,
        installment_count: 1,
        notes: '',
      })
    } catch (error) {
      logger.error('Error creating obligation plan:', error)
      toast.error(error instanceof Error ? error.message : 'فشل إنشاء خطة الالتزام')
    }
  }

  const handleOpenEditPlan = (plan: EmployeeObligationPlan) => {
    setEditingPlanId(plan.id)
    setEditPlanForm({
      obligation_type: plan.obligation_type,
      title: plan.title,
      total_amount: Number(plan.total_amount),
      notes: plan.notes || '',
    })
  }

  const handleUpdatePlan = async () => {
    if (!editingPlanId) return
    const plan = obligationPlans.find((p) => p.id === editingPlanId)
    if (!plan) return
    const totalAmount = Number(editPlanForm.total_amount)
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) { toast.error('يرجى إدخال مبلغ صحيح أكبر من صفر'); return }
    try {
      await updateObligationPlan.mutateAsync({
        plan,
        employeeId: employee.id,
        employee_name: employee.name,
        residence_number: employee.residence_number,
        updates: {
          obligation_type: editPlanForm.obligation_type,
          title: editPlanForm.title.trim() || OBLIGATION_TYPE_LABELS[editPlanForm.obligation_type] || editPlanForm.obligation_type,
          total_amount: totalAmount,
          notes: editPlanForm.notes.trim() || null,
        },
      })
      toast.success('تم تعديل الالتزام بنجاح')
      setEditingPlanId(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل تعديل الالتزام')
    }
  }

  const handleDeletePlan = async () => {
    if (!deletingPlanId) return
    try {
      const deletingPlan = obligationPlans.find((p) => p.id === deletingPlanId)
      await deleteObligationPlan.mutateAsync({
        planId: deletingPlanId,
        employeeId: employee.id,
        employee_name: employee.name,
        residence_number: employee.residence_number,
        obligation_type: deletingPlan?.obligation_type,
        total_amount: deletingPlan?.total_amount,
      })
      toast.success('تم حذف الالتزام بنجاح')
      setDeletingPlanId(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل حذف الالتزام')
    }
  }

  useEffect(() => {
    if (!showObligationForm || !obligationForm.start_month || !employee?.id) {
      setStartMonthConflict(false)
      return
    }
    let cancelled = false
    const monthDate = /^\d{4}-\d{2}$/.test(obligationForm.start_month)
      ? `${obligationForm.start_month}-01`
      : obligationForm.start_month
    setCheckingStartMonth(true)
    void (async () => {
      const { data: runs } = await supabase
        .from('payroll_runs')
        .select('id')
        .eq('payroll_month', monthDate)
        .eq('status', 'finalized')
      if (cancelled) return
      if (!runs || runs.length === 0) {
        setStartMonthConflict(false)
        setCheckingStartMonth(false)
        return
      }
      const runIds = (runs as { id: string }[]).map((r) => r.id)
      const { data: entries } = await supabase
        .from('payroll_entries')
        .select('id')
        .eq('employee_id', employee.id)
        .in('payroll_run_id', runIds)
        .limit(1)
      if (!cancelled) {
        setStartMonthConflict(!!(entries && entries.length > 0))
        setCheckingStartMonth(false)
      }
    })()
    return () => { cancelled = true }
  }, [showObligationForm, obligationForm.start_month, employee?.id])

  const startEditingObligationLine = (lineId: string, amountPaid: number, notes?: string | null) => {
    setEditingObligationLineId(lineId)
    setObligationPaymentForm({ amount_paid: amountPaid, notes: notes || '' })
  }

  const handleSaveObligationPayment = async (lineId: string, amountDue: number) => {
    const amountPaid = Number(obligationPaymentForm.amount_paid)
    if (!Number.isFinite(amountPaid) || amountPaid < 0) { toast.error('قيمة المدفوع يجب أن تكون صفراً أو أكبر'); return }
    if (amountPaid > amountDue) { toast.error('قيمة المدفوع لا يمكن أن تتجاوز قيمة القسط'); return }
    try {
      await updateObligationLinePayment.mutateAsync({
        lineId,
        employeeId: employee.id,
        amount_paid: amountPaid,
        notes: obligationPaymentForm.notes.trim() || null,
      })
      toast.success('تم تحديث سداد القسط بنجاح')
      setEditingObligationLineId(null)
      setObligationPaymentForm({ amount_paid: 0, notes: '' })
    } catch (error) {
      logger.error('Error updating obligation payment:', error)
      toast.error(error instanceof Error ? error.message : 'فشل تحديث السداد')
    }
  }

  return {
    formData, setFormData,
    saving,
    pendingFilesRef,
    thumbnailPreviewUrl,
    hasPendingResidenceFile,
    hasPendingHealthCert,
    hasPendingAjeer,
    hasPendingMuqeem,
    handleHealthCertReady,
    handleAjeerReady,
    handleMuqeemReady,
    isEditMode,
    showUnsavedConfirm, setShowUnsavedConfirm,
    companySearchQuery, setCompanySearchQuery,
    isCompanyDropdownOpen, setIsCompanyDropdownOpen,
    companyDropdownRef,
    projectSearchQuery, setProjectSearchQuery,
    isProjectDropdownOpen, setIsProjectDropdownOpen,
    projectDropdownRef,
    showCreateProjectModal, setShowCreateProjectModal,
    newProjectName, setNewProjectName,
    creatingProject,
    showFinancialOverlay, setShowFinancialOverlay,
    showHistoryModal, setShowHistoryModal,
    showObligationForm, setShowObligationForm,
    editingObligationLineId,
    obligationPaymentForm, setObligationPaymentForm,
    obligationForm, setObligationForm,
    startMonthConflict,
    checkingStartMonth,
    editingPlanId, setEditingPlanId,
    editPlanForm, setEditPlanForm,
    deletingPlanId, setDeletingPlanId,
    filteredCompanies,
    filteredProjects,
    showCreateOption,
    employeeBusinessFields,
    obligationPlans,
    isLoadingObligations,
    hasObligationsError,
    activeObligationPlans,
    allObligationLines,
    openObligationLines,
    recentObligationLines,
    remainingObligationAmount,
    paidObligationAmount,
    obligationBucketSummary,
    installmentPreview,
    createEmployeeObligationPlan,
    updateObligationPlan,
    deleteObligationPlan,
    updateObligationLinePayment,
    setEditingObligationLineId,
    handleCreateProject,
    handleFilesReady,
    handleSave,
    handleCancel,
    handleEdit,
    handleDelete,
    handleCreateObligationPlan,
    handleOpenEditPlan,
    handleUpdatePlan,
    handleDeletePlan,
    startEditingObligationLine,
    handleSaveObligationPayment,
  }
}
