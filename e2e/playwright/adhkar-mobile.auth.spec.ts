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

test.describe('adhkar — mobile / responsive visibility', () => {
  test('sidebar controls and dhikr text do NOT appear on mobile viewport (375px)', async ({ page, request }) => {
    const original = await restSelectSingle<{ setting_value: Record<string, number> }>(
      request, page, 'system_settings', { setting_key: 'adhkar_display' }, 'setting_value'
    )
    await setAdhkarSettings(request, page, { display_duration_ms: 3000 })

    try {
      await page.setViewportSize({ width: 375, height: 812 })
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      await expect(page.getByRole('button', { name: 'الذكر التالي' })).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'الذكر السابق' })).toHaveCount(0)
      await expect(page.locator('[data-testid="sidebar-adhkar-text"]')).toHaveCount(0)
    } finally {
      await page.setViewportSize({ width: 1280, height: 800 })
      if (original?.setting_value) {
        await setAdhkarSettings(request, page, original.setting_value as Record<string, number>)
      }
    }
  })

  test('sidebar controls and dhikr text appear on desktop viewport (1280px)', async ({ page, request }) => {
    const original = await restSelectSingle<{ setting_value: Record<string, number> }>(
      request, page, 'system_settings', { setting_key: 'adhkar_display' }, 'setting_value'
    )
    await setAdhkarSettings(request, page, { display_duration_ms: 3000 })

    try {
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      await expect(page.getByRole('button', { name: 'الذكر التالي' })).toBeVisible({ timeout: 10_000 })
      await expect(page.locator('[data-testid="sidebar-adhkar-text"]')).toBeVisible({ timeout: 10_000 })
    } finally {
      if (original?.setting_value) {
        await setAdhkarSettings(request, page, original.setting_value as Record<string, number>)
      }
    }
  })
})
