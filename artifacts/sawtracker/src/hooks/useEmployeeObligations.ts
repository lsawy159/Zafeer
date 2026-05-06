import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  EmployeeObligationHeader,
  EmployeeObligationLine,
  ObligationPlanStatus,
  ObligationType,
  supabase,
} from '@/lib/supabase'
import { logger } from '@/utils/logger'

export interface EmployeeObligationPlan extends EmployeeObligationHeader {
  lines: EmployeeObligationLine[]
}

export interface CreateEmployeeObligationPlanInput {
  employee_id: string
  obligation_type: ObligationType
  title?: string
  total_amount: number
  currency_code?: string
  start_month: string
  installment_amounts: number[]
  status?: ObligationPlanStatus
  notes?: string | null
}

interface CreateEmployeeObligationPlanResult {
  header_id: string
  line_count: number
}

function getObligationTypeLabel(type: ObligationType): string {
  switch (type) {
    case 'advance':
      return 'سلفة'
    case 'transfer':
      return 'نقل كفالة'
    case 'renewal':
      return 'تجديد'
    case 'penalty':
      return 'غرامة'
    case 'other':
    default:
      return 'التزام آخر'
  }
}

export interface UpdateEmployeeObligationLinePaymentInput {
  lineId: string
  employeeId: string
  amount_paid: number
  manual_override?: boolean
  override_reason?: string | null
  notes?: string | null
}

export function useEmployeeObligations(employeeId?: string) {
  return useQuery({
    queryKey: ['employee-obligations', employeeId],
    enabled: Boolean(employeeId),
    queryFn: async () => {
      if (!employeeId) {
        return [] as EmployeeObligationPlan[]
      }

      const { data: headers, error: headersError } = await supabase
        .from('employee_obligation_headers')
        .select(
          'id,employee_id,obligation_type,title,total_amount,currency_code,start_month,installment_count,status,created_by_user_id,superseded_by_header_id,notes,created_at,updated_at'
        )
        .eq('employee_id', employeeId)
        .order('start_month', { ascending: false })

      if (headersError) {
        logger.error('Error fetching obligation headers:', headersError)
        throw headersError
      }

      const headerList = (headers ?? []) as EmployeeObligationHeader[]
      if (headerList.length === 0) {
        return []
      }

      const headerIds = headerList.map((header) => header.id)

      const { data: lines, error: linesError } = await supabase
        .from('employee_obligation_lines')
        .select(
          'id,header_id,employee_id,due_month,amount_due,amount_paid,line_status,source_version,manual_override,override_reason,rescheduled_from_line_id,rescheduled_to_line_id,payroll_entry_id,notes,created_at,updated_at'
        )
        .eq('employee_id', employeeId)
        .in('header_id', headerIds)
        .order('due_month', { ascending: true })

      if (linesError) {
        logger.error('Error fetching obligation lines:', linesError)
        throw linesError
      }

      const linesByHeader = new Map<string, EmployeeObligationLine[]>()
      for (const line of (lines ?? []) as EmployeeObligationLine[]) {
        const existingLines = linesByHeader.get(line.header_id) ?? []
        existingLines.push(line)
        linesByHeader.set(line.header_id, existingLines)
      }

      return headerList.map((header) => ({
        ...header,
        title: header.title || getObligationTypeLabel(header.obligation_type),
        lines: linesByHeader.get(header.id) ?? [],
      }))
    },
  })
}

export function useCreateEmployeeObligationPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateEmployeeObligationPlanInput) => {
      const { data, error } = await supabase
        .rpc('create_employee_obligation_plan', {
          p_employee_id: input.employee_id,
          p_obligation_type: input.obligation_type,
          p_title: input.title?.trim() || getObligationTypeLabel(input.obligation_type),
          p_total_amount: input.total_amount,
          p_currency_code: input.currency_code ?? 'SAR',
          p_start_month: input.start_month,
          p_installment_amounts: input.installment_amounts,
          p_status: input.status ?? 'active',
          p_notes: input.notes ?? null,
        })
        .single()

      if (error) {
        logger.error('Error creating employee obligation plan:', error)
        throw error
      }

      return data as CreateEmployeeObligationPlanResult
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['employee-obligations', variables.employee_id],
      })
    },
  })
}

