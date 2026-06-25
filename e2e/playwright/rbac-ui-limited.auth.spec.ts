/**
 * J2 — RBAC UI guards for E2E_LIMITED (test1)
 *
 * test1 persona has employees.{view} ONLY (no create/edit/delete, no other sections).
 *
 * Tests:
 *   1. /alerts  → shows 'غير مصرح' + 'ليس لديك صلاحية لعرض هذه الصفحة'; no alert-action rows.
 *   2. /reports → shows access-denied message; 'تصدير Excel' button count = 0.
 *   3. /employees → IS visible (test1 has employees.view) — asserts employees page
 *      element, NOT a guard message. (test1 CAN view employees — block must NOT be asserted.)
 *   4. Sidebar: finance ('المالية') and admin-settings ('إعدادات النظام') nav links
 *      are NOT present.
 *
 * Assertion standard: real Arabic guard text + absence of gated controls.
 * Pattern mirrors permission-guards.auth.spec.ts: override storageState → login fresh.
 */

import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

const SCREENSHOTS = path.resolve(__dirname, '..', 'screenshots', 'spec077')

// Override the project-level admin storageState — tests start unauthenticated
test.use({ storageState: { cookies: [], origins: [] } })

async function loginAsLimited(page: Page) {
  const email = process.env.E2E_LIMITED_EMAIL
  const password = process.env.E2E_LIMITED_PASSWORD

  if (!email || !password) {
    test.skip(
      true,
      'E2E_LIMITED_EMAIL / E2E_LIMITED_PASSWORD not configured — set them in e2e/.env',
    )
    return
  }

  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  await page.locator('#login-username').fill(email)
  await page.locator('#login-password').fill(password)
  await page.locator('button[type="submit"]').click()

  try {
    await page.waitForURL((url) => !/\/login(?:$|[?#])/.test(url.pathname), { timeout: 15_000 })
  } catch {
    const bodyText = (await page.locator('body').textContent())?.trim().slice(0, 300) ?? ''
    throw new Error(
      `E2E_LIMITED login failed — did not leave /login.\n` +
        `Page text: ${bodyText}\n` +
        `Check: user exists in Supabase? password matches e2e/.env E2E_LIMITED_PASSWORD?`,
    )
  }
}

test.describe('RBAC UI guards — limited user (employees.view only)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsLimited(page)
  })

  // ── Test 1: /alerts is blocked ─────────────────────────────────────────────
  test('/alerts shows غير مصرح guard and no alert action rows', async ({ page }) => {
    await page.goto('/alerts')

    // Guard text must appear — generous timeout covers permissions hydration
    await expect(page.locator('body')).toContainText('غير مصرح', { timeout: 15_000 })
    await expect(page.locator('body')).toContainText('ليس لديك صلاحية لعرض هذه الصفحة')

    // No alert row actions rendered (تأجيل = defer button appears on alert rows)
    await expect(page.locator('button').filter({ hasText: 'تأجيل' })).toHaveCount(0)

    await page.screenshot({ path: path.join(SCREENSHOTS, 'j2-alerts-blocked.png') })
  })

  // ── Test 2: /reports is blocked ────────────────────────────────────────────
  test('/reports shows access-denied message and no export button', async ({ page }) => {
    await page.goto('/reports')

    // Access-denied message (Reports.tsx L421-431)
    await expect(page.locator('body')).toContainText(
      'لا تملك صلاحية الوصول إلى صفحة التقارير',
      { timeout: 15_000 },
    )

    // Export button must NOT exist (canExport('reports') gate)
    await expect(page.getByRole('button', { name: 'تصدير Excel' })).toHaveCount(0)

    await page.screenshot({ path: path.join(SCREENSHOTS, 'j2-reports-blocked.png') })
  })

  // ── Test 3: /employees IS visible (test1 has employees.view) ───────────────
  test('/employees renders for limited user (employees.view granted)', async ({ page }) => {
    await page.goto('/employees')
    await page.waitForLoadState('networkidle')

    // Must NOT be blocked — test1 has employees.view
    await expect(page.locator('body')).not.toContainText('غير مصرح', { timeout: 10_000 })
    await expect(page.locator('body')).not.toContainText('ليس لديك صلاحية')

    // Real employees-page element: the heading or filter area — 'الموظفين' appears
    // in the page title / breadcrumb once the page loads
    await expect(page.locator('body')).toContainText('الموظفين', { timeout: 15_000 })

    await page.screenshot({ path: path.join(SCREENSHOTS, 'j2-employees-visible.png') })
  })

  // ── Test 4: Finance & admin-settings nav links absent ──────────────────────
  test('sidebar does not show finance or admin-settings links for limited user', async ({
    page,
  }) => {
    // Navigate anywhere authenticated to trigger sidebar render
    await page.goto('/employees')
    await page.waitForLoadState('networkidle')

    // Wait for the sidebar to stabilise — employees page text confirms render
    await expect(page.locator('body')).toContainText('الموظفين', { timeout: 15_000 })

    // Finance nav item ('المالية') must NOT appear
    await expect(page.locator('nav').filter({ hasText: 'المالية' })).toHaveCount(0)

    // Admin-settings nav item ('إعدادات النظام') must NOT appear
    await expect(page.locator('nav').filter({ hasText: 'إعدادات النظام' })).toHaveCount(0)

    await page.screenshot({ path: path.join(SCREENSHOTS, 'j2-sidebar-limited.png') })
  })
})
