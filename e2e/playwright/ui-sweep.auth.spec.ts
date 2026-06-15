import { expect, test } from '@playwright/test'

test.describe('broader authenticated UI sweep', () => {
  test('dashboard cards, actions, and tab switching work', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(page.getByRole('heading', { name: /لوحة التحكم/i })).toBeVisible()

    await expect(page.getByRole('button', { name: /عدد المؤسسات/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /عدد الموظفين/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /تنبيهات المؤسسات/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /تنبيهات الموظفين/i })).toBeVisible()
    await page.getByRole('button', { name: /جميع التنبيهات/i }).click()
    await expect(page).toHaveURL(/\/alerts/)

    await page.goto('/dashboard')
    await page.getByRole('button', { name: /^التقارير$/i }).click()
    await expect(page).toHaveURL(/\/reports/)

    await page.goto('/dashboard')
    const employeesTab = page.getByRole('button', { name: /^الموظفين$/i }).first()
    await employeesTab.click()
    await expect(employeesTab).toHaveClass(/app-tab-button-active/)

    const companiesTab = page.getByRole('button', { name: /^المؤسسات$/i }).first()
    await companiesTab.click()
    await expect(companiesTab).toHaveClass(/app-tab-button-active/)
  })

  test('finance page tabs switch without crashes', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await page.goto('/finance')

    await expect(page.getByRole('heading', { name: /المالية/i })).toBeVisible()

    const tabs = [
      { label: /المستخلصات/i, query: 'extracts' },
      { label: /مسيرات الرواتب/i, query: 'payroll' },
      { label: /الالتزامات/i, query: 'obligations' },
      { label: /الاستقطاعات.*الجزاءات/i, query: 'deductions' },
      { label: /الإيرادات.*الربحية/i, query: 'revenue' },
    ] as const

    for (const tab of tabs) {
      const button = page.getByRole('button', { name: tab.label }).first()
      if (!(await button.isVisible().catch(() => false))) continue

      await button.click()
      await expect(page).toHaveURL(new RegExp(`tab=${tab.query}`))
      await expect(button).toHaveClass(/app-tab-button-active/)
      await expect(page.locator('body')).not.toContainText('غير مصرح')
    }

    expect(pageErrors).toEqual([])
  })

  test('admin settings navigation, summary cards, and action buttons render', async ({ page }) => {
    await page.goto('/admin-settings')

    await expect(page.getByRole('heading', { name: 'إعدادات النظام', exact: true })).toBeVisible()
    await expect(page.getByText(/إجمالي الإعدادات/i).first()).toBeVisible()
    await expect(page.getByText(/فئات الإعدادات/i).first()).toBeVisible()
    await expect(page.getByText(/آخر تحديث/i).first()).toBeVisible()

    const permissions = page.getByRole('button', { name: /إدارة الصلاحيات/i }).first()
    await permissions.click()
    await expect(page).toHaveURL(/tab=permissions/)
  })

  test('transfer procedures page renders main controls and refresh affordance', async ({ page }) => {
    await page.goto('/transfer-procedures')

    await expect(page.getByRole('heading', { name: /إجراءات النقل/i })).toBeVisible()

    const refreshButton = page.getByTitle('تحديث بيانات الصفحة الحالية')
    await expect(refreshButton).toBeVisible()

    await expect(page.getByRole('button', { name: /تسجيل طلب نقل/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /تحديث/i }).first()).toBeVisible()
    await page.getByRole('button', { name: /تسجيل طلب نقل/i }).first().click()
    await expect(page.locator('.app-modal-surface, [role="dialog"]').first()).toBeVisible()
    await page.getByRole('button', { name: /إغلاق|إلغاء/i }).first().click()
    await expect(page.locator('.app-modal-surface, [role="dialog"]').first()).not.toBeVisible()

    await refreshButton.click()
    await expect(page.getByRole('heading', { name: /إجراءات النقل/i })).toBeVisible()
  })
})