export function useUpdateObligationLinePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      lineId,
      employeeId,
      ...updates
    }: UpdateEmployeeObligationLinePaymentInput) => {
      const payload = {
        amount_paid: updates.amount_paid,
        manual_override: updates.manual_override ?? false,
        override_reason: updates.override_reason ?? null,
        notes: updates.notes ?? null,
      }

      const { data, error } = await supabase
        .from('employee_obligation_lines')
        .update(payload)
        .eq('id', lineId)
        .select(
          'id,header_id,employee_id,due_month,amount_due,amount_paid,line_status,source_version,manual_override,override_reason,rescheduled_from_line_id,rescheduled_to_line_id,payroll_entry_id,notes,created_at,updated_at'
        )
        .single()

      if (error) {
        logger.error('Error updating obligation line payment:', error)
        throw error
      }

      return {
        employeeId,
        line: data as EmployeeObligationLine,
      }
    },
    onSuccess: ({ employeeId }) => {
      queryClient.invalidateQueries({
        queryKey: ['employee-obligations', employeeId],
      })
      queryClient.invalidateQueries({ queryKey: ['all-obligations-summary'] })
    },
  })
}

// ========================================
// Update / Delete obligation plan (header)
// ========================================

export interface UpdateObligationPlanInput {
  plan: EmployeeObligationPlan
  employeeId: string
  updates: {
    obligation_type: ObligationType
    title: string
    total_amount: number
    notes: string | null
  }
}

export function useUpdateObligationPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ plan, updates }: UpdateObligationPlanInput) => {
      const { error: headerError } = await supabase
        .from('employee_obligation_headers')
        .update({
          obligation_type: updates.obligation_type,
          title: updates.title,
          total_amount: updates.total_amount,
          notes: updates.notes,
        })
        .eq('id', plan.id)
      if (headerError) throw headerError

      // If total_amount changed, redistribute among unpaid/partial lines
      if (Number(updates.total_amount) !== Number(plan.total_amount)) {
        const totalAlreadyPaid = plan.lines.reduce((s, l) => s + Number(l.amount_paid || 0), 0)
        const newRemaining = Number(updates.total_amount) - totalAlreadyPaid
        if (newRemaining < 0) throw new Error('المبلغ الجديد أقل مما تم سداده بالفعل')
        const unpaidLines = plan.lines.filter(
          (l) => l.line_status === 'unpaid' || l.line_status === 'partial'
        )
        if (unpaidLines.length > 0) {
          const baseHalalas = Math.floor((newRemaining * 100) / unpaidLines.length)
          let distributedHalalas = 0
          for (let i = 0; i < unpaidLines.length; i++) {
            const isLast = i === unpaidLines.length - 1
            const amtHalalas = isLast
              ? Math.round(newRemaining * 100) - distributedHalalas
              : baseHalalas
            distributedHalalas += amtHalalas
            const { error } = await supabase
              .from('employee_obligation_lines')
              .update({ amount_due: amtHalalas / 100 })
              .eq('id', unpaidLines[i].id)
            if (error) throw error
          }
        }
      }
    },
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({ queryKey: ['employee-obligations', employeeId] })
      queryClient.invalidateQueries({ queryKey: ['all-obligations-summary'] })
    },
  })
}

export function useDeleteObligationPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ planId }: { planId: string; employeeId: string }) => {
      const { error } = await supabase
        .from('employee_obligation_headers')
        .update({ status: 'cancelled' })
        .eq('id', planId)
      if (error) throw error
    },
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({ queryKey: ['employee-obligations', employeeId] })
      queryClient.invalidateQueries({ queryKey: ['all-obligations-summary'] })
    },
  })
}

// ========================================
// Summary row used in the deductions list tab
// ========================================
export interface ObligationSummaryRow {
  employee_id: string
  employee_name: string
  residence_number: string
  project_name: string
  company_name: string
  // Per-type totals (remaining / outstanding)
  transfer: number
  renewal: number
  penalty: number
  advance: number
  other: number
  total_remaining: number
  // Active header ids by type (for linking)
  active_header_ids: Record<string, string[]>
  // Upcoming month's installment per type (due_month of earliest unpaid line)
  upcoming_installment: number
}

export interface AllObligationsSummaryRow {
  employee_id: string
  employee_name: string
  residence_number: string
  project_id: string | null
  project_name: string
  company_name: string
  transfer_remaining: number
  renewal_remaining: number
  penalty_remaining: number
  advance_remaining: number
  other_remaining: number
  total_remaining: number
  total_amount: number
  total_paid: number
  min_start_month: string | null
  transfer_monthly: number
  renewal_monthly: number
  penalty_monthly: number
  advance_monthly: number
  other_monthly: number
  total_monthly: number
}

