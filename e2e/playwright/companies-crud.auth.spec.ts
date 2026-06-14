import { expect, test } from '@playwright/test'

import { restDelete, restSelectSingle } from './support/selfCleaningSupabase'

test.describe('companies self-cleaning CRUD coverage', () => {
  test('create and edit company from UI with guaranteed cleanup', async ({ page, request }) => {
    const unique = Date.now()
    const originalName = `PW Company ${unique}`
    const editedNote = `ملاحظة-${unique}`
    const unifiedNumber = Number(`70${String(unique).slice(-8)}`)

    let companyId: string | null = null

    try {
      await page.goto('/companies')
      await page.getByRole('button', { name: /إضافة مؤسسة/i }).click()

      await page.getByPlaceholder(/أدخل اسم المؤسسة/i).fill(originalName)
      await page.getByPlaceholder(/أدخل الرقم الموحد/i).fill(String(unifiedNumber))
      await page.getByPlaceholder(/أدخل رقم اشتراك قوى/i).fill(`13-${String(unique).slice(-7)}`)
      await page.getByRole('button', { name: /إضافة المؤسسة/i }).click()

      await expect(page.locator('body')).toContainText(originalName)

      const createdCompany = await restSelectSingle<{ id: string }>(
        request,
        page,
        'companies',
        { unified_number: unifiedNumber },
        'id'
      )
      companyId = createdCompany?.id ?? null
      expect(companyId).toBeTruthy()

      const search = page.getByPlaceholder(/ابحث بالاسم|ابحث/i).first()
      await search.fill(originalName)
      await expect(page.locator('body')).toContainText(originalName)

      await page.getByTitle(/تعديل المؤسسة/i).first().click()
      await page.getByPlaceholder(/أدخل أي ملاحظات إضافية/i).fill(editedNote)
      await page.getByRole('button', { name: /تحديث المؤسسة/i }).click()

      await expect(page.locator('body')).toContainText(/تم تحديث المؤسسة/i)
    } finally {
      if (companyId) {
        await restDelete(request, page, 'companies', { id: companyId })
      } else {
        await restDelete(request, page, 'companies', { unified_number: unifiedNumber })
      }
    }
  })
})
