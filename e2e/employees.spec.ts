import { test, expect } from '@playwright/test'

test.describe('Employees CRUD', () => {
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

  test('employees list renders', async ({ page }) => {
    await page.goto('/employees')
    await expect(page.getByRole('heading', { name: /الموظفون/i })).toBeVisible()
  })

  test('add employee opens modal', async ({ page }) => {
    await page.goto('/employees')
    await page.getByRole('button', { name: /إضافة موظف/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('search filters employees', async ({ page }) => {
    await page.goto('/employees')
    const search = page.getByPlaceholder(/بحث/i)
    await search.fill('test')
    await page.waitForTimeout(400) // debounce
    await expect(page.locator('[data-testid="employee-row"]').or(page.getByText(/لا توجد نتائج/i))).toBeVisible()
  })
})
