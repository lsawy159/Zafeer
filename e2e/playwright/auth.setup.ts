import { test } from '@playwright/test'
import { saveAdminStorageState } from './helpers/auth'

test('authenticate admin user', async ({ page }) => {
  await saveAdminStorageState(page)
})
