import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  PayrollEntry,
  PayrollInputMode,
  PayrollRun,
  PayrollScopeType,
  supabase,
} from '@/lib/supabase'
import { logger } from '@/utils/logger'
import { normalizePayrollEntryAmounts, roundPayrollAmount } from '@/utils/payrollMath'
import {
  takePayrollSnapshot,
  comparePayrollSnapshots,
  hasPayrollDrift,
  type PayrollSnapshot,
  type PayrollDiff,
} from '@/utils/payrollSnapshot'
import { isFeatureEnabled } from '@/lib/featureFlags'
import {
  syncPayrollEntryComponents,
  restorePayrollEntryAllocations,
  type UpsertPayrollEntryInput,
  type PayrollSlipSummary,
} from './usePayrollEntries'
import {
  EMPTY_PAYROLL_OBLIGATION_BREAKDOWN,
  type PayrollObligationBreakdown,
} from '@/utils/payrollObligationBuckets'
import { getBucketForObligationType } from './usePayrollEntries/usePayrollEntriesCalculations'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PayrollRunSummary extends PayrollRun {
  entry_count: number
  total_gross_amount: number
  total_net_amount: number
  total_installment_deducted_amount: number
}

export interface CreatePayrollRunInput {
  payroll_month: string
  scope_type: PayrollScopeType
  scope_id: string
  input_mode: PayrollInputMode
  notes?: string | null
}

export interface UpdatePayrollRunStatusInput {
  runId: string
  status: PayrollRun['status']
  approved_at?: string | null
}

export interface ValidatePayrollRunInput {
  runId: string
  operation: () => Promise<void>
}

