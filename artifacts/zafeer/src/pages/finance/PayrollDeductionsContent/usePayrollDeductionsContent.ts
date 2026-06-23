import { ChangeEvent, useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useLocation } from 'react-router-dom'
import { useModalScrollLock } from '@/hooks/useModalScrollLock'
import { supabase } from '@/lib/supabase'
import { logActivity as writeActivity } from '@/utils/logActivity'
import { toast } from 'sonner'
import { saveAs } from 'file-saver'
import { usePermissions } from '@/utils/permissions'
import { loadXlsx } from '@/utils/lazyXlsx'
import { useCompanies } from '@/hooks/useCompanies'
import { useProjects } from '@/hooks/useProjects'
import {
  useCreatePayrollRun,
  useDeletePayrollRun,
  usePayrollRunEntries,
  usePayrollRunSlips,
  usePayrollRuns,
  useScopedPayrollEmployees,
  useUpsertPayrollEntry,
  useUpdatePayrollRunStatus,
  syncPayrollEntryComponents,
  type ScopedPayrollEmployee,
  type UpsertPayrollEntryInput,
} from '@/hooks/usePayroll'
import {
  useAllObligationsSummary,
  useCreateEmployeeObligationPlan,
  useUpdateObligationPlan,
  useDeleteObligationPlan,
  useEmployeeObligations,
  useUpdateObligationLinePayment,
  useBulkCreatePenaltyPlans,
  type EmployeeObligationPlan,
  type AllObligationsSummaryRow,
} from '@/hooks/useEmployeeObligations'
import { useEmployees, useAllActiveEmployees } from '@/hooks/useEmployees'
import { PayrollEntry, PayrollInputMode, PayrollScopeType, ObligationType } from '@/lib/supabase'
import {
  EMPTY_PAYROLL_OBLIGATION_BREAKDOWN,
  PayrollObligationBreakdown,
  getPayrollComponentBucket,
  getPayrollObligationBreakdownTotal,
  normalizePayrollObligationBreakdown,
} from '@/utils/payrollObligationBuckets'
import {
  calculatePayrollTotals,
  normalizePayrollEntryAmounts,
  roundPayrollAmount,
} from '@/utils/payrollMath'

import {
  type PayrollSearchRow,
  type ObligationInsightRow,
  type PayrollExcelRow,
  type PayrollExcelPreviewRow,
  type DaysImportPreviewRow,
  type ObligationImportRow,
  type PayrollRunSeedRow,
  EMPTY_SCOPED_EMPLOYEES,
  PAYROLL_EXCEL_HEADERS,
  REQUIRED_PAYROLL_EXCEL_FIELDS,
  DAYS_IMPORT_HEADERS,
  OBLIGATION_IMPORT_HEADERS,
} from '../../payroll/payrollTypes'
import {
  buildPayrollRunSeedRow,
  normalizePayrollExcelHeader,
  normalizeResidenceNumber,
  toNumericPayrollValue,
  parseObligationStartMonth,
} from '../../payroll/payrollExcelUtils'
import {
  getPayrollStatusText,
  getPayrollInputModeText,
  formatPayrollMonthLabel,
  sanitizePayrollFileName,
  getPayrollScopeName,
  getPayrollRunDisplayName,
  buildPayrollExportWorkbook,
} from './payrollDeductionsHelpers'
import { buildSlipHtml, captureSlip, loadBengaliFont, type SlipData } from '@/utils/payslipBengali'

