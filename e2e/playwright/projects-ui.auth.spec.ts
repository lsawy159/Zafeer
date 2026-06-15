import { expect, test } from '@playwright/test'

test.describe('projects page broader interactions', () => {
  test('projects list controls, tabs, filters, and add modal render', async ({ page }) => {
    await page.goto('/projects')

    await expect(page.getByRole('heading', { name: /المشاريع/i })).toBeVisible()

    const statisticsTab = page.getByRole('button', { name: /إحصائيات المشاريع/i })
    await statisticsTab.click()
    await expect(statisticsTab).toHaveClass(/app-toggle-button-active/)

    const listTab = page.getByRole('button', { name: /قائمة المشاريع/i })
    await listTab.click()
    await expect(listTab).toHaveClass(/app-toggle-button-active/)

    const searchInput = page.getByPlaceholder(/ابحث عن مشروع/i)
    await expect(searchInput).toBeVisible()
    await searchInput.fill('playwright')
    await expect(searchInput).toHaveValue('playwright')
    await searchInput.clear()

    const sortButton = page.getByTitle(/الترتيب/i)
    await expect(sortButton).toBeVisible()
    await sortButton.click()
    await expect(page.getByText(/الاسم \(أ-ي\)|الأحدث|عدد الموظفين/i).first()).toBeVisible()
    await page.keyboard.press('Escape')

    const addButton = page.getByRole('button', { name: /إضافة مشروع جديد/i })
    await expect(addButton).toBeVisible()
    await addButton.click()
    await expect(page.locator('.app-modal-surface, [role="dialog"]').first()).toBeVisible()
    await page.keyboard.press('Escape')
  })
})
