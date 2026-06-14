import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

import {
  restDelete,
  restInsert,
  restSelectSingle,
} from './support/selfCleaningSupabase'

function monthOffsetString(offset: number) {
  const date = new Date()
  date.setDate(1)
  date.setMonth(date.getMonth() + offset)
  return date.toISOString().slice(0, 7)
}

async function cleanupPayrollRunArtifacts(
  request: APIRequestContext,
  page: Page,
  runId: string | null,
  employeeId: string,
  runNotes: string
) {
  const resolvedRunId =
    runId ??
    (await restSelectSingle<{ id: string }>(
      request,
      page,
      'payroll_runs',
      { notes: runNotes },
      'id'
    ))?.id ??
    null

  if (!resolvedRunId) {
    return
  }

  const entryId =
    (await restSelectSingle<{ id: string }>(
      request,
      page,
      'payroll_entries',
      { payroll_run_id: resolvedRunId, employee_id: employeeId },
      'id'
    ))?.id ?? null

  if (entryId) {
    await restDelete(request, page, 'payroll_slips', { payroll_entry_id: entryId })
    await restDelete(request, page, 'payroll_entry_components', { payroll_entry_id: entryId })
  }

  await restDelete(request, page, 'payroll_entries', { payroll_run_id: resolvedRunId })
  await restDelete(request, page, 'payroll_runs', { id: resolvedRunId })
}

async function cleanupObligationArtifacts(
  request: APIRequestContext,
  page: Page,
  employeeId: string,
  obligationNotes: string
) {
  const headerId =
    (await restSelectSingle<{ id: string }>(
      request,
      page,
      'employee_obligation_headers',
      { employee_id: employeeId, notes: obligationNotes },
      'id'
    ))?.id ?? null

  if (!headerId) {
    return
  }

  await restDelete(request, page, 'employee_obligation_lines', { header_id: headerId })
  await restDelete(request, page, 'employee_obligation_headers', { id: headerId })
}

