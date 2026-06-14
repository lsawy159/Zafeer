import { expect, test } from '@playwright/test'

import {
  restDelete,
  restSelectSingle,
  restUpsert,
} from './support/selfCleaningSupabase'

type SystemSettingRow = {
  setting_key: string
  setting_value: string
}

async function restoreSystemSetting(
  request: Parameters<typeof restUpsert>[0],
  page: Parameters<typeof restUpsert>[1],
  original: SystemSettingRow | null,
  settingKey: string
) {
  if (original) {
    await restUpsert(
      request,
      page,
      'system_settings',
      {
        setting_key: original.setting_key,
        setting_value: original.setting_value,
      },
      'setting_key'
    )
    return
  }

  await restDelete(request, page, 'system_settings', { setting_key: settingKey })
}

test.describe('extended finance and admin settings coverage', () => {
  test('finance obligations dialogs open and close safely', async ({ page }) => {
    await page.goto('/finance?tab=deductions')

    const obligationsTab = page.getByRole('button', { name: /^الالتزامات$/i }).first()
    await expect(obligationsTab).toBeVisible()
    await obligationsTab.click()

    await expect(
      page.getByRole('heading', { name: /قائمة الالتزامات والاستقطاعات/i })
    ).toBeVisible()

    const dialogCases = [
      {
        trigger: page.getByRole('button', { name: /^إضافة التزام$/ }),
        heading: /إضافة التزام جديد/i,
      },
      {
        trigger: page.getByRole('button', { name: /^استيراد الالتزامات$/ }),
        heading: /استيراد الالتزامات من Excel/i,
      },
      {
        trigger: page.getByRole('button', { name: /^غرامة جماعية$/ }),
        heading: /غرامة جماعية/i,
      },
    ] as const

    for (const dialogCase of dialogCases) {
      await dialogCase.trigger.click()

      const dialog = page.getByRole('dialog').filter({ hasText: dialogCase.heading }).first()
      await expect(dialog).toBeVisible()

      await dialog.getByRole('button', { name: /إغلاق|إلغاء/ }).first().click()
      await expect(dialog).not.toBeVisible()
    }

    const exportButton = page.getByRole('button', { name: /^تصدير Excel$/ })
    await expect(exportButton).toBeVisible()

    if (await exportButton.isEnabled()) {
      await exportButton.click()
      const exportDialog = page.getByRole('dialog').filter({ hasText: /تصدير قائمة الالتزامات/i }).first()
      await expect(exportDialog).toBeVisible()
      await exportDialog.getByRole('button', { name: /إغلاق|إلغاء/ }).first().click()
      await expect(exportDialog).not.toBeVisible()
    } else {
      await expect(exportButton).toBeDisabled()
    }
  })

  test('finance payroll run modal opens from the runs tab', async ({ page }) => {
    await page.goto('/finance?tab=deductions')

    const runsTab = page.getByRole('button', { name: /مسيرات الرواتب/i }).first()
    await expect(runsTab).toBeVisible()
    await runsTab.click()

    const openModalButton = page.getByRole('button', { name: /^مسير جديد$/ }).first()
    await expect(openModalButton).toBeVisible()
    await openModalButton.click()

    const dialog = page.getByRole('dialog').filter({ hasText: /إضافة مسير جديد/i }).first()
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: /إنشاء المسير/i })).toBeVisible()

    await dialog.getByRole('button', { name: /إغلاق|إلغاء/ }).first().click()
    await expect(dialog).not.toBeVisible()
  })

  test('permissions tab opens a user permission drawer safely', async ({ page }) => {
    await page.goto('/admin-settings?tab=permissions')

    await expect(page.getByRole('heading', { name: /إدارة الصلاحيات/i }).first()).toBeVisible()

    const permissionButton = page.getByRole('button', { name: /^الصلاحيات$/ }).first()
    await expect(permissionButton).toBeVisible()
    await permissionButton.click()

    const savePermissionsButton = page.getByRole('button', { name: /حفظ الصلاحيات/i }).first()
    await expect(savePermissionsButton).toBeVisible()

    const closeButton = page.getByRole('button', { name: /إغلاق|إلغاء/ }).first()
    await closeButton.click()
    await expect(savePermissionsButton).not.toBeVisible()
  })

  test('backup settings can save a temporary schedule toggle and restore it', async ({ page, request }) => {
    const originalScheduleEnabled = await restSelectSingle<SystemSettingRow>(
      request,
      page,
      'system_settings',
      { setting_key: 'backup_schedule_enabled' },
      'setting_key,setting_value'
    )

    const nextValue = originalScheduleEnabled?.setting_value === 'true' ? false : true

    try {
      await page.goto('/admin-settings?tab=backup')

      await expect(page.getByText(/جدولة النسخ التلقائي/i)).toBeVisible()

      const scheduleSwitch = page.getByRole('switch').first()
      const currentChecked = (await scheduleSwitch.getAttribute('aria-checked')) === 'true'

      if (currentChecked !== nextValue) {
        await scheduleSwitch.click()
      }

      const saveButton = page.getByRole('button', { name: /^حفظ الإعدادات$/ }).first()
      await expect(saveButton).toBeVisible()
      await saveButton.click()

      await expect
        .poll(
          async () => {
            const updated = await restSelectSingle<SystemSettingRow>(
              request,
              page,
              'system_settings',
              { setting_key: 'backup_schedule_enabled' },
              'setting_key,setting_value'
            )
            return updated?.setting_value ?? ''
          },
          { timeout: 20_000 }
        )
        .toBe(JSON.stringify(nextValue))
    } finally {
      await restoreSystemSetting(request, page, originalScheduleEnabled, 'backup_schedule_enabled')
    }
  })

  test('email settings can save a temporary admin email and restore it', async ({ page, request }) => {
    const originalAdminEmail = await restSelectSingle<SystemSettingRow>(
      request,
      page,
      'system_settings',
      { setting_key: 'admin_email' },
      'setting_key,setting_value'
    )

    const temporaryEmail = `playwright-${Date.now()}@example.com`

    try {
      await page.goto('/admin-settings?tab=email-settings')

      await expect(page.getByRole('heading', { name: /تضمين المنتهي/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /إرسال الآن/i })).toBeVisible()

      const adminEmailInput = page.locator('input[type="email"]').first()
      await adminEmailInput.fill(temporaryEmail)

      const saveButton = page.getByRole('button', { name: /^حفظ الإعدادات$/ }).first()
      await saveButton.click()

      await expect
        .poll(
          async () => {
            const updated = await restSelectSingle<SystemSettingRow>(
              request,
              page,
              'system_settings',
              { setting_key: 'admin_email' },
              'setting_key,setting_value'
            )
            return updated?.setting_value ?? ''
          },
          { timeout: 20_000 }
        )
        .toBe(JSON.stringify(temporaryEmail))
    } finally {
      await restoreSystemSetting(request, page, originalAdminEmail, 'admin_email')
    }
  })

  test('sessions tab refreshes and renders session surfaces safely', async ({ page }) => {
    await page.goto('/admin-settings?tab=sessions')

    await expect(page.getByText(/الجلسات/i).first()).toBeVisible()

    const refreshButtons = page.getByRole('button', { name: /^تحديث$/ })
    await expect(refreshButtons.first()).toBeVisible()
    await refreshButtons.first().click()

    await expect(page.getByText(/سجل الجلسات/i)).toBeVisible()
    await expect(page.locator('body')).not.toContainText('غير مصرح')
  })
})
