import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Employee,
  ObligationType,
  PayrollEntry,
  PayrollScopeType,
  supabase,
} from '@/lib/supabase'
import { logger } from '@/utils/logger'
import {
  calculatePayrollTotals,
  normalizePayrollEntryAmounts,
} from '@/utils/payrollMath'
import {
  EMPTY_PAYROLL_OBLIGATION_BREAKDOWN,
  PayrollObligationBreakdown,
  PayrollObligationBucketKey,
  getPayrollComponentBucket,
  getPayrollComponentCode,
  getPayrollObligationBucketLabel,
  getPayrollObligationBreakdownTotal,
  normalizePayrollObligationBreakdown,
} from '@/utils/payrollObligationBuckets'
import {
  ScopedPayrollEmployee,
  UpsertPayrollEntryInput,
  PayrollInstallmentComponentRow,
  ObligationLineAllocationRow,
  ObligationHeaderRow,
  PayrollEntryComponentRow,
} from './payrollEntryTypes'
import {
  PAYROLL_COMPONENT_CODE_OVERTIME,
  getLineStatus,
  getPayrollBucketType,
  lineMatchesBucket,
  getBucketForObligationType,
} from './usePayrollEntriesCalculations'

export async function restorePayrollEntryAllocations(entryIds: string[]) {
  if (entryIds.length === 0) return

  const { data: existingComponents, error: existingComponentsError } = await supabase
    .from('payroll_entry_components')
    .select('source_line_id, amount, payroll_entry_id')
    .in('payroll_entry_id', entryIds)
    .not('source_line_id', 'is', null)

  if (existingComponentsError) {
    logger.error('Error fetching payroll components for allocation restore:', existingComponentsError)
    throw existingComponentsError
  }

  const amountByLineId = new Map<string, number>()
  for (const component of (existingComponents ?? []) as PayrollInstallmentComponentRow[]) {
    const sourceLineId = component.source_line_id ?? null
    if (!sourceLineId) continue
    const currentAmount = amountByLineId.get(sourceLineId) ?? 0
    amountByLineId.set(sourceLineId, currentAmount + (Number(component.amount) || 0))
  }

  const lineIds = Array.from(amountByLineId.keys())
  if (lineIds.length === 0) return

  const { data: obligationLines, error: obligationLinesError } = await supabase
    .from('employee_obligation_lines')
    .select('id, amount_due, amount_paid, payroll_entry_id')
    .in('id', lineIds)

  if (obligationLinesError) {
    logger.error('Error fetching obligation lines for allocation restore:', obligationLinesError)
    throw obligationLinesError
  }

  for (const line of obligationLines ?? []) {
    const amountToRestore = amountByLineId.get(line.id as string) ?? 0
    const updatedAmountPaid = Math.max((Number(line.amount_paid) || 0) - amountToRestore, 0)
    const linkedEntryId = line.payroll_entry_id as string | null

    const { error: updateLineError } = await supabase
      .from('employee_obligation_lines')
      .update({
        amount_paid: Number(updatedAmountPaid.toFixed(2)),
        payroll_entry_id: linkedEntryId && entryIds.includes(linkedEntryId) ? null : linkedEntryId,
        line_status: getLineStatus(Number(line.amount_due) || 0, updatedAmountPaid),
      })
      .eq('id', line.id)

    if (updateLineError) {
      logger.error('Error restoring obligation line allocation:', updateLineError)
      throw updateLineError
    }
  }
}