export interface ValidatePayrollRunResult {
  before: PayrollSnapshot
  after: PayrollSnapshot
  diff: PayrollDiff
  hasDrift: boolean
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function getEntryStatusForRunStatus(status: PayrollRun['status']): PayrollEntry['entry_status'] {
  switch (status) {
    case 'finalized': return 'finalized'
    case 'cancelled': return 'cancelled'
    case 'draft':
    case 'processing':
    default: return 'calculated'
  }
}

function buildPayrollSlipNumber(run: PayrollRun, entry: PayrollEntry): string {
  const payrollMonth = run.payroll_month.slice(0, 7).replace('-', '')
  return `SLIP-${payrollMonth}-${entry.residence_number_snapshot}-${entry.id.slice(0, 8).toUpperCase()}`
}

interface PayrollEntryComponentRow {
  payroll_entry_id: string
  component_type: 'earning' | 'deduction' | 'installment'
  component_code: string
  amount: number
  notes?: string | null
  source_line_id?: string | null
  sort_order: number
}

async function syncPayrollSlipsForRun(run: PayrollRun) {
  const { data: entries, error: entriesError } = await supabase
    .from('payroll_entries')
    .select(
      'id,payroll_run_id,employee_id,residence_number_snapshot,employee_name_snapshot,company_name_snapshot,project_name_snapshot,basic_salary_snapshot,daily_rate_snapshot,attendance_days,paid_leave_days,overtime_amount,overtime_notes,deductions_amount,deductions_notes,installment_deducted_amount,gross_amount,net_amount,entry_status,notes,created_at,updated_at'
    )
    .eq('payroll_run_id', run.id)
    .order('employee_name_snapshot', { ascending: true })

  if (entriesError) {
    logger.error('Error fetching payroll entries for slip generation:', entriesError)
    throw entriesError
  }

  const entryList = (entries ?? []) as PayrollEntry[]
  if (entryList.length === 0) return 0

  const entryIds = entryList.map((entry) => entry.id)
  const { data: components, error: componentsError } = await supabase
    .from('payroll_entry_components')
    .select('payroll_entry_id, component_type, component_code, amount, notes, source_line_id, sort_order')
    .in('payroll_entry_id', entryIds)
    .order('sort_order', { ascending: true })

  if (componentsError) {
    logger.error('Error fetching payroll components for slip generation:', componentsError)
    throw componentsError
  }

  const componentsByEntryId = new Map<string, PayrollEntryComponentRow[]>()
  for (const component of (components ?? []) as PayrollEntryComponentRow[]) {
    const existingComponents = componentsByEntryId.get(component.payroll_entry_id) ?? []
    existingComponents.push(component)
    componentsByEntryId.set(component.payroll_entry_id, existingComponents)
  }

  const generatedAt = new Date().toISOString()
  const slipsPayload = entryList.map((entry) => ({
    payroll_entry_id: entry.id,
    slip_number: buildPayrollSlipNumber(run, entry),
    template_version: 'v1',
    snapshot_data: {
      payroll_run: {
        id: run.id,
        payroll_month: run.payroll_month,
        scope_type: run.scope_type,
        scope_id: run.scope_id,
        status: run.status,
        approved_at: run.approved_at ?? null,
      },
      payroll_entry: entry,
      components: componentsByEntryId.get(entry.id) ?? [],
    },
    generated_at: generatedAt,
  }))

  const { error: slipsError } = await supabase
    .from('payroll_slips')
    .upsert(slipsPayload, { onConflict: 'payroll_entry_id' })

  if (slipsError) {
    logger.error('Error upserting payroll slips:', slipsError)
    throw slipsError
  }

  return slipsPayload.length
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function usePayrollRuns() {
  return useQuery({
    queryKey: ['payroll-runs'],
    queryFn: async () => {
      const { data: runs, error: runsError } = await supabase
        .from('payroll_runs')
        .select(
          'id,payroll_month,scope_type,scope_id,input_mode,status,notes,created_by_user_id,approved_by_user_id,created_at,updated_at,approved_at'
        )
        .order('payroll_month', { ascending: false })
        .order('created_at', { ascending: false })

      if (runsError) {
        logger.error('Error fetching payroll runs:', runsError)
        throw runsError
      }

      const runList = (runs ?? []) as PayrollRun[]
      if (runList.length === 0) return [] as PayrollRunSummary[]

      const runIds = runList.map((run) => run.id)
      const { data: entries, error: entriesError } = await supabase
        .from('payroll_entries')
        .select(
          'payroll_run_id, basic_salary_snapshot, attendance_days, paid_leave_days, overtime_amount, gross_amount, net_amount, installment_deducted_amount'
        )
        .in('payroll_run_id', runIds)

      if (entriesError) {
        logger.error('Error fetching payroll entry summaries:', entriesError)
        throw entriesError
      }

      const totalsByRunId = new Map<string, PayrollRunSummary>()
      for (const run of runList) {
        totalsByRunId.set(run.id, {
          ...run,
          entry_count: 0,
          total_gross_amount: 0,
          total_net_amount: 0,
          total_installment_deducted_amount: 0,
        })
      }

      for (const entry of entries ?? []) {
        const summary = totalsByRunId.get(entry.payroll_run_id as string)
        if (!summary) continue
        const normalized = normalizePayrollEntryAmounts(entry as Partial<PayrollEntry>)
        summary.entry_count += 1
        summary.total_gross_amount = roundPayrollAmount(summary.total_gross_amount + normalized.grossAmount)
        summary.total_net_amount = roundPayrollAmount(summary.total_net_amount + normalized.netAmount)
        summary.total_installment_deducted_amount = roundPayrollAmount(
          summary.total_installment_deducted_amount + (Number(entry.installment_deducted_amount) || 0)
        )
      }

      return runList.map((run) => totalsByRunId.get(run.id) as PayrollRunSummary)
    },
  })
}

export function usePayrollRunSlips(runId?: string) {
  return useQuery({
    queryKey: ['payroll-run-slips', runId],
    enabled: Boolean(runId),
    queryFn: async () => {
      if (!runId) return [] as PayrollSlipSummary[]

      const { data: entries, error: entriesError } = await supabase
        .from('payroll_entries')
        .select('id')
        .eq('payroll_run_id', runId)

      if (entriesError) {
        logger.error('Error fetching payroll entry ids for slips:', entriesError)
        throw entriesError
      }

      const entryIds = (entries ?? []).map((entry) => entry.id as string)
      if (entryIds.length === 0) return [] as PayrollSlipSummary[]

      const { data: slips, error: slipsError } = await supabase
        .from('payroll_slips')
        .select('id, payroll_entry_id, slip_number, snapshot_data, generated_at, template_version')
        .in('payroll_entry_id', entryIds)
        .order('generated_at', { ascending: false })

      if (slipsError) {
        logger.error('Error fetching payroll slips:', slipsError)
        throw slipsError
      }

      return (slips ?? []) as PayrollSlipSummary[]
    },
  })
}

export function useCreatePayrollRun() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreatePayrollRunInput) => {
      const { data, error } = await supabase
        .from('payroll_runs')
        .insert({
          payroll_month: input.payroll_month,
          scope_type: input.scope_type,
          scope_id: input.scope_id,
          input_mode: input.input_mode,
          notes: input.notes ?? null,
        })
        .select(
          'id,payroll_month,scope_type,scope_id,input_mode,status,notes,created_by_user_id,approved_by_user_id,created_at,updated_at,approved_at'
        )
        .single()

      if (error) {
        logger.error('Error creating payroll run:', error)
        if (error.code === '23505') {
          throw new Error(
            'يوجد مسير رواتب بالفعل لهذا الشهر ولنفس المشروع أو المؤسسة. افتح المسير الموجود بدل إنشاء مسير جديد.'
          )
        }
        throw error
      }

      return data as PayrollRun
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] })
    },
  })
}