export function useAllObligationsSummary() {
  return useQuery({
    queryKey: ['all-obligations-summary'],
    queryFn: async () => {
      const [
        { data: employeesData, error: employeesError },
        { data: headersData, error: headersError },
        { data: linesData, error: linesError },
      ] = await Promise.all([
        supabase
          .from('employees')
          .select('id, name, residence_number, project_id, project_name, project:projects(name), company:companies(name)')
          .eq('is_deleted', false),
        supabase
          .from('employee_obligation_headers')
          .select('id, employee_id, obligation_type, status, total_amount, start_month')
          .in('status', ['active', 'draft']),
        supabase
          .from('employee_obligation_lines')
          .select('id, header_id, employee_id, due_month, amount_due, amount_paid, line_status')
          .in('line_status', ['unpaid', 'partial']),
      ])

      if (employeesError) throw employeesError
      if (headersError) throw headersError
      if (linesError) throw linesError

      // Build maps
      const employeeMap = new Map<
        string,
        { name: string; residence_number: string; project_id: string | null; project_name: string; company_name: string }
      >()
      ;(employeesData ?? []).forEach((emp) => {
        const projectRel = Array.isArray(emp.project) ? emp.project[0] : emp.project
        const companyRel = Array.isArray(emp.company) ? emp.company[0] : emp.company
        employeeMap.set(emp.id as string, {
          name: String(emp.name || ''),
          residence_number: String(emp.residence_number || ''),
          project_id: (emp.project_id as string | null) ?? null,
          project_name: String(projectRel?.name || emp.project_name || ''),
          company_name: String((companyRel as { name?: string } | null)?.name || ''),
        })
      })

      // Map header_id -> { obligation_type, total_amount }
      const totalAmountByEmployee = new Map<string, number>()
      const minStartMonthByEmployee = new Map<string, string>()
      ;(headersData ?? []).forEach((h) => {
        totalAmountByEmployee.set(
          h.employee_id as string,
          (totalAmountByEmployee.get(h.employee_id as string) ?? 0) + Number(h.total_amount || 0)
        )
        const startMonth = String(h.start_month || '').slice(0, 7)
        if (startMonth) {
          const existing = minStartMonthByEmployee.get(h.employee_id as string)
          if (!existing || startMonth < existing) {
            minStartMonthByEmployee.set(h.employee_id as string, startMonth)
          }
        }
      })

      // Map header_id -> obligation_type
      const headerTypeMap = new Map<string, string>()
      ;(headersData ?? []).forEach((h) => {
        headerTypeMap.set(h.id as string, h.obligation_type as string)
      })

      // Accumulate remaining & monthly per employee per type
      type TypeTotals = {
        transfer_remaining: number
        renewal_remaining: number
        penalty_remaining: number
        advance_remaining: number
        other_remaining: number
        // earliest unpaid month per type
        transfer_months: string[]
        renewal_months: string[]
        penalty_months: string[]
        advance_months: string[]
        other_months: string[]
      }

      const accByEmployee = new Map<string, TypeTotals>()

      const getAcc = (empId: string): TypeTotals => {
        if (!accByEmployee.has(empId)) {
          accByEmployee.set(empId, {
            transfer_remaining: 0,
            renewal_remaining: 0,
            penalty_remaining: 0,
            advance_remaining: 0,
            other_remaining: 0,
            transfer_months: [],
            renewal_months: [],
            penalty_months: [],
            advance_months: [],
            other_months: [],
          })
        }
        return accByEmployee.get(empId)!
      }

      ;(linesData ?? []).forEach((line) => {
        const obligationType = headerTypeMap.get(line.header_id as string) ?? 'other'
        const remaining = Math.max(
          Number(line.amount_due || 0) - Number(line.amount_paid || 0),
          0
        )
        const acc = getAcc(line.employee_id as string)
        const month = String(line.due_month || '')

        if (obligationType === 'transfer') {
          acc.transfer_remaining += remaining
          acc.transfer_months.push(month)
        } else if (obligationType === 'renewal') {
          acc.renewal_remaining += remaining
          acc.renewal_months.push(month)
        } else if (obligationType === 'penalty') {
          acc.penalty_remaining += remaining
          acc.penalty_months.push(month)
        } else if (obligationType === 'advance') {
          acc.advance_remaining += remaining
          acc.advance_months.push(month)
        } else {
          acc.other_remaining += remaining
          acc.other_months.push(month)
        }
      })

      // Build result rows — only employees with at least one outstanding obligation
      const rows: AllObligationsSummaryRow[] = []
      accByEmployee.forEach((acc, empId) => {
        const meta = employeeMap.get(empId)
        if (!meta) return

        const total =
          acc.transfer_remaining +
          acc.renewal_remaining +
          acc.penalty_remaining +
          acc.advance_remaining +
          acc.other_remaining

        if (total <= 0) return

        // Monthly installment = count of upcoming lines (next month) per type
        // We approximate by counting distinct months in upcoming lines (sorted ascending, first month)
        const earliestMonth = (months: string[]) =>
          months.length > 0 ? [...months].sort()[0] : null

        const countMonthly = (months: string[]): number => {
          const earliest = earliestMonth(months)
          if (!earliest) return 0
          return months.filter((m) => m === earliest).length
        }

        // Actually monthly = the amount due for the nearest upcoming month
        // Since lines have amount_due per line, we just sum the remaining for current lines
        // but we want the installment amount per type for the upcoming month.
        // We'll just compute total remaining per type as the "outstanding" column.

        const totalAmt = totalAmountByEmployee.get(empId) ?? 0
        rows.push({
          employee_id: empId,
          employee_name: meta.name,
          residence_number: meta.residence_number,
          project_id: meta.project_id,
          project_name: meta.project_name,
          company_name: meta.company_name,
          transfer_remaining: acc.transfer_remaining,
          renewal_remaining: acc.renewal_remaining,
          penalty_remaining: acc.penalty_remaining,
          advance_remaining: acc.advance_remaining,
          other_remaining: acc.other_remaining,
          total_remaining: total,
          total_amount: totalAmt,
          total_paid: Math.max(0, totalAmt - total),
          min_start_month: minStartMonthByEmployee.get(empId) ?? null,
          transfer_monthly: countMonthly(acc.transfer_months) > 0 ? acc.transfer_remaining / Math.max(countMonthly(acc.transfer_months), 1) : 0,
          renewal_monthly: countMonthly(acc.renewal_months) > 0 ? acc.renewal_remaining / Math.max(countMonthly(acc.renewal_months), 1) : 0,
          penalty_monthly: countMonthly(acc.penalty_months) > 0 ? acc.penalty_remaining / Math.max(countMonthly(acc.penalty_months), 1) : 0,
          advance_monthly: countMonthly(acc.advance_months) > 0 ? acc.advance_remaining / Math.max(countMonthly(acc.advance_months), 1) : 0,
          other_monthly: countMonthly(acc.other_months) > 0 ? acc.other_remaining / Math.max(countMonthly(acc.other_months), 1) : 0,
          total_monthly: 0,
        })
      })

      // Sort by employee name
      rows.sort((a, b) => a.employee_name.localeCompare(b.employee_name, 'ar'))
      return rows
    },
  })
}

