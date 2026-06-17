import { expect, test } from '@playwright/test'

// Selectors (grounded in AlertsDisplay.tsx + AlertSnoozeModal.tsx):
//   snooze button:  <button>تأجيل</button>  (exact text, table row actions)
//   unsnooze btn:  <button>إلغاء التأجيل</button>  (deferred tab)
//   modal heading: DialogTitle "تأجيل التنبيه"
//   confirm btn:   <button>تأكيد التأجيل</button>
//   deferred tab:  <button class="v3-chip">مؤجلة (...)</button>  (filter bar)

// Use :text-is() (exact match) — :has-text() is substring and would match
// "تأكيد التأجيل" and "إلغاء التأجيل" when searching for "تأجيل"
const SNOOZE_BTN = 'button:text-is("تأجيل")'
const UNSNOOZE_BTN = 'button:text-is("إلغاء التأجيل")'
const DEFERRED_TAB = 'button.v3-chip:has-text("مؤجلة")'

test.describe('alerts snooze and defer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/alerts')
    await page.waitForLoadState('networkidle')
  })

  test('7-day snooze moves alert to deferred tab then unsnooze restores it', async ({ page }) => {
    // Require at least one snoozeable alert in the list
    await expect(page.locator(SNOOZE_BTN).first()).toBeVisible({ timeout: 15_000 })

    await page.locator(SNOOZE_BTN).first().click()

    // Modal opens
    await expect(page.getByRole('heading', { name: 'تأجيل التنبيه' })).toBeVisible()

    // Default mode is 7-days
    await expect(page.locator('input[type="radio"][value="7-days"]')).toBeChecked()

    // Confirm
    await page.getByRole('button', { name: 'تأكيد التأجيل' }).click()

    // Toast contains date confirmation
    await expect(page.locator('body')).toContainText('تم تأجيل التنبيه حتى', { timeout: 5_000 })

    // Modal dismissed
    await expect(page.getByRole('heading', { name: 'تأجيل التنبيه' })).toHaveCount(0)

    // Switch to deferred tab in filter bar
    await page.locator(DEFERRED_TAB).click()
    await page.waitForLoadState('networkidle')

    // Alert now appears with unsnooze action
    await expect(page.locator(UNSNOOZE_BTN).first()).toBeVisible({ timeout: 10_000 })

    const deferredCountBefore = await page.locator(UNSNOOZE_BTN).count()

    // Unsnooze — self-cleaning
    await page.locator(UNSNOOZE_BTN).first().click()
    await page.waitForTimeout(1_000)

    const deferredCountAfter = await page.locator(UNSNOOZE_BTN).count()
    expect(deferredCountAfter).toBeLessThan(deferredCountBefore)
  })

  test('defer mode saves with indefinite toast and unsnooze cleans up', async ({ page }) => {
    await expect(page.locator(SNOOZE_BTN).first()).toBeVisible({ timeout: 15_000 })

    await page.locator(SNOOZE_BTN).first().click()

    await expect(page.getByRole('heading', { name: 'تأجيل التنبيه' })).toBeVisible()

    // Select defer (indefinite) mode
    await page.locator('input[type="radio"][value="defer"]').click()
    await expect(page.locator('input[type="radio"][value="defer"]')).toBeChecked()

    await page.getByRole('button', { name: 'تأكيد التأجيل' }).click()

    // Toast must use the indefinite message — NOT a date
    // Assert prefix + suffix separately: "يفعَّل" contains Unicode combining diacritics
    // that may encode differently across editor/DOM, making full-string match fragile
    await expect(page.locator('body')).toContainText('تم تأجيل التنبيه حتى', { timeout: 5_000 })
    await expect(page.locator('body')).toContainText('يدوياً', { timeout: 5_000 })
    await expect(page.locator('body')).not.toContainText('فشل')

    // Cleanup: go to deferred tab and unsnooze
    await page.locator(DEFERRED_TAB).click()
    await page.waitForLoadState('networkidle')
    await expect(page.locator(UNSNOOZE_BTN).first()).toBeVisible({ timeout: 10_000 })
    const deferCountBefore = await page.locator(UNSNOOZE_BTN).count()
    await page.locator(UNSNOOZE_BTN).first().click()
    // Wait for unsnooze to complete before test ends — avoids aborted network writes
    await expect(page.locator(UNSNOOZE_BTN)).toHaveCount(deferCountBefore - 1, { timeout: 5_000 })
  })

  test('cancel button closes modal without saving', async ({ page }) => {
    await expect(page.locator(SNOOZE_BTN).first()).toBeVisible({ timeout: 15_000 })

    // Count active (snoozeable) alerts before — UNSNOOZE_BTN is 0 on active tab
    // so we compare snooze buttons; cancel must not remove any alert from the list
    const snoozableBefore = await page.locator(SNOOZE_BTN).count()

    await page.locator(SNOOZE_BTN).first().click()
    await expect(page.getByRole('heading', { name: 'تأجيل التنبيه' })).toBeVisible()

    await page.getByRole('button', { name: 'إلغاء' }).click()

    await expect(page.getByRole('heading', { name: 'تأجيل التنبيه' })).toHaveCount(0)

    // Alert list unchanged — no alert was moved to deferred
    const snoozableAfter = await page.locator(SNOOZE_BTN).count()
    expect(snoozableAfter).toBe(snoozableBefore)
  })
})
