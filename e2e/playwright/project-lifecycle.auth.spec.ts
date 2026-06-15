/**
 * Tests soft-delete of a project from the real projects list.
 * Confirms the UI shows success, the project disappears from the list,
 * and the authenticated edge-function request succeeds.
 *
 * SAFETY: Every test that creates data wraps it in try/finally with restDelete
 * so no test artifacts remain in the DB even on failure.
 */
import { expect, test } from '@playwright/test'

import { restDelete, restInsert, restSelectSingle } from './support/selfCleaningSupabase'

async function collectDeleteFunctionCalls(
  page: import('@playwright/test').Page,
  fn: () => Promise<void>,
) {
  const calls: Array<{
    method: string
    url: string
    authHeader: string
    status: number
    body: string
  }> = []

  const onReq = (req: import('@playwright/test').Request) => {
    if (req.url().includes('/functions/v1/admin-projects')) {
      calls.push({
        method: req.method(),
        url: req.url(),
        authHeader: req.headers().authorization ?? '<MISSING>',
        status: 0,
        body: '',
      })
    }
  }

  const onRes = async (res: import('@playwright/test').Response) => {
    if (!res.url().includes('/functions/v1/admin-projects')) return
    const entry = [...calls].reverse().find((c) => c.url === res.url() && c.status === 0)
    if (!entry) return
    entry.status = res.status()
    try {
      entry.body = JSON.stringify(await res.json())
    } catch {
      entry.body = '<non-json>'
    }
  }

  page.on('request', onReq)
  page.on('response', onRes)
  await fn()
  await page.waitForTimeout(3000)
  page.off('request', onReq)
  page.off('response', onRes)
  return calls
}