async function ensureAutoPayrollObligationLine(
  employeeId: string,
  payrollMonth: string,
  bucket: PayrollObligationBucketKey,
  amount: number
) {
  const monthKey = payrollMonth.slice(0, 7)
  const marker = `AUTO_PAYROLL_SYNC:${bucket}:${monthKey}`
  const title = `قسط ${getPayrollObligationBucketLabel(bucket)} - ${monthKey}`
  const obligationType = getPayrollBucketType(bucket)

  const { data: existingHeaders, error: existingHeadersError } = await supabase
    .from('employee_obligation_headers')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('obligation_type', obligationType)
    .ilike('notes', `%${marker}%`)
    .limit(1)

  if (existingHeadersError) {
    logger.error('Error fetching auto payroll obligation header:', existingHeadersError)
    throw existingHeadersError
  }

  let headerId = (existingHeaders?.[0]?.id as string | undefined) ?? null

  if (!headerId && amount > 0) {
    const { data, error } = await supabase
      .rpc('create_employee_obligation_plan', {
        p_employee_id: employeeId,
        p_obligation_type: obligationType,
        p_title: title,
        p_total_amount: amount,
        p_currency_code: 'SAR',
        p_start_month: payrollMonth,
        p_installment_amounts: [amount],
        p_status: 'active',
        p_notes: marker,
      })
      .single()

    if (error) {
      logger.error('Error creating auto payroll obligation plan:', error)
      throw error
    }
    headerId = (data as { header_id?: string } | null)?.header_id ?? null
  }

  if (!headerId) return null

  const { error: updateHeaderError } = await supabase
    .from('employee_obligation_headers')
    .update({
      title,
      total_amount: amount,
      installment_count: 1,
      start_month: payrollMonth,
      status: amount > 0 ? 'active' : 'completed',
      notes: marker,
    })
    .eq('id', headerId)

  if (updateHeaderError) {
    logger.error('Error updating auto payroll obligation header:', updateHeaderError)
    throw updateHeaderError
  }

  const { data: lines, error: linesError } = await supabase
    .from('employee_obligation_lines')
    .select('id, header_id, amount_due, amount_paid, payroll_entry_id, line_status')
    .eq('header_id', headerId)
    .order('due_month', { ascending: true })
    .limit(1)

  if (linesError) {
    logger.error('Error fetching auto payroll obligation line:', linesError)
    throw linesError
  }

  const line = (lines?.[0] ?? null) as ObligationLineAllocationRow | null
  if (!line) return null

  const { error: updateLineError } = await supabase
    .from('employee_obligation_lines')
    .update({
      amount_due: amount,
      amount_paid: amount <= 0 ? 0 : line.amount_paid,
      payroll_entry_id: amount <= 0 ? null : (line.payroll_entry_id ?? null),
      line_status: amount <= 0 ? 'paid' : getLineStatus(amount, Number(line.amount_paid) || 0),
      notes: marker,
    })
    .eq('id', line.id)

  if (updateLineError) {
    logger.error('Error updating auto payroll obligation line:', updateLineError)
    throw updateLineError
  }

  return {
    ...line,
    amount_due: amount,
    amount_paid: amount <= 0 ? 0 : line.amount_paid,
    payroll_entry_id: amount <= 0 ? null : (line.payroll_entry_id ?? null),
    line_status: amount <= 0 ? 'paid' : getLineStatus(amount, Number(line.amount_paid) || 0),
  }
}