export function useUpdatePayrollRunStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ runId, status, approved_at }: UpdatePayrollRunStatusInput) => {
      const beforeSnapshot = await takePayrollSnapshot(runId)

      const { data, error } = await supabase
        .from('payroll_runs')
        .update({ status, approved_at: approved_at ?? null })
        .eq('id', runId)
        .select(
          'id,payroll_month,scope_type,scope_id,input_mode,status,notes,created_by_user_id,approved_by_user_id,created_at,updated_at,approved_at'
        )
        .single()

      if (error) {
        logger.error('Error updating payroll run status:', error)
        throw error
      }

      const nextEntryStatus = getEntryStatusForRunStatus(status)
      const { error: entriesError } = await supabase
        .from('payroll_entries')
        .update({ entry_status: nextEntryStatus })
        .eq('payroll_run_id', runId)

      if (entriesError) {
        logger.error('Error updating payroll entry statuses:', entriesError)
        throw entriesError
      }

      const run = data as PayrollRun

      const { data: entryRows, error: entryRowsError } = await supabase
        .from('payroll_entries')
        .select(
          'id,payroll_run_id,employee_id,residence_number_snapshot,employee_name_snapshot,company_name_snapshot,project_name_snapshot,basic_salary_snapshot,daily_rate_snapshot,attendance_days,paid_leave_days,overtime_amount,overtime_notes,deductions_amount,deductions_notes,installment_deducted_amount,gross_amount,net_amount,entry_status,notes,created_at,updated_at'
        )
        .eq('payroll_run_id', runId)

      if (entryRowsError) {
        logger.error('Error fetching payroll entries after status update:', entryRowsError)
        throw entryRowsError
      }

      const runEntries = (entryRows ?? []) as PayrollEntry[]

      if (status === 'finalized') {
        await Promise.all(
          runEntries.map((entry) =>
            syncPayrollEntryComponents(
              entry,
              {
                payroll_run_id: run.id,
                payroll_run_status: 'finalized',
                payroll_month: run.payroll_month,
                employee_id: entry.employee_id,
                residence_number_snapshot: entry.residence_number_snapshot,
                employee_name_snapshot: entry.employee_name_snapshot,
                company_name_snapshot: entry.company_name_snapshot ?? null,
                project_name_snapshot: entry.project_name_snapshot ?? null,
                basic_salary_snapshot: entry.basic_salary_snapshot,
                daily_rate_snapshot: entry.daily_rate_snapshot,
                attendance_days: entry.attendance_days,
                paid_leave_days: entry.paid_leave_days,
                overtime_amount: entry.overtime_amount,
                overtime_notes: entry.overtime_notes ?? null,
                deductions_amount: entry.deductions_amount,
                deductions_notes: entry.deductions_notes ?? null,
                installment_deducted_amount: entry.installment_deducted_amount,
                gross_amount: entry.gross_amount,
                net_amount: entry.net_amount,
                entry_status: entry.entry_status,
                notes: entry.notes ?? null,
              } as UpsertPayrollEntryInput,
              true
            )
          )
        )
        await syncPayrollSlipsForRun(run)
      } else {
        const revertEntryIds = runEntries.map((entry) => entry.id)
        await restorePayrollEntryAllocations(revertEntryIds)
        // Delete stale slips — run no longer finalized
        if (revertEntryIds.length > 0) {
          await supabase.from('payroll_slips').delete().in('payroll_entry_id', revertEntryIds)
        }
      }

      const afterSnapshot = await takePayrollSnapshot(runId)
      const diff = comparePayrollSnapshots(beforeSnapshot, afterSnapshot)

      if (hasPayrollDrift(diff)) {
        logger.warn('Payroll drift detected after status update:', { runId, status, diff })
      }

      if (isFeatureEnabled('useNewPayrollRPC')) {
        const action = status === 'finalized' ? 'finalize' : status === 'cancelled' ? 'cancel' : 'calculate'
        try {
          const { data: rpcResult, error: rpcError } = await supabase.rpc('process_payroll_run', {
            p_run_id: runId,
            p_action: action,
          })

          if (rpcError) {
            logger.warn('[Dual-Write] RPC process_payroll_run failed:', rpcError)
          } else {
            const oldResult = { status: run.status, entry_count: runEntries.length }
            const newResult = rpcResult as Record<string, unknown>
            const rpcStatus = status === 'finalized' ? 'finalized' : status === 'cancelled' ? 'cancelled' : 'processing'
            if (newResult.success !== true || rpcStatus !== run.status) {
              logger.warn('[Dual-Write] Results diverged:', { old: oldResult, new: newResult })
            }
          }
        } catch (dualWriteError) {
          logger.warn('[Dual-Write] Unexpected error in dual-write validation:', dualWriteError)
        }
      }

      return run
    },
    onSuccess: (run) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] })
      queryClient.invalidateQueries({ queryKey: ['payroll-run-entries', run.id] })
      queryClient.invalidateQueries({ queryKey: ['payroll-run-slips', run.id] })
      queryClient.invalidateQueries({ queryKey: ['payroll-scope-employees'] })
      queryClient.invalidateQueries({ queryKey: ['employee-obligations'] })
      queryClient.invalidateQueries({ queryKey: ['all-obligations-summary'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-pnl'] })
      queryClient.invalidateQueries({ queryKey: ['unlinked-payroll-count'] })
      queryClient.invalidateQueries({ queryKey: ['payroll-entries-search'] })
    },
  })
}

