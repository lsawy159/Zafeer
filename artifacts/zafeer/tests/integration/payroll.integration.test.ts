import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createIntegrationClient,
  signInAs,
  signOut,
  getAdminCredentials,
} from './_client'
import { deleteByPrefix } from './_cleanup'
import type { SupabaseClient } from '@supabase/supabase-js'

const PREFIX = 'IT-061-payroll'

// Known values for the test entry
const BASIC_SALARY = 3000
const ATTENDANCE_DAYS = 30
const PAID_LEAVE_DAYS = 0
const OVERTIME_AMOUNT = 200
const DEDUCTIONS_AMOUNT = 150
const INSTALLMENT_AMOUNT = 50
// gross = (attendance + paid_leave) * (salary / 30) + overtime = 30 * 100 + 200 = 3200
const EXPECTED_GROSS = 3200
// net = gross - deductions - installment = 3200 - 150 - 50 = 3000
const EXPECTED_NET = 3000

describe('Surface 1 — Payroll Integration', () => {
  let client: SupabaseClient
  let seedCompanyId: string
  let seedEmployeeId: string
  let payrollRunId: string | null = null

  beforeAll(async () => {
    client = createIntegrationClient()
    const { email, password } = getAdminCredentials()
    await signInAs(client, email, password)

    // Fetch seed company (created in Phase 2 T007)
    const { data: company, error: companyError } = await client
      .from('companies')
      .select('id, name')
      .ilike('name', 'IT-061-seed%')
      .limit(1)
      .single()

    if (companyError || !company) {
      throw new Error(
        '[T007] Seed company (IT-061-seed%) not found in test-ci. Complete Phase 2 setup first.'
      )
    }
    seedCompanyId = company.id

    // Fetch seed employee linked to seed company
    const { data: employee, error: employeeError } = await client
      .from('employees')
      .select('id, name')
      .eq('company_id', seedCompanyId)
      .eq('is_deleted', false)
      .limit(1)
      .single()

    if (employeeError || !employee) {
      throw new Error(
        '[T007] Seed employee not found in test-ci for company IT-061-seed. Complete Phase 2 setup first.'
      )
    }
    seedEmployeeId = employee.id
  })

  afterAll(async () => {
    if (!client) return
    try {
      // Clean up payroll entries first (FK constraint)
      if (payrollRunId) {
        await deleteByPrefix(client, 'payroll_entries', 'notes', PREFIX)
      }
      // Clean up payroll runs
      await deleteByPrefix(client, 'payroll_runs', 'notes', PREFIX)
    } finally {
      await signOut(client)
    }
  })

  it('creates payroll_run + payroll_entry with known values and verifies net_amount', async () => {
    const payrollMonth = '2099-01-01' // Far future to avoid collision with real data

    // Insert payroll_run
    const { data: run, error: runError } = await client
      .from('payroll_runs')
      .insert({
        payroll_month: payrollMonth,
        scope_type: 'company',
        scope_id: seedCompanyId,
        input_mode: 'manual',
        status: 'draft',
        notes: `${PREFIX}-run-${Date.now()}`,
      })
      .select('id')
      .single()

    expect(runError, `payroll_run insert failed: ${runError?.message}`).toBeNull()
    expect(run?.id).toBeTruthy()
    payrollRunId = run!.id

    // Insert payroll_entry with known values
    const { data: entry, error: entryError } = await client
      .from('payroll_entries')
      .insert({
        payroll_run_id: payrollRunId,
        employee_id: seedEmployeeId,
        residence_number_snapshot: 1061001,
        employee_name_snapshot: 'IT-061-TestEmployee',
        company_name_snapshot: 'IT-061-Seed-Co',
        basic_salary_snapshot: BASIC_SALARY,
        daily_rate_snapshot: BASIC_SALARY / 30,
        attendance_days: ATTENDANCE_DAYS,
        paid_leave_days: PAID_LEAVE_DAYS,
        overtime_amount: OVERTIME_AMOUNT,
        deductions_amount: DEDUCTIONS_AMOUNT,
        installment_deducted_amount: INSTALLMENT_AMOUNT,
        gross_amount: EXPECTED_GROSS,
        net_amount: EXPECTED_NET,
        entry_status: 'draft',
        notes: `${PREFIX}-entry-${Date.now()}`,
      })
      .select('id, gross_amount, net_amount, deductions_amount, installment_deducted_amount')
      .single()

    expect(entryError, `payroll_entry insert failed: ${entryError?.message}`).toBeNull()
    expect(entry).toBeTruthy()

    // Read back from DB to confirm persistence
    const { data: fetched, error: fetchError } = await client
      .from('payroll_entries')
      .select('gross_amount, net_amount, deductions_amount, installment_deducted_amount')
      .eq('id', entry!.id)
      .single()

    expect(fetchError).toBeNull()
    expect(fetched).toBeTruthy()

    // Core assertion: net_amount = gross - deductions - installment
    const gross = Number(fetched!.gross_amount)
    const net = Number(fetched!.net_amount)
    const deductions = Number(fetched!.deductions_amount)
    const installment = Number(fetched!.installment_deducted_amount)

    expect(gross).toBe(EXPECTED_GROSS)
    expect(net).toBe(EXPECTED_NET)
    expect(net).toBe(gross - deductions - installment)
  })

  it('fails if payroll_entries or payroll_runs columns are renamed (schema drift detection)', async () => {
    // This test verifies column names exist by checking the insert succeeded above.
    // If any column in payroll_entries was renamed, the beforeAll/first test would have errored.
    // Explicit column existence check:
    const { data, error } = await client
      .from('payroll_entries')
      .select(
        'id, payroll_run_id, employee_id, basic_salary_snapshot, gross_amount, net_amount, deductions_amount, installment_deducted_amount, entry_status'
      )
      .eq('payroll_run_id', payrollRunId!)
      .limit(1)

    expect(error, `Schema drift detected in payroll_entries: ${error?.message}`).toBeNull()
    expect(data).toHaveLength(1)
  })
})