export async function syncPayrollEntryComponents(
  entry: PayrollEntry,
  input: UpsertPayrollEntryInput,
  shouldApplyAllocations = false
) {
  const { data: existingComponents, error: existingComponentsError } = await supabase
    .from('payroll_entry_components')
    .select('id, amount, source_line_id, component_code, payroll_entry_id')
    .eq('payroll_entry_id', entry.id)

  if (existingComponentsError) {
    logger.error('Error fetching existing payroll components:', existingComponentsError)
    throw existingComponentsError
  }

  const previousAllocationByLineId = new Map<string, number>()
  const existingBreakdown = normalizePayrollObligationBreakdown()
  for (const component of (existingComponents ?? []) as PayrollInstallmentComponentRow[]) {
    const bucket = getPayrollComponentBucket(component.component_code)
    if (bucket) existingBreakdown[bucket] += Number(component.amount || 0)
    if (!component.source_line_id) continue
    const currentAmount = previousAllocationByLineId.get(component.source_line_id) ?? 0
    previousAllocationByLineId.set(
      component.source_line_id,
      currentAmount + (Number(component.amount) || 0)
    )
  }

  const breakdown = normalizePayrollObligationBreakdown(
    input.deduction_breakdown ??
      (getPayrollObligationBreakdownTotal(existingBreakdown) > 0
        ? existingBreakdown
        : {
            ...EMPTY_PAYROLL_OBLIGATION_BREAKDOWN,
            penalty: input.deductions_amount,
            advance: input.installment_deducted_amount,
          })
  )

  const { data: dueMonthLines, error: dueMonthLinesError } = await supabase
    .from('employee_obligation_lines')
    .select('id, header_id, amount_due, amount_paid, payroll_entry_id, line_status')
    .eq('employee_id', input.employee_id)
    .eq('due_month', input.payroll_month)
    .order('created_at', { ascending: true })

  if (dueMonthLinesError) {
    logger.error('Error fetching due month obligation lines for payroll sync:', dueMonthLinesError)
    throw dueMonthLinesError
  }

  const normalizedLines = (dueMonthLines ?? []) as ObligationLineAllocationRow[]
  const headerIds = Array.from(new Set(normalizedLines.map((line) => line.header_id).filter(Boolean)))
  const headerMap = new Map<string, ObligationHeaderRow>()

  if (headerIds.length > 0) {
    const { data: headers, error: headersError } = await supabase
      .from('employee_obligation_headers')
      .select('id, obligation_type, title, currency_code, notes')
      .in('id', headerIds)

    if (headersError) {
      logger.error('Error fetching obligation headers for payroll sync:', headersError)
      throw headersError
    }
    for (const header of (headers ?? []) as ObligationHeaderRow[]) {
      headerMap.set(header.id, header)
    }
  }

  const restoredLineUpdates: Array<{
    id: string
    amount_paid: number
    payroll_entry_id: string | null
    line_status: 'unpaid' | 'partial' | 'paid'
  }> = []
  const appliedLineUpdates = new Map<
    string,
    { id: string; amount_paid: number; payroll_entry_id: string | null; line_status: 'unpaid' | 'partial' | 'paid' }
  >()
  const componentsToInsert: PayrollEntryComponentRow[] = []
  let sortOrder = 1

  const workingLines = normalizedLines.map((line) => {
    const previousAllocatedAmount = previousAllocationByLineId.get(line.id) ?? 0
    const restoredAmountPaid = Math.max((Number(line.amount_paid) || 0) - previousAllocatedAmount, 0)
    const header = headerMap.get(line.header_id)

    if (previousAllocatedAmount > 0 || line.payroll_entry_id === entry.id) {
      restoredLineUpdates.push({
        id: line.id,
        amount_paid: Number(restoredAmountPaid.toFixed(2)),
        payroll_entry_id: line.payroll_entry_id === entry.id ? null : (line.payroll_entry_id ?? null),
        line_status: getLineStatus(Number(line.amount_due) || 0, restoredAmountPaid),
      })
    }

    return {
      ...line,
      restoredAmountPaid,
      obligation_type: header?.obligation_type ?? 'other',
      is_auto_synced: Boolean(header?.notes?.includes('AUTO_PAYROLL_SYNC:')),
    }
  })

  if (input.overtime_amount > 0) {
    componentsToInsert.push({
      payroll_entry_id: entry.id,
      component_type: 'earning',
      component_code: PAYROLL_COMPONENT_CODE_OVERTIME,
      amount: input.overtime_amount,
      notes: input.overtime_notes ?? null,
      sort_order: sortOrder++,
    })
  }

  const pushUnlinkedBucketComponent = (bucket: PayrollObligationBucketKey, amount: number) => {
    if (amount <= 0) return
    componentsToInsert.push({
      payroll_entry_id: entry.id,
      component_type: bucket === 'penalty' || bucket === 'other' ? 'deduction' : 'installment',
      component_code: getPayrollComponentCode(bucket),
      amount: Number(amount.toFixed(2)),
      notes:
        bucket === 'penalty' || bucket === 'other'
          ? (input.deductions_notes ?? null)
          : (input.notes ?? null),
      sort_order: sortOrder++,
    })
  }

  const allocateBucket = async (bucket: PayrollObligationBucketKey, requestedAmount: number) => {
    let remaining = Number(requestedAmount || 0)
    if (remaining < 0) remaining = 0

    const manualLines = workingLines.filter(
      (line) => lineMatchesBucket(line.obligation_type as ObligationType, bucket) && !line.is_auto_synced
    )

    for (const line of manualLines) {
      if (remaining <= 0) break
      const availableAmount = Math.max((Number(line.amount_due) || 0) - Number(line.restoredAmountPaid || 0), 0)
      if (availableAmount <= 0) continue
      const allocatedAmount = Math.min(availableAmount, remaining)
      const nextPaid = Number((line.restoredAmountPaid + allocatedAmount).toFixed(2))
      line.restoredAmountPaid = nextPaid
      remaining = Number((remaining - allocatedAmount).toFixed(2))

      appliedLineUpdates.set(line.id, {
        id: line.id,
        amount_paid: nextPaid,
        payroll_entry_id: entry.id,
        line_status: getLineStatus(Number(line.amount_due) || 0, nextPaid),
      })

      componentsToInsert.push({
        payroll_entry_id: entry.id,
        component_type: bucket === 'penalty' || bucket === 'other' ? 'deduction' : 'installment',
        component_code: getPayrollComponentCode(bucket),
        amount: Number(allocatedAmount.toFixed(2)),
        notes: `استقطاع ${getPayrollObligationBucketLabel(bucket)} عن شهر ${input.payroll_month.slice(0, 7)}`,
        source_line_id: line.id,
        sort_order: sortOrder++,
      })
    }

    const autoLine = await ensureAutoPayrollObligationLine(input.employee_id, input.payroll_month, bucket, remaining)

    if (autoLine && remaining > 0) {
      const nextPaid = Number(remaining.toFixed(2))
      appliedLineUpdates.set(autoLine.id, {
        id: autoLine.id,
        amount_paid: nextPaid,
        payroll_entry_id: entry.id,
        line_status: getLineStatus(Number(autoLine.amount_due) || 0, nextPaid),
      })

      componentsToInsert.push({
        payroll_entry_id: entry.id,
        component_type: bucket === 'penalty' || bucket === 'other' ? 'deduction' : 'installment',
        component_code: getPayrollComponentCode(bucket),
        amount: nextPaid,
        notes: `تمت مزامنة ${getPayrollObligationBucketLabel(bucket)} تلقائياً مع المسير`,
        source_line_id: autoLine.id,
        sort_order: sortOrder++,
      })
    }
  }

  if (shouldApplyAllocations) {
    await allocateBucket('transfer_renewal', breakdown.transfer_renewal)
    await allocateBucket('penalty', breakdown.penalty)
    await allocateBucket('advance', breakdown.advance)
    await allocateBucket('other', breakdown.other)
  } else {
    pushUnlinkedBucketComponent('transfer_renewal', breakdown.transfer_renewal)
    pushUnlinkedBucketComponent('penalty', breakdown.penalty)
    pushUnlinkedBucketComponent('advance', breakdown.advance)
    pushUnlinkedBucketComponent('other', breakdown.other)
  }

  const { error: deleteComponentsError } = await supabase
    .from('payroll_entry_components')
    .delete()
    .eq('payroll_entry_id', entry.id)

  if (deleteComponentsError) {
    logger.error('Error deleting old payroll entry components:', deleteComponentsError)
    throw deleteComponentsError
  }

  for (const lineUpdate of restoredLineUpdates) {
    const { error } = await supabase
      .from('employee_obligation_lines')
      .update({
        amount_paid: lineUpdate.amount_paid,
        payroll_entry_id: lineUpdate.payroll_entry_id,
        line_status: lineUpdate.line_status,
      })
      .eq('id', lineUpdate.id)

    if (error) {
      logger.error('Error restoring prior payroll obligation allocation:', error)
      throw error
    }
  }

  for (const lineUpdate of appliedLineUpdates.values()) {
    const { error } = await supabase
      .from('employee_obligation_lines')
      .update({
        amount_paid: lineUpdate.amount_paid,
        payroll_entry_id: lineUpdate.payroll_entry_id,
        line_status: lineUpdate.line_status,
      })
      .eq('id', lineUpdate.id)

    if (error) {
      logger.error('Error applying payroll obligation allocation:', error)
      throw error
    }
  }

  if (componentsToInsert.length > 0) {
    const { error: insertComponentsError } = await supabase
      .from('payroll_entry_components')
      .insert(componentsToInsert)

    if (insertComponentsError) {
      logger.error('Error inserting payroll entry components:', insertComponentsError)
      throw insertComponentsError
    }
  }
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function usePayrollRunEntries(runId?: string) {
  return useQuery({
    queryKey: ['payroll-run-entries', runId],
    enabled: Boolean(runId),
    queryFn: async () => {
      if (!runId) return [] as PayrollEntry[]

      const { data, error } = await supabase
        .from('payroll_entries')
        .select(
          'id,payroll_run_id,employee_id,residence_number_snapshot,employee_name_snapshot,company_name_snapshot,project_name_snapshot,basic_salary_snapshot,daily_rate_snapshot,attendance_days,paid_leave_days,overtime_amount,overtime_notes,deductions_amount,deductions_notes,installment_deducted_amount,gross_amount,net_amount,entry_status,notes,created_at,updated_at,employee:employees(bank_account)'
        )
        .eq('payroll_run_id', runId)
        .order('employee_name_snapshot', { ascending: true })

      if (error) {
        logger.error('Error fetching payroll run entries:', error)
        throw error
      }

      return ((data ?? []) as (PayrollEntry & { employee?: { bank_account?: string | null } | null })[]).map((entry) => {
        const normalized = normalizePayrollEntryAmounts(entry)
        return {
          ...entry,
          daily_rate_snapshot: normalized.dailyRate,
          gross_amount: normalized.grossAmount,
          net_amount: normalized.netAmount,
          bank_account_snapshot: entry.employee?.bank_account ?? null,
          employee: undefined,
        }
      })
    },
  })
}

export function useUpsertPayrollEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpsertPayrollEntryInput) => {
      const normalizedBreakdown = normalizePayrollObligationBreakdown(
        input.deduction_breakdown ?? {
          ...EMPTY_PAYROLL_OBLIGATION_BREAKDOWN,
          penalty: input.deductions_amount,
          advance: input.installment_deducted_amount,
        }
      )
      const totalGroupedDeductions = getPayrollObligationBreakdownTotal(normalizedBreakdown)
      const normalizedTotals = calculatePayrollTotals(
        input.basic_salary_snapshot,
        input.attendance_days,
        input.paid_leave_days,
        input.overtime_amount,
        totalGroupedDeductions
      )

      const payload = {
        payroll_run_id: input.payroll_run_id,
        employee_id: input.employee_id,
        residence_number_snapshot: input.residence_number_snapshot,
        employee_name_snapshot: input.employee_name_snapshot,
        company_name_snapshot: input.company_name_snapshot ?? null,
        project_name_snapshot: input.project_name_snapshot ?? null,
        basic_salary_snapshot: input.basic_salary_snapshot,
        daily_rate_snapshot: normalizedTotals.dailyRate,
        attendance_days: input.attendance_days,
        paid_leave_days: input.paid_leave_days,
        overtime_amount: input.overtime_amount,
        overtime_notes: input.overtime_notes ?? null,
        deductions_amount: normalizedBreakdown.penalty + normalizedBreakdown.other,
        deductions_notes: input.deductions_notes ?? null,
        installment_deducted_amount: normalizedBreakdown.transfer_renewal + normalizedBreakdown.advance,
        gross_amount: normalizedTotals.grossAmount,
        net_amount: normalizedTotals.netAmount,
        entry_status: input.entry_status,
        notes: input.notes ?? null,
      }

      const { data, error } = await supabase
        .from('payroll_entries')
        .upsert(payload, { onConflict: 'payroll_run_id,employee_id' })
        .select(
          'id,payroll_run_id,employee_id,residence_number_snapshot,employee_name_snapshot,company_name_snapshot,project_name_snapshot,basic_salary_snapshot,daily_rate_snapshot,attendance_days,paid_leave_days,overtime_amount,overtime_notes,deductions_amount,deductions_notes,installment_deducted_amount,gross_amount,net_amount,entry_status,notes,created_at,updated_at'
        )
        .single()

      if (error) {
        logger.error('Error upserting payroll entry:', error)
        throw error
      }

      const entry = data as PayrollEntry
      await syncPayrollEntryComponents(entry, input, input.payroll_run_status === 'finalized')
      // Delete stale slip — entry data changed, slip must be regenerated
      await supabase.from('payroll_slips').delete().eq('payroll_entry_id', entry.id)
      return entry
    },
    onSuccess: (entry, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] })
      queryClient.invalidateQueries({ queryKey: ['payroll-run-entries', entry.payroll_run_id] })
      queryClient.invalidateQueries({ queryKey: ['payroll-run-slips', entry.payroll_run_id] })
      queryClient.invalidateQueries({ queryKey: ['payroll-scope-employees'] })
      queryClient.invalidateQueries({ queryKey: ['employee-obligations', variables.employee_id] })
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-pnl'] })
      queryClient.invalidateQueries({ queryKey: ['unlinked-payroll-count'] })
      queryClient.invalidateQueries({ queryKey: ['payroll-entries-search'] })
    },
  })
}