// ========================================
// Bulk-create penalty plans (batch insert, 2 round-trips regardless of N)
// ========================================

export interface BulkPenaltyPlanInput {
  employee_id: string
  total_amount: number
  start_month: string // YYYY-MM-01
  notes: string | null
}

export interface BulkCreatePenaltyPlansResult {
  success_count: number
  error_count: number
  employee_ids: string[]
}

export function useBulkCreatePenaltyPlans() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (inputs: BulkPenaltyPlanInput[]): Promise<BulkCreatePenaltyPlansResult> => {
      if (inputs.length === 0) return { success_count: 0, error_count: 0 }

      // ① Batch-insert all obligation headers in a single round-trip
      const { data: headers, error: headersError } = await supabase
        .from('employee_obligation_headers')
        .insert(
          inputs.map((inp) => ({
            employee_id: inp.employee_id,
            obligation_type: 'penalty' as ObligationType,
            title: 'غرامة',
            total_amount: inp.total_amount,
            currency_code: 'SAR',
            start_month: inp.start_month,
            installment_count: 1,
            status: 'active' as ObligationPlanStatus,
            notes: inp.notes,
          }))
        )
        .select('id, employee_id')

      if (headersError) {
        logger.error('Error batch inserting penalty obligation headers:', headersError)
        throw headersError
      }

      const headerList = (headers ?? []) as { id: string; employee_id: string }[]
      if (headerList.length === 0) {
        return { success_count: 0, error_count: inputs.length }
      }

      // Build a lookup: employee_id → input (unique per batch)
      const inputByEmployeeId = new Map(inputs.map((inp) => [inp.employee_id, inp]))

      // ② Batch-insert all obligation lines in a single round-trip
      const lines = headerList.flatMap(({ id: header_id, employee_id }) => {
        const inp = inputByEmployeeId.get(employee_id)
        if (!inp) return []
        return [
          {
            header_id,
            employee_id,
            due_month: inp.start_month,
            amount_due: inp.total_amount,
            amount_paid: 0,
            line_status: 'unpaid' as const,
            source_version: 1,
          },
        ]
      })

      const { error: linesError } = await supabase
        .from('employee_obligation_lines')
        .insert(lines)

      if (linesError) {
        logger.error('Error batch inserting penalty obligation lines:', linesError)
        // Compensating rollback: cancel the orphaned headers so they don't appear
        // as active obligations without any installment lines.
        const headerIds = headerList.map((h) => h.id)
        await supabase
          .from('employee_obligation_headers')
          .update({ status: 'cancelled' })
          .in('id', headerIds)
        throw linesError
      }

      return {
        success_count: headerList.length,
        error_count: inputs.length - headerList.length,
        employee_ids: headerList.map((h) => h.employee_id),
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['all-obligations-summary'] })
      // Invalidate per-employee caches so detail modals reflect new penalties immediately
      for (const empId of result.employee_ids) {
        queryClient.invalidateQueries({ queryKey: ['employee-obligations', empId] })
      }
    },
  })
}