export function useDeletePayrollRun() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (runId: string) => {
      const { data: entries, error: entriesError } = await supabase
        .from('payroll_entries')
        .select('id')
        .eq('payroll_run_id', runId)

      if (entriesError) {
        logger.error('Error fetching payroll entries before delete:', entriesError)
        throw entriesError
      }

      const entryIds = (entries ?? []).map((entry) => entry.id as string)

      if (entryIds.length > 0) {
        await restorePayrollEntryAllocations(entryIds)

        const { error: slipsError } = await supabase
          .from('payroll_slips')
          .delete()
          .in('payroll_entry_id', entryIds)

        if (slipsError) {
          logger.error('Error deleting payroll slips:', slipsError)
          throw slipsError
        }

        const { error: componentsError } = await supabase
          .from('payroll_entry_components')
          .delete()
          .in('payroll_entry_id', entryIds)

        if (componentsError) {
          logger.error('Error deleting payroll entry components:', componentsError)
          throw componentsError
        }

        const { error: deleteEntriesError } = await supabase
          .from('payroll_entries')
          .delete()
          .eq('payroll_run_id', runId)

        if (deleteEntriesError) {
          logger.error('Error deleting payroll entries:', deleteEntriesError)
          throw deleteEntriesError
        }
      }

      const { error: runDeleteError } = await supabase.from('payroll_runs').delete().eq('id', runId)

      if (runDeleteError) {
        logger.error('Error deleting payroll run:', runDeleteError)
        throw runDeleteError
      }

      return runId
    },
    onSuccess: (runId) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] })
      queryClient.invalidateQueries({ queryKey: ['payroll-run-entries', runId] })
      queryClient.invalidateQueries({ queryKey: ['payroll-run-slips', runId] })
      queryClient.invalidateQueries({ queryKey: ['payroll-scope-employees'] })
      queryClient.invalidateQueries({ queryKey: ['employee-obligations'] })
      queryClient.invalidateQueries({ queryKey: ['all-obligations-summary'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-pnl'] })
      queryClient.invalidateQueries({ queryKey: ['unlinked-payroll-count'] })
      queryClient.invalidateQueries({ queryKey: ['payroll-entries-search'] })
    },
  })
}

