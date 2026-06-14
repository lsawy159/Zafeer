import { expect, test } from '@playwright/test'

import {
  restDelete,
  restInsert,
  restSelectSingle,
  restUpsert,
} from './support/selfCleaningSupabase'

test.describe('remaining critical surfaces coverage', () => {
  test('advanced notification settings save and restore original values', async ({ page, request }) => {
    const originalFrequency = await restSelectSingle<{ setting_key: string; setting_value: string }>(
      request,
      page,
      'system_settings',
      { setting_key: 'notification_frequency' },
      'setting_key,setting_value'
    )
    const originalUrgent = await restSelectSingle<{ setting_key: string; setting_value: string }>(
      request,
      page,
      'system_settings',
      { setting_key: 'urgent_notifications' },
      'setting_key,setting_value'
    )

    const nextFrequency =
      originalFrequency?.setting_value === '"daily"' ? 'weekly' : 'daily'
    const nextUrgent =
      originalUrgent?.setting_value === 'true' ? false : true

    try {
      await page.goto('/admin-settings?tab=advanced-notifications')

      const saveButton = page.getByRole('button', { name: /حفظ هذا التبويب/i })
      await expect(saveButton).toBeVisible()

      const frequencySelect = page.locator('[role="combobox"]').first()
      await frequencySelect.click()
      await page.getByRole('option', { name: nextFrequency, exact: true }).click()

      const urgentCheckbox = page.locator('input[type="checkbox"]').first()
      if ((await urgentCheckbox.isChecked()) !== nextUrgent) {
        await urgentCheckbox.click()
      }

      await saveButton.click()

      await expect
        .poll(
          async () => {
            const updated = await restSelectSingle<{ setting_value: string }>(
              request,
              page,
              'system_settings',
              { setting_key: 'notification_frequency' },
              'setting_value'
            )
            return updated?.setting_value ?? ''
          },
          { timeout: 20_000 }
        )
        .toBe(JSON.stringify(nextFrequency))

      await expect
        .poll(
          async () => {
            const updated = await restSelectSingle<{ setting_value: string }>(
              request,
              page,
              'system_settings',
              { setting_key: 'urgent_notifications' },
              'setting_value'
            )
            return updated?.setting_value ?? ''
          },
          { timeout: 20_000 }
        )
        .toBe(JSON.stringify(nextUrgent))
    } finally {
      if (originalFrequency) {
        await restUpsert(request, page, 'system_settings', {
          setting_key: 'notification_frequency',
          setting_value: originalFrequency.setting_value,
        }, 'setting_key')
      } else {
        await restDelete(request, page, 'system_settings', { setting_key: 'notification_frequency' })
      }

      if (originalUrgent) {
        await restUpsert(request, page, 'system_settings', {
          setting_key: 'urgent_notifications',
          setting_value: originalUrgent.setting_value,
        }, 'setting_key')
      } else {
        await restDelete(request, page, 'system_settings', { setting_key: 'urgent_notifications' })
      }
    }
  })

  test('global search finds a temporary project and opens its detail modal', async ({
    page,
    request,
  }) => {
    const unique = Date.now()
    const projectName = `PW Search Project ${unique}`
    let projectId: string | null = null

    try {
      const project = await restInsert(request, page, 'projects', {
        name: projectName,
        description: 'Temporary project for global search coverage',
        status: 'active',
      })
      projectId = project.id

      await page.goto('/dashboard')
      await page.locator('button').filter({ hasText: '/' }).first().click()

      const searchInput = page.locator('input[placeholder]').first()
      await page.getByRole('button', { name: /مشاريع/i }).click()
      await searchInput.fill(projectName)

      await expect(page.locator('button').filter({ hasText: projectName }).first()).toBeVisible({
        timeout: 15_000,
      })
      await page.locator('button').filter({ hasText: projectName }).first().click()

      await expect(page.locator('.app-modal-surface').filter({ hasText: projectName }).first()).toBeVisible({
        timeout: 15_000,
      })
    } finally {
      if (projectId) {
        await restDelete(request, page, 'projects', { id: projectId })
      }
    }
  })

  test('activity logs tab supports filtering and Excel export safely', async ({ page }) => {
    await page.goto('/admin-settings?tab=activity-logs')

    await expect(page.getByRole('heading', { name: /سجل/i }).first()).toBeVisible()

    const searchInput = page.getByPlaceholder(/البحث/i).first()
    await searchInput.fill('create')

    const refreshButton = page.getByRole('button', { name: /تحديث/i }).first()
    await expect(refreshButton).toBeVisible()
    await refreshButton.click()

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Excel/i }).first().click(),
    ])

    expect(download.suggestedFilename()).toMatch(/\.xlsx$/i)
  })

  test('advanced notifications tab can refresh deferred notifications section without crashing', async ({ page }) => {
    await page.goto('/admin-settings?tab=advanced-notifications')

    const refreshDeferredButton = page.getByRole('button').filter({ has: page.locator('svg') }).last()
    await expect(refreshDeferredButton).toBeVisible()
    await refreshDeferredButton.click()
    await expect(page.locator('body')).not.toContainText('غير مصرح')
  })
})
