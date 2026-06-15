import fs from 'node:fs'
import path from 'node:path'
import { expect, type Page } from '@playwright/test'
import { adminStorageStatePath } from './paths'

export function getAdminCredentials() {
  const email = process.env.TEST_USER_EMAIL
  const password = process.env.TEST_USER_PASSWORD

  if (!email || !password) {
    throw new Error(
      'Set TEST_USER_EMAIL / TEST_USER_PASSWORD, or ADMIN_EMAIL / ADMIN_PASSWORD in local env files.'
    )
  }

  return { email, password }
}

export async function loginAsAdmin(page: Page) {
  const { email, password } = getAdminCredentials()

  await page.goto('/login')
  await page.locator('#login-username').fill(email)
  await page.locator('#login-password').fill(password)
  await page.locator('button[type="submit"]').click()

  const loginError = page
    .getByText(/اسم المستخدم أو البريد الإلكتروني أو كلمة المرور غير صحيحة|Invalid login credentials|فشل الاتصال/i)
    .first()

  await Promise.race([
    page.waitForURL((url) => !/\/login(?:$|[?#])/.test(url.pathname), { timeout: 30_000 }),
    loginError.waitFor({ state: 'visible', timeout: 30_000 }).then(async () => {
      const message = (await loginError.textContent())?.trim() || 'Unknown login error'
      throw new Error(`Login failed: ${message}`)
    }),
  ])

  await expect(page).not.toHaveURL(/\/login(?:$|[?#])/, { timeout: 5_000 })
  await expect(page.locator('text=غير مصرح')).toHaveCount(0)
}

export async function saveAdminStorageState(page: Page) {
  await loginAsAdmin(page)
  fs.mkdirSync(path.dirname(adminStorageStatePath), { recursive: true })
  await page.context().storageState({ path: adminStorageStatePath })
}