// ─── US1: Update Payroll Run Month ───────────────────────────────────────────

export interface UpdatePayrollRunMonthInput {
  runId: string
  newMonth: string
}

export function useUpdatePayrollRunMonth() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ runId, newMonth }: UpdatePayrollRunMonthInput) => {
      const { data: run, error: runError } = await supabase
        .from('payroll_runs')
        .select('id,scope_type,scope_id,status')
        .eq('id', runId)
        .single()

      if (runError) throw runError
      if (run.status !== 'draft') throw new Error('يمكن تغيير الشهر على مسودة فقط')

      const { data: duplicate } = await supabase
        .from('payroll_runs')
        .select('id')
        .eq('scope_type', run.scope_type)
        .eq('scope_id', run.scope_id)
        .eq('payroll_month', newMonth)
        .neq('id', runId)
        .maybeSingle()

      if (duplicate) throw new Error('يوجد مسير لهذا الشهر بالفعل')

      const { data: entries, error: entriesError } = await supabase
        .from('payroll_entries')
        .select(
          'id,payroll_run_id,employee_id,residence_number_snapshot,employee_name_snapshot,company_name_snapshot,project_name_snapshot,basic_salary_snapshot,daily_rate_snapshot,attendance_days,paid_leave_days,overtime_amount,overtime_notes,deductions_amount,deductions_notes,installment_deducted_amount,gross_amount,net_amount,entry_status,notes,created_at,updated_at'
        )
        .eq('payroll_run_id', runId)

      if (entriesError) throw entriesError

      const entryList = (entries ?? []) as PayrollEntry[]
      const employeeIds = entryList.map((e) => e.employee_id)

      // Build per-employee breakdown by obligation type for newMonth
      const breakdownMap = new Map<string, PayrollObligationBreakdown>()
      const installmentMap = new Map<string, number>()

      if (employeeIds.length > 0) {
        const { data: lines, error: linesError } = await supabase
          .from('employee_obligation_lines')
          .select('employee_id, amount_due, amount_paid, header:employee_obligation_headers!header_id(obligation_type)')
          .in('employee_id', employeeIds)
          .eq('due_month', newMonth)
          .in('line_status', ['unpaid', 'partial'])

        if (linesError) throw linesError

        for (const line of lines ?? []) {
          const empId = line.employee_id as string
          const remaining = Math.max(Number(line.amount_due) - Number(line.amount_paid), 0)
          if (remaining <= 0) continue

          const header = line.header as { obligation_type?: string } | null
          const bucket = getBucketForObligationType(
            (header?.obligation_type ?? 'other') as Parameters<typeof getBucketForObligationType>[0]
          )

          const existing = breakdownMap.get(empId) ?? { ...EMPTY_PAYROLL_OBLIGATION_BREAKDOWN }
          existing[bucket] = (existing[bucket] ?? 0) + remaining
          breakdownMap.set(empId, existing)
          installmentMap.set(empId, (installmentMap.get(empId) ?? 0) + remaining)
        }
      }

      const { error: updateRunError } = await supabase
        .from('payroll_runs')
        .update({ payroll_month: newMonth })
        .eq('id', runId)

      if (updateRunError) throw updateRunError

      // Update entries + sync components
      await Promise.all(
        entryList.map(async (entry) => {
          const inst = installmentMap.get(entry.employee_id) ?? 0
          const net = Number(entry.gross_amount) - Number(entry.deductions_amount) - inst
          const breakdown = breakdownMap.get(entry.employee_id) ?? { ...EMPTY_PAYROLL_OBLIGATION_BREAKDOWN }

          const { error: updateEntryError } = await supabase
            .from('payroll_entries')
            .update({
              installment_deducted_amount: String(inst),
              net_amount: String(net),
            })
            .eq('id', entry.id)

          if (updateEntryError) throw updateEntryError

          const updatedEntry: PayrollEntry = {
            ...entry,
            installment_deducted_amount: String(inst) as unknown as number,
            net_amount: String(net) as unknown as number,
          }

          await syncPayrollEntryComponents(
            updatedEntry,
            {
              payroll_run_id: runId,
              payroll_run_status: 'draft',
              payroll_month: newMonth,
              employee_id: entry.employee_id,
              residence_number_snapshot: Number(entry.residence_number_snapshot),
              employee_name_snapshot: entry.employee_name_snapshot,
              company_name_snapshot: entry.company_name_snapshot ?? null,
              project_name_snapshot: entry.project_name_snapshot ?? null,
              basic_salary_snapshot: Number(entry.basic_salary_snapshot),
              daily_rate_snapshot: Number(entry.daily_rate_snapshot),
              attendance_days: Number(entry.attendance_days),
              paid_leave_days: Number(entry.paid_leave_days),
              overtime_amount: Number(entry.overtime_amount),
              overtime_notes: entry.overtime_notes ?? null,
              deductions_amount: Number(entry.deductions_amount),
              deductions_notes: entry.deductions_notes ?? null,
              installment_deducted_amount: inst,
              deduction_breakdown: breakdown,
              gross_amount: Number(entry.gross_amount),
              net_amount: net,
              entry_status: entry.entry_status,
              notes: entry.notes ?? null,
            } as UpsertPayrollEntryInput,
            false
          )
        })
      )

      // Delete stale slips — run is draft, slips no longer valid
      const entryIds = entryList.map((e) => e.id)
      if (entryIds.length > 0) {
        await supabase.from('payroll_slips').delete().in('payroll_entry_id', entryIds)
      }
    },
    onSuccess: (_, { runId }) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] })
      queryClient.invalidateQueries({ queryKey: ['payroll-run-entries', runId] })
      queryClient.invalidateQueries({ queryKey: ['payroll-run-slips', runId] })
      queryClient.invalidateQueries({ queryKey: ['payroll-scope-employees'] })
      queryClient.invalidateQueries({ queryKey: ['employee-obligations'] })
      queryClient.invalidateQueries({ queryKey: ['all-obligations-summary'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-pnl'] })
      queryClient.invalidateQueries({ queryKey: ['payroll-entries-search'] })
    },
  })
}

