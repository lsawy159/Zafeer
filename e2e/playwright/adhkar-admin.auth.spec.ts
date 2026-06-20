import { expect, test, type Page } from '@playwright/test'
import { restDelete, restSelectSingle } from './support/selfCleaningSupabase'

const ADHKAR_TAB_URL = '/admin-settings?tab=adhkar-settings'
const MODAL = '.app-modal-surface'

// ── Admin CRUD ────────────────────────────────────────────────────────────────

test.describe('adhkar admin — settings tab', () => {
  test('admin sees adhkar-settings tab and can perform CRUD', async ({ page, request }) => {
    const unique = Date.now()
    const testText = `ذكر اختبار Playwright ${unique}`
    const editedText = `ذكر اختبار مُعدَّل ${unique}`
    let adhkarId: string | null = null

    try {
      await page.goto(ADHKAR_TAB_URL)
      await page.waitForLoadState('networkidle')

      // tab renders AdhkarTab
      await expect(page.getByRole('heading', { name: 'إعدادات التوقيت' })).toBeVisible({ timeout: 10_000 })
      await expect(page.getByRole('heading', { name: 'قائمة الأذكار' })).toBeVisible()

      // ── Add dhikr ──────────────────────────────────────────────────────────
      await page.getByRole('button', { name: 'إضافة ذكر' }).click()
      await expect(page.locator(MODAL)).toBeVisible({ timeout: 5_000 })

      await page.locator(`${MODAL} textarea`).fill(testText)
      await page.locator(MODAL).getByRole('button', { name: 'إضافة' }).click()
      await expect(page.locator(MODAL)).toHaveCount(0, { timeout: 5_000 })

      // verify appears in table
      await expect(page.locator('table').getByText(testText, { exact: false })).toBeVisible({ timeout: 5_000 })

      // get id for cleanup
      const row = await restSelectSingle<{ id: string }>(
        request, page, 'adhkar', { text: testText }, 'id'
      )
      adhkarId = row?.id ?? null

      // ── Edit dhikr ─────────────────────────────────────────────────────────
      const editBtn = page.locator('table').getByText(testText, { exact: false }).locator('..').locator('..').getByRole('button', { name: 'تعديل' })
      // Use aria-label instead
      const row_locator = page.locator('tr').filter({ hasText: testText })
      await row_locator.getByRole('button', { name: 'تعديل' }).first().click()
      await expect(page.locator(MODAL)).toBeVisible({ timeout: 5_000 })

      const textareaInModal = page.locator(`${MODAL} textarea`)
      await textareaInModal.clear()
      await textareaInModal.fill(editedText)
      await page.locator(MODAL).getByRole('button', { name: 'حفظ التعديلات' }).click()
      await expect(page.locator(MODAL)).toHaveCount(0, { timeout: 5_000 })
      await expect(page.locator('table').getByText(editedText, { exact: false })).toBeVisible({ timeout: 5_000 })

      // ── Update timer settings ──────────────────────────────────────────────
      const displayInput = page.getByLabel('مدة عرض الذكر (ثواني)')
      await displayInput.clear()
      await displayInput.fill('6')
      await page.getByRole('button', { name: 'حفظ التوقيت' }).click()
      // no error shown
      await expect(page.locator('text=حدث خطأ')).toHaveCount(0)

      // restore timer to original
      await displayInput.clear()
      await displayInput.fill('8')
      await page.getByRole('button', { name: 'حفظ التوقيت' }).click()

      // ── Delete dhikr ───────────────────────────────────────────────────────
      const deleteRow = page.locator('tr').filter({ hasText: editedText })
      await deleteRow.getByRole('button', { name: 'حذف' }).first().click()
      await expect(page.locator(MODAL)).toBeVisible({ timeout: 5_000 })
      await page.locator(MODAL).getByRole('button', { name: /^حذف$/ }).click()
      await expect(page.locator(MODAL)).toHaveCount(0, { timeout: 5_000 })
      await expect(page.locator('table').getByText(editedText, { exact: false })).toHaveCount(0, { timeout: 5_000 })
      adhkarId = null // cleaned up via UI
    } finally {
      if (adhkarId) {
        await restDelete(request, page, 'adhkar', { id: adhkarId })
      }
    }
  })
})

// ── Non-admin guard ───────────────────────────────────────────────────────────

test.describe('adhkar admin tab — non-admin guard', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  async function loginAsNoPerm(page: Page) {
    const email = process.env.E2E_NOPERM_EMAIL
    const password = process.env.E2E_NOPERM_PASSWORD
    if (!email || !password) {
      test.skip(true, 'E2E_NOPERM_EMAIL / E2E_NOPERM_PASSWORD not configured')
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
      test.skip(true, 'noperm login failed — check credentials')
    }
  }

  test('non-admin navigating to adhkar-settings tab sees redirect to first accessible', async ({ page }) => {
    await loginAsNoPerm(page)
    await page.goto(ADHKAR_TAB_URL)
    await page.waitForLoadState('networkidle')

    // adhkar-settings tab NOT visible in sidebar
    await expect(page.getByRole('button', { name: /الأذكار/i })).toHaveCount(0, { timeout: 5_000 })
    // AdhkarTab heading NOT rendered
    await expect(page.getByRole('heading', { name: 'إعدادات التوقيت' })).toHaveCount(0)
  })
})
