/**
 * J3 — Finding A: Suspended user race condition
 *
 * test2 persona: E2E_SUSPENDED (is_active=false).
 *
 * Protocol:
 *   1. Submit test2 credentials.
 *   2. Take screenshot IMMEDIATELY after navigation (before any settle) to capture
 *      whether dashboard/authenticated content flashed.
 *   3. Wait for page to fully settle.
 *   4. Take a second screenshot of the final settled state.
 *   5. Assert FINAL state: must be on /login AND the Arabic suspension message is visible.
 *
 * Note on race visibility: AuthContext.tsx signIn() calls signInWithPassword() first,
 * then checks is_active. A valid JWT exists briefly between those two steps.
 * This test documents whether any authenticated content rendered before the
 * suspension check fired (UI-only gate evidence).
 *
 * Assertion standard: asserts real Arabic suspension message AND /login URL.
 */

import path from 'node:path'
import { expect, test } from '@playwright/test'

const SCREENSHOTS = path.resolve(__dirname, '..', 'screenshots', 'spec077')

test('suspended user: final state is /login with Arabic suspension message', async ({ page }) => {
  const email = process.env.E2E_SUSPENDED_EMAIL
  const password = process.env.E2E_SUSPENDED_PASSWORD

  if (!email || !password) {
    test.skip(
      true,
      'E2E_SUSPENDED_EMAIL / E2E_SUSPENDED_PASSWORD not configured — set them in e2e/.env',
    )
    return
  }

  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  await page.locator('#login-username').fill(email)
  await page.locator('#login-password').fill(password)

  // Click submit and immediately take a screenshot — captures any flash of authenticated content.
  // We do NOT wait for navigation here; we want the in-flight state.
  await page.locator('button[type="submit"]').click()

  // Immediate screenshot — captures racing authenticated content if any
  await page.screenshot({ path: path.join(SCREENSHOTS, 'j3-suspended-immediate.png') })

  // Check body text right now (before settle) for any dashboard/authenticated element
  // that would indicate the suspension gate is too slow.
  // "الموظفين" in the sidebar = authenticated shell rendered → race exposed.
  // We capture this as a FINDING, not necessarily a hard assertion failure.
  const immediateBodyText = (await page.locator('body').textContent()) ?? ''
  const dashboardFlashed =
    immediateBodyText.includes('الموظفين') || immediateBodyText.includes('لوحة التحكم')

  // ── Wait for settled state ─────────────────────────────────────────────────
  // The suspension check redirects back to /login with a message.
  // Wait up to 15 s for this to complete.
  try {
    // Either we're still on /login (immediate rejection), or we briefly left and return.
    // In both cases the final URL must be /login.
    await page.waitForFunction(
      () => /\/login(?:$|[?#])/.test(window.location.pathname),
      { timeout: 15_000 },
    )
  } catch {
    // If timeout fires, capture state and fail descriptively
    await page.screenshot({ path: path.join(SCREENSHOTS, 'j3-suspended-settle-timeout.png') })
    const bodyText = (await page.locator('body').textContent())?.trim().slice(0, 400) ?? ''
    throw new Error(
      `Suspended user was NOT redirected to /login within 15 s.\n` +
        `Current URL: ${page.url()}\nBody: ${bodyText}\n` +
        `Dashboard flashed immediately: ${dashboardFlashed}`,
    )
  }

  // Final screenshot — settled state
  await page.screenshot({ path: path.join(SCREENSHOTS, 'j3-suspended-settled.png') })

  // ── Assertions on settled state ────────────────────────────────────────────

  // 1. Final URL must be /login
  await expect(page).toHaveURL(/\/login(?:$|[?#])/, { timeout: 5_000 })

  // 2. The Arabic suspension message must be visible.
  //    Verified in AuthContext.tsx — signIn() sets an error message on is_active=false:
  //    "حسابك موقوف، تواصل مع المسؤول"
  await expect(page.locator('body')).toContainText(
    'حسابك موقوف، تواصل مع المسؤول',
    { timeout: 10_000 },
  )

  // ── Finding A documentation (non-fatal comment in test output) ──────────────
  // dashboardFlashed = true  → Finding A confirmed: suspension is UI-only (gate fires
  //   after JWT is created and authenticated content renders briefly).
  //   Evidence: j3-suspended-immediate.png shows dashboard elements.
  //   Severity: Critical — server-side RLS must be probed separately to determine
  //   whether the suspended JWT can read data rows (see rbac-rls-matrix.md).
  //
  // dashboardFlashed = false → Suspension check is fast enough that no content flashed
  //   in this run. UI-only vs server-enforced still requires the REST probe to confirm.
  //
  // Either way the final state must be signed-out (/login + message).
  // The finding is logged here for the QA report.
  // eslint-disable-next-line no-console
  console.log(
    `[Finding A] Suspended user race: dashboard content flashed immediately = ${dashboardFlashed}`,
  )
  // The screenshot j3-suspended-immediate.png is the evidence artefact.
})
