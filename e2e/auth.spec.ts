import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /تسجيل الدخول/i })).toBeVisible()
  })

  test('invalid credentials show error', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/البريد الإلكتروني/i).fill('wrong@example.com')
    await page.getByLabel(/كلمة المرور/i).fill('wrongpassword')
    await page.getByRole('button', { name: /تسجيل الدخول/i }).click()
    await expect(page.getByRole('alert')).toBeVisible()
  })

  test('unauthenticated redirect to login', async ({ page }) => {
    await page.goto('/employees')
    await expect(page).toHaveURL(/\/login/)
  })

  test('logout clears session', async ({ page }) => {
    // Setup: login first (requires test user env vars)
    const email = process.env.TEST_USER_EMAIL
    const password = process.env.TEST_USER_PASSWORD
    test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not set')

    await page.goto('/login')
    await page.getByLabel(/البريد الإلكتروني/i).fill(email!)
    await page.getByLabel(/كلمة المرور/i).fill(password!)
    await page.getByRole('button', { name: /تسجيل الدخول/i }).click()
    await expect(page).not.toHaveURL(/\/login/)

    await page.getByRole('button', { name: /تسجيل الخروج/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
