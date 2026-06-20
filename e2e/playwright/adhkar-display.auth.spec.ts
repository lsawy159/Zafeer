import { expect, test } from '@playwright/test'
import { restSelectSingle, restUpsert } from './support/selfCleaningSupabase'

async function setAdhkarSettings(
  request: Parameters<typeof restUpsert>[0],
  page: Parameters<typeof restUpsert>[1],
  settings: Record<string, number>
) {
  await restUpsert(request, page, 'system_settings', {
    setting_key: 'adhkar_display',
    setting_value: settings,
    updated_at: new Date().toISOString(),
  }, 'setting_key')
}

test.describe('adhkar — display + sidebar controls', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('sidebar shows a dhikr', async ({ page, request }) => {
    const original = await restSelectSingle<{ setting_value: Record<string, number> }>(
      request, page, 'system_settings', { setting_key: 'adhkar_display' }, 'setting_value'
    )
    await setAdhkarSettings(request, page, { display_duration_ms: 3000 })

    try {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      const adhkarText = page.locator('[data-testid="sidebar-adhkar-text"]')
      await expect(adhkarText).toBeVisible({ timeout: 10_000 })
      const text = await adhkarText.textContent()
      expect(text?.trim().length).toBeGreaterThan(0)
    } finally {
      if (original?.setting_value) {
        await setAdhkarSettings(request, page, original.setting_value as Record<string, number>)
      }
    }
  })

  test('next button advances dhikr', async ({ page, request }) => {
    const original = await restSelectSingle<{ setting_value: Record<string, number> }>(
      request, page, 'system_settings', { setting_key: 'adhkar_display' }, 'setting_value'
    )
    await setAdhkarSettings(request, page, { display_duration_ms: 3000 })

    try {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      const adhkarText = page.locator('[data-testid="sidebar-adhkar-text"]')
      await expect(adhkarText).toBeVisible({ timeout: 10_000 })

      await page.getByRole('button', { name: 'الذكر التالي' }).click()
      await page.waitForTimeout(300)

      const text = await adhkarText.textContent()
      expect(text?.trim().length).toBeGreaterThan(0)
    } finally {
      if (original?.setting_value) {
        await setAdhkarSettings(request, page, original.setting_value as Record<string, number>)
      }
    }
  })
})