test.describe('finance transactional self-cleaning coverage', () => {
  test.setTimeout(60_000)

  test('create and cancel an employee obligation through the UI with cleanup fallback', async ({
    page,
    request,
  }) => {
    const unique = Date.now()
    const companyName = `PW Finance Company ${unique}`
    const employeeName = `PW Finance Employee ${unique}`
    const obligationNotes = `pw-obligation-${unique}`
    const unifiedNumber = Number(`72${String(unique).slice(-8)}`)
    const residenceNumber = Number(`86${String(unique).slice(-8)}`)
    const startMonth = monthOffsetString(2)

    let companyId: string | null = null
    let employeeId: string | null = null
    let headerId: string | null = null

    try {
      const company = await restInsert(request, page, 'companies', {
        name: companyName,
        unified_number: unifiedNumber,
        labor_subscription_number: `LS-${unique}`,
        social_insurance_number: `SI-${unique}`,
        max_employees: 5,
      })
      companyId = company.id

      const employee = await restInsert(request, page, 'employees', {
        company_id: company.id,
        name: employeeName,
        profession: 'فني',
        nationality: 'مصري',
        birth_date: '1990-01-01',
        phone: `050${String(unique).slice(-7)}`,
        residence_number: residenceNumber,
        joining_date: '2026-01-01',
        residence_expiry: '2027-01-01',
        salary: 3200,
      })
      employeeId = employee.id

      await page.goto('/finance?tab=deductions')
      await page.getByRole('button', { name: /^الالتزامات$/i }).first().click()
      await page.getByRole('button', { name: /^إضافة التزام$/ }).click()

      const dialog = page.getByRole('dialog').filter({ hasText: /إضافة التزام جديد/i }).first()
      await expect(dialog).toBeVisible()

      const searchInput = dialog.getByPlaceholder(/اكتب الاسم أو رقم الإقامة/i)
      await searchInput.fill(employeeName)
      await dialog.getByRole('button', { name: new RegExp(employeeName) }).click()

      await dialog.locator('select').first().selectOption('advance')
      await dialog.locator('input[type="number"]').nth(0).fill('1200')
      await dialog.locator('input[type="number"]').nth(1).fill('3')
      await dialog.locator('input[type="month"]').fill(startMonth)
      await dialog.getByPlaceholder(/أي ملاحظات إضافية/i).fill(obligationNotes)
      await dialog.getByRole('button', { name: /إضافة الالتزام/i }).click()

      await expect
        .poll(
          async () => {
            const header = await restSelectSingle<{ id: string; status: string; installment_count: number }>(
              request,
              page,
              'employee_obligation_headers',
              { employee_id: employee.id, notes: obligationNotes },
              'id,status,installment_count'
            )
            headerId = header?.id ?? null
            return header?.status ?? ''
          },
          { timeout: 20_000 }
        )
        .toBe('active')

      expect(headerId).toBeTruthy()

      await page.getByPlaceholder(/الاسم أو رقم الإقامة أو المشروع/i).fill(employeeName)
      const employeeRow = page.locator('tr').filter({ hasText: employeeName }).first()
      await expect(employeeRow).toBeVisible({ timeout: 15_000 })
      await employeeRow.getByRole('button', { name: /تفاصيل/i }).click()

      const detailsDialog = page.getByRole('dialog').filter({ hasText: /التزامات الموظف/i }).first()
      await expect(detailsDialog).toBeVisible()
      await detailsDialog.getByTitle(/حذف الالتزام/i).first().click()

      const confirmDialog = page.getByRole('dialog').filter({ hasText: /تأكيد حذف الالتزام/i }).first()
      await expect(confirmDialog).toBeVisible()
      await confirmDialog.getByRole('button', { name: /حذف الالتزام/i }).click()

      await expect
        .poll(
          async () => {
            const header = await restSelectSingle<{ status: string }>(
              request,
              page,
              'employee_obligation_headers',
              { id: headerId! },
              'status'
            )
            return header?.status ?? ''
          },
          { timeout: 20_000 }
        )
        .toBe('cancelled')
    } finally {
      if (employeeId) {
        await cleanupObligationArtifacts(request, page, employeeId, obligationNotes)
        await restDelete(request, page, 'employees', { id: employeeId })
      } else {
        await restDelete(request, page, 'employees', { residence_number: residenceNumber })
      }

      if (companyId) {
        await restDelete(request, page, 'companies', { id: companyId })
      } else {
        await restDelete(request, page, 'companies', { unified_number: unifiedNumber })
      }
    }
  })

  test('create, cancel, and delete a payroll run through the UI with cleanup fallback', async ({
    page,
    request,
  }) => {
    const unique = Date.now()
    const companyName = `PW Payroll Company ${unique}`
    const employeeName = `PW Payroll Employee ${unique}`
    const runNotes = `pw-run-${unique}`
    const unifiedNumber = Number(`73${String(unique).slice(-8)}`)
    const residenceNumber = Number(`85${String(unique).slice(-8)}`)
    const payrollMonth = monthOffsetString(3)

    let companyId: string | null = null
    let employeeId: string | null = null
    let runId: string | null = null

    try {
      const company = await restInsert(request, page, 'companies', {
        name: companyName,
        unified_number: unifiedNumber,
        labor_subscription_number: `LS-${unique}`,
        social_insurance_number: `SI-${unique}`,
        max_employees: 5,
      })
      companyId = company.id

      const employee = await restInsert(request, page, 'employees', {
        company_id: company.id,
        name: employeeName,
        profession: 'محاسب',
        nationality: 'مصري',
        birth_date: '1991-01-01',
        phone: `051${String(unique).slice(-7)}`,
        residence_number: residenceNumber,
        joining_date: '2026-01-01',
        residence_expiry: '2027-01-01',
        salary: 4500,
      })
      employeeId = employee.id

      await page.goto('/payroll-deductions')
      await page.getByRole('button', { name: /مسيرات الرواتب/i }).click()
      await page.getByRole('button', { name: /^مسير جديد$/ }).click()

      const dialog = page.getByRole('dialog').filter({ hasText: /إضافة مسير جديد/i }).first()
      await expect(dialog).toBeVisible()

      await dialog.locator('input[type="month"]').fill(payrollMonth)
      await dialog.locator('select').nth(0).selectOption('company')
      await dialog.locator('select').nth(1).selectOption(company.id)
      await dialog.locator('select').nth(2).selectOption('manual')
      await dialog.getByPlaceholder(/اختياري/i).fill(runNotes)

      await expect(dialog.locator('tbody tr').filter({ hasText: employeeName }).first()).toBeVisible({
        timeout: 15_000,
      })
      await dialog.getByRole('button', { name: /إنشاء المسير/i }).click()

      await expect
        .poll(
          async () => {
            const run = await restSelectSingle<{ id: string; status: string }>(
              request,
              page,
              'payroll_runs',
              { scope_id: company.id, notes: runNotes },
              'id,status'
            )
            runId = run?.id ?? null
            return run?.status ?? ''
          },
          { timeout: 20_000 }
        )
        .toBe('draft')

      expect(runId).toBeTruthy()

      await expect
        .poll(
          async () => {
            const createdEntry = await restSelectSingle<{ id: string; employee_id: string }>(
              request,
              page,
              'payroll_entries',
              { payroll_run_id: runId!, employee_id: employee.id },
              'id,employee_id'
            )
            return createdEntry?.employee_id ?? null
          },
          { timeout: 20_000 }
        )
        .toBe(employee.id)

      const detailsDialog = page.getByRole('dialog').filter({ hasText: /عرض المسير/i }).first()
      await expect(detailsDialog).toBeVisible()
      await detailsDialog.getByRole('button', { name: /إلغاء المسير/i }).click()

      await expect
        .poll(
          async () => {
            const run = await restSelectSingle<{ status: string }>(
              request,
              page,
              'payroll_runs',
              { id: runId! },
              'status'
            )
            return run?.status ?? ''
          },
          { timeout: 20_000 }
        )
        .toBe('cancelled')

      await detailsDialog.getByRole('button', { name: /حذف المسير/i }).click()

      const confirmDialog = page.getByRole('dialog').filter({ hasText: /تأكيد حذف المسير/i }).first()
      await expect(confirmDialog).toBeVisible()
      await confirmDialog.getByRole('button', { name: /تأكيد الحذف/i }).click()

      await expect
        .poll(
          async () => {
            const run = await restSelectSingle<{ id: string }>(
              request,
              page,
              'payroll_runs',
              { id: runId! },
              'id'
            )
            return run?.id ?? null
          },
          { timeout: 20_000 }
        )
        .toBeNull()
    } finally {
      if (employeeId) {
        await cleanupPayrollRunArtifacts(request, page, runId, employeeId, runNotes)
        await restDelete(request, page, 'employees', { id: employeeId })
      } else {
        await restDelete(request, page, 'employees', { residence_number: residenceNumber })
      }

      if (companyId) {
        await restDelete(request, page, 'companies', { id: companyId })
      } else {
        await restDelete(request, page, 'companies', { unified_number: unifiedNumber })
      }
    }
  })
})