export function useScopedPayrollEmployees(
  scopeType?: PayrollScopeType,
  scopeId?: string,
  payrollMonth?: string
) {
  return useQuery({
    queryKey: ['payroll-scope-employees', scopeType, scopeId, payrollMonth],
    enabled: Boolean(scopeType && scopeId && payrollMonth),
    queryFn: async () => {
      if (!scopeType || !scopeId || !payrollMonth) return [] as ScopedPayrollEmployee[]

      let employeeQuery = supabase
        .from('employees')
        .select(
          'id,company_id,name,profession,nationality,birth_date,phone,passport_number,residence_number,joining_date,contract_expiry,residence_expiry,project_name,bank_account,residence_image_url,salary,health_insurance_expiry,additional_fields,created_at,updated_at,notes,hired_worker_contract_expiry,project_id,is_deleted,deleted_at, company:companies(name), project:projects(name)'
        )
        .eq('is_deleted', false)
        .order('name', { ascending: true })

      employeeQuery =
        scopeType === 'company'
          ? employeeQuery.eq('company_id', scopeId)
          : employeeQuery.eq('project_id', scopeId)

      const { data: employees, error: employeesError } = await employeeQuery

      if (employeesError) {
        logger.error('Error fetching scoped payroll employees:', employeesError)
        throw employeesError
      }

      const rawEmployeeList = (employees ?? []) as unknown as ScopedPayrollEmployee[]
      const employeeByResidence = new Map<string, ScopedPayrollEmployee>()

      for (const employee of rawEmployeeList) {
        const normalizedResidence = String(employee.residence_number || '').trim()
        if (!normalizedResidence) {
          employeeByResidence.set(employee.id, employee)
          continue
        }
        if (!employeeByResidence.has(normalizedResidence)) {
          employeeByResidence.set(normalizedResidence, employee)
        }
      }

      const employeeList = Array.from(employeeByResidence.values())
      if (employeeList.length === 0) return [] as ScopedPayrollEmployee[]

      const employeeIds = employeeList.map((employee) => employee.id)
      const { data: obligationHeaders, error: obligationHeadersError } = await supabase
        .from('employee_obligation_headers')
        .select('id, employee_id, obligation_type, status')
        .in('employee_id', employeeIds)
        .in('status', ['active', 'draft'])

      if (obligationHeadersError) {
        logger.error('Error fetching scoped obligation headers:', obligationHeadersError)
        throw obligationHeadersError
      }

      const headerTypeById = new Map<string, ObligationType>()
      for (const header of obligationHeaders ?? []) {
        headerTypeById.set(header.id as string, header.obligation_type as ObligationType)
      }

      const { data: obligationLines, error: obligationLinesError } = await supabase
        .from('employee_obligation_lines')
        .select('employee_id, header_id, amount_due, amount_paid, line_status, due_month')
        .in('employee_id', employeeIds)
        .eq('due_month', payrollMonth)
        .in('line_status', ['unpaid', 'partial'])

      if (obligationLinesError) {
        logger.error('Error fetching scoped obligation lines:', obligationLinesError)
        throw obligationLinesError
      }

      const suggestedInstallments = new Map<string, number>()
      const suggestedBreakdown = new Map<string, PayrollObligationBreakdown>()
      for (const line of obligationLines ?? []) {
        const employeeId = line.employee_id as string
        const existing = suggestedInstallments.get(employeeId) ?? 0
        const remaining = Math.max((Number(line.amount_due) || 0) - (Number(line.amount_paid) || 0), 0)
        suggestedInstallments.set(employeeId, existing + remaining)

        const obligationType = headerTypeById.get(line.header_id as string) ?? 'other'
        const bucket = getBucketForObligationType(obligationType)
        const currentBreakdown = suggestedBreakdown.get(employeeId) ?? normalizePayrollObligationBreakdown()
        currentBreakdown[bucket] += remaining
        suggestedBreakdown.set(employeeId, currentBreakdown)
      }

      return employeeList.map((employee) => ({
        ...employee,
        suggested_installment_amount: suggestedInstallments.get(employee.id) ?? 0,
        suggested_deduction_breakdown: suggestedBreakdown.get(employee.id) ?? normalizePayrollObligationBreakdown(),
      }))
    },
  })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _EmployeeUnused = Employee
