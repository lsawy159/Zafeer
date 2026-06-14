import { expect, test } from '@playwright/test'

test.describe('routing and redirect coverage', () => {
  test('legacy finance routes redirect to the unified finance page', async ({ page }) => {
    await page.goto('/extracts')
    await expect(page).toHaveURL(/\/finance\?tab=extracts/)
    await expect(page.getByRole('heading', { name: /المالية/i })).toBeVisible()

    await page.goto('/payroll-deductions')
    await expect(page).toHaveURL(/\/finance\?tab=payroll/)
    await expect(page.getByRole('heading', { name: /المالية/i })).toBeVisible()
  })

  test('legacy settings routes redirect to the expected admin settings tabs', async ({ page }) => {
    await page.goto('/backup-settings')
    await expect(page).toHaveURL(/\/admin-settings\?tab=backup/)
    await expect(page.getByRole('heading', { name: 'إعدادات النظام', exact: true })).toBeVisible()

    await page.goto('/alert-settings')
    await expect(page).toHaveURL(/\/admin-settings\?tab=alert-settings/)
    await expect(page.getByRole('heading', { name: 'إعدادات النظام', exact: true })).toBeVisible()

    await page.goto('/activity-logs')
    await expect(page).toHaveURL(/\/admin-settings\?tab=activity-logs/)
    await expect(page.getByRole('heading', { name: 'إعدادات النظام', exact: true })).toBeVisible()
  })

  test('unknown route shows the 404 page and can navigate back home', async ({ page }) => {
    await page.goto('/this-route-does-not-exist')

    await expect(page.getByRole('heading', { name: /الصفحة غير موجودة/i })).toBeVisible()
    await page.getByRole('link', { name: /العودة للرئيسية/i }).click()
    await expect(page).toHaveURL(/\/dashboard/)
  })
})
