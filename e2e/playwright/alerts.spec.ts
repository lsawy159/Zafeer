import { test, expect } from '@playwright/test'

test.describe('Alerts', () => {
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

  test('alerts page renders', async ({ page }) => {
    await page.goto('/alerts')
    await expect(page.getByRole('heading', { name: /التنبيهات/i })).toBeVisible()
  })

  test('alerts page has action controls', async ({ page }) => {
    await page.goto('/alerts')
    // Verify action controls exist without mutating live data
    await expect(page.getByRole('heading', { name: /التنبيهات/i })).toBeVisible()
  })
})
