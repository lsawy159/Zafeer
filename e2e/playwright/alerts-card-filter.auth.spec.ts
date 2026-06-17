import { expect, test } from '@playwright/test'

// Summary card titles (grounded in useAlertsPage.ts L381-390):
//   key='companies'  → title='تنبيهات المؤسسات'
//   key='employees'  → title='تنبيهات الموظفين'
//   key='مؤجلة'     → title='مؤجلة'
//   key=null         → title='إجمالي التنبيهات'
//
// Active card class (Alerts.tsx L68): 'ring-2 ring-offset-1 ring-primary shadow-md'
// Filter bar tabs (AlertsFilterBar.tsx L47-50): button.v3-chip with class 'v3-on' when active

const summaryCard = (title: string) =>
  `[class*="app-panel"][class*="cursor-pointer"]:has-text("${title}")`

test.describe('alerts summary card filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/alerts')
    await page.waitForLoadState('networkidle')
  })

  test('clicking تنبيهات المؤسسات card activates it and switches filter bar to مؤسسات tab', async ({
    page,
  }) => {
    const card = page.locator(summaryCard('تنبيهات المؤسسات'))
    await expect(card).toBeVisible({ timeout: 10_000 })

    // Card is not active before click
    await expect(card).not.toHaveClass(/ring-2/)

    await card.click()

    // Card gets active ring
    await expect(card).toHaveClass(/ring-2/, { timeout: 3_000 })

    // Filter bar "مؤسسات" tab becomes active (v3-on)
    const filterTab = page.locator('button.v3-chip').filter({ hasText: 'مؤسسات' })
    await expect(filterTab).toHaveClass(/v3-on/, { timeout: 3_000 })

    // "موظفين" tab is not active
    const employeesFilterTab = page.locator('button.v3-chip').filter({ hasText: 'موظفين' })
    await expect(employeesFilterTab).not.toHaveClass(/v3-on/)
  })

  test('clicking active card again clears the filter (toggle off)', async ({ page }) => {
    const card = page.locator(summaryCard('تنبيهات المؤسسات'))
    await expect(card).toBeVisible({ timeout: 10_000 })

    // Activate
    await card.click()
    await expect(card).toHaveClass(/ring-2/, { timeout: 3_000 })

    // Deactivate by clicking again
    await card.click()
    await expect(card).not.toHaveClass(/ring-2/, { timeout: 3_000 })

    // Filter bar "الكل" tab should now be active
    const allTab = page.locator('button.v3-chip').filter({ hasText: 'الكل' })
    await expect(allTab).toHaveClass(/v3-on/, { timeout: 3_000 })
  })

  test('clicking مؤجلة card activates it and switches filter bar to مؤجلة tab', async ({
    page,
  }) => {
    const card = page.locator(summaryCard('مؤجلة'))
    await expect(card).toBeVisible({ timeout: 10_000 })

    await card.click()

    // Card gets active ring
    await expect(card).toHaveClass(/ring-2/, { timeout: 3_000 })

    // Filter bar "مؤجلة" tab becomes active
    const deferredTab = page.locator('button.v3-chip').filter({ hasText: 'مؤجلة' })
    await expect(deferredTab).toHaveClass(/v3-on/, { timeout: 3_000 })
  })

  test('إجمالي التنبيهات card clears any active filter when clicked', async ({ page }) => {
    // First activate a filter
    const companiesCard = page.locator(summaryCard('تنبيهات المؤسسات'))
    await expect(companiesCard).toBeVisible({ timeout: 10_000 })
    await companiesCard.click()
    await expect(companiesCard).toHaveClass(/ring-2/, { timeout: 3_000 })

    // Click the "all" card
    const allCard = page.locator(summaryCard('إجمالي التنبيهات'))
    await allCard.click()

    // Companies card no longer active
    await expect(companiesCard).not.toHaveClass(/ring-2/, { timeout: 3_000 })

    // All card itself has no ring (key=null card uses setCardFilter(null) which = no active filter)
    // Filter bar "الكل" tab is active
    const allTab = page.locator('button.v3-chip').filter({ hasText: 'الكل' })
    await expect(allTab).toHaveClass(/v3-on/, { timeout: 3_000 })
  })
})
