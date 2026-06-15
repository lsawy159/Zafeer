import { expect, test } from '@playwright/test'

test.describe('Client readiness critical UI flows', () => {
  test('reports cards render, refresh works, and Excel export downloads', async ({ page }) => {
    await page.goto('/reports')

    await expect(page.getByRole('heading', { name: /التقارير|الإحصائيات/i })).toBeVisible()
    await expect(page.locator('.app-panel').filter({ hasText: 'إجمالي المنتهية' }).first()).toBeVisible()
    await expect(page.locator('.app-panel').filter({ hasText: 'عاجل' }).first()).toBeVisible()
    await expect(page.locator('.app-panel').filter({ hasText: 'متوسط' }).first()).toBeVisible()
    await expect(page.locator('.app-panel').filter({ hasText: 'ساري' }).first()).toBeVisible()

    await page.getByRole('button', { name: /تحديث البيانات/i }).click()
    await expect(page.getByRole('heading', { name: /التقارير|الإحصائيات/i })).toBeVisible()

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /تصدير Excel/i }).click(),
    ])

    expect(download.suggestedFilename()).toMatch(/\.xlsx$/i)
  })

  test('import/export employee export is safe in both empty and populated states', async ({ page }) => {
    await page.goto('/import-export')

    await expect(page.getByRole('heading', { name: /استيراد وتصدير/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /تصدير الموظفين/i })).toBeVisible()

    const exportSelectedButton = page.getByRole('button', { name: /تصدير المحدد/i }).first()
    await expect(exportSelectedButton).toBeVisible()

    const selectAllButton = page.getByRole('button', { name: /تحديد الكل/i }).first()
    if (await selectAllButton.isVisible()) {
      await selectAllButton.click()
      await expect(exportSelectedButton).toBeEnabled()

      const [download] = await Promise.all([
        page.waitForEvent('download'),
        exportSelectedButton.click(),
      ])

      expect(download.suggestedFilename()).toMatch(/\.xlsx$/i)
    } else {
      await expect(exportSelectedButton).toBeDisabled()
    }
  })
})
