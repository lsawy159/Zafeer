import { expect, test } from '@playwright/test'

import { restDelete, restInsert, restSelectSingle } from './support/selfCleaningSupabase'

test.describe('projects advanced self-cleaning coverage', () => {
  test('create and edit project from UI with guaranteed cleanup', async ({ page, request }) => {
    const unique = Date.now()
    const originalName = `PW Project ${unique}`
    const editedDescription = `Edited description ${unique}`

    let projectId: string | null = null

    try {
      await page.goto('/projects')
      await page.getByRole('button', { name: /إضافة مشروع جديد/i }).click()

      await page.getByPlaceholder(/أدخل اسم المشروع/i).fill(originalName)
      await page.getByPlaceholder(/أدخل وصف المشروع/i).fill('Temporary project for Playwright')
      await page.getByRole('button', { name: /^إنشاء$/i }).click()

      await expect(page.locator('body')).toContainText(originalName)

      const createdProject = await restSelectSingle<{ id: string }>(
        request,
        page,
        'projects',
        { name: originalName },
        'id'
      )
      projectId = createdProject?.id ?? null
      expect(projectId).toBeTruthy()

      const search = page.getByPlaceholder(/ابحث عن مشروع/i)
      await search.fill(originalName)
      await page.getByTitle(/تعديل المشروع/i).first().click()

      await page.getByPlaceholder(/أدخل وصف المشروع/i).fill(editedDescription)
      await page.getByRole('button', { name: /^تحديث$/i }).click()
      await expect(page.locator('body')).toContainText(/تم تحديث المشروع/i)
    } finally {
      if (projectId) {
        await restDelete(request, page, 'projects', { id: projectId })
      }
    }
  })

  test('project detail modal and job-title rates work on temporary seeded data', async ({ page, request }) => {
    const unique = Date.now()
    const projectName = `PW Detail Project ${unique}`
    const companyName = `PW Detail Company ${unique}`
    const profession = `نجار-${unique}`

    let projectId: string | null = null
    let companyId: string | null = null
    let employeeId: string | null = null
    let rateId: string | null = null

    try {
      const project = await restInsert(request, page, 'projects', {
        name: projectName,
        description: 'Temporary project for detail and job-rate verification',
        status: 'active',
      })
      projectId = project.id

      const company = await restInsert(request, page, 'companies', {
        name: companyName,
        unified_number: Number(`71${String(unique).slice(-8)}`),
        labor_subscription_number: `13-${String(unique).slice(-7)}`,
        social_insurance_number: `SI-${unique}`,
        max_employees: 5,
      })
      companyId = company.id

      const employee = await restInsert(request, page, 'employees', {
        company_id: company.id,
        name: `PW Project Employee ${unique}`,
        profession,
        nationality: 'مصري',
        birth_date: '1990-01-01',
        phone: `050${String(unique).slice(-7)}`,
        residence_number: Number(`87${String(unique).slice(-8)}`),
        joining_date: '2026-01-01',
        residence_expiry: '2027-01-01',
        project_id: project.id,
        project_name: project.name,
        salary: 3200,
      })
      employeeId = employee.id

      await page.goto('/projects')
      await page.getByPlaceholder(/ابحث عن مشروع/i).fill(projectName)
      await page.getByText(projectName, { exact: true }).click()

      await expect(page.locator('.app-modal-surface').first()).toBeVisible()
      await expect(page.locator('body')).toContainText(/أسعار المهن/i)
      await expect(page.locator('body')).toContainText(profession)

      await page.getByRole('button', { name: /أسعار المهن/i }).click()
      await expect(page.locator('body')).toContainText(new RegExp(profession))

      const row = page.locator('tr').filter({ hasText: profession }).first()
      await row.getByPlaceholder('0.00').fill('4500')
      await row.getByRole('button', { name: /حفظ/i }).click()
      await expect(page.locator('body')).toContainText(/تم حفظ سعر/i)

      const savedRate = await restSelectSingle<{ id: string; monthly_rate: number }>(
        request,
        page,
        'project_job_title_rates',
        { project_id: project.id, profession },
        'id,monthly_rate'
      )
      rateId = savedRate?.id ?? null
      expect(savedRate?.monthly_rate).toBe(4500)
    } finally {
      if (rateId) {
        await restDelete(request, page, 'project_job_title_rates', { id: rateId })
      }
      if (employeeId) {
        await restDelete(request, page, 'employees', { id: employeeId })
      }
      if (companyId) {
        await restDelete(request, page, 'companies', { id: companyId })
      }
      if (projectId) {
        await restDelete(request, page, 'projects', { id: projectId })
      }
    }
  })
})
