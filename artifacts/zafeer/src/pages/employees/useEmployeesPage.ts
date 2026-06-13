import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { useQueryClient } from '@tanstack/react-query'
import { useModalScrollLock } from '@/hooks/useModalScrollLock'
import { supabase, Employee, Company, type EmployeeWithRelations } from '@/lib/supabase'
import { useAllEmployeesPage, EMPLOYEES_PAGE_QUERY_KEY } from '@/hooks/useEmployees'
import { useProjects } from '@/hooks/useProjects'
import { useEmployeeFilters, type CardSeverityFilter } from '@/hooks/useEmployeeFilters'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { type PostgrestError } from '@supabase/supabase-js'
import { usePermissions } from '@/utils/permissions'
import { logger } from '@/utils/logger'
import {
  getEmployeeNotificationThresholdsPublic,
  type EmployeeNotificationThresholds,
} from '@/utils/employeeAlerts'
import { useIsMobileView } from '@/hooks/useIsMobileView'
import { useSnoozedAlerts } from '@/hooks/useSnoozedAlerts'
import { type ObligationHeaderInfo } from '@/components/employees/CascadeDeleteModal'
import { COLOR_THRESHOLD_FALLBACK, hasAlert, getFieldLabel, getDaysRemaining } from './employeeUtils'

// ─── Exported types ───────────────────────────────────────────────────────────

export interface DeletePreviewData {
  obligationHeaders: ObligationHeaderInfo[]
  payrollEntryCount: number
  extractLineCount: number
}

export type ObligationDeleteChoice = 'delete' | 'keep'

export interface BulkDeletePreviewData {
  obligationHeaders: ObligationHeaderInfo[]
  totalPayrollEntries: number
  totalExtractLines: number
}

// ─── Private helpers ──────────────────────────────────────────────────────────

const DELETE_BATCH_SIZE = 50

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

async function softDeleteEmployees(employeeIds: string[]): Promise<number> {
  let deletedCount = 0
  for (const batch of chunkArray(employeeIds, DELETE_BATCH_SIZE)) {
    const { data, error } = await supabase.rpc('soft_delete_employees', { p_employee_ids: batch })
    if (error) throw error
    deletedCount += typeof data === 'number' ? data : batch.length
  }
  return deletedCount
}

async function fetchObligationHeaders(employeeIds: string[]): Promise<ObligationHeaderInfo[]> {
  const allHeaders: ObligationHeaderInfo[] = []
  for (const batch of chunkArray(employeeIds, DELETE_BATCH_SIZE)) {
    const { data, error } = await supabase
      .from('employee_obligation_headers')
      .select('id, employee_id, obligation_type, title, total_amount, currency_code, status')
      .in('employee_id', batch)
    if (error) throw error
    allHeaders.push(...((data ?? []) as ObligationHeaderInfo[]))
  }
  return allHeaders
}

async function deleteObligationHeaders(headerIds: string[]): Promise<void> {
  for (const batch of chunkArray(headerIds, DELETE_BATCH_SIZE)) {
    const { error } = await supabase.from('employee_obligation_headers').delete().in('id', batch)
    if (error) throw error
  }
}

async function fetchDeletePreview(employeeId: string): Promise<DeletePreviewData> {
  const [headers, payrollResult, extractResult] = await Promise.all([
    fetchObligationHeaders([employeeId]),
    supabase.from('payroll_entries').select('id', { count: 'exact', head: true }).eq('employee_id', employeeId),
    supabase.from('extract_invoice_lines').select('id', { count: 'exact', head: true }).eq('employee_id', employeeId),
  ])
  if (payrollResult.error) throw payrollResult.error
  if (extractResult.error) throw extractResult.error
  return { obligationHeaders: headers, payrollEntryCount: payrollResult.count ?? 0, extractLineCount: extractResult.count ?? 0 }
}