export function usePayrollDeductionsContent({
  defaultTab = 'search',
  hideTabBar = false,
}: {
  defaultTab?: 'search' | 'runs' | 'obligations'
  hideTabBar?: boolean
} = {}) {
  const { canEdit, canDelete, canCreate, canExport, canView, isAdmin } = usePermissions()
  const [activePageTab, setActivePageTab] = useState<'search' | 'runs' | 'obligations'>(defaultTab)
  const [obligationsSearchQuery, setObligationsSearchQuery] = useState('')
  const [obligationsProjectFilter, setObligationsProjectFilter] = useState('')
  const [obligationsTypeFilter, setObligationsTypeFilter] = useState<
    Array<'transfer' | 'renewal' | 'penalty' | 'advance' | 'other'>
  >([])
  const [obligationsDateFrom, setObligationsDateFrom] = useState('')
  const [obligationsDateTo, setObligationsDateTo] = useState('')
  const [showExportObligationsDialog, setShowExportObligationsDialog] = useState(false)
  const [exportScope, setExportScope] = useState<'filtered' | 'all'>('filtered')
  const [exportTypes, setExportTypes] = useState({
    transfer: true, renewal: true, penalty: true, advance: true, other: true,
  })
  const [exportColumns, setExportColumns] = useState({
    employee_name: true,
    residence_number: true,
    project: true,
    company: true,
    total_amount: true,
    total_paid: true,
    per_type: true,
    total_remaining: true,
    monthly_installments: true,
  })
  const [showAddObligationDialog, setShowAddObligationDialog] = useState(false)
  const [addObligationEmployeeSearch, setAddObligationEmployeeSearch] = useState('')
  const [addObligationSelectedEmployeeId, setAddObligationSelectedEmployeeId] = useState('')
  const [addObligationForm, setAddObligationForm] = useState({
    obligation_type: 'advance' as 'transfer' | 'renewal' | 'penalty' | 'advance' | 'other',
    total_amount: 0,
    installment_count: 1,
    start_month: new Date().toISOString().slice(0, 7),
    notes: '',
  })
  const [addObligationStartMonthConflict, setAddObligationStartMonthConflict] = useState(false)
  const [checkingAddObligationMonth, setCheckingAddObligationMonth] = useState(false)
  const [editingDetailPlanId, setEditingDetailPlanId] = useState<string | null>(null)
  const [editDetailPlanForm, setEditDetailPlanForm] = useState<{
    obligation_type: 'transfer' | 'renewal' | 'penalty' | 'advance' | 'other'
    title: string
    total_amount: number
    notes: string
  }>({ obligation_type: 'advance', title: '', total_amount: 0, notes: '' })
  const [deletingDetailPlanId, setDeletingDetailPlanId] = useState<string | null>(null)
  const [exportingObligations, setExportingObligations] = useState(false)
  // Obligation detail/edit modal
  const [obligationDetailEmployeeId, setObligationDetailEmployeeId] = useState<string | null>(null)
  const [editingObligationLineId, setEditingObligationLineId] = useState<string | null>(null)
  const [obligationPaymentForm, setObligationPaymentForm] = useState({
    amount_paid: 0,
    notes: '',
  })
  const [showPayrollRunForm, setShowPayrollRunForm] = useState(false)
  const [showPayrollEntryForm, setShowPayrollEntryForm] = useState(false)
  const [showPayrollRunDetailsModal, setShowPayrollRunDetailsModal] = useState(false)
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<Array<'bank' | 'cash'>>([])
  const [selectedPayrollRunId, setSelectedPayrollRunId] = useState<string | null>(null)
  const [selectedPayrollSlipEntryId, setSelectedPayrollSlipEntryId] = useState<string | null>(null)
  const [payrollSearchQuery, setPayrollSearchQuery] = useState('')
  const [payrollSearchMonth, setPayrollSearchMonth] = useState('')
  const [payrollSearchProject, setPayrollSearchProject] = useState('')
  const [payrollSearchSortField, setPayrollSearchSortField] = useState<
    'employee_name' | 'residence' | 'project' | 'month' | 'status' | 'deductions' | 'remaining' | 'net_amount'
  >('employee_name')
  const [payrollSearchSortDirection, setPayrollSearchSortDirection] = useState<'asc' | 'desc'>('asc')
  const [payrollRunStatsMonth, setPayrollRunStatsMonth] = useState('')
  const [payrollRunStatsRunId, setPayrollRunStatsRunId] = useState('')
  const [allPayrollSearchRows, setAllPayrollSearchRows] = useState<PayrollSearchRow[]>([])
  const [obligationInsightRows, setObligationInsightRows] = useState<ObligationInsightRow[]>([])
  const [payrollInsightsLoading, setPayrollInsightsLoading] = useState(false)
  const [importingPayrollExcel, setImportingPayrollExcel] = useState(false)
  const [confirmingPayrollExcelImport, setConfirmingPayrollExcelImport] = useState(false)
  const [payrollImportErrors, setPayrollImportErrors] = useState<string[]>([])
  const [payrollImportHeaderError, setPayrollImportHeaderError] = useState<string | null>(null)
  const [payrollImportPreviewRows, setPayrollImportPreviewRows] = useState<
    PayrollExcelPreviewRow[]
  >([])
  const [payrollImportFileName, setPayrollImportFileName] = useState<string>('')
  const [importingDaysExcel, setImportingDaysExcel] = useState(false)
  const [confirmingDaysImport, setConfirmingDaysImport] = useState(false)
  const [daysImportPreviewRows, setDaysImportPreviewRows] = useState<DaysImportPreviewRow[]>([])
  const [daysImportFileName, setDaysImportFileName] = useState('')
  const [daysImportErrors, setDaysImportErrors] = useState<string[]>([])
  const [selectedPayrollExportRunIds, setSelectedPayrollExportRunIds] = useState<string[]>([])
  const [exportingSelectedPayrollRuns, setExportingSelectedPayrollRuns] = useState(false)
  const [payrollRunDeleteConfirmOpen, setPayrollRunDeleteConfirmOpen] = useState(false)
  const [showObligationImportDialog, setShowObligationImportDialog] = useState(false)
  const [obligationImportStep, setObligationImportStep] = useState<'upload' | 'review'>('upload')
  const [obligationImportRows, setObligationImportRows] = useState<ObligationImportRow[]>([])
  const [importingObligations, setImportingObligations] = useState(false)
  const [obligationImportFileName, setObligationImportFileName] = useState('')
  const [obligationImportHeaderError, setObligationImportHeaderError] = useState<string | null>(null)
  const obligationImportFileRef = useRef<HTMLInputElement | null>(null)
  const payrollSlipPreviewRef = useRef<HTMLDivElement | null>(null)
  const [showBulkPenaltyDialog, setShowBulkPenaltyDialog] = useState(false)
  const [bulkPenaltySearch, setBulkPenaltySearch] = useState('')
  const [bulkPenaltySelectedIds, setBulkPenaltySelectedIds] = useState<Set<string>>(new Set())
  const [bulkPenaltyAmount, setBulkPenaltyAmount] = useState(0)
  const [bulkPenaltyMonth, setBulkPenaltyMonth] = useState(new Date().toISOString().slice(0, 7))
  const [bulkPenaltyNotes, setBulkPenaltyNotes] = useState('')
  const [confirmingBulkPenalty, setConfirmingBulkPenalty] = useState(false)
  const [downloadingSlipPdf, setDownloadingSlipPdf] = useState(false)

  // قفل التمرير عند فتح أي مودال
  const isAnyPayrollModalOpen =
    showPayrollRunDetailsModal ||
    showPayrollRunForm ||
    showAddObligationDialog ||
    !!editingDetailPlanId ||
    !!deletingDetailPlanId ||
    payrollRunDeleteConfirmOpen ||
    !!selectedPayrollSlipEntryId ||
    showExportObligationsDialog ||
    showObligationImportDialog ||
    showBulkPenaltyDialog
  useModalScrollLock(isAnyPayrollModalOpen)
  const payrollExcelInputRef = useRef<HTMLInputElement | null>(null)
  const daysExcelInputRef = useRef<HTMLInputElement | null>(null)
  const payrollEntryFormRef = useRef<HTMLDivElement | null>(null)
  const hasInitializedPayrollRunSelectionRef = useRef(false)
  const [payrollForm, setPayrollForm] = useState({
    payroll_month: new Date().toISOString().slice(0, 7),
    scope_type: 'company' as PayrollScopeType,
    scope_id: '',
    input_mode: 'manual' as PayrollInputMode,
    notes: '',
  })
  const [newPayrollRunRows, setNewPayrollRunRows] = useState<PayrollRunSeedRow[]>([])
  const [payrollEntryForm, setPayrollEntryForm] = useState({
    employee_id: '',
    attendance_days: 30,
    paid_leave_days: 0,
    basic_salary_snapshot: 0,
    overtime_amount: 0,
    transfer_renewal_amount: 0,
    penalty_amount: 0,
    advance_amount: 0,
    other_amount: 0,
    deductions_amount: 0,
    installment_deducted_amount: 0,
    overtime_notes: '',
    deductions_notes: '',
    notes: '',
  })
  const { data: companies = [] } = useCompanies()
  const { data: projects = [] } = useProjects()

  // wrappers — close over companies/projects
  const getScopeName = (scopeType: PayrollScopeType, scopeId: string) =>
    getPayrollScopeName(scopeType, scopeId, companies, projects)
  const getRunDisplayName = (scopeType: PayrollScopeType, scopeId: string, payrollMonth: string) =>
    getPayrollRunDisplayName(scopeType, scopeId, payrollMonth, companies, projects)

  const {
    data: payrollRuns = [],
    isLoading: payrollRunsLoading,
    refetch: refetchPayrollRuns,
  } = usePayrollRuns()
  const {
    data: payrollEntries = [],
    isLoading: payrollEntriesLoading,
    refetch: refetchPayrollEntries,
  } = usePayrollRunEntries(selectedPayrollRunId ?? undefined)
  const { data: payrollSlips = [], refetch: refetchPayrollSlips } = usePayrollRunSlips(
    selectedPayrollRunId ?? undefined
  )
  const queryClient = useQueryClient()
  const createPayrollRun = useCreatePayrollRun()
  const upsertPayrollEntry = useUpsertPayrollEntry()
  const updatePayrollRunStatus = useUpdatePayrollRunStatus()
  const deletePayrollRun = useDeletePayrollRun()
  const createObligationPlan = useCreateEmployeeObligationPlan()
  const bulkCreatePenaltyPlans = useBulkCreatePenaltyPlans()
  const updateObligationPlan = useUpdateObligationPlan()
  const deleteObligationPlan = useDeleteObligationPlan()
  const updateObligationLinePayment = useUpdateObligationLinePayment()
  const { data: allObligationsSummary = [], isLoading: obligationsLoading, refetch: refetchObligations } =
    useAllObligationsSummary()
  const { data: allEmployees = [] } = useEmployees()
  const { data: allActiveEmployees = [] } = useAllActiveEmployees()

  // Fetch obligation plans for the employee currently open in the detail modal
  const { data: detailObligationPlans = [], isLoading: detailObligationsLoading } =
    useEmployeeObligations(obligationDetailEmployeeId ?? undefined)

  const payrollRunList = payrollRuns
  const selectedPayrollRun = payrollRunList.find((run) => run.id === selectedPayrollRunId) ?? null
  const normalizedPayrollFormMonth = payrollForm.payroll_month
    ? `${payrollForm.payroll_month}-01`
    : undefined
  const { data: payrollRunSeedEmployees = EMPTY_SCOPED_EMPLOYEES, isLoading: payrollRunSeedEmployeesLoading } =
    useScopedPayrollEmployees(
      payrollForm.scope_type,
      payrollForm.scope_id || undefined,
      normalizedPayrollFormMonth
    )
  const { data: scopedPayrollEmployees = EMPTY_SCOPED_EMPLOYEES, isLoading: scopedEmployeesLoading } =
    useScopedPayrollEmployees(
      selectedPayrollRun?.scope_type,
      selectedPayrollRun?.scope_id,
      selectedPayrollRun?.payroll_month
    )
  const scopeOptions = payrollForm.scope_type === 'company' ? companies : projects
  const selectedPayrollEmployee =
    scopedPayrollEmployees.find((employee) => employee.id === payrollEntryForm.employee_id) ?? null
  const selectedNewPayrollRunRows = useMemo(
    () => newPayrollRunRows.filter((row) => row.included),
    [newPayrollRunRows]
  )
  const allNewPayrollRunRowsSelected =
    newPayrollRunRows.length > 0 && selectedNewPayrollRunRows.length === newPayrollRunRows.length
  // Set of employee IDs currently returned by the scope query — used to flag stale/out-of-scope rows
  const seedEmployeeIds = useMemo(
    () => new Set(payrollRunSeedEmployees.map((e) => e.id)),
    [payrollRunSeedEmployees]
  )
  const payrollSlipEntryIds = useMemo(
    () => new Set(payrollSlips.map((slip) => slip.payroll_entry_id)),
    [payrollSlips]
  )
  const selectedPayrollSlip =
    payrollSlips.find((slip) => slip.payroll_entry_id === selectedPayrollSlipEntryId) ?? null
  const baseSalary = Number(
    payrollEntryForm.basic_salary_snapshot || selectedPayrollEmployee?.salary || 0
  )
  const deductionBreakdown = normalizePayrollObligationBreakdown({
    transfer_renewal: payrollEntryForm.transfer_renewal_amount,
    penalty: payrollEntryForm.penalty_amount,
    advance: payrollEntryForm.advance_amount,
    other: payrollEntryForm.other_amount,
  })
  const groupedDeductionsTotal = getPayrollObligationBreakdownTotal(deductionBreakdown)
  const { dailyRate, grossAmount, netAmount } = calculatePayrollTotals(
    baseSalary,
    payrollEntryForm.attendance_days,
    payrollEntryForm.paid_leave_days,
    payrollEntryForm.overtime_amount,
    groupedDeductionsTotal
  )
  const selectedPayrollRunEditable = Boolean(
    selectedPayrollRun &&
      selectedPayrollRun.status !== 'finalized' &&
      selectedPayrollRun.status !== 'cancelled'
  )
  const selectedSlipSnapshot = selectedPayrollSlip?.snapshot_data as
    | {
        payroll_run?: Record<string, unknown>
        payroll_entry?: Partial<PayrollEntry>
        components?: Array<{
          component_type?: string
          component_code?: string
          amount?: number
          notes?: string | null
        }>
      }
    | undefined
  const selectedSlipEntry = selectedSlipSnapshot?.payroll_entry
  // Fetch obligation plans for the currently selected payslip employee (for PDF export)
  const { data: slipEmployeeObligationPlans = [] } =
    useEmployeeObligations(selectedSlipEntry?.employee_id ?? undefined)
  const selectedSlipComponents = Array.isArray(selectedSlipSnapshot?.components)
    ? selectedSlipSnapshot.components
    : []
  const selectedSlipTotals = selectedSlipEntry
    ? normalizePayrollEntryAmounts(selectedSlipEntry as Partial<PayrollEntry>)
    : null
  const payrollEntryBreakdownById = useMemo(
    () => new Map(allPayrollSearchRows.map((row) => [row.id, row.deduction_breakdown])),
    [allPayrollSearchRows]
  )

  const hasPayrollViewPermission = canView('payroll')

  // ─── Obligations Tab: filtered rows ───────────────────────────────────────
  const filteredObligationsSummary = useMemo((): AllObligationsSummaryRow[] => {
    let result = allObligationsSummary

    // فلتر البحث النصي
    const q = obligationsSearchQuery.trim().toLowerCase()
    if (q) {
      result = result.filter(
        (row) =>
          row.employee_name.toLowerCase().includes(q) ||
          row.residence_number.includes(q) ||
          row.project_name.toLowerCase().includes(q) ||
          row.company_name.toLowerCase().includes(q)
      )
    }

    // فلتر المشروع
    if (obligationsProjectFilter) {
      result = result.filter((row) => row.project_id === obligationsProjectFilter)
    }

    // فلتر نوع الالتزام
    if (obligationsTypeFilter.length > 0) {
      result = result.filter((row) =>
        obligationsTypeFilter.some((type) => (row[`${type}_remaining` as keyof AllObligationsSummaryRow] as number) > 0)
      )
    }

    // فلتر الفترة الزمنية — بناءً على min_start_month لكل موظف
    if (obligationsDateFrom) {
      result = result.filter((row) => row.min_start_month != null && row.min_start_month >= obligationsDateFrom)
    }
    if (obligationsDateTo) {
      result = result.filter((row) => row.min_start_month != null && row.min_start_month <= obligationsDateTo)
    }

    return result
  }, [allObligationsSummary, obligationsSearchQuery, obligationsProjectFilter, obligationsTypeFilter, obligationsDateFrom, obligationsDateTo])

  // Employee list for the add-obligation dialog (search by name or residence_number)
  const dialogEmployeeOptions = useMemo(() => {
    const q = addObligationEmployeeSearch.trim().toLowerCase()
    if (!q) return allActiveEmployees.slice(0, 30)
    return allActiveEmployees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(q) ||
        String(emp.residence_number || '').includes(addObligationEmployeeSearch.trim())
    )
  }, [allActiveEmployees, addObligationEmployeeSearch])

  // Check if selected start_month has a finalized payroll run for the selected employee
  useEffect(() => {
    if (!showAddObligationDialog || !addObligationSelectedEmployeeId || !addObligationForm.start_month) {
      setAddObligationStartMonthConflict(false)
      return
    }
    let cancelled = false
    const monthDate = /^\d{4}-\d{2}$/.test(addObligationForm.start_month)
      ? `${addObligationForm.start_month}-01`
      : addObligationForm.start_month
    setCheckingAddObligationMonth(true)
    void (async () => {
      const { data: runs } = await supabase
        .from('payroll_runs')
        .select('id')
        .eq('payroll_month', monthDate)
        .eq('status', 'finalized')
      if (cancelled) return
      if (!runs || runs.length === 0) {
        setAddObligationStartMonthConflict(false)
        setCheckingAddObligationMonth(false)
        return
      }
      const runIds = (runs as { id: string }[]).map((r) => r.id)
      const { data: entries } = await supabase
        .from('payroll_entries')
        .select('id')
        .eq('employee_id', addObligationSelectedEmployeeId)
        .in('payroll_run_id', runIds)
        .limit(1)
      if (!cancelled) {
        setAddObligationStartMonthConflict(!!(entries && entries.length > 0))
        setCheckingAddObligationMonth(false)
      }
    })()
    return () => { cancelled = true }
  }, [showAddObligationDialog, addObligationSelectedEmployeeId, addObligationForm.start_month])

  const handleAddObligation = async () => {
    if (!addObligationSelectedEmployeeId) {
      toast.error('يرجى اختيار موظف أولاً')
      return
    }
    if (addObligationStartMonthConflict) {
      toast.error('لا يمكن بدء الأقساط في شهر تم اعتماد مسيره بالفعل')
      return
    }
    if (addObligationForm.total_amount <= 0) {
      toast.error('يرجى إدخال قيمة الالتزام')
      return
    }
    if (addObligationForm.installment_count <= 0) {
      toast.error('عدد الأقساط يجب أن يكون 1 على الأقل')
      return
    }
    try {
      const perInstallment =
        Math.round((addObligationForm.total_amount / addObligationForm.installment_count) * 100) /
        100
      const amounts = Array.from(
        { length: addObligationForm.installment_count },
        (_, i) =>
          i === addObligationForm.installment_count - 1
            ? Math.round(
                (addObligationForm.total_amount - perInstallment * (addObligationForm.installment_count - 1)) * 100
              ) / 100
            : perInstallment
      )
      const normalizedStartMonth = /^\d{4}-\d{2}$/.test(addObligationForm.start_month)
        ? `${addObligationForm.start_month}-01`
        : addObligationForm.start_month

      await createObligationPlan.mutateAsync({
        employee_id: addObligationSelectedEmployeeId,
        obligation_type: addObligationForm.obligation_type,
        total_amount: addObligationForm.total_amount,
        start_month: normalizedStartMonth,
        installment_amounts: amounts,
        notes: addObligationForm.notes || null,
      })
      toast.success('تم إضافة الالتزام بنجاح')
      setShowAddObligationDialog(false)
      setAddObligationSelectedEmployeeId('')
      setAddObligationEmployeeSearch('')
      setAddObligationForm({
        obligation_type: 'advance',
        total_amount: 0,
        installment_count: 1,
        start_month: new Date().toISOString().slice(0, 7),
        notes: '',
      })
      void refetchObligations()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل إضافة الالتزام'
      toast.error(msg)
    }
  }

  const handleOpenEditDetailPlan = (plan: EmployeeObligationPlan) => {
    setEditingDetailPlanId(plan.id)
    setEditDetailPlanForm({
      obligation_type: plan.obligation_type,
      title: plan.title,
      total_amount: Number(plan.total_amount),
      notes: plan.notes || '',
    })
  }

  const handleUpdateDetailPlan = async () => {
    if (!editingDetailPlanId || !obligationDetailEmployeeId) return
    const plan = detailObligationPlans.find((p) => p.id === editingDetailPlanId)
    if (!plan) return
    const totalAmount = Number(editDetailPlanForm.total_amount)
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح أكبر من صفر')
      return
    }
    try {
      await updateObligationPlan.mutateAsync({
        plan,
        employeeId: obligationDetailEmployeeId,
        updates: {
          obligation_type: editDetailPlanForm.obligation_type,
          title: editDetailPlanForm.title.trim() || editDetailPlanForm.obligation_type,
          total_amount: totalAmount,
          notes: editDetailPlanForm.notes.trim() || null,
        },
      })
      toast.success('تم تعديل الالتزام بنجاح')
      setEditingDetailPlanId(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل تعديل الالتزام')
    }
  }

  const handleDeleteDetailPlan = async () => {
    if (!deletingDetailPlanId || !obligationDetailEmployeeId) return
    try {
      const deletingDetailPlan = detailObligationPlans.find((p) => p.id === deletingDetailPlanId)
      const deletingDetailEmployee = allObligationsSummary.find((r) => r.employee_id === obligationDetailEmployeeId)
      await deleteObligationPlan.mutateAsync({
        planId: deletingDetailPlanId,
        employeeId: obligationDetailEmployeeId,
        employee_name: deletingDetailEmployee?.employee_name,
        residence_number: deletingDetailEmployee?.residence_number,
        obligation_type: deletingDetailPlan?.obligation_type,
        total_amount: deletingDetailPlan?.total_amount,
      })
      toast.success('تم حذف الالتزام بنجاح')
      setDeletingDetailPlanId(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل حذف الالتزام')
    }
  }

  const handleObligationImportFile = async (file: File) => {
    setObligationImportHeaderError(null)
    setObligationImportFileName(file.name)
    try {
      const xlsxModule = await loadXlsx()
      const data = await file.arrayBuffer()
      const workbook = xlsxModule.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const rawRows = xlsxModule.utils.sheet_to_json(sheet, { header: 1, raw: false }) as unknown[][]

      if (rawRows.length < 2) {
        setObligationImportHeaderError('الملف لا يحتوي على بيانات كافية')
        return
      }

      const headerRow = rawRows[0] as unknown[]
      const colMap: Partial<Record<keyof typeof OBLIGATION_IMPORT_HEADERS, number>> = {}
      headerRow.forEach((cell, idx) => {
        const normalized = normalizePayrollExcelHeader(cell)
        for (const [field, aliases] of Object.entries(OBLIGATION_IMPORT_HEADERS)) {
          if ((aliases as readonly string[]).some((a) => normalizePayrollExcelHeader(a) === normalized)) {
            colMap[field as keyof typeof OBLIGATION_IMPORT_HEADERS] = idx
          }
        }
      })

      if (colMap.residence_number === undefined) {
        setObligationImportHeaderError('عمود "رقم الإقامة" مطلوب ولم يُعثر عليه في الملف')
        return
      }

      const empByIqama = new Map<string, { id: string; name: string }>()
      allActiveEmployees.forEach((emp) => {
        const iqama = normalizeResidenceNumber(emp.residence_number)
        if (iqama) empByIqama.set(iqama, { id: emp.id, name: emp.name })
      })

      const defaultStartMonth = new Date().toISOString().slice(0, 7)
      const rows: ObligationImportRow[] = []

      for (let i = 1; i < rawRows.length; i++) {
        const row = rawRows[i] as unknown[]
        const residenceRaw = colMap.residence_number !== undefined ? row[colMap.residence_number] : ''
        const residence = normalizeResidenceNumber(residenceRaw)
        if (!residence) continue

        const resolved = empByIqama.get(residence) ?? null
        const advanceAmt = colMap.advance_amount !== undefined ? toNumericPayrollValue(row[colMap.advance_amount]) : 0
        const transferAmt = colMap.transfer_amount !== undefined ? toNumericPayrollValue(row[colMap.transfer_amount]) : 0
        const renewalAmt = colMap.renewal_amount !== undefined ? toNumericPayrollValue(row[colMap.renewal_amount]) : 0
        const penaltyAmt = colMap.penalty_amount !== undefined ? toNumericPayrollValue(row[colMap.penalty_amount]) : 0
        const otherAmt = colMap.other_amount !== undefined ? toNumericPayrollValue(row[colMap.other_amount]) : 0
        const installmentsRaw = colMap.installments !== undefined ? row[colMap.installments] : undefined
        const numInstallments = installmentsRaw !== undefined
          ? Math.max(1, Math.min(60, Math.floor(toNumericPayrollValue(installmentsRaw))))
          : 1
        const startMonthRaw = colMap.start_month !== undefined ? row[colMap.start_month] : undefined
        const resolvedStartMonth = startMonthRaw !== undefined
          ? parseObligationStartMonth(startMonthRaw, defaultStartMonth)
          : defaultStartMonth
        rows.push({
          row_number: i,
          employee_name_from_file:
            colMap.employee_name !== undefined
              ? String(row[colMap.employee_name] ?? '').trim()
              : '',
          residence_number: residence,
          notes: colMap.notes !== undefined ? String(row[colMap.notes] ?? '').trim() : '',
          employee_id: resolved?.id ?? null,
          employee_name: resolved?.name ?? null,
          selected: resolved !== null,
          advance_amount: advanceAmt,
          advance_installments: numInstallments,
          advance_start_month: resolvedStartMonth,
          transfer_amount: transferAmt,
          transfer_installments: numInstallments,
          transfer_start_month: resolvedStartMonth,
          renewal_amount: renewalAmt,
          renewal_installments: numInstallments,
          renewal_start_month: resolvedStartMonth,
          penalty_amount: penaltyAmt,
          penalty_installments: numInstallments,
          penalty_start_month: resolvedStartMonth,
          other_amount: otherAmt,
          other_installments: numInstallments,
          other_start_month: resolvedStartMonth,
        })
      }

      if (rows.length === 0) {
        setObligationImportHeaderError('لم يُعثر على صفوف قابلة للاستيراد في الملف')
        return
      }

      setObligationImportRows(rows)
      setObligationImportStep('review')
    } catch (err) {
      console.error(err)
      setObligationImportHeaderError('حدث خطأ أثناء قراءة الملف. تأكد من أن الملف بتنسيق Excel أو CSV')
    }
  }

  const handleConfirmBulkPenalty = async () => {
    if (bulkPenaltySelectedIds.size === 0) {
      toast.warning('لم يتم تحديد أي موظفين')
      return
    }
    if (bulkPenaltyAmount <= 0) {
      toast.warning('مبلغ الغرامة يجب أن يكون أكبر من صفر')
      return
    }
    if (!bulkPenaltyMonth) {
      toast.warning('شهر الاستقطاع مطلوب')
      return
    }
    setConfirmingBulkPenalty(true)
    const normalizedMonth = `${bulkPenaltyMonth}-01`
    try {
      const result = await bulkCreatePenaltyPlans.mutateAsync(
        Array.from(bulkPenaltySelectedIds).map((employee_id) => ({
          employee_id,
          total_amount: bulkPenaltyAmount,
          start_month: normalizedMonth,
          notes: bulkPenaltyNotes || null,
        }))
      )
      if (result.success_count > 0) {
        toast.success(`تم إنشاء الغرامة لـ ${result.success_count} موظف بنجاح`)
        refetchObligations()
        setShowBulkPenaltyDialog(false)
        setBulkPenaltySelectedIds(new Set())
        setBulkPenaltyAmount(0)
        setBulkPenaltyNotes('')
        setBulkPenaltySearch('')
      }
      if (result.error_count > 0) {
        toast.error(`فشل إنشاء الغرامة لـ ${result.error_count} موظف`)
      }
    } catch {
      toast.error('حدث خطأ أثناء إنشاء الغرامات. يرجى المحاولة مجدداً')
    } finally {
      setConfirmingBulkPenalty(false)
    }
  }

  const handleConfirmObligationImport = async () => {
    const selectedRows = obligationImportRows.filter((r) => r.selected && r.employee_id)
    if (selectedRows.length === 0) {
      toast.warning('لم يتم تحديد أي صفوف للاستيراد')
      return
    }
    setImportingObligations(true)

    const OBLIGATION_TYPE_LABELS: Record<string, string> = {
      advance: 'سلفة', transfer: 'نقل كفالة', renewal: 'تجديد', penalty: 'غرامة', other: 'التزام آخر',
    }

    type ObligationTask = {
      employee_id: string
      employee_name: string
      type: 'advance' | 'transfer' | 'renewal' | 'penalty' | 'other'
      amount: number
      installment_amounts: number[]
      start_month: string
      notes: string | null
    }

    // جمع كل المهام أولاً بدون تنفيذ
    const tasks: ObligationTask[] = []
    let validationErrorCount = 0

    for (const row of selectedRows) {
      if (!row.employee_id) continue
      const typeDefs = [
        row.advance_amount > 0 && { type: 'advance' as const, amount: row.advance_amount, installments: row.advance_installments, start_month: row.advance_start_month },
        row.transfer_amount > 0 && { type: 'transfer' as const, amount: row.transfer_amount, installments: row.transfer_installments, start_month: row.transfer_start_month },
        row.renewal_amount > 0 && { type: 'renewal' as const, amount: row.renewal_amount, installments: row.renewal_installments, start_month: row.renewal_start_month },
        row.penalty_amount > 0 && { type: 'penalty' as const, amount: row.penalty_amount, installments: row.penalty_installments, start_month: row.penalty_start_month },
        row.other_amount > 0 && { type: 'other' as const, amount: row.other_amount, installments: row.other_installments, start_month: row.other_start_month },
      ].filter(Boolean) as Array<{ type: 'advance' | 'transfer' | 'renewal' | 'penalty' | 'other'; amount: number; installments: number; start_month: string }>

      for (const def of typeDefs) {
        if (!def.start_month) {
          toast.warning(`شهر البداية مطلوب للموظف ${row.employee_name ?? row.residence_number} (${def.type})`)
          validationErrorCount++
          continue
        }
        const count = Math.max(1, def.installments)
        const baseHalalas = Math.floor((def.amount * 100) / count)
        const installmentAmounts: number[] = Array(count).fill(baseHalalas / 100) as number[]
        const remainder = Math.round(def.amount * 100 - baseHalalas * count)
        if (remainder !== 0) {
          installmentAmounts[count - 1] = Math.round((installmentAmounts[count - 1] + remainder / 100) * 100) / 100
        }
        tasks.push({
          employee_id: row.employee_id!,
          employee_name: row.employee_name ?? String(row.residence_number),
          type: def.type,
          amount: def.amount,
          installment_amounts: installmentAmounts,
          start_month: def.start_month.length === 7 ? `${def.start_month}-01` : def.start_month,
          notes: row.notes || null,
        })
      }
    }

    // تنفيذ كل الـ RPC calls بالتوازي — بدل الطابور التسلسلي
    const rpcResults = await Promise.allSettled(
      tasks.map((task) =>
        supabase
          .rpc('create_employee_obligation_plan', {
            p_employee_id: task.employee_id,
            p_obligation_type: task.type,
            p_title: OBLIGATION_TYPE_LABELS[task.type] ?? task.type,
            p_total_amount: task.amount,
            p_currency_code: 'SAR',
            p_start_month: task.start_month,
            p_installment_amounts: task.installment_amounts,
            p_status: 'active',
            p_notes: task.notes,
          })
          .single()
      )
    )

    const successCount = rpcResults.filter((r) => r.status === 'fulfilled').length
    const errorCount = rpcResults.filter((r) => r.status === 'rejected').length + validationErrorCount

    // إدخال سجل النشاط دفعة واحدة للالتزامات الناجحة
    const successfulTasks = tasks.filter((_, i) => rpcResults[i]?.status === 'fulfilled')
    if (successfulTasks.length > 0) {
      try {
        // bulk insert مقصود للأداء (صف لكل التزام). الفاعل يُختم تلقائياً
        // بالـ DB trigger على كل صف — لا حاجة لتمرير user_id. راجع migration 074.
        await supabase.from('activity_log').insert(
          successfulTasks.map((task) => ({
            entity_type: 'obligation',
            action: 'إنشاء التزام',
            details: {
              employee_name: task.employee_name,
              obligation_type: OBLIGATION_TYPE_LABELS[task.type] ?? task.type,
              amount: task.amount,
            },
          }))
        )
      } catch { /* non-blocking */ }
    }

    // تحديث الشاشة مرة واحدة فقط بدل N تحديث
    const affectedEmployeeIds = [...new Set(successfulTasks.map((t) => t.employee_id))]
    for (const empId of affectedEmployeeIds) {
      queryClient.invalidateQueries({ queryKey: ['employee-obligations', empId] })
    }
    if (successfulTasks.length > 0) {
      queryClient.invalidateQueries({ queryKey: ['all-obligations-summary'] })
    }

    setImportingObligations(false)
    if (successCount > 0) {
      toast.success(`تم استيراد ${successCount} خطة التزام بنجاح`)
      refetchObligations()
      setShowObligationImportDialog(false)
      setObligationImportStep('upload')
      setObligationImportRows([])
      setObligationImportFileName('')
    }
    if (errorCount > 0) {
      toast.error(`فشل إنشاء ${errorCount} خطة التزام`)
    }
  }

  const exportObligationsToExcel = async (
    scope: 'filtered' | 'all' = 'filtered',
    typesFilter: { transfer: boolean; renewal: boolean; penalty: boolean; advance: boolean; other: boolean } = { transfer: true, renewal: true, penalty: true, advance: true, other: true },
    colFilter: { employee_name: boolean; residence_number: boolean; project: boolean; company: boolean; total_amount: boolean; total_paid: boolean; per_type: boolean; total_remaining: boolean; monthly_installments: boolean } = { employee_name: true, residence_number: true, project: true, company: true, total_amount: true, total_paid: true, per_type: true, total_remaining: true, monthly_installments: true }
  ) => {
    const sourceRows = scope === 'all' ? allObligationsSummary : filteredObligationsSummary
    if (sourceRows.length === 0) {
      toast.warning('لا توجد بيانات التزامات للتصدير')
      return
    }
    try {
      setExportingObligations(true)
      const XLSX = await loadXlsx()
      const employeeIds = sourceRows.map((row) => row.employee_id)
      const monthSet = new Set<string>()
      const monthlyDueByEmployee = new Map<string, Map<string, number>>()

      const { data: obligationHeaders, error: obligationHeadersError } = await supabase
        .from('employee_obligation_headers')
        .select('id,employee_id,status,total_amount')
        .in('employee_id', employeeIds)
        .in('status', ['active', 'draft'])

      if (obligationHeadersError) {
        throw obligationHeadersError
      }

      const typedHeaders =
        (obligationHeaders ?? []) as Array<{
          id: string
          employee_id: string
          status: string
          total_amount: number
        }>
      const headerIds = typedHeaders.map((header) => header.id)

      if (headerIds.length > 0) {
        const { data: obligationLines, error: obligationLinesError } = await supabase
          .from('employee_obligation_lines')
          .select('header_id,employee_id,due_month,amount_due,amount_paid')
          .in('header_id', headerIds)

        if (obligationLinesError) {
          throw obligationLinesError
        }

        const typedLines = (obligationLines ?? []) as Array<{
          header_id: string
          employee_id: string
          due_month: string
          amount_due: number
          amount_paid: number
        }>

        for (const line of typedLines) {
          const monthKey = line.due_month?.slice(0, 7)
          if (!monthKey) continue
          monthSet.add(monthKey)

          const employeeMonthMap =
            monthlyDueByEmployee.get(line.employee_id) ?? new Map<string, number>()
          employeeMonthMap.set(
            monthKey,
            (employeeMonthMap.get(monthKey) ?? 0) + Number(line.amount_due || 0)
          )
          monthlyDueByEmployee.set(line.employee_id, employeeMonthMap)
        }
      }

      const sortedMonths = Array.from(monthSet).sort((a, b) => a.localeCompare(b))

      // بناء الأعمدة ديناميكياً بناءً على الأنواع المختارة
      const allTypeColumns: { header: string; key: ObligationType }[] = [
        { header: 'نقل كفالة (المتبقي)', key: 'transfer' },
        { header: 'تجديد (المتبقي)', key: 'renewal' },
        { header: 'جزاءات (المتبقي)', key: 'penalty' },
        { header: 'سلف (المتبقي)', key: 'advance' },
        { header: 'أخرى (المتبقي)', key: 'other' },
      ]
      const typeColumns = allTypeColumns.filter((c) => typesFilter[c.key])

      // بناء الأعمدة ديناميكياً بناءً على اختيار الأعمدة
      const headerDefs: { label: string; getValue: (row: AllObligationsSummaryRow) => unknown }[] = []
      if (colFilter.employee_name) headerDefs.push({ label: 'اسم الموظف', getValue: (r) => r.employee_name })
      if (colFilter.residence_number) headerDefs.push({ label: 'رقم الإقامة', getValue: (r) => r.residence_number })
      if (colFilter.project) headerDefs.push({ label: 'المشروع', getValue: (r) => r.project_name })
      if (colFilter.company) headerDefs.push({ label: 'المؤسسة', getValue: (r) => r.company_name })
      if (colFilter.total_amount) headerDefs.push({ label: 'إجمالي الالتزامات', getValue: (r) => r.total_amount })
      if (colFilter.total_paid) headerDefs.push({ label: 'المدفوع', getValue: (r) => r.total_paid })
      if (colFilter.per_type) {
        typeColumns.forEach((c) => {
          headerDefs.push({ label: c.header, getValue: (r) => r[`${c.key}_remaining` as keyof AllObligationsSummaryRow] as number })
        })
      }
      if (colFilter.total_remaining) headerDefs.push({ label: 'إجمالي المتبقي', getValue: (r) => r.total_remaining })
      if (colFilter.monthly_installments) {
        sortedMonths.forEach((month) => {
          headerDefs.push({ label: `قسط ${month}`, getValue: (r) => monthlyDueByEmployee.get(r.employee_id)?.get(month) ?? 0 })
        })
      }

      const headers = headerDefs.map((d) => d.label)
      const rows = sourceRows.map((row) => headerDefs.map((d) => d.getValue(row)))
      const worksheet = XLSX.utils.aoa_to_sheet([
        ['قائمة الالتزامات والاستقطاعات'],
        [`تاريخ التصدير: ${new Date().toLocaleString('ar-EG')}`],
        [],
        headers,
        ...rows,
      ])
      const lastColumnIndex = headers.length - 1
      worksheet['!cols'] = headerDefs.map((d) =>
        d.label.startsWith('قسط') ? { wch: 14 } :
        d.label === 'اسم الموظف' ? { wch: 24 } :
        d.label === 'رقم الإقامة' ? { wch: 16 } :
        d.label === 'المشروع' || d.label === 'المؤسسة' ? { wch: 20 } :
        { wch: 18 }
      )
      worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: lastColumnIndex } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: lastColumnIndex } },
      ]
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Obligations')
      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      saveAs(blob, `obligations_${new Date().toISOString().slice(0, 10)}.xlsx`)
      toast.success('تم تصدير قائمة الالتزامات بنجاح')
    } catch (err) {
      console.error(err)
      toast.error('فشل تصدير الالتزامات')
    } finally {
      setExportingObligations(false)
    }
  }

  const handleOpenObligationDetail = (employeeId: string) => {
    setObligationDetailEmployeeId(employeeId)
    setEditingObligationLineId(null)
    setObligationPaymentForm({ amount_paid: 0, notes: '' })
  }

  const handleCloseObligationDetail = () => {
    setObligationDetailEmployeeId(null)
    setEditingObligationLineId(null)
    setObligationPaymentForm({ amount_paid: 0, notes: '' })
  }

  const handleStartEditObligationLine = (
    lineId: string,
    amountPaid: number,
    notes?: string | null
  ) => {
    setEditingObligationLineId(lineId)
    setObligationPaymentForm({ amount_paid: amountPaid, notes: notes || '' })
  }

  const handleSaveObligationLinePayment = async (lineId: string, amountDue: number) => {
    if (!obligationDetailEmployeeId) return
    const amountPaid = Number(obligationPaymentForm.amount_paid)
    if (!Number.isFinite(amountPaid) || amountPaid < 0) {
      toast.error('قيمة المدفوع يجب أن تكون صفراً أو أكبر')
      return
    }
    if (amountPaid > amountDue) {
      toast.error('قيمة المدفوع لا يمكن أن تتجاوز قيمة القسط')
      return
    }
    try {
      await updateObligationLinePayment.mutateAsync({
        lineId,
        employeeId: obligationDetailEmployeeId,
        amount_paid: amountPaid,
        notes: obligationPaymentForm.notes.trim() || null,
      })
      toast.success('تم تحديث سداد القسط بنجاح')
      setEditingObligationLineId(null)
      setObligationPaymentForm({ amount_paid: 0, notes: '' })
      void refetchObligations()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل تحديث السداد')
    }
  }

  useEffect(() => {
    const firstId = scopeOptions[0]?.id
    if (firstId && !scopeOptions.some((item) => item.id === payrollForm.scope_id)) {
      setPayrollForm((current) => ({
        ...current,
        scope_id: firstId,
      }))
    }
  }, [scopeOptions, payrollForm.scope_id])

  useEffect(() => {
    if (!hasInitializedPayrollRunSelectionRef.current && payrollRunList.length > 0) {
      setSelectedPayrollRunId(payrollRunList[0].id)
      hasInitializedPayrollRunSelectionRef.current = true
      return
    }

    if (selectedPayrollRunId && !payrollRunList.some((run) => run.id === selectedPayrollRunId)) {
      setSelectedPayrollRunId(payrollRunList[0]?.id ?? null)
    }
  }, [payrollRunList, selectedPayrollRunId])

  useEffect(() => {
    setSelectedPayrollExportRunIds((current) => {
      const next = current.filter((runId) =>
        payrollRunList.some((run) => run.id === runId && run.entry_count > 0)
      )
      const isUnchanged =
        next.length === current.length && next.every((runId, index) => runId === current[index])
      return isUnchanged ? current : next
    })
  }, [payrollRunList])

  // Deep-link: ?run=RUN_ID&entry=ENTRY_ID → switch to runs tab, select run + entry
  const location = useLocation()
  const deepLinkPayrollHandledRef = useRef(false)
  useEffect(() => {
    if (deepLinkPayrollHandledRef.current || payrollRunList.length === 0) return
    const params = new URLSearchParams(location.search)
    const runId = params.get('run')
    const entryId = params.get('entry')
    if (!runId) return
    const run = payrollRunList.find((r) => r.id === runId)
    if (!run) return
    deepLinkPayrollHandledRef.current = true
    hasInitializedPayrollRunSelectionRef.current = true
    setSelectedPayrollRunId(runId)
    setActivePageTab('runs')
    if (entryId) {
      setSelectedPayrollSlipEntryId(entryId)
    }
  }, [payrollRunList, location.search])

  useEffect(() => {
    setPayrollImportPreviewRows([])
    setPayrollImportErrors([])
    setPayrollImportHeaderError(null)
    setPayrollImportFileName('')
  }, [selectedPayrollRunId])

  useEffect(() => {
    if (selectedPayrollSlipEntryId && !payrollSlipEntryIds.has(selectedPayrollSlipEntryId)) {
      setSelectedPayrollSlipEntryId(null)
    }
  }, [selectedPayrollSlipEntryId, payrollSlipEntryIds])

  useEffect(() => {
    if (!showPayrollRunForm || !payrollForm.scope_id || !normalizedPayrollFormMonth) {
      return
    }

    setNewPayrollRunRows((current) => {
      const next = payrollRunSeedEmployees.map((employee) =>
        buildPayrollRunSeedRow(employee as ScopedPayrollEmployee)
      )
      if (
        next.length === current.length &&
        next.every((row, i) => row.employee_id === current[i]?.employee_id)
      ) {
        return current
      }
      return next
    })
  }, [
    showPayrollRunForm,
    payrollForm.scope_id,
    normalizedPayrollFormMonth,
    payrollRunSeedEmployees,
  ])

  useEffect(() => {
    if (
      selectedPayrollRun &&
      scopedPayrollEmployees.length > 0 &&
      !scopedPayrollEmployees.some((employee) => employee.id === payrollEntryForm.employee_id)
    ) {
      const defaultEmployee = scopedPayrollEmployees[0]
      setPayrollEntryForm((current) => {
        const nextSalary = Number(defaultEmployee.salary || 0)
        const nextBreakdown = normalizePayrollObligationBreakdown(
          defaultEmployee.suggested_deduction_breakdown
        )

        if (
          current.employee_id === defaultEmployee.id &&
          Number(current.basic_salary_snapshot || 0) === nextSalary &&
          Number(current.transfer_renewal_amount || 0) === nextBreakdown.transfer_renewal &&
          Number(current.penalty_amount || 0) === nextBreakdown.penalty &&
          Number(current.advance_amount || 0) === nextBreakdown.advance &&
          Number(current.other_amount || 0) === nextBreakdown.other &&
          Number(current.installment_deducted_amount || 0) ===
            nextBreakdown.transfer_renewal + nextBreakdown.advance
        ) {
          return current
        }

        return {
          ...current,
          employee_id: defaultEmployee.id,
          basic_salary_snapshot: nextSalary,
          transfer_renewal_amount: nextBreakdown.transfer_renewal,
          penalty_amount: nextBreakdown.penalty,
          advance_amount: nextBreakdown.advance,
          other_amount: nextBreakdown.other,
          deductions_amount: nextBreakdown.penalty + nextBreakdown.other,
          installment_deducted_amount:
            nextBreakdown.transfer_renewal + nextBreakdown.advance,
        }
      })
    }
  }, [selectedPayrollRun, scopedPayrollEmployees, payrollEntryForm.employee_id])

  useEffect(() => {
    if (selectedPayrollEmployee) {
      const existingEntry = payrollEntries.find(
        (entry) => entry.employee_id === selectedPayrollEmployee.id
      )

      if (existingEntry) {
        const existingBreakdown = normalizePayrollObligationBreakdown(
          payrollEntryBreakdownById.get(existingEntry.id) ?? {
            ...EMPTY_PAYROLL_OBLIGATION_BREAKDOWN,
            penalty: Number(existingEntry.deductions_amount) || 0,
            advance: Number(existingEntry.installment_deducted_amount) || 0,
          }
        )

        setPayrollEntryForm((current) => {
          const next = {
            ...current,
            employee_id: selectedPayrollEmployee.id,
            attendance_days: Number(existingEntry.attendance_days) || 0,
            paid_leave_days: Number(existingEntry.paid_leave_days) || 0,
            basic_salary_snapshot:
              Number(existingEntry.basic_salary_snapshot) ||
              Number(selectedPayrollEmployee.salary || 0),
            overtime_amount: Number(existingEntry.overtime_amount) || 0,
            transfer_renewal_amount: existingBreakdown.transfer_renewal,
            penalty_amount: existingBreakdown.penalty,
            advance_amount: existingBreakdown.advance,
            other_amount: existingBreakdown.other,
            deductions_amount: Number(existingEntry.deductions_amount) || 0,
            installment_deducted_amount: Number(existingEntry.installment_deducted_amount) || 0,
            overtime_notes: existingEntry.overtime_notes || '',
            deductions_notes: existingEntry.deductions_notes || '',
            notes: existingEntry.notes || '',
          }

          const isUnchanged = JSON.stringify(current) === JSON.stringify(next)
          return isUnchanged ? current : next
        })
        return
      }

      setPayrollEntryForm((current) => {
        const nextBreakdown = normalizePayrollObligationBreakdown(
          selectedPayrollEmployee.suggested_deduction_breakdown
        )
        const next = {
          ...current,
          basic_salary_snapshot: Number(selectedPayrollEmployee.salary || 0),
          transfer_renewal_amount:
            current.transfer_renewal_amount === 0
              ? nextBreakdown.transfer_renewal
              : current.transfer_renewal_amount,
          penalty_amount:
            current.penalty_amount === 0 ? nextBreakdown.penalty : current.penalty_amount,
          advance_amount:
            current.advance_amount === 0 ? nextBreakdown.advance : current.advance_amount,
          other_amount: current.other_amount === 0 ? nextBreakdown.other : current.other_amount,
          deductions_amount:
            (current.penalty_amount === 0 ? nextBreakdown.penalty : current.penalty_amount) +
            (current.other_amount === 0 ? nextBreakdown.other : current.other_amount),
          installment_deducted_amount:
            current.installment_deducted_amount === 0
              ? nextBreakdown.transfer_renewal + nextBreakdown.advance
              : current.installment_deducted_amount,
        }

        const isUnchanged = JSON.stringify(current) === JSON.stringify(next)
        return isUnchanged ? current : next
      })
    }
  }, [selectedPayrollEmployee, payrollEntries, payrollEntryBreakdownById])

  const handleUpdateNewPayrollRunRow = (
    employeeId: string,
    field: keyof PayrollRunSeedRow,
    value: string | number | boolean
  ) => {
    setNewPayrollRunRows((current) =>
      current.map((row) => (row.employee_id === employeeId ? { ...row, [field]: value } : row))
    )
  }

  const handleToggleSelectAllNewPayrollRows = (checked: boolean) => {
    setNewPayrollRunRows((current) => current.map((row) => ({ ...row, included: checked })))
  }

  // يمنع كتابة نتائج قديمة فوق نتائج أحدث عند استدعاء متزامن
  const insightsRequestIdRef = useRef(0)

  const loadPayrollInsights = async ({ silent = false }: { silent?: boolean } = {}) => {
    const requestId = ++insightsRequestIdRef.current
    try {
      setPayrollInsightsLoading(true)

      const [
        { data: entriesData, error: entriesError },
        { data: componentsData, error: componentsError },
        { data: employeesData, error: employeesError },
        { data: obligationLinesData, error: obligationLinesError },
      ] = await Promise.all([
        supabase
          .from('payroll_entries')
          .select(
            'id,payroll_run_id,employee_id,residence_number_snapshot,employee_name_snapshot,company_name_snapshot,project_name_snapshot,basic_salary_snapshot,daily_rate_snapshot,attendance_days,paid_leave_days,overtime_amount,overtime_notes,deductions_amount,deductions_notes,installment_deducted_amount,gross_amount,net_amount,entry_status,notes,created_at,updated_at, payroll_run:payroll_runs(id,payroll_month,scope_type,scope_id,input_mode,status,notes,created_by_user_id,approved_by_user_id,created_at,updated_at,approved_at)'
          )
          .order('created_at', { ascending: false }),
        supabase
          .from('payroll_entry_components')
          .select('payroll_entry_id, component_code, amount'),
        supabase
          .from('employees')
          .select('id, name, residence_number, project_name, project:projects(name)')
          .eq('is_deleted', false),
        supabase
          .from('employee_obligation_lines')
          .select('employee_id, due_month, amount_due, amount_paid, line_status, header_id')
          .neq('line_status', 'cancelled')
          .order('due_month', { ascending: false }),
      ])

      if (entriesError) throw entriesError
      if (componentsError) throw componentsError
      if (employeesError) throw employeesError
      if (obligationLinesError) throw obligationLinesError

      const employeeMetaMap = new Map<
        string,
        { name: string; residence_number: string; project_name: string }
      >()
      ;(employeesData || []).forEach((employee) => {
        const projectRelation = Array.isArray(employee.project)
          ? employee.project[0]
          : employee.project
        employeeMetaMap.set(employee.id as string, {
          name: String(employee.name || ''),
          residence_number: String(employee.residence_number || ''),
          project_name: String(projectRelation?.name || employee.project_name || ''),
        })
      })

      const breakdownByEntryId = new Map<string, PayrollObligationBreakdown>()
      ;(componentsData || []).forEach((component) => {
        const bucket = getPayrollComponentBucket(component.component_code as string | undefined)
        if (!bucket) {
          return
        }

        const current = normalizePayrollObligationBreakdown(
          breakdownByEntryId.get(component.payroll_entry_id as string)
        )
        current[bucket] += Number(component.amount || 0)
        breakdownByEntryId.set(component.payroll_entry_id as string, current)
      })

      const nextObligationRows = (
        (obligationLinesData || []) as Array<Record<string, unknown>>
      ).map((line) => {
        const meta = employeeMetaMap.get(String(line.employee_id))
        return {
          employee_id: String(line.employee_id || ''),
          employee_name: meta?.name || '',
          residence_number: meta?.residence_number || '',
          project_name: meta?.project_name || '',
          due_month: String(line.due_month || ''),
          amount_due: Number(line.amount_due || 0),
          amount_paid: Number(line.amount_paid || 0),
        }
      })

      const obligationSummaryByEmployeeMonth = new Map<
        string,
        { total: number; paid: number; remaining: number }
      >()
      nextObligationRows.forEach((line) => {
        const monthKey = String(line.due_month || '').slice(0, 7)
        const key = `${line.employee_id}::${monthKey}`
        const current = obligationSummaryByEmployeeMonth.get(key) ?? {
          total: 0,
          paid: 0,
          remaining: 0,
        }
        current.total += Number(line.amount_due || 0)
        current.paid += Number(line.amount_paid || 0)
        current.remaining += Math.max(
          Number(line.amount_due || 0) - Number(line.amount_paid || 0),
          0
        )
        obligationSummaryByEmployeeMonth.set(key, current)
      })

      const nextSearchRows = ((entriesData || []) as Array<Record<string, unknown>>).map(
        (entry) => {
          const meta = employeeMetaMap.get(String(entry.employee_id))
          const payrollRunMeta =
            (entry.payroll_run as { payroll_month?: string; status?: string } | null) ?? null
          const payrollMonthLabel = String(payrollRunMeta?.payroll_month || '').slice(0, 7)
          const obligationSummary = obligationSummaryByEmployeeMonth.get(
            `${String(entry.employee_id)}::${payrollMonthLabel}`
          )
          const breakdown = normalizePayrollObligationBreakdown(
            breakdownByEntryId.get(String(entry.id)) ?? {
              ...EMPTY_PAYROLL_OBLIGATION_BREAKDOWN,
              penalty: Number(entry.deductions_amount || 0),
              advance: Number(entry.installment_deducted_amount || 0),
            }
          )
          const totalDeductions = getPayrollObligationBreakdownTotal(breakdown)
          const normalizedTotals = calculatePayrollTotals(
            Number(entry.basic_salary_snapshot || 0),
            Number(entry.attendance_days || 0),
            Number(entry.paid_leave_days || 0),
            Number(entry.overtime_amount || 0),
            totalDeductions
          )

          return {
            ...(entry as unknown as PayrollEntry),
            gross_amount: normalizedTotals.grossAmount,
            net_amount: normalizedTotals.netAmount,
            daily_rate_snapshot: normalizedTotals.dailyRate,
            payroll_month_label: payrollMonthLabel,
            payroll_run_status: String(payrollRunMeta?.status || 'draft'),
            project_label: String(entry.project_name_snapshot || meta?.project_name || ''),
            company_label: String(entry.company_name_snapshot || ''),
            residence_label: String(
              entry.residence_number_snapshot || meta?.residence_number || ''
            ),
            deduction_breakdown: breakdown,
            total_deductions: totalDeductions,
            obligation_total: Number(obligationSummary?.total || 0),
            obligation_paid: Number(obligationSummary?.paid || 0),
            obligation_remaining: Number(obligationSummary?.remaining || 0),
          } as PayrollSearchRow
        }
      )

      // تجاهل النتيجة لو طلب أحدث بدأ بعدنا
      if (requestId !== insightsRequestIdRef.current) return
      setAllPayrollSearchRows(nextSearchRows)
      setObligationInsightRows(nextObligationRows)
    } catch (error) {
      if (requestId !== insightsRequestIdRef.current) return
      console.error('Error loading payroll insights:', error)
      if (!silent) toast.error('تعذر تحديث بحث الاستقطاعات حالياً')
    } finally {
      if (requestId === insightsRequestIdRef.current) setPayrollInsightsLoading(false)
    }
  }

  useEffect(() => {
    void loadPayrollInsights()
  // allObligationsSummary: re-fetch search stats when obligations change (React Query updates reference)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payrollRunList.length, allObligationsSummary])

  const filteredPayrollSearchRows = useMemo(() => {
    const normalizedQuery = payrollSearchQuery.trim().toLowerCase()
    const filteredRows = allPayrollSearchRows.filter((row) => {
      const matchesQuery =
        !normalizedQuery ||
        row.employee_name_snapshot.toLowerCase().includes(normalizedQuery) ||
        String(row.residence_label || '')
          .toLowerCase()
          .includes(normalizedQuery) ||
        String(row.project_label || '')
          .toLowerCase()
          .includes(normalizedQuery)

      const matchesMonth = !payrollSearchMonth || row.payroll_month_label === payrollSearchMonth
      const matchesProject = !payrollSearchProject || row.project_label === payrollSearchProject

      return matchesQuery && matchesMonth && matchesProject
    })

    const directionFactor = payrollSearchSortDirection === 'asc' ? 1 : -1
    const getSortableValue = (row: PayrollSearchRow) => {
      switch (payrollSearchSortField) {
        case 'employee_name':
          return row.employee_name_snapshot
        case 'residence':
          return row.residence_label
        case 'project':
          return row.project_label
        case 'month':
          return row.payroll_month_label
        case 'status':
          return row.payroll_run_status
        case 'deductions':
          return row.total_deductions
        case 'remaining':
          return row.obligation_remaining
        case 'net_amount':
          return row.net_amount
      }
    }

    return [...filteredRows].sort((left, right) => {
      const leftValue = getSortableValue(left)
      const rightValue = getSortableValue(right)

      if (leftValue == null && rightValue == null) return 0
      if (leftValue == null) return 1
      if (rightValue == null) return -1

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return (leftValue - rightValue) * directionFactor
      }

      if (payrollSearchSortField === 'status') {
        const statusOrder: Record<PayrollSearchRow['payroll_run_status'], number> = {
          draft: 0,
          finalized: 1,
          cancelled: 2,
        }
        return (statusOrder[left.payroll_run_status] - statusOrder[right.payroll_run_status]) * directionFactor
      }

      return String(leftValue).localeCompare(String(rightValue), 'ar') * directionFactor
    })
  }, [
    allPayrollSearchRows,
    payrollSearchMonth,
    payrollSearchProject,
    payrollSearchQuery,
    payrollSearchSortDirection,
    payrollSearchSortField,
  ])

  // Virtualizer for payroll search table
  const payrollTableContainerRef = useRef<HTMLDivElement>(null)
  const payrollRowVirtualizer = useVirtualizer({
    count: filteredPayrollSearchRows.length,
    getScrollElement: () => payrollTableContainerRef.current,
    estimateSize: useCallback(() => 48, []),
    overscan: 10,
  })

  const filteredObligationInsightRows = useMemo(() => {
    const normalizedQuery = payrollSearchQuery.trim().toLowerCase()
    return obligationInsightRows.filter((row) => {
      const matchesQuery =
        !normalizedQuery ||
        row.employee_name.toLowerCase().includes(normalizedQuery) ||
        row.residence_number.toLowerCase().includes(normalizedQuery) ||
        row.project_name.toLowerCase().includes(normalizedQuery)

      const matchesMonth = !payrollSearchMonth || row.due_month.slice(0, 7) === payrollSearchMonth
      const matchesProject = !payrollSearchProject || row.project_name === payrollSearchProject

      return matchesQuery && matchesMonth && matchesProject
    })
  }, [obligationInsightRows, payrollSearchMonth, payrollSearchProject, payrollSearchQuery])

  const obligationStats = useMemo(() => {
    return filteredObligationInsightRows.reduce(
      (totals, row) => {
        totals.total += Number(row.amount_due || 0)
        totals.paid += Number(row.amount_paid || 0)
        totals.remaining += Math.max(Number(row.amount_due || 0) - Number(row.amount_paid || 0), 0)
        return totals
      },
      { total: 0, paid: 0, remaining: 0 }
    )
  }, [filteredObligationInsightRows])

  const projectFilterOptions = useMemo(() => {
    const values = Array.from(
      new Set(allPayrollSearchRows.map((row) => row.project_label).filter(Boolean))
    )
    return values.sort((left, right) => left.localeCompare(right, 'ar'))
  }, [allPayrollSearchRows])

  const filteredPayrollRunList = useMemo(() => {
    return payrollRunList.filter((run) => {
      const matchesMonth =
        !payrollRunStatsMonth || run.payroll_month.slice(0, 7) === payrollRunStatsMonth
      const matchesRun = !payrollRunStatsRunId || run.id === payrollRunStatsRunId
      return matchesMonth && matchesRun
    })
  }, [payrollRunList, payrollRunStatsMonth, payrollRunStatsRunId])

  const payrollRunStatsRows = useMemo(() => {
    return allPayrollSearchRows.filter((row) => {
      const matchesMonth = !payrollRunStatsMonth || row.payroll_month_label === payrollRunStatsMonth
      const matchesRun = !payrollRunStatsRunId || row.payroll_run_id === payrollRunStatsRunId
      return matchesMonth && matchesRun
    })
  }, [allPayrollSearchRows, payrollRunStatsMonth, payrollRunStatsRunId])

  const payrollRunCardsStats = useMemo(() => {
    const uniqueEmployees = new Set(payrollRunStatsRows.map((row) => row.employee_id)).size

    return payrollRunStatsRows.reduce(
      (totals, row) => {
        totals.employees = uniqueEmployees
        totals.gross = roundPayrollAmount(totals.gross + Number(row.gross_amount || 0))
        totals.transferRenewal = roundPayrollAmount(
          totals.transferRenewal + Number(row.deduction_breakdown.transfer_renewal || 0)
        )
        totals.penalty = roundPayrollAmount(
          totals.penalty + Number(row.deduction_breakdown.penalty || 0)
        )
        totals.advance = roundPayrollAmount(
          totals.advance + Number(row.deduction_breakdown.advance || 0)
        )
        totals.other = roundPayrollAmount(totals.other + Number(row.deduction_breakdown.other || 0))
        totals.totalObligations = roundPayrollAmount(
          totals.totalObligations + Number(row.total_deductions || 0)
        )
        return totals
      },
      {
        employees: uniqueEmployees,
        gross: 0,
        transferRenewal: 0,
        penalty: 0,
        advance: 0,
        other: 0,
        totalObligations: 0,
      }
    )
  }, [payrollRunStatsRows])

  // buildPayrollExportRows + sanitizePayrollFileName → imported from ./payrollDeductionsHelpers

  const exportablePayrollRunIds = filteredPayrollRunList
    .filter((run) => run.entry_count > 0)
    .map((run) => run.id)

  const allExportablePayrollRunsSelected =
    exportablePayrollRunIds.length > 0 &&
    exportablePayrollRunIds.every((runId) => selectedPayrollExportRunIds.includes(runId))

  const fetchPayrollEntriesForExport = async (runId: string) => {
    if (selectedPayrollRun?.id === runId && payrollEntries.length > 0) {
      return payrollEntries
    }

    const { data, error } = await supabase
      .from('payroll_entries')
      .select(
        'id,payroll_run_id,employee_id,residence_number_snapshot,employee_name_snapshot,company_name_snapshot,project_name_snapshot,basic_salary_snapshot,daily_rate_snapshot,attendance_days,paid_leave_days,overtime_amount,overtime_notes,deductions_amount,deductions_notes,installment_deducted_amount,gross_amount,net_amount,entry_status,notes,created_at,updated_at,employee:employees(bank_account)'
      )
      .eq('payroll_run_id', runId)

    if (error) {
      throw error
    }

    return ((data ?? []) as (PayrollEntry & { employee?: { bank_account?: string | null } | null })[]).map((e) => ({
      ...e,
      bank_account_snapshot: e.employee?.bank_account ?? null,
      employee: undefined,
    })) as PayrollEntry[]
  }

  const fetchPayrollEntryBreakdowns = async (entryIds: string[]) => {
    const map = new Map<string, PayrollObligationBreakdown>()

    if (entryIds.length === 0) {
      return map
    }

    const { data, error } = await supabase
      .from('payroll_entry_components')
      .select('payroll_entry_id, component_code, amount')
      .in('payroll_entry_id', entryIds)

    if (error) {
      throw error
    }

    ;(data || []).forEach((component) => {
      const bucket = getPayrollComponentBucket(component.component_code as string | undefined)
      if (!bucket) {
        return
      }

      const current = normalizePayrollObligationBreakdown(
        map.get(component.payroll_entry_id as string)
      )
      current[bucket] += Number(component.amount || 0)
      map.set(component.payroll_entry_id as string, current)
    })

    return map
  }

  // buildPayrollExportWorkbook → imported from ./payrollDeductionsHelpers

  const downloadPayrollRunExcel = async (
    run: NonNullable<typeof selectedPayrollRun>,
    entries: PayrollEntry[],
    breakdownByEntryId: Map<string, PayrollObligationBreakdown>
  ) => {
    const XLSX = await loadXlsx()
    const workbook = buildPayrollExportWorkbook(XLSX, run, entries, breakdownByEntryId, companies, projects)
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const fileName = `${sanitizePayrollFileName(getRunDisplayName(run.scope_type, run.scope_id, run.payroll_month))}.xlsx`
    saveAs(blob, fileName)
  }

  const exportPayrollToExcel = async () => {
    if (!selectedPayrollRun) {
      toast.error('يرجى اختيار مسير أولاً')
      return
    }

    try {
      const entries = await fetchPayrollEntriesForExport(selectedPayrollRun.id)
      if (entries.length === 0) {
        toast.warning('هذا المسير لا يحتوي على بيانات رواتب للتصدير')
        return
      }

      const breakdownByEntryId = await fetchPayrollEntryBreakdowns(entries.map((item) => item.id))
      await downloadPayrollRunExcel(selectedPayrollRun, entries, breakdownByEntryId)
      toast.success('تم تصدير ملف Excel منسق لهذا المسير')
    } catch (error) {
      console.error('Error exporting payroll run to Excel:', error)
      const message = error instanceof Error ? error.message : 'فشل تصدير المسير بصيغة Excel'
      toast.error(message)
    }
  }

  const exportPayrollByPaymentMethod = async (method: 'bank' | 'cash') => {
    if (!selectedPayrollRun) {
      toast.error('يرجى اختيار مسير أولاً')
      return
    }

    try {
      const allEntries = await fetchPayrollEntriesForExport(selectedPayrollRun.id)
      const filtered = allEntries.filter((e) =>
        method === 'bank' ? Boolean(e.bank_account_snapshot) : !e.bank_account_snapshot
      )

      if (filtered.length === 0) {
        toast.warning(method === 'bank' ? 'لا يوجد موظفون بحساب بنكي في هذا المسير' : 'لا يوجد موظفون يقبضون كاش في هذا المسير')
        return
      }

      const breakdownByEntryId = await fetchPayrollEntryBreakdowns(filtered.map((e) => e.id))
      const XLSX = await loadXlsx()
      const workbook = buildPayrollExportWorkbook(XLSX, selectedPayrollRun, filtered, breakdownByEntryId, companies, projects)
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const suffix = method === 'bank' ? 'تحويل_بنكي' : 'كاش'
      const baseName = sanitizePayrollFileName(getRunDisplayName(selectedPayrollRun.scope_type, selectedPayrollRun.scope_id, selectedPayrollRun.payroll_month))
      saveAs(blob, `${baseName}_${suffix}.xlsx`)
      toast.success(`تم تصدير كشف ${method === 'bank' ? 'التحويل البنكي' : 'الكاش'} (${filtered.length} موظف)`)
    } catch (error) {
      console.error('Error exporting payroll by payment method:', error)
      const message = error instanceof Error ? error.message : 'فشل التصدير'
      toast.error(message)
    }
  }

  const handleTogglePayrollRunExportSelection = (runId: string, checked: boolean) => {
    setSelectedPayrollExportRunIds((current) =>
      checked ? Array.from(new Set([...current, runId])) : current.filter((id) => id !== runId)
    )
  }

  const handleToggleSelectAllPayrollRuns = (checked: boolean) => {
    setSelectedPayrollExportRunIds(checked ? exportablePayrollRunIds : [])
  }

  const handleExportSelectedPayrollRuns = async () => {
    if (selectedPayrollExportRunIds.length === 0) {
      toast.error('يرجى اختيار مسير واحد على الأقل للتصدير')
      return
    }

    try {
      setExportingSelectedPayrollRuns(true)
      let exportedCount = 0
      let skippedCount = 0

      for (const runId of selectedPayrollExportRunIds) {
        const run = payrollRunList.find((item) => item.id === runId) ?? null
        if (!run) {
          continue
        }

        const entries = await fetchPayrollEntriesForExport(run.id)
        if (entries.length === 0) {
          skippedCount += 1
          continue
        }

        const breakdownByEntryId = await fetchPayrollEntryBreakdowns(entries.map((item) => item.id))
        await downloadPayrollRunExcel(run, entries, breakdownByEntryId)
        exportedCount += 1
      }

      if (exportedCount > 0) {
        toast.success(`تم تصدير ${exportedCount} ملف Excel للمسيرات المحددة`)
      }

      if (skippedCount > 0) {
        toast.warning(`تم تجاوز ${skippedCount} مسير لأنه لا يحتوي على بيانات رواتب`)
      }
    } catch (error) {
      console.error('Error exporting selected payroll runs:', error)
      const message = error instanceof Error ? error.message : 'فشل تصدير المسيرات المحددة'
      toast.error(message)
    } finally {
      setExportingSelectedPayrollRuns(false)
    }
  }

  const downloadPayrollTemplate = async () => {
    const XLSX = await loadXlsx()
    const templateData = [
      {
        'رقم الإقامة': '2123456789',
        'أيام الحضور': 30,
        'الإجازات المدفوعة': 0,
        الإضافي: 250,
        'قسط رسوم نقل وتجديد': 150,
        'قسط جزاءات وغرامات': 100,
        'قسط سلفة': 50,
        'قسط أخرى': 0,
        'ملاحظات الإضافي': 'بدل ساعات إضافية',
        'ملاحظات الخصومات': 'سلفة أو غياب',
        ملاحظات: 'اختياري',
      },
    ]

    const worksheet = XLSX.utils.json_to_sheet(templateData)
    worksheet['!cols'] = [
      { wch: 16 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 24 },
      { wch: 24 },
      { wch: 24 },
    ]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payroll Template')
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    saveAs(blob, 'قالب_استيراد_الرواتب.xlsx')
    toast.success('تم تنزيل قالب استيراد الرواتب')
  }

  const handleCreatePayrollRun = async () => {
    if (!payrollForm.payroll_month) {
      toast.error('يرجى اختيار شهر الرواتب')
      return
    }

    if (!payrollForm.scope_id) {
      toast.error(
        payrollForm.scope_type === 'project' ? 'يرجى اختيار المشروع' : 'يرجى اختيار المؤسسة'
      )
      return
    }

    if (payrollRunSeedEmployees.length > 0 && selectedNewPayrollRunRows.length === 0) {
      toast.error('اختر موظفًا واحدًا على الأقل لإضافته داخل المسير')
      return
    }

    const requestedPayrollMonth = `${payrollForm.payroll_month}-01`
    const existingRun = payrollRunList.find(
      (run) =>
        run.payroll_month.slice(0, 7) === payrollForm.payroll_month &&
        run.scope_type === payrollForm.scope_type &&
        run.scope_id === payrollForm.scope_id
    )

    if (existingRun) {
      setSelectedPayrollRunId(existingRun.id)
      setShowPayrollRunDetailsModal(true)
      setShowPayrollRunForm(false)
      toast.warning(getExistingRunWarningMessage(existingRun))
      return
    }

    try {
      // تحذير: موظف مضاف في مسير مسودة آخر لنفس الشهر
      if (selectedNewPayrollRunRows.length > 0) {
        const { data: existingDraftRuns } = await supabase
          .from('payroll_runs')
          .select('id')
          .eq('payroll_month', requestedPayrollMonth)
          .eq('status', 'draft')

        if (existingDraftRuns && existingDraftRuns.length > 0) {
          const selectedEmpIds = selectedNewPayrollRunRows.map((r) => r.employee_id)
          const draftRunIds = existingDraftRuns.map((r) => r.id)
          const { data: conflicts } = await supabase
            .from('payroll_entries')
            .select('employee_name_snapshot')
            .in('employee_id', selectedEmpIds)
            .in('payroll_run_id', draftRunIds)

          if (conflicts && conflicts.length > 0) {
            const names = [...new Set(conflicts.map((e) => String(e.employee_name_snapshot || '')))]
              .filter(Boolean)
              .join('، ')
            toast.warning(
              `⚠️ تنبيه: الموظفون التالون موجودون في مسير مسودة آخر لنفس الشهر: ${names}`
            )
          }
        }
      }

      const createdRun = await createPayrollRun.mutateAsync({
        payroll_month: requestedPayrollMonth,
        scope_type: payrollForm.scope_type,
        scope_id: payrollForm.scope_id,
        input_mode: payrollForm.input_mode,
        notes: payrollForm.notes.trim() || null,
      })

      if (selectedNewPayrollRunRows.length > 0) {
        const employeeById = new Map(
          payrollRunSeedEmployees.map((emp) => [emp.id, emp])
        )

        const dbPayloads: Array<{
          payroll_run_id: string
          employee_id: string
          residence_number_snapshot: number
          employee_name_snapshot: string
          company_name_snapshot: string | null
          project_name_snapshot: string | null
          basic_salary_snapshot: number
          daily_rate_snapshot: number
          attendance_days: number
          paid_leave_days: number
          overtime_amount: number
          overtime_notes: string | null
          deductions_amount: number
          deductions_notes: string | null
          installment_deducted_amount: number
          gross_amount: number
          net_amount: number
          entry_status: PayrollEntry['entry_status']
          notes: string | null
        }> = []
        const inputByEmployeeId = new Map<string, UpsertPayrollEntryInput>()

        for (const row of selectedNewPayrollRunRows) {
          const employee = employeeById.get(row.employee_id)
          if (!employee) continue

          const rowBreakdown = normalizePayrollObligationBreakdown({
            transfer_renewal: row.transfer_renewal_amount,
            penalty: row.penalty_amount,
            advance: row.advance_amount,
            other: row.other_amount,
          })
          const rowDeductionsTotal = getPayrollObligationBreakdownTotal(rowBreakdown)
          const rowTotals = calculatePayrollTotals(
            row.basic_salary_snapshot,
            row.attendance_days,
            row.paid_leave_days,
            row.overtime_amount,
            rowDeductionsTotal
          )

          dbPayloads.push({
            payroll_run_id: createdRun.id,
            employee_id: employee.id,
            residence_number_snapshot: employee.residence_number,
            employee_name_snapshot: employee.name,
            company_name_snapshot: employee.company?.name ?? null,
            project_name_snapshot: employee.project?.name ?? null,
            basic_salary_snapshot: row.basic_salary_snapshot,
            daily_rate_snapshot: rowTotals.dailyRate,
            attendance_days: row.attendance_days,
            paid_leave_days: row.paid_leave_days,
            overtime_amount: row.overtime_amount,
            overtime_notes: row.overtime_notes.trim() || null,
            deductions_amount: row.penalty_amount + row.other_amount,
            deductions_notes: row.deductions_notes.trim() || null,
            installment_deducted_amount: row.transfer_renewal_amount + row.advance_amount,
            gross_amount: rowTotals.grossAmount,
            net_amount: rowTotals.netAmount,
            entry_status: 'calculated',
            notes: row.notes.trim() || null,
          })

          inputByEmployeeId.set(employee.id, {
            payroll_run_id: createdRun.id,
            payroll_run_status: createdRun.status,
            payroll_month: createdRun.payroll_month,
            employee_id: employee.id,
            residence_number_snapshot: employee.residence_number,
            employee_name_snapshot: employee.name,
            company_name_snapshot: employee.company?.name ?? null,
            project_name_snapshot: employee.project?.name ?? null,
            basic_salary_snapshot: row.basic_salary_snapshot,
            daily_rate_snapshot: rowTotals.dailyRate,
            attendance_days: row.attendance_days,
            paid_leave_days: row.paid_leave_days,
            overtime_amount: row.overtime_amount,
            overtime_notes: row.overtime_notes.trim() || null,
            deductions_amount: row.penalty_amount + row.other_amount,
            deductions_notes: row.deductions_notes.trim() || null,
            installment_deducted_amount: row.transfer_renewal_amount + row.advance_amount,
            deduction_breakdown: rowBreakdown,
            gross_amount: rowTotals.grossAmount,
            net_amount: rowTotals.netAmount,
            entry_status: 'calculated',
            notes: row.notes.trim() || null,
          })
        }

        if (dbPayloads.length > 0) {
          const { data: insertedEntries, error: insertError } = await supabase
            .from('payroll_entries')
            .insert(dbPayloads)
            .select(
              'id,payroll_run_id,employee_id,residence_number_snapshot,employee_name_snapshot,company_name_snapshot,project_name_snapshot,basic_salary_snapshot,daily_rate_snapshot,attendance_days,paid_leave_days,overtime_amount,overtime_notes,deductions_amount,deductions_notes,installment_deducted_amount,gross_amount,net_amount,entry_status,notes,created_at,updated_at'
            )

          if (insertError) throw insertError

          await Promise.all(
            (insertedEntries ?? []).map((entry) => {
              const input = inputByEmployeeId.get(entry.employee_id as string)
              if (!input) return Promise.resolve()
              return syncPayrollEntryComponents(entry as PayrollEntry, input, false)
            })
          )

          queryClient.invalidateQueries({ queryKey: ['payroll-runs'] })
          queryClient.invalidateQueries({ queryKey: ['payroll-run-entries', createdRun.id] })
          queryClient.invalidateQueries({ queryKey: ['payroll-scope-employees'] })
          queryClient.invalidateQueries({ queryKey: ['employee-obligations'] })
          queryClient.invalidateQueries({ queryKey: ['employees'] })
          queryClient.invalidateQueries({ queryKey: ['revenue-pnl'] })
          queryClient.invalidateQueries({ queryKey: ['unlinked-payroll-count'] })
          queryClient.invalidateQueries({ queryKey: ['payroll-entries-search'] })
        }
      }

      setSelectedPayrollRunId(createdRun.id)
  setShowPayrollRunDetailsModal(true)
      setShowPayrollRunForm(false)
      setNewPayrollRunRows([])
      toast.success(
        selectedNewPayrollRunRows.length > 0
          ? `تم إنشاء المسير وإضافة ${selectedNewPayrollRunRows.length} موظف`
          : 'تم إنشاء المسير بنجاح'
      )
    } catch (error) {
      console.error('Error creating payroll run:', error)

      const isDuplicateRunError =
        typeof error === 'object' &&
        error !== null &&
        (('code' in error && error.code === '23505') ||
          ('message' in error &&
            typeof error.message === 'string' &&
            (error.message.includes('duplicate key') ||
              error.message.includes('payroll_runs_scope_month_unique'))))

      if (isDuplicateRunError) {
        const matchingRun = payrollRunList.find(
          (run) =>
            run.payroll_month.slice(0, 7) === payrollForm.payroll_month &&
            run.scope_type === payrollForm.scope_type &&
            run.scope_id === payrollForm.scope_id
        )

        if (matchingRun) {
          setSelectedPayrollRunId(matchingRun.id)
          setShowPayrollRunDetailsModal(true)
          setShowPayrollRunForm(false)
          toast.warning(getExistingRunWarningMessage(matchingRun))
          return
        }
      }

      const message = error instanceof Error ? error.message : 'فشل إنشاء المسير'
      toast.error(message)
    }
  }

  const handleUpsertPayrollEntry = async () => {
    if (!selectedPayrollRun) {
      toast.error('يرجى اختيار مسير أولاً')
      return
    }

    if (!selectedPayrollEmployee) {
      toast.error('يرجى اختيار الموظف')
      return
    }

    if (netAmount < 0) {
      toast.error('صافي الراتب لا يمكن أن يكون سالبًا')
      return
    }

    try {
      await upsertPayrollEntry.mutateAsync({
        payroll_run_id: selectedPayrollRun.id,
        payroll_run_status: selectedPayrollRun.status,
        payroll_month: selectedPayrollRun.payroll_month,
        employee_id: selectedPayrollEmployee.id,
        residence_number_snapshot: selectedPayrollEmployee.residence_number,
        employee_name_snapshot: selectedPayrollEmployee.name,
        company_name_snapshot: selectedPayrollEmployee.company?.name ?? null,
        project_name_snapshot: selectedPayrollEmployee.project?.name ?? null,
        basic_salary_snapshot: baseSalary,
        daily_rate_snapshot: dailyRate,
        attendance_days: payrollEntryForm.attendance_days,
        paid_leave_days: payrollEntryForm.paid_leave_days,
        overtime_amount: payrollEntryForm.overtime_amount,
        overtime_notes: payrollEntryForm.overtime_notes.trim() || null,
        deductions_amount: deductionBreakdown.penalty + deductionBreakdown.other,
        deductions_notes: payrollEntryForm.deductions_notes.trim() || null,
        installment_deducted_amount:
          deductionBreakdown.transfer_renewal + deductionBreakdown.advance,
        deduction_breakdown: deductionBreakdown,
        gross_amount: grossAmount,
        net_amount: netAmount,
        entry_status: 'calculated',
        notes: payrollEntryForm.notes.trim() || null,
      })

      loadPayrollInsights({ silent: true }).catch((e) => console.error('[insights] refresh failed after entry save:', e))
      toast.success('تم حفظ مدخل الراتب وربطه بالالتزامات المالية')
      setShowPayrollEntryForm(false)
    } catch (error) {
      console.error('Error upserting payroll entry:', error)
      const message = error instanceof Error ? error.message : 'فشل حفظ مدخل الراتب'
      toast.error(message)
    }
  }

  const logPayrollActivity = async (action: string, details: Record<string, unknown>) => {
    await writeActivity({
      entity_type: 'payroll',
      entity_id: selectedPayrollRun?.id ?? null,
      action,
      details,
    })
  }

  const handleUpdatePayrollRunStatus = async (status: 'draft' | 'finalized' | 'cancelled') => {
    if (!selectedPayrollRun) {
      toast.error('يرجى اختيار مسير أولاً')
      return
    }

    if (status === 'finalized' && payrollEntries.length === 0) {
      toast.error('لا يمكن اعتماد مسير فارغ')
      return
    }

    try {
      await updatePayrollRunStatus.mutateAsync({
        runId: selectedPayrollRun.id,
        status,
        approved_at: status === 'finalized' ? new Date().toISOString() : null,
      })

      await logPayrollActivity('payroll_run_status_updated', {
        payroll_run_id: selectedPayrollRun.id,
        payroll_month: selectedPayrollRun.payroll_month,
        from_status: selectedPayrollRun.status,
        to_status: status,
        entry_count: payrollEntries.length,
      })

      loadPayrollInsights({ silent: true }).catch((e) => console.error('[insights] refresh failed after status update:', e))

      toast.success(
        status === 'finalized'
          ? 'تم اعتماد المسير'
          : status === 'cancelled'
            ? 'تم إلغاء المسير'
            : 'تمت إعادة المسير إلى مسودة'
      )
    } catch (error) {
      console.error('Error updating payroll run status:', error)
      const message = error instanceof Error ? error.message : 'فشل تحديث حالة المسير'
      toast.error(message)
    }
  }

  const handleDownloadPayrollSlipPdf = async () => {
    if (!selectedPayrollSlip || !selectedSlipEntry) {
      toast.error('لا توجد قسيمة جاهزة للتنزيل')
      return
    }

    setDownloadingSlipPdf(true)
    const toastId = toast.loading('جاري توليد PDF')

    try {
      const [{ jsPDF }, bengaliFont] = await Promise.all([
        import('jspdf'),
        loadBengaliFont(),
      ])

      const slipObligationSummary = allObligationsSummary.find(
        (row) => row.employee_id === selectedSlipEntry.employee_id
      )

      const grossAmount = Number(selectedSlipTotals?.grossAmount || selectedSlipEntry.gross_amount || 0)
      const netAmount = Number(selectedSlipTotals?.netAmount || selectedSlipEntry.net_amount || 0)
      const deductionsAmount = Number(selectedSlipEntry.deductions_amount || 0)
      const installmentAmount = Number(selectedSlipEntry.installment_deducted_amount || 0)
      const rawPayrollMonth = String(
        (selectedSlipSnapshot?.payroll_run as Record<string, unknown> | undefined)?.['payroll_month'] ??
        selectedPayrollRun?.payroll_month ??
        ''
      )
      const slipData: SlipData = {
        slip: {
          slip_number: selectedPayrollSlip.slip_number ?? 'payroll-slip',
          generated_at: selectedPayrollSlip.generated_at ?? null,
        },
        entry: selectedSlipEntry,
        components: selectedSlipComponents,
        obligationPlans: slipEmployeeObligationPlans,
        obligationSummary: slipObligationSummary ?? null,
        payrollRun: /^\d{4}-\d{2}/.test(rawPayrollMonth)
          ? { payroll_month: rawPayrollMonth.slice(0, 7) }
          : null,
        totals: {
          grossAmount,
          netAmount,
          deductionsAmount,
          installmentAmount,
        },
      }

      const [arCanvas, bnCanvas] = await Promise.all([
        captureSlip(buildSlipHtml(slipData, 'ar')),
        captureSlip(buildSlipHtml(slipData, 'bn', bengaliFont)),
      ])

      const arImageData = arCanvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const arImgW = pageWidth
      const arImgH = (arCanvas.height * arImgW) / arCanvas.width

      pdf.addImage(arImageData, 'PNG', 0, 0, arImgW, arImgH)

      let arRemaining = arImgH - pageHeight
      let arYOffset = 0
      while (arRemaining > 0) {
        arYOffset -= pageHeight
        pdf.addPage()
        pdf.addImage(arImageData, 'PNG', 0, arYOffset, arImgW, arImgH)
        arRemaining -= pageHeight
      }

      pdf.addPage()

      const bnImageData = bnCanvas.toDataURL('image/png')
      const bnImgH = (bnCanvas.height * pageWidth) / bnCanvas.width
      pdf.addImage(bnImageData, 'PNG', 0, 0, pageWidth, bnImgH)

      let bnRemaining = bnImgH - pageHeight
      let bnYOffset = 0
      while (bnRemaining > 0) {
        bnYOffset -= pageHeight
        pdf.addPage()
        pdf.addImage(bnImageData, 'PNG', 0, bnYOffset, pageWidth, bnImgH)
        bnRemaining -= pageHeight
      }

      pdf.save(`${selectedPayrollSlip.slip_number}.pdf`)
      toast.success('تم تنزيل القسيمة بصيغة PDF')
    } catch (error) {
      console.error('Error generating payroll slip PDF:', error)
      toast.error('فشل تنزيل القسيمة بصيغة PDF')
    } finally {
      setDownloadingSlipPdf(false)
      toast.dismiss(toastId)
    }
  }

  const handleOpenPayrollExcelImport = () => {
    payrollExcelInputRef.current?.click()
  }

  const handleConfirmPayrollExcelImport = async () => {
    if (!selectedPayrollRun || payrollImportPreviewRows.length === 0) {
      toast.error('لا توجد صفوف جاهزة لاعتماد الاستيراد')
      return
    }

    try {
      setConfirmingPayrollExcelImport(true)

      await Promise.all(
        payrollImportPreviewRows.map((row) =>
          upsertPayrollEntry.mutateAsync({
            payroll_run_id: selectedPayrollRun.id,
            payroll_run_status: selectedPayrollRun.status,
            payroll_month: selectedPayrollRun.payroll_month,
            employee_id: row.employee_id,
            residence_number_snapshot: Number(row.residence_number),
            employee_name_snapshot: row.employee_name,
            company_name_snapshot: row.company_name ?? null,
            project_name_snapshot: row.project_name ?? null,
            basic_salary_snapshot: row.basic_salary_snapshot,
            daily_rate_snapshot: row.daily_rate_snapshot,
            attendance_days: row.attendance_days,
            paid_leave_days: row.paid_leave_days,
            overtime_amount: row.overtime_amount,
            overtime_notes: row.overtime_notes || null,
            deductions_amount: row.penalty_amount + row.other_amount,
            deductions_notes: row.deductions_notes || null,
            installment_deducted_amount: row.transfer_renewal_amount + row.advance_amount,
            deduction_breakdown: {
              transfer_renewal: row.transfer_renewal_amount,
              penalty: row.penalty_amount,
              advance: row.advance_amount,
              other: row.other_amount,
            },
            gross_amount: row.gross_amount,
            net_amount: row.net_amount,
            entry_status: 'calculated',
            notes: row.notes || null,
          })
        )
      )

      loadPayrollInsights({ silent: true }).catch((e) => console.error('[insights] refresh failed after excel import:', e))
      toast.success(
        `تم اعتماد ${payrollImportPreviewRows.length} مدخل راتب من ملف Excel وربطه بالالتزامات`
      )
      setPayrollImportPreviewRows([])
      setPayrollImportFileName('')
      if (payrollImportErrors.length === 0) {
        setPayrollImportHeaderError(null)
      }
    } catch (error) {
      console.error('Error confirming payroll Excel import:', error)
      const message = error instanceof Error ? error.message : 'فشل اعتماد استيراد الرواتب'
      toast.error(message)
    } finally {
      setConfirmingPayrollExcelImport(false)
    }
  }

  const handleClearPayrollImportPreview = () => {
    setPayrollImportPreviewRows([])
    setPayrollImportErrors([])
    setPayrollImportHeaderError(null)
    setPayrollImportFileName('')
  }

  const handleDownloadDaysTemplate = async () => {
    try {
      const XLSX = await loadXlsx()
      const headers = ['م', 'الاسم', 'رقم الإقامة', 'أيام الحضور', 'الاجازات المدفوعة']
      const rows = scopedPayrollEmployees.length > 0
        ? scopedPayrollEmployees.map((emp, i) => [
            i + 1,
            emp.name ?? '',
            emp.residence_number ?? '',
            30,
            0,
          ])
        : [[1, '', '', 30, 0]]
      const wsData = [headers, ...rows]
      const ws = XLSX.utils.aoa_to_sheet(wsData)
      ws['!cols'] = [{ wch: 5 }, { wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 18 }]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'الأيام')
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(blob, 'نموذج_استيراد_الايام.xlsx')
      toast.success('تم تحميل نموذج Excel للأيام')
    } catch {
      toast.error('فشل تحميل النموذج')
    }
  }

  const handleOpenDaysExcelImport = () => {
    daysExcelInputRef.current?.click()
  }

  const handleClearDaysImport = () => {
    setDaysImportPreviewRows([])
    setDaysImportErrors([])
    setDaysImportFileName('')
  }

  const handleDaysExcelFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (event.target) event.target.value = ''

    if (!selectedPayrollRun) {
      toast.error('يرجى اختيار مسير أولاً')
      return
    }
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      toast.error('يرجى اختيار ملف Excel صالح (.xlsx أو .xls)')
      return
    }

    if (payrollEntries.length === 0) {
      toast.error('لا توجد إدخالات رواتب في هذا المسير بعد')
      return
    }

    setDaysImportFileName(selectedFile.name)
    setDaysImportPreviewRows([])
    setDaysImportErrors([])

    try {
      setImportingDaysExcel(true)

      const fileData = await selectedFile.arrayBuffer()
      const XLSX = await loadXlsx()
      const workbook = XLSX.read(fileData)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' })

      if (rows.length === 0) {
        toast.error('ملف Excel فارغ')
        return
      }

      const getColValue = (row: Record<string, unknown>, aliases: readonly string[]): unknown => {
        const normalized = new Map<string, unknown>()
        Object.entries(row).forEach(([k, v]) => normalized.set(normalizePayrollExcelHeader(k), v))
        for (const alias of aliases) {
          const val = normalized.get(normalizePayrollExcelHeader(alias))
          if (val !== undefined && val !== '') return val
        }
        return ''
      }

      const entriesByIqama = new Map<string, typeof payrollEntries[0]>()
      for (const entry of payrollEntries) {
        const key = normalizeResidenceNumber(entry.residence_number_snapshot)
        if (key) entriesByIqama.set(key, entry)
      }

      const importErrors: string[] = []
      const previewRows: DaysImportPreviewRow[] = []

      for (const [index, row] of rows.entries()) {
        const rawIqama = getColValue(row, DAYS_IMPORT_HEADERS.iqama)
        const iqama = normalizeResidenceNumber(rawIqama)

        if (!iqama) {
          importErrors.push(`الصف ${index + 2}: رقم الإقامة مفقود أو غير صالح`)
          continue
        }

        const entry = entriesByIqama.get(iqama)
        if (!entry) {
          importErrors.push(
            `الصف ${index + 2}: لا يوجد إدخال راتب في المسير برقم إقامة ${iqama}`
          )
          continue
        }

        const rawAttendance = getColValue(row, DAYS_IMPORT_HEADERS.attendance_days)
        const rawDaysOff = getColValue(row, DAYS_IMPORT_HEADERS.paid_leave_days)
        const attendance_days = toNumericPayrollValue(rawAttendance)
        const paid_leave_days = toNumericPayrollValue(rawDaysOff)

        if (attendance_days < 0 || paid_leave_days < 0) {
          importErrors.push(`الصف ${index + 2}: أيام الحضور وأيام الإجازة لا يمكن أن تكون سالبة`)
          continue
        }

        const totalDeductions =
          Number(entry.deductions_amount || 0) + Number(entry.installment_deducted_amount || 0)
        const { grossAmount: new_gross, netAmount: new_net } = calculatePayrollTotals(
          Number(entry.basic_salary_snapshot || 0),
          attendance_days,
          paid_leave_days,
          Number(entry.overtime_amount || 0),
          totalDeductions
        )

        if (new_net < 0) {
          importErrors.push(
            `الصف ${index + 2}: صافي الراتب سيكون سالبًا (${new_net.toLocaleString('en-US')}) بعد التحديث`
          )
          continue
        }

        previewRows.push({
          row_number: index + 2,
          iqama,
          employee_name_from_file: String(getColValue(row, DAYS_IMPORT_HEADERS.employee_name) || '').trim(),
          attendance_days,
          paid_leave_days,
          entry_id: entry.id,
          employee_name_snapshot: entry.employee_name_snapshot,
          old_attendance_days: Number(entry.attendance_days || 0),
          old_paid_leave_days: Number(entry.paid_leave_days || 0),
          old_gross: Number(entry.gross_amount || 0),
          old_net: Number(entry.net_amount || 0),
          new_gross,
          new_net,
          basic_salary_snapshot: Number(entry.basic_salary_snapshot || 0),
          overtime_amount: Number(entry.overtime_amount || 0),
          deductions_amount: Number(entry.deductions_amount || 0),
          installment_deducted_amount: Number(entry.installment_deducted_amount || 0),
        })
      }

      setDaysImportErrors(importErrors)
      setDaysImportPreviewRows(previewRows)

      if (previewRows.length === 0) {
        toast.warning('لم يُعثر على أي صف قابل للتحديث في الملف')
      } else {
        toast.success(
          `تم تحضير ${previewRows.length} موظف للمراجعة${importErrors.length > 0 ? ` (${importErrors.length} صف به خطأ)` : ''}`
        )
      }
    } catch (error) {
      console.error('Error reading days Excel file:', error)
      toast.error('فشل قراءة ملف Excel')
    } finally {
      setImportingDaysExcel(false)
    }
  }

  const handleConfirmDaysImport = async () => {
    if (!selectedPayrollRun || daysImportPreviewRows.length === 0) {
      toast.error('لا توجد صفوف جاهزة للتحديث')
      return
    }

    try {
      setConfirmingDaysImport(true)

      const dayUpdateResults = await Promise.all(
        daysImportPreviewRows.map((row) =>
          supabase
            .from('payroll_entries')
            .update({
              attendance_days: row.attendance_days,
              paid_leave_days: row.paid_leave_days,
              gross_amount: row.new_gross,
              net_amount: row.new_net,
              updated_at: new Date().toISOString(),
            })
            .eq('id', row.entry_id)
        )
      )
      const firstDayUpdateError = dayUpdateResults.find((r) => r.error)?.error
      if (firstDayUpdateError) throw firstDayUpdateError

      await refetchPayrollEntries()
      toast.success(`تم تحديث أيام ${daysImportPreviewRows.length} موظف في المسير بنجاح`)
      handleClearDaysImport()
    } catch (error) {
      console.error('Error confirming days import:', error)
      const message = error instanceof Error ? error.message : 'فشل تحديث أيام الموظفين'
      toast.error(message)
    } finally {
      setConfirmingDaysImport(false)
    }
  }

  const handlePayrollExcelImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]

    if (!selectedPayrollRun) {
      toast.error('يرجى اختيار مسير أولاً')
      event.target.value = ''
      return
    }

    if (!selectedFile) {
      return
    }

    setPayrollImportErrors([])
    setPayrollImportHeaderError(null)
    setPayrollImportPreviewRows([])
    setPayrollImportFileName(selectedFile.name)

    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      toast.error('يرجى اختيار ملف Excel صالح')
      event.target.value = ''
      return
    }

    try {
      setImportingPayrollExcel(true)
      const fileData = await selectedFile.arrayBuffer()
      const XLSX = await loadXlsx()
      const workbook = XLSX.read(fileData)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' })

      if (rows.length === 0) {
        toast.error('ملف Excel فارغ')
        return
      }

      const sheetHeaders = Object.keys(rows[0] ?? {}).map((header) =>
        normalizePayrollExcelHeader(header)
      )
      const missingRequiredHeaders = REQUIRED_PAYROLL_EXCEL_FIELDS.filter((fieldKey) => {
        const aliases = PAYROLL_EXCEL_HEADERS[fieldKey]
        return !aliases.some((alias) => sheetHeaders.includes(normalizePayrollExcelHeader(alias)))
      })

      if (missingRequiredHeaders.length > 0) {
        const missingHeadersText = missingRequiredHeaders
          .map((fieldKey) => PAYROLL_EXCEL_HEADERS[fieldKey][0])
          .join('، ')
        setPayrollImportHeaderError(
          `الملف لا يحتوي على الأعمدة المطلوبة التالية: ${missingHeadersText}`
        )
        toast.error('هيكل ملف الرواتب غير صحيح')
        return
      }

      const scopedEmployeesByResidence = new Map(
        scopedPayrollEmployees.map((employee) => [
          normalizeResidenceNumber(employee.residence_number),
          employee,
        ])
      )

      const normalizedRows: PayrollExcelRow[] = rows.map((row) => {
        const normalizedMap = new Map<string, unknown>()
        Object.entries(row).forEach(([key, value]) => {
          normalizedMap.set(normalizePayrollExcelHeader(key), value)
        })

        const getValue = (aliases: readonly string[]) => {
          for (const alias of aliases) {
            const match = normalizedMap.get(normalizePayrollExcelHeader(alias))
            if (match !== undefined) {
              return match
            }
          }
          return ''
        }

        const transferRenewalAmount = toNumericPayrollValue(
          getValue(PAYROLL_EXCEL_HEADERS.transfer_renewal_amount)
        )
        const penaltyAmount = toNumericPayrollValue(getValue(PAYROLL_EXCEL_HEADERS.penalty_amount))
        const advanceAmount = toNumericPayrollValue(getValue(PAYROLL_EXCEL_HEADERS.advance_amount))
        const otherAmount = toNumericPayrollValue(getValue(PAYROLL_EXCEL_HEADERS.other_amount))
        const legacyDeductionsAmount = toNumericPayrollValue(
          getValue(PAYROLL_EXCEL_HEADERS.deductions_amount)
        )
        const legacyInstallmentAmount = toNumericPayrollValue(
          getValue(PAYROLL_EXCEL_HEADERS.installment_deducted_amount)
        )

        return {
          residence_number: normalizeResidenceNumber(
            getValue(PAYROLL_EXCEL_HEADERS.residence_number)
          ),
          attendance_days: toNumericPayrollValue(getValue(PAYROLL_EXCEL_HEADERS.attendance_days)),
          paid_leave_days: toNumericPayrollValue(getValue(PAYROLL_EXCEL_HEADERS.paid_leave_days)),
          overtime_amount: toNumericPayrollValue(getValue(PAYROLL_EXCEL_HEADERS.overtime_amount)),
          transfer_renewal_amount: transferRenewalAmount,
          penalty_amount: penaltyAmount || legacyDeductionsAmount,
          advance_amount: advanceAmount || legacyInstallmentAmount,
          other_amount: otherAmount,
          deductions_amount: penaltyAmount + otherAmount || legacyDeductionsAmount,
          installment_deducted_amount:
            transferRenewalAmount + advanceAmount || legacyInstallmentAmount,
          overtime_notes: String(getValue(PAYROLL_EXCEL_HEADERS.overtime_notes) || '').trim(),
          deductions_notes: String(getValue(PAYROLL_EXCEL_HEADERS.deductions_notes) || '').trim(),
          notes: String(getValue(PAYROLL_EXCEL_HEADERS.notes) || '').trim(),
        }
      })

      // كشف تكرار رقم الإقامة — يُرفض الملف فوراً عند وجود تكرار
      const seenIqamas = new Set<string>()
      const duplicateIqamas = new Set<string>()
      for (const row of normalizedRows) {
        if (row.residence_number) {
          if (seenIqamas.has(row.residence_number)) duplicateIqamas.add(row.residence_number)
          else seenIqamas.add(row.residence_number)
        }
      }
      if (duplicateIqamas.size > 0) {
        setPayrollImportHeaderError(
          `الملف يحتوي على تكرار في أرقام الإقامة التالية: ${[...duplicateIqamas].join('، ')}`
        )
        toast.error('لا يُقبل ملف يحتوي على نفس رقم الإقامة مرتين — يرجى تصحيح الملف وإعادة الرفع')
        return
      }

      const importErrors: string[] = []
      const previewRows: PayrollExcelPreviewRow[] = []

      for (const [index, row] of normalizedRows.entries()) {
        if (!row.residence_number) {
          importErrors.push(`الصف ${index + 2}: رقم الإقامة مفقود`)
          continue
        }

        const employee = scopedEmployeesByResidence.get(row.residence_number)
        if (!employee) {
          importErrors.push(
            `الصف ${index + 2}: لا يوجد موظف ضمن نطاق المسير برقم إقامة ${row.residence_number}`
          )
          continue
        }

        const groupedImportDeductions = getPayrollObligationBreakdownTotal({
          transfer_renewal: row.transfer_renewal_amount,
          penalty: row.penalty_amount,
          advance: row.advance_amount,
          other: row.other_amount,
        })
        const {
          dailyRate: employeeDailyRate,
          grossAmount: importedGrossAmount,
          netAmount: importedNetAmount,
        } = calculatePayrollTotals(
          Number(employee.salary ?? 0),
          row.attendance_days,
          row.paid_leave_days,
          row.overtime_amount,
          groupedImportDeductions
        )

        if (importedNetAmount < 0) {
          importErrors.push(`الصف ${index + 2}: صافي الراتب لا يمكن أن يكون سالبًا`)
          continue
        }

        previewRows.push({
          row_number: index + 2,
          employee_id: employee.id,
          employee_name: employee.name,
          company_name: employee.company?.name ?? null,
          project_name: employee.project?.name ?? null,
          basic_salary_snapshot: employee.salary ?? 0,
          daily_rate_snapshot: employeeDailyRate,
          gross_amount: importedGrossAmount,
          net_amount: importedNetAmount,
          ...row,
        })
      }

      setPayrollImportPreviewRows(previewRows)

      if (importErrors.length > 0) {
        setPayrollImportErrors(importErrors)
        toast.warning(
          `تمت معاينة ${previewRows.length} صف صالح، وتعذر تجهيز ${importErrors.length} صف`
        )
        console.error('Payroll Excel import errors:', importErrors)
      } else if (previewRows.length > 0) {
        toast.success(`تم تجهيز ${previewRows.length} صف للمراجعة قبل الاعتماد`)
      } else {
        toast.error('لم يتم العثور على صفوف صالحة للاستيراد')
      }
    } catch (error) {
      console.error('Error importing payroll Excel:', error)
      const message = error instanceof Error ? error.message : 'فشل استيراد ملف الرواتب'
      toast.error(message)
    } finally {
      setImportingPayrollExcel(false)
      event.target.value = ''
    }
  }

  // getPayrollStatusText/getPayrollScopeName/getPayrollInputModeText/formatPayrollMonthLabel/getPayrollRunDisplayName → imported from ./payrollDeductionsHelpers

  const getExistingRunWarningMessage = (run: {
    status: string
    scope_type: PayrollScopeType
    scope_id: string
    payroll_month: string
  }) => {
    const runLabel = getRunDisplayName(run.scope_type, run.scope_id, run.payroll_month)

    return run.status === 'cancelled'
      ? `${runLabel} موجود بالفعل لكنه ملغي حاليًا، وتم فتحه لك. اضغط على إعادة فتح المسير للمتابعة.`
      : `${runLabel} موجود بالفعل وتم فتحه لك بدل إنشاء نسخة مكررة.`
  }

  const handleTogglePayrollRunForm = () => {
    if (!showPayrollRunForm) {
      const defaultScopeType: PayrollScopeType = projects.length > 0 ? 'project' : 'company'
      const defaultScopeOptions = defaultScopeType === 'project' ? projects : companies

      setPayrollForm((current) => ({
        ...current,
        scope_type: defaultScopeType,
        scope_id:
          defaultScopeOptions.some((item) => item.id === current.scope_id) &&
          current.scope_type === defaultScopeType
            ? current.scope_id
            : (defaultScopeOptions[0]?.id ?? ''),
      }))
    } else {
      setNewPayrollRunRows([])
    }

    setShowPayrollRunForm((current) => !current)
  }

  const handleRefreshPayrollData = async () => {
    // هنا المستخدم طلب تحديث صريح — ننتظر ونعرض الأخطاء (مختلف عن التحديثات الخلفية الصامتة)
    await Promise.all([
      refetchPayrollRuns(),
      refetchPayrollEntries(),
      refetchPayrollSlips(),
      loadPayrollInsights(),
    ])
    toast.success('تم تحديث بيانات الرواتب')
  }

  const handleOpenPayrollEntryForm = () => {
    if (!selectedPayrollRun) {
      toast.error('يرجى اختيار مسير أولاً')
      return
    }

    if (!selectedPayrollRunEditable) {
      toast.error(
        selectedPayrollRun.status === 'cancelled'
          ? 'هذا المسير ملغي حاليًا. اضغط على إعادة فتح المسير أولاً ثم أضف الرواتب.'
          : 'لا يمكن إدخال راتب يدوي لأن هذا المسير نهائي أو ملغي'
      )
      return
    }

    if (scopedEmployeesLoading) {
      toast.warning('جاري تحميل الموظفين المرتبطين بهذا المسير، حاول مرة أخرى بعد لحظة')
      return
    }

    if (scopedPayrollEmployees.length === 0) {
      toast.warning(
        'لا يوجد موظفون داخل نطاق هذا المسير حاليًا. أضف موظفًا للنطاق أولاً ثم حاول مرة أخرى.'
      )
      return
    }

    setShowPayrollEntryForm(true)
    window.requestAnimationFrame(() => {
      payrollEntryFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const handleSelectPayrollRun = (runId: string) => {
    setSelectedPayrollRunId(runId)
    setShowPayrollRunDetailsModal(true)
    setShowPayrollEntryForm(false)
    setSelectedPayrollSlipEntryId(null)
    setPayrollRunDeleteConfirmOpen(false)
  }

  const handleClosePayrollRunDetailsModal = () => {
    setShowPayrollRunDetailsModal(false)
    setShowPayrollEntryForm(false)
    setSelectedPayrollSlipEntryId(null)
    setPayrollRunDeleteConfirmOpen(false)
    setPaymentMethodFilter([])
  }

  const handleEditPayrollEntry = (entry: PayrollEntry) => {
    if (!selectedPayrollRunEditable) {
      toast.error('أعد المسير إلى مسودة أولاً ثم قم بالتعديل')
      return
    }

    setShowPayrollEntryForm(true)
    setPayrollEntryForm((current) => ({
      ...current,
      employee_id: entry.employee_id,
    }))

    window.requestAnimationFrame(() => {
      payrollEntryFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const handleDeletePayrollRun = () => {
    if (!selectedPayrollRun) {
      toast.error('يرجى اختيار مسير أولاً')
      return
    }

    if (selectedPayrollRun.status !== 'cancelled') {
      toast.error('يمكن حذف المسير الملغي فقط')
      return
    }

    setPayrollRunDeleteConfirmOpen(true)
  }

  const handleConfirmDeletePayrollRun = async () => {
    if (!selectedPayrollRun) {
      toast.error('يرجى اختيار مسير أولاً')
      return
    }

    try {
      await deletePayrollRun.mutateAsync(selectedPayrollRun.id)
      const nextAvailableRun = payrollRunList.find((run) => run.id !== selectedPayrollRun.id)
      setSelectedPayrollRunId(nextAvailableRun?.id ?? null)
      setShowPayrollRunDetailsModal(false)
      setSelectedPayrollSlipEntryId(null)
      setShowPayrollEntryForm(false)
      setPayrollRunDeleteConfirmOpen(false)
      loadPayrollInsights({ silent: true }).catch((e) => console.error('[insights] refresh failed after run delete:', e))
      toast.success('تم حذف المسير بنجاح')
    } catch (error) {
      console.error('Error deleting payroll run:', error)
      const message = error instanceof Error ? error.message : 'فشل حذف المسير'
      toast.error(message)
    }
  }


  const showRunsBlock = !hideTabBar || activePageTab === 'runs'

  return {
    canEdit, canDelete, canCreate, canExport, canView, isAdmin,
    hasPayrollViewPermission,
    activePageTab, setActivePageTab,
    showRunsBlock, hideTabBar,
    getScopeName, getRunDisplayName,
    getPayrollStatusText, getPayrollInputModeText, formatPayrollMonthLabel, sanitizePayrollFileName,
    companies, projects,
    allEmployees, allActiveEmployees,
    payrollRuns, payrollRunList: payrollRuns, payrollRunsLoading,
    payrollEntries, payrollEntriesLoading,
    payrollSlips,
    refetchPayrollRuns, refetchPayrollEntries, refetchPayrollSlips,
    allObligationsSummary, obligationsLoading, refetchObligations,
    detailObligationPlans, detailObligationsLoading,
    slipEmployeeObligationPlans,
    createPayrollRun, upsertPayrollEntry, updatePayrollRunStatus, deletePayrollRun,
    createObligationPlan, bulkCreatePenaltyPlans, updateObligationPlan, deleteObligationPlan, updateObligationLinePayment,
    selectedPayrollRun, selectedPayrollRunEditable,
    scopeOptions, normalizedPayrollFormMonth,
    payrollRunSeedEmployees, payrollRunSeedEmployeesLoading,
    scopedPayrollEmployees, scopedEmployeesLoading,
    selectedPayrollEmployee,
    selectedNewPayrollRunRows, allNewPayrollRunRowsSelected,
    seedEmployeeIds, payrollSlipEntryIds,
    selectedPayrollSlip, selectedSlipEntry, selectedSlipSnapshot, selectedSlipComponents, selectedSlipTotals,
    payrollEntryBreakdownById,
    baseSalary, deductionBreakdown, groupedDeductionsTotal, dailyRate, grossAmount, netAmount,
    filteredPayrollSearchRows, filteredObligationInsightRows,
    obligationStats, projectFilterOptions,
    filteredPayrollRunList, payrollRunStatsRows, payrollRunCardsStats,
    exportablePayrollRunIds, allExportablePayrollRunsSelected,
    filteredObligationsSummary, dialogEmployeeOptions,
    payrollTableContainerRef, payrollExcelInputRef, daysExcelInputRef,
    payrollEntryFormRef, payrollSlipPreviewRef, obligationImportFileRef,
    payrollRowVirtualizer,
    payrollSearchQuery, setPayrollSearchQuery,
    payrollSearchMonth, setPayrollSearchMonth,
    payrollSearchProject, setPayrollSearchProject,
    payrollSearchSortField, setPayrollSearchSortField,
    payrollSearchSortDirection, setPayrollSearchSortDirection,
    payrollInsightsLoading, paymentMethodFilter, setPaymentMethodFilter,
    loadPayrollInsights,
    selectedPayrollRunId, setSelectedPayrollRunId,
    showPayrollRunForm, setShowPayrollRunForm,
    showPayrollRunDetailsModal, setShowPayrollRunDetailsModal,
    showPayrollEntryForm, setShowPayrollEntryForm,
    selectedPayrollSlipEntryId, setSelectedPayrollSlipEntryId,
    payrollRunDeleteConfirmOpen, setPayrollRunDeleteConfirmOpen,
    payrollRunStatsMonth, setPayrollRunStatsMonth,
    payrollRunStatsRunId, setPayrollRunStatsRunId,
    selectedPayrollExportRunIds, setSelectedPayrollExportRunIds,
    exportingSelectedPayrollRuns, setExportingSelectedPayrollRuns,
    payrollForm, setPayrollForm,
    newPayrollRunRows, setNewPayrollRunRows,
    payrollEntryForm, setPayrollEntryForm,
    importingPayrollExcel, setImportingPayrollExcel,
    confirmingPayrollExcelImport, setConfirmingPayrollExcelImport,
    payrollImportErrors, setPayrollImportErrors,
    payrollImportHeaderError, setPayrollImportHeaderError,
    payrollImportPreviewRows, setPayrollImportPreviewRows,
    payrollImportFileName, setPayrollImportFileName,
    importingDaysExcel, setImportingDaysExcel,
    confirmingDaysImport, setConfirmingDaysImport,
    daysImportPreviewRows, setDaysImportPreviewRows,
    daysImportFileName, setDaysImportFileName,
    daysImportErrors, setDaysImportErrors,
    obligationsSearchQuery, setObligationsSearchQuery,
    obligationsProjectFilter, setObligationsProjectFilter,
    obligationsTypeFilter, setObligationsTypeFilter,
    obligationsDateFrom, setObligationsDateFrom,
    obligationsDateTo, setObligationsDateTo,
    showExportObligationsDialog, setShowExportObligationsDialog,
    exportScope, setExportScope, exportTypes, setExportTypes, exportColumns, setExportColumns,
    exportingObligations,
    showAddObligationDialog, setShowAddObligationDialog,
    addObligationEmployeeSearch, setAddObligationEmployeeSearch,
    addObligationSelectedEmployeeId, setAddObligationSelectedEmployeeId,
    addObligationForm, setAddObligationForm,
    addObligationStartMonthConflict, checkingAddObligationMonth,
    editingDetailPlanId, setEditingDetailPlanId,
    editDetailPlanForm, setEditDetailPlanForm,
    deletingDetailPlanId, setDeletingDetailPlanId,
    obligationDetailEmployeeId, editingObligationLineId, setEditingObligationLineId,
    obligationPaymentForm, setObligationPaymentForm,
    showObligationImportDialog, setShowObligationImportDialog,
    obligationImportStep, setObligationImportStep,
    obligationImportRows, setObligationImportRows, importingObligations,
    obligationImportFileName, setObligationImportFileName,
    obligationImportHeaderError, setObligationImportHeaderError,
    showBulkPenaltyDialog, setShowBulkPenaltyDialog,
    bulkPenaltySearch, setBulkPenaltySearch,
    bulkPenaltySelectedIds, setBulkPenaltySelectedIds,
    bulkPenaltyAmount, setBulkPenaltyAmount,
    bulkPenaltyMonth, setBulkPenaltyMonth,
    bulkPenaltyNotes, setBulkPenaltyNotes,
    confirmingBulkPenalty,
    downloadingSlipPdf,
    handleAddObligation, handleOpenEditDetailPlan, handleUpdateDetailPlan, handleDeleteDetailPlan,
    handleObligationImportFile, handleConfirmBulkPenalty, handleConfirmObligationImport,
    handleOpenObligationDetail, handleCloseObligationDetail,
    handleStartEditObligationLine, handleSaveObligationLinePayment,
    handleUpdateNewPayrollRunRow, handleToggleSelectAllNewPayrollRows,
    handleTogglePayrollRunExportSelection, handleToggleSelectAllPayrollRuns, handleExportSelectedPayrollRuns,
    handleCreatePayrollRun, handleUpsertPayrollEntry, handleUpdatePayrollRunStatus,
    handleDownloadPayrollSlipPdf,
    handleOpenPayrollExcelImport, handleConfirmPayrollExcelImport, handleClearPayrollImportPreview,
    handleDownloadDaysTemplate, handleOpenDaysExcelImport, handleClearDaysImport,
    handleDaysExcelFile, handleConfirmDaysImport, handlePayrollExcelImport,
    downloadPayrollTemplate,
    handleTogglePayrollRunForm, handleRefreshPayrollData,
    handleOpenPayrollEntryForm, handleSelectPayrollRun, handleClosePayrollRunDetailsModal,
    handleEditPayrollEntry, handleDeletePayrollRun, handleConfirmDeletePayrollRun,
    exportPayrollToExcel, exportPayrollByPaymentMethod, exportObligationsToExcel,
  }
}
