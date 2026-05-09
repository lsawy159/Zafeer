import { test, expect, Page } from '@playwright/test'
import path from 'path'

async function login(page: Page) {
  const email = process.env.TEST_USER_EMAIL
  const password = process.env.TEST_USER_PASSWORD
  await page.goto('/login')
  await page.getByLabel(/البريد الإلكتروني/i).fill(email!)
  await page.getByLabel(/كلمة المرور/i).fill(password!)
  await page.getByRole('button', { name: /تسجيل الدخول/i }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

test.describe('Import / Export', () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL
    const password = process.env.TEST_USER_PASSWORD
    test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not set')
    await login(page)
  })

  test('export employees button triggers download', async ({ page }) => {
    await page.goto('/employees')
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /تصدير|Excel/i }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/)
  })

  test('import tab renders file picker', async ({ page }) => {
    await page.goto('/employees')
    const importTab = page.getByRole('tab', { name: /استيراد/i })
    if (await importTab.isVisible()) {
      await importTab.click()
      await expect(page.getByRole('button', { name: /اختر ملف|رفع/i }).or(page.locator('input[type="file"]'))).toBeVisible()
    }
  })
})