// ─── US2: Add/Remove Payroll Run Employee ─────────────────────────────────────

export interface AddPayrollRunEmployeeInput {
  runId: string
  employeeId: string
}

export function useAddPayrollRunEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ runId, employeeId }: AddPayrollRunEmployeeInput) => {
      const { data: run, error: runError } = await supabase
        .from('payroll_runs')
        .select('id,scope_type,scope_id,status,payroll_month')
        .eq('id', runId)
        .single()

      if (runError) throw runError
      if (run.status !== 'draft') throw new Error('يمكن إضافة موظف على مسودة فقط')

      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id,name,residence_number,salary,company_id,project_id, company:companies(name), project:projects(name)')
        .eq('id', employeeId)
        .single()

      if (employeeError) throw employeeError

      const { data: existing } = await supabase
        .from('payroll_entries')
        .select('id')
        .eq('payroll_run_id', runId)
        .eq('employee_id', employeeId)
        .maybeSingle()

      if (existing) throw new Error('الموظف موجود في المسير بالفعل')

      const { data: lines, error: linesError } = await supabase
        .from('employee_obligation_lines')
        .select('amount_due,amount_paid')
        .eq('employee_id', employeeId)
        .eq('due_month', run.payroll_month)
        .in('line_status', ['unpaid', 'partial'])

      if (linesError) throw linesError

      const installment = (lines ?? []).reduce(
        (s, l) => s + Math.max(Number(l.amount_due) - Number(l.amount_paid), 0),
        0
      )

      const salary = Number((employee as { salary?: number | null }).salary || 0)
      const dailyRate = salary / 30
      const gross = salary
      const net = gross - installment

      const companyName = (employee.company as { name?: string | null } | null)?.name ?? null
      const projectName = (employee.project as { name?: string | null } | null)?.name ?? null

      const { data: insertedEntry, error: insertError } = await supabase
        .from('payroll_entries')
        .insert({
          payroll_run_id: runId,
          employee_id: employeeId,
          employee_name_snapshot: employee.name,
          residence_number_snapshot: String(employee.residence_number ?? ''),
          basic_salary_snapshot: String(salary),
          daily_rate_snapshot: String(dailyRate),
          attendance_days: '30',
          paid_leave_days: '0',
          overtime_amount: '0',
          deductions_amount: '0',
          installment_deducted_amount: String(installment),
          gross_amount: String(gross),
          net_amount: String(net),
          entry_status: 'calculated',
          company_name_snapshot: companyName,
          project_name_snapshot: projectName,
          project_id: (employee as { project_id?: string | null }).project_id ?? null,
        })
        .select(
          'id,payroll_run_id,employee_id,residence_number_snapshot,employee_name_snapshot,company_name_snapshot,project_name_snapshot,basic_salary_snapshot,daily_rate_snapshot,attendance_days,paid_leave_days,overtime_amount,overtime_notes,deductions_amount,deductions_notes,installment_deducted_amount,gross_amount,net_amount,entry_status,notes,created_at,updated_at'
        )
        .single()

      if (insertError) throw insertError

      const payrollEntry = insertedEntry as PayrollEntry
      await syncPayrollEntryComponents(
        payrollEntry,
        {
          payroll_run_id: run.id,
          payroll_run_status: 'draft',
          payroll_month: run.payroll_month,
          employee_id: employeeId,
          residence_number_snapshot: Number(employee.residence_number ?? 0),
          employee_name_snapshot: employee.name,
          company_name_snapshot: companyName,
          project_name_snapshot: projectName,
          basic_salary_snapshot: salary,
          daily_rate_snapshot: dailyRate,
          attendance_days: 30,
          paid_leave_days: 0,
          overtime_amount: 0,
          overtime_notes: null,
          deductions_amount: 0,
          deductions_notes: null,
          installment_deducted_amount: installment,
          gross_amount: gross,
          net_amount: net,
          entry_status: 'calculated',
          notes: null,
        } as UpsertPayrollEntryInput,
        false
      )

      return payrollEntry
    },
    onSuccess: (_, { runId }) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] })
      queryClient.invalidateQueries({ queryKey: ['payroll-run-entries', runId] })
      queryClient.invalidateQueries({ queryKey: ['payroll-scope-employees'] })
      queryClient.invalidateQueries({ queryKey: ['employee-obligations'] })
    },
  })
}

