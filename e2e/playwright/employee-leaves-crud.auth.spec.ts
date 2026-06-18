import { expect, test, type Page } from '@playwright/test'

import { restDelete, restInsert, restSelectSingle } from './support/selfCleaningSupabase'

// ── Permission guard (no-perm user) ─────────────────────────────────────────

test.describe('employee-leaves — permission guard', () => {
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
    await page.waitForURL((url) => !/\/login(?:$|[?#])/.test(url.pathname), { timeout: 15_000 })
  }

  test('no-perm user sees access denied on /employee-leaves', async ({ page }) => {
    await loginAsNoPerm(page)
    await page.goto('/employee-leaves')
    await expect(page.locator('body')).toContainText('لا تملك صلاحية الوصول', { timeout: 15_000 })
    // تسجيل إجازة button must NOT be present
    await expect(page.getByRole('button', { name: /تسجيل إجازة/i })).toHaveCount(0)
  })
})

// ── Admin CRUD ───────────────────────────────────────────────────────────────

test.describe('employee-leaves CRUD — admin', () => {
  test('create, edit, delete leave — self-cleaning', async ({ page, request }) => {
    const unique = Date.now()
    const tempName = `PW إجازة ${unique}`
    const tempResidence = Number(`99${String(unique).slice(-8)}`)

    let employeeId: string | null = null
    let leaveId: string | null = null

    try {
      // ── Setup: create temp employee via API ─────────────────────────────
      const emp = await restInsert(request, page, 'employees', {
        name: tempName,
        residence_number: tempResidence,
        profession: 'عامل',
        nationality: 'مصري',
      })
      employeeId = emp.id

      // ── Navigate to employee-leaves ─────────────────────────────────────
      await page.goto('/employee-leaves')
      await page.waitForLoadState('networkidle')

      // ── Open form ───────────────────────────────────────────────────────
      await page.getByRole('button', { name: /تسجيل إجازة/i }).click()
      await expect(page.locator('.app-modal-surface')).toBeVisible({ timeout: 5_000 })

      // ── Search employee by name ─────────────────────────────────────────
      await page.getByPlaceholder(/ابحث بالاسم أو رقم الإقامة/i).first().fill(String(tempResidence))
      await page.waitForTimeout(400) // debounce

      const suggestion = page.locator('.app-modal-surface li').filter({ hasText: tempName })
      await expect(suggestion).toBeVisible({ timeout: 8_000 })
      await suggestion.dispatchEvent('mousedown')

      // ── Verify employee selected ────────────────────────────────────────
      await expect(page.locator('.app-modal-surface')).toContainText('✓ تم اختيار الموظف')

      // ── Fill dates ──────────────────────────────────────────────────────
      const startDate = '2026-07-01'
      const endDate = '2026-07-10'
      await page.locator('input[type="date"]').first().fill(startDate)
      await page.locator('input[type="date"]').last().fill(endDate)

      // days preview should show 10
      await expect(page.locator('.app-modal-surface')).toContainText('10')

      // ── Submit ──────────────────────────────────────────────────────────
      await page.getByRole('button', { name: /تسجيل الإجازة/i }).click()
      await expect(page.locator('.app-modal-surface')).toHaveCount(0, { timeout: 8_000 })

      // ── Verify row appeared ─────────────────────────────────────────────
      await expect(page.locator('body')).toContainText(tempName, { timeout: 8_000 })
      await expect(page.locator('body')).toContainText(String(tempResidence))

      // ── Fetch leave id for cleanup ──────────────────────────────────────
      const created = await restSelectSingle<{ id: string }>(
        request, page, 'employee_leaves',
        { employee_id: employeeId as string },
        'id'
      )
      leaveId = created?.id ?? null
      expect(leaveId).toBeTruthy()

      // ── Edit: change end_date ───────────────────────────────────────────
      const editBtn = page.locator(`tr:has-text("${tempName}")`).getByTitle('تعديل')
      await editBtn.click()
      await expect(page.locator('.app-modal-surface')).toBeVisible({ timeout: 5_000 })

      await page.locator('input[type="date"]').last().fill('2026-07-15')
      await expect(page.locator('.app-modal-surface')).toContainText('15')

      await page.getByRole('button', { name: /حفظ التعديلات/i }).click()
      await expect(page.locator('.app-modal-surface')).toHaveCount(0, { timeout: 8_000 })

      // days pill should now show 15
      await expect(page.locator('body')).toContainText('15')

      // ── Delete ──────────────────────────────────────────────────────────
      page.once('dialog', (d) => d.accept())
      const deleteBtn = page.locator(`tr:has-text("${tempName}")`).getByTitle('حذف')
      await deleteBtn.click()

      await expect(page.locator(`tr:has-text("${tempName}")`)).toHaveCount(0, { timeout: 8_000 })
      leaveId = null // cleaned by UI
    } finally {
      if (leaveId) await restDelete(request, page, 'employee_leaves', { id: leaveId })
      if (employeeId) await restDelete(request, page, 'employees', { id: employeeId })
    }
  })

  test('search filters leaves by name', async ({ page, request }) => {
    const unique = Date.now()
    const tempName = `PW فلتر ${unique}`
    const tempResidence = Number(`98${String(unique).slice(-8)}`)

    let employeeId: string | null = null
    let leaveId: string | null = null

    try {
      const emp = await restInsert(request, page, 'employees', {
        name: tempName,
        residence_number: tempResidence,
        profession: 'عامل',
        nationality: 'مصري',
      })
      employeeId = emp.id

      // insert leave directly via API
      const leave = await restInsert(request, page, 'employee_leaves', {
        employee_id: employeeId,
        start_date: '2026-08-01',
        end_date: '2026-08-05',
      })
      leaveId = leave.id

      await page.goto('/employee-leaves')
      await page.waitForLoadState('networkidle')
      await expect(page.locator('body')).toContainText(tempName, { timeout: 8_000 })

      // search for unique name — row stays visible
      const searchInput = page.getByPlaceholder(/بحث بالاسم أو رقم الإقامة/i)
      await searchInput.fill(tempName)
      await expect(page.locator(`tr:has-text("${tempName}")`)).toBeVisible()

      // search for unrelated term — row disappears
      await searchInput.fill('zzznomatch')
      await expect(page.locator(`tr:has-text("${tempName}")`)).toHaveCount(0)
      await expect(page.locator('body')).toContainText('لا توجد نتائج')
    } finally {
      if (leaveId) await restDelete(request, page, 'employee_leaves', { id: leaveId })
      if (employeeId) await restDelete(request, page, 'employees', { id: employeeId })
    }
  })
})