async function fetchBulkDeletePreview(employeeIds: string[]): Promise<BulkDeletePreviewData> {
  const { data, error } = await supabase.rpc('bulk_delete_employee_preview', { p_employee_ids: employeeIds })
  if (error) throw error
  return data as BulkDeletePreviewData
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useEmployeesPage() {
  const { canView, canCreate, canEdit, canDelete } = usePermissions()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const hasViewPermission = canView('employees')
  const { data: employeesData = [], isLoading: loading } = useAllEmployeesPage(hasViewPermission)
  const employees = employeesData as (Employee & { company: Company })[]

  const [colorThresholds, setColorThresholds] = useState<EmployeeNotificationThresholds | null>(null)
  const { snoozedAlertIds } = useSnoozedAlerts()

  const companiesWithIds = useMemo(() => {
    const map = new Map<string, { name: string; unified_number?: number }>()
    employees.forEach((emp) => {
      if (emp.company?.id && emp.company?.name && !map.has(emp.company.id)) {
        map.set(emp.company.id, { name: emp.company.name, unified_number: emp.company.unified_number })
      }
    })
    return Array.from(map.entries()).map(([id, d]) => ({ id, name: d.name, unified_number: d.unified_number })).sort((a, b) => a.name.localeCompare(b.name))
  }, [employees])

  const nationalities = useMemo(() => [...new Set(employees.map((e) => e.nationality).filter(Boolean))].sort() as string[], [employees])
  const professions = useMemo(() => [...new Set(employees.map((e) => e.profession).filter(Boolean))].sort() as string[], [employees])

  const { data: projectsData = [] } = useProjects()
  const projects = useMemo(() => projectsData.map((p) => p.name).filter(Boolean), [projectsData])

  const [selectedEmployee, setSelectedEmployee] = useState<(Employee & { company: Company }) | null>(null)
  const [isCardOpen, setIsCardOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([])
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid')
  const isMobileView = useIsMobileView()

  const [showDeleteSummaryModal, setShowDeleteSummaryModal] = useState(false)
  const [employeeToDelete, setEmployeeToDelete] = useState<(Employee & { company: Company }) | null>(null)
  const [deletePreview, setDeletePreview] = useState<DeletePreviewData | null>(null)
  const [deletePreviewLoading, setDeletePreviewLoading] = useState(false)
  const [deleteConfirmLoading, setDeleteConfirmLoading] = useState(false)
  const [bulkDeletePreview, setBulkDeletePreview] = useState<BulkDeletePreviewData | null>(null)
  const [bulkPreviewLoading, setBulkPreviewLoading] = useState(false)
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set())
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [deletingEmployees, setDeletingEmployees] = useState(false)
  const [showBulkResidenceModal, setShowBulkResidenceModal] = useState(false)
  const [showBulkInsuranceModal, setShowBulkInsuranceModal] = useState(false)
  const [showBulkContractModal, setShowBulkContractModal] = useState(false)
  const [showFiltersModal, setShowFiltersModal] = useState(false)
  const [showSortDropdown, setShowSortDropdown] = useState(false)

  useModalScrollLock(showDeleteSummaryModal || showBulkDeleteModal || showBulkResidenceModal || showBulkInsuranceModal || showBulkContractModal || showFiltersModal)

  const loadEmployees = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: EMPLOYEES_PAGE_QUERY_KEY })
  }, [queryClient])

  const filterResult = useEmployeeFilters({ employees, colorThresholds, snoozedAlertIds })
  const {
    searchTerm, setSearchTerm, residenceNumberSearch, setResidenceNumberSearch,
    companyFilter, setCompanyFilter, nationalityFilter, setNationalityFilter,
    professionFilter, setProfessionFilter, projectFilter, setProjectFilter,
    contractFilter, setContractFilter, hiredWorkerContractFilter, setHiredWorkerContractFilter,
    residenceFilter, setResidenceFilter, healthInsuranceFilter, setHealthInsuranceFilter,
    contractStatusDocFilter, setContractStatusDocFilter,
    hiredWorkerContractStatusDocFilter, setHiredWorkerContractStatusDocFilter,
    residenceStatusDocFilter, setResidenceStatusDocFilter,
    healthInsuranceStatusDocFilter, setHealthInsuranceStatusDocFilter,
    hasAlertFilter, setHasAlertFilter, showAlertsOnly, setShowAlertsOnly,
    cardSeverityFilter, setCardSeverityFilter,
    sortField, setSortField, sortDirection, setSortDirection,
    filteredEmployees, sortedAndFilteredEmployees, activeFiltersCount, hasActiveFilters,
    clearFilters: clearFilterState, applyUrlFilter,
  } = filterResult

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const thresholds = await getEmployeeNotificationThresholdsPublic()
        if (isMounted) setColorThresholds(thresholds)
      } catch (err) { logger.error('Error loading color thresholds:', err) }
    }
    load()
    return () => { isMounted = false }
  }, [])

  useEffect(() => {
    if (!hasViewPermission) return
    const filter = new URLSearchParams(location.search).get('filter')
    applyUrlFilter(filter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasViewPermission])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const companyId = params.get('company')
    if (companyId && companiesWithIds.length > 0) {
      const company = companiesWithIds.find((c) => c.id === companyId)
      if (company) setCompanyFilter([company.name])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companiesWithIds, location.search])

  const openEmployeeHandledRef = useRef(false)
  useEffect(() => {
    if (openEmployeeHandledRef.current || loading || employees.length === 0) return
    const openId = new URLSearchParams(location.search).get('open')
    if (!openId) return
    const emp = employees.find((e) => e.id === openId)
    if (emp) {
      setSelectedEmployee(emp)
      setIsCardOpen(true)
      openEmployeeHandledRef.current = true
    }
  }, [employees, loading, location.search])

  useEffect(() => {
    setSelectedEmployees(new Set())
  }, [searchTerm, residenceNumberSearch, companyFilter, nationalityFilter, professionFilter, projectFilter, contractFilter, hiredWorkerContractFilter, residenceFilter, healthInsuranceFilter, contractStatusDocFilter, hiredWorkerContractStatusDocFilter, residenceStatusDocFilter, healthInsuranceStatusDocFilter, hasAlertFilter, cardSeverityFilter, showAlertsOnly])

  const clearFilters = () => { clearFilterState(); navigate('/employees') }

  const handleEmployeeClick = useCallback((employee: Employee & { company: Company }) => {
    setSelectedEmployee(employee)
    setIsCardOpen(true)
  }, [])

  const handleCloseCard = () => {
    setIsCardOpen(false)
    setSelectedEmployee(null)
    setSelectedRowIndex(null)
  }

  const handleUpdateEmployee = async () => { await loadEmployees() }

  const logActivity = async (employeeId: string, action: string, changes: Record<string, unknown>) => {
    try {
      const employee = employees.find((e) => e.id === employeeId)
      const translatedChanges: Record<string, unknown> = {}
      const changedFields: string[] = []
      Object.keys(changes).forEach((key) => {
        const label = getFieldLabel(key)
        translatedChanges[label] = changes[key]
        changedFields.push(label)
      })
      let actionName = action
      if (changedFields.length === 1 && !action.includes('حذف')) actionName = `تحديث ${changedFields[0]}`
      else if (changedFields.length > 1 && !action.includes('حذف')) actionName = `تحديث متعدد (${changedFields.length} حقول)`
      await supabase.from('activity_log').insert({
        entity_type: 'employee', entity_id: employeeId, action: actionName,
        details: { employee_name: employee?.name, residence_number: employee?.residence_number, changes: translatedChanges, timestamp: new Date().toISOString() },
      })
    } catch (err) { logger.error('Error logging activity:', err) }
  }

  const handleDeleteEmployee = useCallback(async (employee: Employee & { company: Company }) => {
    setEmployeeToDelete(employee)
    setDeletePreview(null)
    setDeletePreviewLoading(true)
    setShowDeleteSummaryModal(true)
    try {
      const preview = await fetchDeletePreview(employee.id)
      setDeletePreview(preview)
    } catch (fetchError) {
      logger.error('Error fetching delete preview:', fetchError)
      toast.error('تعذر فحص السجلات المرتبطة بالموظف')
      setShowDeleteSummaryModal(false)
      setEmployeeToDelete(null)
    } finally {
      setDeletePreviewLoading(false)
    }
  }, [])

  const confirmDeleteEmployee = async (choice: ObligationDeleteChoice) => {
    if (!employeeToDelete) return
    setDeleteConfirmLoading(true)
    try {
      if (choice === 'delete' && deletePreview?.obligationHeaders.length) {
        await deleteObligationHeaders(deletePreview.obligationHeaders.map((h) => h.id))
      }
      await softDeleteEmployees([employeeToDelete.id])
      await logActivity(employeeToDelete.id, 'حذف موظف', {
        employee_name: employeeToDelete.name, company: employeeToDelete.company?.name,
        obligation_choice: choice, obligations_deleted: choice === 'delete' ? (deletePreview?.obligationHeaders.length ?? 0) : 0,
        payroll_kept: deletePreview?.payrollEntryCount ?? 0, extracts_kept: deletePreview?.extractLineCount ?? 0,
      })
      toast.success(`تم حذف الموظف "${employeeToDelete.name}" بنجاح`)
      await queryClient.invalidateQueries({ queryKey: EMPLOYEES_PAGE_QUERY_KEY })
      await queryClient.invalidateQueries({ queryKey: ['all-obligations-summary'] })
      await queryClient.invalidateQueries({ queryKey: ['deleted-employee-obligations'] })
      setShowDeleteSummaryModal(false)
      setDeletePreview(null)
      setEmployeeToDelete(null)
      if (isCardOpen && selectedEmployee?.id === employeeToDelete.id) {
        setIsCardOpen(false)
        setSelectedEmployee(null)
      }
    } catch (error) {
      logger.error('Error deleting employee:', error)
      const postgrestError = error as PostgrestError | null
      if (postgrestError?.code === '23503') toast.error('تعذر حذف الموظف بسبب وجود سجلات مرتبطة به.')
      else toast.error(error instanceof Error ? error.message : 'فشل في حذف الموظف')
    } finally {
      setDeleteConfirmLoading(false)
    }
  }

  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployees((prev) => {
      const next = new Set(prev)
      if (next.has(employeeId)) next.delete(employeeId)
      else next.add(employeeId)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedEmployees.size === filteredEmployees.length) setSelectedEmployees(new Set())
    else setSelectedEmployees(new Set(filteredEmployees.map((emp) => emp.id)))
  }

  const clearSelection = () => setSelectedEmployees(new Set())

  const handleBulkDeleteClick = async () => {
    if (selectedEmployees.size === 0) { toast.error('لم يتم تحديد أي موظف للحذف'); return }
    const employeeIds = Array.from(selectedEmployees)
    setBulkDeletePreview(null)
    setBulkPreviewLoading(true)
    setShowBulkDeleteModal(true)
    try {
      const preview = await fetchBulkDeletePreview(employeeIds)
      setBulkDeletePreview(preview)
    } catch (fetchError) {
      logger.error('Error fetching bulk delete preview:', fetchError)
      toast.error('تعذر فحص السجلات المرتبطة بالموظفين المحددين')
      setShowBulkDeleteModal(false)
    } finally {
      setBulkPreviewLoading(false)
    }
  }

  const handleBulkDelete = async (choice: ObligationDeleteChoice) => {
    if (selectedEmployees.size === 0) return
    const employeeIds = Array.from(selectedEmployees)
    setDeletingEmployees(true)
    try {
      if (choice === 'delete' && bulkDeletePreview?.obligationHeaders.length) {
        await deleteObligationHeaders(bulkDeletePreview.obligationHeaders.map((h) => h.id))
      }
      const selectedEmployeesData = employees.filter((emp) => employeeIds.includes(emp.id))
      let totalDeleted = 0
      const failedBatches: string[] = []
      const employeeBatches = chunkArray(employeeIds, DELETE_BATCH_SIZE)
      for (let i = 0; i < employeeBatches.length; i++) {
        const batch = employeeBatches[i]
        try {
          totalDeleted += await softDeleteEmployees(batch)
          if (selectedEmployeesData.length <= 100) {
            for (const emp of selectedEmployeesData.filter((e) => batch.includes(e.id))) {
              try { await logActivity(emp.id, 'حذف موظف (جماعي)', { employee_name: emp.name, company: emp.company?.name, obligation_choice: choice }) }
              catch { logger.warn('Failed to log activity for employee:', emp.id) }
            }
          }
        } catch (batchError) {
          logger.error(`Error deleting batch ${i + 1}/${employeeBatches.length}:`, batchError)
          failedBatches.push(...batch)
        }
      }
      if (failedBatches.length > 0) toast.error(`تم حذف ${totalDeleted} موظف، ولكن فشل حذف ${failedBatches.length} موظف`)
      else toast.success(`تم حذف ${totalDeleted} موظف بنجاح`)
      await queryClient.invalidateQueries({ queryKey: EMPLOYEES_PAGE_QUERY_KEY })
      await queryClient.invalidateQueries({ queryKey: ['all-obligations-summary'] })
      await queryClient.invalidateQueries({ queryKey: ['deleted-employee-obligations'] })
      clearSelection()
      setShowBulkDeleteModal(false)
      setBulkDeletePreview(null)
    } catch (error) {
      logger.error('Error bulk deleting employees:', error)
      const e = error as PostgrestError | null
      if (e?.code === '23503') toast.error('تعذر حذف بعض الموظفين بسبب وجود سجلات مرتبطة بهم.')
      else toast.error(error instanceof Error ? error.message : 'فشل في حذف الموظفين')
    } finally {
      setDeletingEmployees(false)
    }
  }

  const handleBulkUpdateResidence = async (newDate: string) => {
    if (selectedEmployees.size === 0) return
    try {
      const employeeIds = Array.from(selectedEmployees)
      const selectedEmployeesData = employees.filter((emp) => employeeIds.includes(emp.id))
      const { error } = await supabase.from('employees').update({ residence_expiry: newDate }).in('id', employeeIds)
      if (error) throw error
      for (const emp of selectedEmployeesData) await logActivity(emp.id, 'تعديل تاريخ انتهاء الإقامة (جماعي)', { employee_name: emp.name, old_date: emp.residence_expiry, new_date: newDate })
      toast.success(`تم تحديث تاريخ انتهاء الإقامة لـ ${selectedEmployees.size} موظف`)
      await loadEmployees(); clearSelection(); setShowBulkResidenceModal(false)
    } catch (error) { logger.error('Error bulk updating residence:', error); toast.error(error instanceof Error ? error.message : 'فشل في تحديث تاريخ انتهاء الإقامة') }
  }

  const handleBulkUpdateInsurance = async (newDate: string) => {
    if (selectedEmployees.size === 0) return
    try {
      const employeeIds = Array.from(selectedEmployees)
      const selectedEmployeesData = employees.filter((emp) => employeeIds.includes(emp.id))
      const { error } = await supabase.from('employees').update({ health_insurance_expiry: newDate }).in('id', employeeIds)
      if (error) throw error
      for (const emp of selectedEmployeesData) await logActivity(emp.id, 'تعديل تاريخ انتهاء التأمين (جماعي)', { employee_name: emp.name, old_date: emp.health_insurance_expiry, new_date: newDate })
      toast.success(`تم تحديث تاريخ انتهاء التأمين لـ ${selectedEmployees.size} موظف`)
      await loadEmployees(); clearSelection(); setShowBulkInsuranceModal(false)
    } catch (error) { logger.error('Error bulk updating insurance:', error); toast.error(error instanceof Error ? error.message : 'فشل في تحديث تاريخ انتهاء التأمين') }
  }

  const handleBulkUpdateContract = async (newDate: string) => {
    if (selectedEmployees.size === 0) return
    try {
      const employeeIds = Array.from(selectedEmployees)
      const selectedEmployeesData = employees.filter((emp) => employeeIds.includes(emp.id))
      const { error } = await supabase.from('employees').update({ contract_expiry: newDate }).in('id', employeeIds)
      if (error) throw error
      for (const emp of selectedEmployeesData) await logActivity(emp.id, 'تعديل تاريخ انتهاء العقد (جماعي)', { employee_name: emp.name, old_date: emp.contract_expiry, new_date: newDate })
      toast.success(`تم تحديث تاريخ انتهاء العقد لـ ${selectedEmployees.size} موظف`)
      await loadEmployees(); clearSelection(); setShowBulkContractModal(false)
    } catch (error) { logger.error('Error bulk updating contract:', error); toast.error(error instanceof Error ? error.message : 'فشل في تحديث تاريخ انتهاء العقد') }
  }

  const alertsCount = useMemo(() =>
    employees.reduce((count, emp) =>
      count + (hasAlert(emp.contract_expiry, emp.hired_worker_contract_expiry, emp.residence_expiry, emp.health_insurance_expiry, colorThresholds ?? COLOR_THRESHOLD_FALLBACK) ? 1 : 0), 0),
    [employees, colorThresholds])

  const employeeSummaryCards = useMemo(() => {
    const thresholds = colorThresholds ?? COLOR_THRESHOLD_FALLBACK
    const empAlertId = (prefix: 'contract' | 'hired_worker_contract' | 'residence' | 'health_insurance', empId: string, expiry: string | null | undefined) => `${prefix}_${empId}_${expiry ?? ''}`
    const getSev = (days: number | null, u: number, h: number, m: number) => {
      if (days === null || days > m) return 0
      if (days < 0) return 4
      if (days <= u) return 3
      if (days <= h) return 2
      return 1
    }
    let totalAlerts = 0, expiredAlerts = 0, urgentAlerts = 0, highAlerts = 0, mediumAlerts = 0, snoozedEmployees = 0
    for (const employee of employees) {
      const fields = [
        { expiry: employee.contract_expiry, prefix: 'contract' as const, urgentDays: thresholds.contract_urgent_days, highDays: thresholds.contract_high_days, mediumDays: thresholds.contract_medium_days },
        { expiry: employee.hired_worker_contract_expiry, prefix: 'hired_worker_contract' as const, urgentDays: thresholds.hired_worker_contract_urgent_days, highDays: thresholds.hired_worker_contract_high_days, mediumDays: thresholds.hired_worker_contract_medium_days },
        { expiry: employee.residence_expiry, prefix: 'residence' as const, urgentDays: thresholds.residence_urgent_days, highDays: thresholds.residence_high_days, mediumDays: thresholds.residence_medium_days },
        { expiry: employee.health_insurance_expiry, prefix: 'health_insurance' as const, urgentDays: thresholds.health_insurance_urgent_days, highDays: thresholds.health_insurance_high_days, mediumDays: thresholds.health_insurance_medium_days },
      ]
      let hasSnoozed = false
      const activeSeverities: number[] = []
      for (const field of fields) {
        const rawSev = getSev(getDaysRemaining(field.expiry), field.urgentDays, field.highDays, field.mediumDays)
        if (rawSev === 0) continue
        const alertId = empAlertId(field.prefix, employee.id, field.expiry)
        if (snoozedAlertIds.has(alertId)) { hasSnoozed = true }
        else { activeSeverities.push(rawSev) }
      }
      if (hasSnoozed) snoozedEmployees++
      const highestActive = activeSeverities.length > 0 ? Math.max(...activeSeverities) : 0
      if (highestActive === 0) continue
      totalAlerts++
      if (highestActive === 4) expiredAlerts++
      else if (highestActive === 3) urgentAlerts++
      else if (highestActive === 2) highAlerts++
      else mediumAlerts++
    }
    const minU = Math.min(thresholds.residence_urgent_days, thresholds.contract_urgent_days, thresholds.health_insurance_urgent_days, thresholds.hired_worker_contract_urgent_days)
    const maxU = Math.max(thresholds.residence_urgent_days, thresholds.contract_urgent_days, thresholds.health_insurance_urgent_days, thresholds.hired_worker_contract_urgent_days)
    const minH = Math.min(thresholds.residence_high_days, thresholds.contract_high_days, thresholds.health_insurance_high_days, thresholds.hired_worker_contract_high_days)
    const maxH = Math.max(thresholds.residence_high_days, thresholds.contract_high_days, thresholds.health_insurance_high_days, thresholds.hired_worker_contract_high_days)
    const maxM = Math.max(thresholds.residence_medium_days, thresholds.contract_medium_days, thresholds.health_insurance_medium_days, thresholds.hired_worker_contract_medium_days)
    return [
      { key: 'employees', title: 'إجمالي الموظفين', value: employees.length, label: '', accentClass: '', valueClass: 'text-foreground dark:text-white' },
      { key: 'total', title: 'إجمالي التنبيهات', value: totalAlerts, label: 'الموظفون الذين لديهم تنبيه واحد على الأقل', accentClass: 'border-rose-500/20 bg-rose-500/5', valueClass: 'text-rose-600 dark:text-rose-300' },
      { key: 'expired', title: 'منتهي', value: expiredAlerts, label: 'أقل من 0 يوم', accentClass: 'border-red-500/20 bg-red-500/5', valueClass: 'text-red-600 dark:text-red-300' },
      { key: 'urgent', title: 'طارئ', value: urgentAlerts, label: `0 - ${maxU} يوم`, accentClass: 'border-red-500/20 bg-red-500/5', valueClass: 'text-red-600 dark:text-red-300' },
      { key: 'high', title: 'عاجل', value: highAlerts, label: `${minU + 1} - ${maxH} يوم`, accentClass: 'border-orange-500/20 bg-orange-500/5', valueClass: 'text-orange-600 dark:text-orange-300' },
      { key: 'medium', title: 'متوسط', value: mediumAlerts, label: `${minH + 1} - ${maxM} يوم`, accentClass: 'border-yellow-500/20 bg-yellow-500/5', valueClass: 'text-yellow-600 dark:text-yellow-300' },
      { key: 'snoozed', title: 'مؤجلة', value: snoozedEmployees, label: '', accentClass: 'border-amber-500/20 bg-amber-500/5', valueClass: 'text-amber-600 dark:text-amber-300' },
    ]
  }, [employees, colorThresholds, snoozedAlertIds])

  const employeeTableThresholds = colorThresholds ?? COLOR_THRESHOLD_FALLBACK

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDirection('asc') }
  }

  // Virtual grid
  const gridContainerRef = useRef<HTMLDivElement>(null)
  const [gridColumnsCount, setGridColumnsCount] = useState(6)
  useEffect(() => {
    const el = gridContainerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      if (w >= 1200) setGridColumnsCount(6)
      else if (w >= 1000) setGridColumnsCount(5)
      else if (w >= 780) setGridColumnsCount(4)
      else if (w >= 560) setGridColumnsCount(3)
      else if (w >= 360) setGridColumnsCount(2)
      else setGridColumnsCount(1)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const gridRowCount = Math.ceil(sortedAndFilteredEmployees.length / gridColumnsCount)
  const gridVirtualizer = useWindowVirtualizer({
    count: viewMode === 'grid' ? gridRowCount : 0,
    estimateSize: () => 165,
    overscan: 2,
    scrollMargin: gridContainerRef.current?.offsetTop ?? 0,
  })

  // Arrow key navigation
  useEffect(() => {
    if (isCardOpen || isAddModalOpen || showDeleteSummaryModal || showBulkDeleteModal || showFiltersModal) return
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return
      const list = sortedAndFilteredEmployees
      if (list.length === 0) return
      let newIndex: number | null = selectedRowIndex
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); newIndex = selectedRowIndex === null ? 0 : Math.min(selectedRowIndex + 1, list.length - 1); break
        case 'ArrowUp': e.preventDefault(); newIndex = selectedRowIndex === null ? list.length - 1 : Math.max(selectedRowIndex - 1, 0); break
        case 'Home': e.preventDefault(); newIndex = 0; break
        case 'End': e.preventDefault(); newIndex = list.length - 1; break
        case 'Enter': e.preventDefault(); if (selectedRowIndex !== null && list[selectedRowIndex]) handleEmployeeClick(list[selectedRowIndex]); return
        default: return
      }
      if (newIndex !== null && newIndex !== selectedRowIndex) {
        setSelectedRowIndex(newIndex)
        setTimeout(() => { const row = rowRefs.current[newIndex]; if (row) row.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, 0)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedRowIndex, sortedAndFilteredEmployees, isCardOpen, isAddModalOpen, showDeleteSummaryModal, showBulkDeleteModal, showFiltersModal, handleEmployeeClick])

  useEffect(() => { setSelectedRowIndex(null) }, [searchTerm, companyFilter, nationalityFilter, professionFilter, projectFilter, contractFilter, residenceFilter, healthInsuranceFilter, cardSeverityFilter, sortField, sortDirection])

  return {
    // Permissions
    canView, canCreate, canEdit, canDelete, hasViewPermission,
    // Data
    employees, loading,
    // Derived lists
    companiesWithIds, nationalities, professions, projects,
    // Modal states
    selectedEmployee, isCardOpen, isAddModalOpen, setIsAddModalOpen,
    showDeleteSummaryModal, setShowDeleteSummaryModal,
    employeeToDelete, setEmployeeToDelete,
    deletePreview, setDeletePreview,
    deletePreviewLoading, deleteConfirmLoading,
    bulkDeletePreview, setBulkDeletePreview, bulkPreviewLoading,
    showBulkDeleteModal, setShowBulkDeleteModal, deletingEmployees,
    showBulkResidenceModal, setShowBulkResidenceModal,
    showBulkInsuranceModal, setShowBulkInsuranceModal,
    showBulkContractModal, setShowBulkContractModal,
    showFiltersModal, setShowFiltersModal,
    showSortDropdown, setShowSortDropdown,
    // Filters (from useEmployeeFilters)
    searchTerm, setSearchTerm, residenceNumberSearch, setResidenceNumberSearch,
    companyFilter, setCompanyFilter, nationalityFilter, setNationalityFilter,
    professionFilter, setProfessionFilter, projectFilter, setProjectFilter,
    contractFilter, setContractFilter, hiredWorkerContractFilter, setHiredWorkerContractFilter,
    residenceFilter, setResidenceFilter, healthInsuranceFilter, setHealthInsuranceFilter,
    contractStatusDocFilter, setContractStatusDocFilter,
    hiredWorkerContractStatusDocFilter, setHiredWorkerContractStatusDocFilter,
    residenceStatusDocFilter, setResidenceStatusDocFilter,
    healthInsuranceStatusDocFilter, setHealthInsuranceStatusDocFilter,
    hasAlertFilter, setHasAlertFilter, showAlertsOnly, setShowAlertsOnly,
    cardSeverityFilter, setCardSeverityFilter,
    sortField, setSortField, sortDirection, setSortDirection,
    filteredEmployees, sortedAndFilteredEmployees, activeFiltersCount, hasActiveFilters,
    clearFilters,
    // View
    viewMode, setViewMode, isMobileView,
    // Computed
    alertsCount, employeeSummaryCards, employeeTableThresholds,
    // Selection
    selectedEmployees, toggleEmployeeSelection, toggleSelectAll, clearSelection,
    // Table refs
    tableRef, rowRefs, selectedRowIndex,
    // Grid
    gridContainerRef, gridColumnsCount, gridRowCount, gridVirtualizer,
    // Handlers
    handleEmployeeClick, handleCloseCard, handleUpdateEmployee, handleDeleteEmployee,
    confirmDeleteEmployee, handleBulkDeleteClick, handleBulkDelete,
    handleBulkUpdateResidence, handleBulkUpdateInsurance, handleBulkUpdateContract,
    handleSort, loadEmployees,
  }
}