test.describe('Project delete flow', () => {
  // T1 and T2 are read-only — no data creation, no cleanup needed
  test('T1 — at least one project is visible on page', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')
    const heading = page.locator('h3').filter({ hasNotText: /تأكيد/ }).first()
    await expect(heading).toBeVisible({ timeout: 8000 })
    const name = (await heading.textContent())?.trim()
    expect(name, 'a project name should be visible').toBeTruthy()
    await expect(page.getByText(name!).first()).toBeVisible()
  })

  test('T2 — delete button opens confirmation modal (temp project)', async ({ page, request }) => {
    const unique = Date.now()
    const tempName = `PW T2 Project ${unique}`
    let projectId: string | null = null

    try {
      const created = await restInsert(request, page, 'projects', {
        name: tempName,
        description: 'T2 temp — read-only modal test',
        status: 'active',
      })
      projectId = created.id

      await page.goto('/projects')
      await page.waitForLoadState('networkidle')
      await page.getByPlaceholder(/ابحث عن مشروع/i).fill(tempName)
      await expect(page.getByText(tempName, { exact: true })).toBeVisible({ timeout: 10000 })

      const deleteBtn = page.locator('button[title*="حذف"], button[aria-label*="حذف"]').first()
      await deleteBtn.click()

      const confirmHeading = page.locator('h3, h2').filter({ hasText: /تأكيد/ }).first()
      await expect(confirmHeading).toBeVisible({ timeout: 5000 })
      await expect(page.getByText(tempName).first()).toBeVisible()

      // Close modal without deleting — project still exists for cleanup
      const cancelBtn = page.locator('button').filter({ hasText: /إلغاء|رجوع/ }).first()
      if (await cancelBtn.isVisible()) await cancelBtn.click()
    } finally {
      if (projectId) {
        await restDelete(request, page, 'projects', { id: projectId })
      }
    }
  })

  test('T3 — confirm delete sends authenticated edge-function request (temp project)', async ({
    page,
    request,
  }) => {
    const unique = Date.now()
    const tempName = `PW T3 Project ${unique}`
    let projectId: string | null = null

    try {
      const created = await restInsert(request, page, 'projects', {
        name: tempName,
        description: 'T3 temp — edge-function auth test',
        status: 'active',
      })
      projectId = created.id

      await page.goto('/projects')
      await page.waitForLoadState('networkidle')
      await page.getByPlaceholder(/ابحث عن مشروع/i).fill(tempName)
      await expect(page.getByText(tempName, { exact: true })).toBeVisible({ timeout: 10000 })

      const deleteBtn = page.locator('button[title*="حذف"], button[aria-label*="حذف"]').first()
      await deleteBtn.click()

      const confirmBtn = page
        .locator('button')
        .filter({ hasText: /^حذف|^تأكيد/ })
        .last()

      const calls = await collectDeleteFunctionCalls(page, async () => {
        await confirmBtn.click()
      })

      console.log('\n=== Delete function calls during project delete ===')
      for (const c of calls) {
        console.log(`${c.method} ${c.url}`)
        console.log(`  Authorization: ${c.authHeader.substring(0, 50)}...`)
        console.log(`  Status: ${c.status}`)
        console.log(`  Body: ${c.body}`)
      }

      const deleteCall = calls.find(
        (c) => c.method === 'POST' && c.url.includes('/functions/v1/admin-projects'),
      )

      expect(deleteCall, 'admin-projects edge function must be called').toBeTruthy()
      expect(deleteCall!.authHeader, 'Authorization header must be present').not.toBe('<MISSING>')
      expect(deleteCall!.authHeader).toMatch(/^Bearer .+/)
      expect(
        deleteCall!.status,
        `delete function must return 200, got ${deleteCall!.status}: ${deleteCall!.body}`,
      ).toBe(200)

      // Project was deleted via UI — clear local ref to skip redundant restDelete
      projectId = null
    } finally {
      // If UI delete failed, clean up via REST
      if (projectId) {
        await restDelete(request, page, 'projects', { id: projectId })
      }
    }
  })

  test('T4 — after confirm: success toast appears AND project is removed from list', async ({
    page,
    request,
  }) => {
    const unique = Date.now()
    const targetName = `PW Delete Project ${unique}`
    let projectId: string | null = null

    try {
      const created = await restInsert(request, page, 'projects', {
        name: targetName,
        description: 'Temporary project for deterministic delete verification',
        status: 'active',
      })
      projectId = created.id

      await page.goto('/projects')
      await page.waitForLoadState('networkidle')
      await page.getByPlaceholder(/ابحث عن مشروع/i).fill(targetName)
      await expect(page.getByText(targetName, { exact: true })).toBeVisible({ timeout: 10000 })

      const deleteBtn = page.locator('button[title*="حذف"], button[aria-label*="حذف"]').first()
      await deleteBtn.click()

      const confirmBtn = page
        .locator('button')
        .filter({ hasText: /^حذف|^تأكيد/ })
        .last()
      await confirmBtn.click()

      const anyToast = page.locator('[data-sonner-toast]')
      await anyToast.first().waitFor({ state: 'visible', timeout: 8000 })

      const toastText = await anyToast.first().textContent().catch(() => '')
      console.log(`\nToast text: "${toastText}"`)

      const isSuccess = /تم حذف|نجاح|success/i.test(toastText ?? '')
      const isError = /خطأ|فشل|غير مصرح|error/i.test(toastText ?? '')

      console.log(`Toast type: ${isSuccess ? 'SUCCESS' : isError ? 'ERROR' : 'UNKNOWN'}`)

      if (isSuccess) {
        // UI delete succeeded — project is gone, no REST cleanup needed
        projectId = null
      } else if (isError) {
        // UI delete failed — projectId remains set so finally will clean up
        test.fail(
          true,
          `Delete failed. Toast: "${toastText}". Check auth token and server permissions.`,
        )
        return
      }

      await page.goto('/projects')
      await page.waitForLoadState('networkidle')
      await page.getByPlaceholder(/ابحث عن مشروع/i).fill(targetName)
      await page.waitForTimeout(500)

      const projectStillVisible = await page
        .getByText(targetName, { exact: true })
        .isVisible()
        .catch(() => false)
      console.log(`\nProject still visible after success toast: ${projectStillVisible}`)

      expect(
        projectStillVisible,
        'BUG: Success toast appeared but project is still in the list!',
      ).toBe(false)
    } finally {
      // Fallback: if UI delete didn't happen or was soft-delete, force hard delete via REST
      if (projectId) {
        await restDelete(request, page, 'projects', { id: projectId })
      }
    }
  })
})