export interface RemovePayrollRunEmployeeInput {
  entryId: string
  runId: string
}

export function useRemovePayrollRunEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ entryId, runId: _runId }: RemovePayrollRunEmployeeInput) => {
      await restorePayrollEntryAllocations([entryId])

      const { error: componentsError } = await supabase
        .from('payroll_entry_components')
        .delete()
        .eq('payroll_entry_id', entryId)

      if (componentsError) throw componentsError

      const { error: slipsError } = await supabase
        .from('payroll_slips')
        .delete()
        .eq('payroll_entry_id', entryId)

      if (slipsError) throw slipsError

      const { error: deleteError } = await supabase
        .from('payroll_entries')
        .delete()
        .eq('id', entryId)

      if (deleteError) throw deleteError
    },
    onSuccess: (_, { runId }) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] })
      queryClient.invalidateQueries({ queryKey: ['payroll-run-entries', runId] })
      queryClient.invalidateQueries({ queryKey: ['payroll-scope-employees'] })
      queryClient.invalidateQueries({ queryKey: ['employee-obligations'] })
    },
  })
}

export async function validatePayrollRun({
  runId,
  operation,
}: ValidatePayrollRunInput): Promise<ValidatePayrollRunResult> {
  const before = await takePayrollSnapshot(runId)

  try {
    await operation()
  } catch (error) {
    logger.error('Error during payroll operation:', error)
    throw error
  }

  const after = await takePayrollSnapshot(runId)
  const diff = comparePayrollSnapshots(before, after)
  const hasDrift = hasPayrollDrift(diff)

  if (hasDrift) {
    logger.warn('Payroll drift detected:', { runId, diff })
  }

  return { before, after, diff, hasDrift }
}
