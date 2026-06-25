/**
 * J1 — Auth UI (unauthenticated / public)
 *
 * Tests:
 *   1. Valid admin login → real authenticated content renders (sidebar link 'الموظفين'),
 *      not just a URL change.
 *   2. Invalid credentials → exact Arabic error stays on /login.
 *   3. Logged-out hit on /dashboard → redirected to /login.
 *
 * Assertion standard: NO URL-only passes. Every test asserts visible Arabic content.
 */

import path from 'node:path'
import { expect, test } from '@playwright/test'

const SCREENSHOTS = path.resolve(__dirname, '..', 'screenshots', 'spec077')

// ─── 1. Valid admin login ──────────────────────────────────────────────────────

test('valid admin login shows authenticated dashboard content', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL
  const password = process.env.TEST_USER_PASSWORD

  if (!email || !password) {
    test.skip(true, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not configured in e2e/.env')
    return
  }

  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  await page.locator('#login-username').fill(email)
  await page.locator('#login-password').fill(password)
  await page.locator('button[type="submit"]').click()

  // Wait to leave /login (auth redirect)
  try {
    await page.waitForURL((url) => !/\/login(?:$|[?#])/.test(url.pathname), { timeout: 20_000 })
  } catch {
    const bodyText = (await page.locator('body').textContent())?.trim().slice(0, 300) ?? ''
    await page.screenshot({ path: path.join(SCREENSHOTS, 'j1-login-failure.png') })
    throw new Error(`Admin login did not leave /login within 20 s.\nPage text: ${bodyText}`)
  }

  // REAL assertion: the sidebar link 'الموظفين' must be present — proves authenticated shell
  // rendered, not just a URL transition.
  await expect(page.locator('body')).toContainText('الموظفين', { timeout: 15_000 })

  await page.screenshot({ path: path.join(SCREENSHOTS, 'j1-login-success.png') })
})

// ─── 2. Invalid credentials ────────────────────────────────────────────────────

test('invalid credentials show exact Arabic error and stay on /login', async ({ page }) => {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  await page.locator('#login-username').fill(`wrong-${Date.now()}@invalid.example`)
  await page.locator('#login-password').fill('wrong-password-xyz')
  await page.locator('button[type="submit"]').click()

  // Assert the EXACT Arabic error text (not just "invalid")
  await expect(page.locator('body')).toContainText(
    'اسم المستخدم أو البريد الإلكتروني أو كلمة المرور غير صحيحة',
    { timeout: 15_000 },
  )

  // Still on /login — must not have navigated away
  await expect(page).toHaveURL(/\/login(?:$|[?#])/)

  await page.screenshot({ path: path.join(SCREENSHOTS, 'j1-invalid-creds.png') })
})

// ─── 3. Logged-out redirect ────────────────────────────────────────────────────

test('logged-out user hitting /dashboard is redirected to /login', async ({ page }) => {
  // No storageState override needed — public project starts unauthenticated.
  await page.goto('/dashboard')

  // Must end up on /login (the real redirect guard)
  await expect(page).toHaveURL(/\/login(?:$|[?#])/, { timeout: 10_000 })

  // The login form must be visible — confirms we landed on the real login page,
  // not an error page or a blank redirect.
  await expect(page.locator('#login-username')).toBeVisible({ timeout: 5_000 })

  await page.screenshot({ path: path.join(SCREENSHOTS, 'j1-logged-out-redirect.png') })
})
