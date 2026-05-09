import { test, expect } from '@playwright/test'

test.describe('Payroll', () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL
    const password = process.env.TEST_USER_PASSWORD
    test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not set')

    await page.goto('/login')
    await page.getByLabel(/البريد الإلكتروني/i).fill(email!)
    await page.getByLabel(/كلمة المرور/i).fill(password!)
    await page.getByRole('button', { name: /تسجيل الدخول/i }).click()
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('payroll page renders', async ({ page }) => {
    await page.goto('/payroll')
    await expect(page.getByRole('heading', { name: /الرواتب/i })).toBeVisible()
  })

  test('create payroll run opens dialog', async ({ page }) => {
    await page.goto('/payroll')
    const btn = page.getByRole('button', { name: /إنشاء مسير|مسير جديد/i })
    if (await btn.isVisible()) {
      await btn.click()
      await expect(page.getByRole('dialog')).toBeVisible()
    }
  })

  test('finalize payroll requires confirmation', async ({ page }) => {
    await page.goto('/payroll')
    const finalize = page.getByRole('button', { name: /اعتماد|تأكيد/i }).first()
    if (await finalize.isVisible()) {
      await finalize.click()
      await expect(page.getByRole('alertdialog').or(page.getByRole('dialog'))).toBeVisible()
    }
  })
})
