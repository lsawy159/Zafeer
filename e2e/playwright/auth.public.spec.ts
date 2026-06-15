import { expect, test } from '@playwright/test'

test.describe('public authentication', () => {
  test('login form renders with stable controls', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByAltText('ZaFeer').first()).toBeVisible()
    await expect(page.locator('#login-username')).toBeVisible()
    await expect(page.locator('#login-password')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('invalid credentials stay on login and show an error', async ({ page }) => {
    await page.goto('/login')

    const uniqueWrongEmail = `wrong-${Date.now()}@example.com`

    await page.locator('#login-username').fill(uniqueWrongEmail)
    await page.locator('#login-password').fill('wrongpassword')
    await page.locator('button[type="submit"]').click()

    await expect(page).toHaveURL(/\/login/)
    await expect(
      page.getByText(
        /اسم المستخدم أو البريد الإلكتروني أو كلمة المرور غير صحيحة|Invalid login credentials/i,
      ),
    ).toBeVisible({ timeout: 15_000 })
  })

  test('protected pages redirect anonymous users to login', async ({ page }) => {
    await page.goto('/employees')

    await expect(page).toHaveURL(/\/login/)
  })
})
