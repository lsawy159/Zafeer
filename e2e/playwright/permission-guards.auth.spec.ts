import { expect, test, type Page } from '@playwright/test'

// Override the project-level admin storageState — tests start unauthenticated
test.use({ storageState: { cookies: [], origins: [] } })

// Guards verified in source:
//   Alerts.tsx L21-33:  !canView('alerts')  → renders "غير مصرح"
//   Reports.tsx L421-431: !canView('reports') → renders "لا تملك صلاحية الوصول إلى صفحة التقارير"
//   Reports.tsx L463:   canExport('reports') gates the "تصدير Excel" button

async function loginAsNoPerm(page: Page) {
  const email = process.env.E2E_NOPERM_EMAIL
  const password = process.env.E2E_NOPERM_PASSWORD

  if (!email || !password) {
    test.skip(true, 'E2E_NOPERM_EMAIL / E2E_NOPERM_PASSWORD not configured — set them in e2e/.env')
    return
  }

  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  await page.locator('#login-username').fill(email)
  await page.locator('#login-password').fill(password)
  await page.locator('button[type="submit"]').click()

  // Promise.race with a throwing branch causes unhandled rejections on the losing side.
  // Use try/catch instead: wait for URL change, capture page text on failure.
  try {
    await page.waitForURL((url) => !/\/login(?:$|[?#])/.test(url.pathname), { timeout: 15_000 })
  } catch {
    const bodyText = (await page.locator('body').textContent())?.trim().slice(0, 300) ?? ''
    throw new Error(
      `noperm login failed\n  email=${email}\n  page: ${bodyText}\n  Check: user exists in Supabase? password matches e2e/.env E2E_NOPERM_PASSWORD?`
    )
  }
}

test.describe('permission guards — no-permission user', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsNoPerm(page)
  })

  test('alerts page shows غير مصرح and not the alerts list', async ({ page }) => {
    await page.goto('/alerts')
    // Assert guard text directly — "جاري تحميل" never appears for noperm (guard renders
    // before loading branch). Generous timeout covers permissions hydration from Supabase.
    await expect(page.locator('body')).toContainText('غير مصرح', { timeout: 15_000 })
    await expect(page.locator('body')).toContainText('ليس لديك صلاحية لعرض هذه الصفحة')

    // No alert rows rendered
    await expect(page.locator('button').filter({ hasText: 'تأجيل' })).toHaveCount(0)
  })

  test('reports page shows access denied message and no export button', async ({ page }) => {
    await page.goto('/reports')
    // Same rationale — assert guard text directly with generous timeout
    await expect(page.locator('body')).toContainText('لا تملك صلاحية الوصول إلى صفحة التقارير', { timeout: 15_000 })

    // Export button must NOT be present (canExport guard)
    await expect(page.getByRole('button', { name: 'تصدير Excel' })).toHaveCount(0)
  })

  test('noperm user is authenticated — not redirected to login', async ({ page }) => {
    // Confirms the noperm user session works — not checking content (user has no permissions)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Must be authenticated — not bounced to /login
    await expect(page).not.toHaveURL(/\/login(?:$|[?#])/)
  })
})
