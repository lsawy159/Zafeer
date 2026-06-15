import { expect, test } from '@playwright/test'

import { restDelete, restInsert, restSelectSingle } from './support/selfCleaningSupabase'

test.describe('employees self-cleaning CRUD coverage', () => {
  test('create employee from UI and remove it after verification', async ({ page, request }) => {
    const unique = Date.now()
    const tempCompanyName = `PW Company ${unique}`
    const tempEmployeeName = `PW Employee ${unique}`
    const tempResidenceNumber = Number(`88${String(unique).slice(-8)}`)

    let companyId: string | null = null
    let employeeId: string | null = null

    try {
      const company = await restInsert(request, page, 'companies', {
        name: tempCompanyName,
        unified_number: Number(`7${String(unique).slice(-8)}`),
        labor_subscription_number: `LS-${unique}`,
        social_insurance_number: `SI-${unique}`,
        max_employees: 5,
      })
      companyId = company.id

      await page.goto('/employees')
      await page.getByRole('button', { name: /إضافة موظف/i }).click()

      await page.getByPlaceholder(/أدخل اسم الموظف/i).fill(tempEmployeeName)
      await page.getByPlaceholder(/أدخل المهنة/i).fill('عامل')
      await page.getByPlaceholder(/أدخل الجنسية/i).fill('مصري')
      await page.getByPlaceholder(/أدخل رقم الإقامة/i).fill(String(tempResidenceNumber))

      const companySearch = page.getByPlaceholder(/ابحث بالاسم أو الرقم الموحد/i)
      await companySearch.fill(tempCompanyName)
      await page.getByRole('button', { name: new RegExp(tempCompanyName) }).click()

      await page.getByRole('button', { name: /إضافة الموظف/i }).click()

      await expect(page.locator('body')).toContainText(tempEmployeeName)

      const createdEmployee = await restSelectSingle<{ id: string }>(
        request,
        page,
        'employees',
        { residence_number: tempResidenceNumber },
        'id'
      )
      employeeId = createdEmployee?.id ?? null
      expect(employeeId).toBeTruthy()

      const search = page.getByPlaceholder(/ابحث بالاسم|ابحث/i).first()
      await search.fill(tempEmployeeName)
      await expect(page.locator('body')).toContainText(tempEmployeeName)
    } finally {
      if (employeeId) {
        await restDelete(request, page, 'employees', { id: employeeId })
      }
      if (companyId) {
        await restDelete(request, page, 'companies', { id: companyId })
      }
    }
  })
})
