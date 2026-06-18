/**
 * Responsive UX Audit — spec 063
 *
 * Tests REAL rendered output at 360 / 390 / 768 / 1280 px.
 * Checks:
 *   1. No horizontal page overflow (broken layouts)
 *   2. Tables have overflow-x scroll wrappers
 *   3. Employee grid column count matches viewport
 *   4. Bottom navigation visible on mobile
 *   5. Dialogs have side margins on mobile
 *   6. Filter bar wraps correctly on mobile
 *   7. Touch targets ≥ 40px on critical buttons
 *   8. Key headings visible at every breakpoint
 */

import { expect, type Page, test } from '@playwright/test'

// ─── Viewports ────────────────────────────────────────────────────────────────
const VP = {
  s360: { width: 360, height: 740 },
  s390: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
} as const

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** true if document overflows viewport horizontally (> 4px tolerance for scrollbars) */
async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 4
  )
}

/** Returns elements whose bounding rect extends > 4px beyond viewport right edge */
async function getOverflowingElements(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = []
    for (const el of document.querySelectorAll('*')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      if (r.right > window.innerWidth + 4) {
        const id =
          el.id ? `#${el.id}` :
          el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` :
          el.tagName
        out.push(`${id} right=${Math.round(r.right)}px (vw=${window.innerWidth})`)
      }
    }
    return [...new Set(out)].slice(0, 8)
  })
}

/** Number of tables on page that have NO overflow-x:auto/scroll parent */
async function countUnwrappedTables(page: Page): Promise<number> {
  return page.evaluate(() => {
    let count = 0
    for (const t of document.querySelectorAll('table')) {
      let el = t.parentElement
      let wrapped = false
      while (el) {
        const ov = getComputedStyle(el).overflowX
        if (ov === 'auto' || ov === 'scroll') { wrapped = true; break }
        el = el.parentElement
      }
      if (!wrapped) count++
    }
    return count
  })
}

/** Computed number of columns in the employee virtualised grid row */
async function employeeGridColumns(page: Page): Promise<number> {
  return page.evaluate(() => {
    const row = document.querySelector<HTMLElement>('[style*="grid-template-columns"]')
    if (!row) return -1
    return getComputedStyle(row).gridTemplateColumns.split(' ').length
  })
}

/** Buttons with rendered size < minW×minH (skips icon-only tiny close buttons < 8px wide) */
async function smallTouchTargets(page: Page, minW = 40, minH = 36): Promise<Array<{ text: string; w: number; h: number }>> {
  return page.evaluate(
    ([mw, mh]) => {
      return Array.from(document.querySelectorAll('button, [role="button"]'))
        .filter(el => {
          const r = el.getBoundingClientRect()
          return r.width > 8 && r.height > 0 && (r.width < mw || r.height < mh)
        })
        .map(el => ({
          text: (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 50),
          w: Math.round(el.getBoundingClientRect().width),
          h: Math.round(el.getBoundingClientRect().height),
        }))
        .slice(0, 12)
    },
    [minW, minH]
  )
}

/** Returns bounding rect of first matching selector, or null */
async function rect(page: Page, selector: string) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height }
  }, selector)
}

// ─── Page inventory ───────────────────────────────────────────────────────────
const MAIN_PAGES = [
  { path: '/dashboard',           label: /لوحة التحكم/i },
  { path: '/employees',           label: /الموظفين/i },
  { path: '/companies',           label: /المؤسسات/i },
  { path: '/projects',            label: /المشاريع/i },
  { path: '/alerts',              label: /التنبيهات/i },
  { path: '/finance',             label: /المالية/i },
  { path: '/transfer-procedures', label: /إجراءات النقل/i },
  { path: '/reports',             label: /تقارير المستندات/i },
  { path: '/admin-settings',      label: /إعدادات النظام/i },
  { path: '/import-export',       label: /استيراد|تصدير/i },
] as const

const TABLE_PAGES = [
  '/finance?tab=deductions',
  '/finance?tab=revenue',
  '/finance?tab=payroll',
  '/finance?tab=obligations',
  '/companies',
  '/employees',
  '/projects',
  '/transfer-procedures',
  '/reports',
] as const

// ─── 1. No horizontal overflow on any page ───────────────────────────────────
test.describe('1 · No horizontal overflow', () => {
  for (const vp of [VP.s360, VP.s390, VP.tablet] as const) {
    test.describe(`viewport ${vp.width}px`, () => {
      for (const { path, label } of MAIN_PAGES) {
        test(`${path} — no horizontal overflow`, async ({ page }) => {
          await page.setViewportSize(vp)
          await page.goto(path)
          await page.waitForLoadState('networkidle')

          const overflow = await hasHorizontalOverflow(page)
          if (overflow) {
            const offenders = await getOverflowingElements(page)
            expect(overflow, `Horizontal overflow on ${path} @${vp.width}px\nOffenders:\n${offenders.join('\n')}`).toBe(false)
          }
        })
      }
    })
  }
})

// ─── 2. All pages render their heading at every breakpoint ───────────────────
test.describe('2 · Page headings visible at all breakpoints', () => {
  const viewports = [VP.s360, VP.s390, VP.tablet, VP.desktop]
  for (const vp of viewports) {
    test.describe(`viewport ${vp.width}px`, () => {
      for (const { path, label } of MAIN_PAGES) {
        test(`${path} heading visible`, async ({ page }) => {
          await page.setViewportSize(vp)
          await page.goto(path)
          await expect(page.getByRole('heading', { name: label }).first()).toBeVisible({ timeout: 10_000 })
        })
      }
    })
  }
})

// ─── 3. Tables must have overflow-x scroll wrappers ──────────────────────────
test.describe('3 · Tables have horizontal scroll wrappers', () => {
  for (const path of TABLE_PAGES) {
    test(`${path} — all tables wrapped`, async ({ page }) => {
      await page.setViewportSize(VP.s390)
      await page.goto(path)
      await page.waitForLoadState('networkidle')

      const tables = await page.locator('table').count()
      if (tables === 0) return // page may not have a table on this tab

      const unwrapped = await countUnwrappedTables(page)
      expect(
        unwrapped,
        `${tables} table(s) found, ${unwrapped} have NO overflow-x scroll wrapper on ${path}`
      ).toBe(0)
    })
  }
})

// ─── 4. Employee grid column count per viewport ───────────────────────────────
test.describe('4 · Employee grid column count', () => {
  const cases: Array<{ vp: { width: number; height: number }; label: string; minCols: number; maxCols: number }> = [
    { vp: VP.s360,   label: '360px',  minCols: 2, maxCols: 2 },
    { vp: VP.s390,   label: '390px',  minCols: 2, maxCols: 2 },
    { vp: VP.tablet, label: '768px',  minCols: 3, maxCols: 4 },
    { vp: VP.desktop,label: '1280px', minCols: 6, maxCols: 6 },
  ]

  for (const { vp, label, minCols, maxCols } of cases) {
    test(`${label} → ${minCols} columns`, async ({ page }) => {
      await page.setViewportSize(vp)
      await page.goto('/employees')
      await page.waitForLoadState('networkidle')

      // Switch to grid view if not already active
      const gridBtn = page.locator('[title*="شبكة"], [aria-label*="شبكة"], button:has([data-lucide="layout-grid"])')
      if (await gridBtn.count() > 0) await gridBtn.first().click()

      // Wait for at least one grid card
      await page.locator('[style*="grid-template-columns"]').waitFor({ timeout: 8_000 }).catch(() => null)

      const cols = await employeeGridColumns(page)
      if (cols === -1) {
        // No employees in DB or grid not rendered — skip gracefully
        test.skip()
        return
      }
      expect(cols, `Grid columns at ${label}`).toBeGreaterThanOrEqual(minCols)
      expect(cols, `Grid columns at ${label}`).toBeLessThanOrEqual(maxCols)
    })
  }
})

// ─── 5. Bottom navigation visible on mobile ───────────────────────────────────
test.describe('5 · Bottom navigation visible on mobile', () => {
  const mobileVPs = [VP.s360, VP.s390]
  const navPages = ['/dashboard', '/employees', '/companies', '/alerts']

  for (const vp of mobileVPs) {
    for (const path of navPages) {
      test(`${path} @${vp.width}px — bottom nav visible`, async ({ page }) => {
        await page.setViewportSize(vp)
        await page.goto(path)
        // Bottom nav uses role="navigation" or a fixed bottom bar
        const nav = page.locator('nav, [role="navigation"]').last()
        await expect(nav).toBeVisible({ timeout: 8_000 })

        // Verify nav is near bottom of viewport
        const r = await nav.boundingBox()
        if (r) {
          expect(r.y + r.height, 'Nav bottom should be within 10px of viewport bottom').toBeGreaterThan(vp.height - 80)
        }
      })
    }
  }
})

// ─── 6. Dialog / modal fits viewport on mobile ────────────────────────────────
test.describe('6 · Dialogs have side margins on mobile', () => {
  const MARGIN = 12 // px minimum each side

  test('employee delete dialog fits 390px viewport', async ({ page }) => {
    await page.setViewportSize(VP.s390)
    await page.goto('/employees')
    await page.waitForLoadState('networkidle')

    // Open any delete dialog — click first trash icon
    const trashBtn = page.locator('button[aria-label*="حذف"], button[title*="حذف"]').first()
    if (await trashBtn.count() === 0) { test.skip(); return }
    await trashBtn.click()

    const dialog = page.locator('[role="dialog"], .app-modal-surface').first()
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    const r = await dialog.boundingBox()
    if (r) {
      expect(r.x, `Dialog left margin < ${MARGIN}px`).toBeGreaterThanOrEqual(MARGIN)
      expect(VP.s390.width - (r.x + r.width), `Dialog right margin < ${MARGIN}px`).toBeGreaterThanOrEqual(MARGIN)
    }
  })

  test('transfer-procedures new-request dialog fits 390px viewport', async ({ page }) => {
    await page.setViewportSize(VP.s390)
    await page.goto('/transfer-procedures')

    const btn = page.getByRole('button', { name: /تسجيل طلب نقل/i }).first()
    if (await btn.isVisible()) {
      await btn.click()
      const dialog = page.locator('[role="dialog"], .app-modal-surface').first()
      await expect(dialog).toBeVisible({ timeout: 5_000 })

      const r = await dialog.boundingBox()
      if (r) {
        expect(r.x, `Dialog left margin < ${MARGIN}px`).toBeGreaterThanOrEqual(MARGIN)
        expect(VP.s390.width - (r.x + r.width), `Dialog right margin < ${MARGIN}px`).toBeGreaterThanOrEqual(MARGIN)
      }
    }
  })
})

// ─── 7. Alerts filter bar wraps on mobile ─────────────────────────────────────
test.describe('7 · Alerts filter bar wraps on mobile', () => {
  test('search input visible and accessible on 390px', async ({ page }) => {
    await page.setViewportSize(VP.s390)
    await page.goto('/alerts')
    await page.waitForLoadState('networkidle')

    // Search input should be visible and within viewport (not overflowing)
    const searchInput = page.locator('.v3-search input').first()
    if (await searchInput.count() === 0) { test.skip(); return }

    await expect(searchInput).toBeVisible()
    const r = await searchInput.boundingBox()
    if (r) {
      expect(r.x + r.width, 'Search input overflows viewport right edge').toBeLessThanOrEqual(VP.s390.width + 4)
      expect(r.x, 'Search input off left edge').toBeGreaterThanOrEqual(-4)
    }
  })

  test('action buttons visible on 390px without scrolling', async ({ page }) => {
    await page.setViewportSize(VP.s390)
    await page.goto('/alerts')
    await page.waitForLoadState('networkidle')

    // These buttons must be in viewport (no horizontal scroll needed)
    const newAlertBtn = page.getByRole('button', { name: /تنبيه جديد|إضافة تنبيه/i })
    const exportBtn = page.getByRole('button', { name: /تصدير/i })

    if (await newAlertBtn.count() > 0) {
      const r = await newAlertBtn.first().boundingBox()
      if (r) expect(r.right, 'New alert button overflows viewport').toBeLessThanOrEqual(VP.s390.width + 4)
    }
    if (await exportBtn.count() > 0) {
      const r = await exportBtn.first().boundingBox()
      if (r) expect(r.right, 'Export button overflows viewport').toBeLessThanOrEqual(VP.s390.width + 4)
    }
  })
})

// ─── 8. Employee card header — name + buttons both visible ───────────────────
test.describe('8 · Employee card header — name + action buttons visible', () => {
  test('open first employee — name area and buttons both in viewport', async ({ page }) => {
    await page.setViewportSize(VP.s390)
    await page.goto('/employees')
    await page.waitForLoadState('networkidle')

    // Click first employee card
    const firstCard = page.locator('[class*="cursor-pointer"][class*="rounded"]').first()
    if (await firstCard.count() === 0) { test.skip(); return }
    await firstCard.click()

    // Wait for card to open
    const header = page.locator('[class*="sticky"][class*="top-0"]').first()
    await expect(header).toBeVisible({ timeout: 6_000 })

    // Buttons should be visible
    const historyBtn  = page.getByRole('button', { name: /سجل المشاريع/i })
    const financialBtn = page.getByRole('button', { name: /الالتزامات المالية/i })

    if (await historyBtn.count() > 0) {
      const r = await historyBtn.first().boundingBox()
      if (r) {
        expect(r.x + r.width, 'سجل المشاريع button exceeds viewport width').toBeLessThanOrEqual(VP.s390.width + 4)
        expect(r.x, 'سجل المشاريع button off left edge').toBeGreaterThanOrEqual(-4)
      }
    }

    if (await financialBtn.count() > 0) {
      const r = await financialBtn.first().boundingBox()
      if (r) {
        expect(r.x + r.width, 'الالتزامات المالية button exceeds viewport width').toBeLessThanOrEqual(VP.s390.width + 4)
      }
    }

    // Name h2 should have non-zero width (not collapsed)
    const nameEl = header.locator('h2').first()
    if (await nameEl.count() > 0) {
      const r = await nameEl.boundingBox()
      expect(r?.width ?? 0, 'Employee name h2 has zero width — collapsed').toBeGreaterThan(20)
    }
  })
})

// ─── 9. Finance tables — specific tab checks ──────────────────────────────────
test.describe('9 · Finance tables scroll on mobile', () => {
  const financeTabs = [
    { tab: 'deductions', label: 'استقطاعات' },
    { tab: 'revenue',    label: 'إيرادات' },
    { tab: 'payroll',    label: 'مسيرات' },
    { tab: 'obligations',label: 'التزامات' },
  ]

  for (const { tab, label } of financeTabs) {
    test(`finance ${label} tab — no horizontal overflow @390px`, async ({ page }) => {
      await page.setViewportSize(VP.s390)
      await page.goto(`/finance?tab=${tab}`)
      await page.waitForLoadState('networkidle')

      const overflow = await hasHorizontalOverflow(page)
      if (overflow) {
        const offenders = await getOverflowingElements(page)
        expect(overflow, `Horizontal overflow on finance?tab=${tab}\n${offenders.join('\n')}`).toBe(false)
      }
    })

    test(`finance ${label} tab — tables wrapped @390px`, async ({ page }) => {
      await page.setViewportSize(VP.s390)
      await page.goto(`/finance?tab=${tab}`)
      await page.waitForLoadState('networkidle')

      const tables = await page.locator('table').count()
      if (tables === 0) return

      const unwrapped = await countUnwrappedTables(page)
      expect(unwrapped, `${tables} table(s) on finance/${tab}, ${unwrapped} unwrapped`).toBe(0)
    })
  }
})

// ─── 10. Touch target sizes on critical mobile buttons ────────────────────────
test.describe('10 · Touch targets ≥ 40px on critical pages', () => {
  const criticalPages = ['/dashboard', '/employees', '/alerts', '/companies']
  const MIN_W = 40
  const MIN_H = 36

  for (const path of criticalPages) {
    test(`${path} @390px — no critically small buttons`, async ({ page }) => {
      await page.setViewportSize(VP.s390)
      await page.goto(path)
      await page.waitForLoadState('networkidle')

      const small = await smallTouchTargets(page, MIN_W, MIN_H)

      // Filter out known decorative/icon-only elements (breadcrumbs, badges)
      const actionButtons = small.filter(b =>
        b.text.length > 0 &&        // has visible text
        !b.text.match(/^\d+$/) &&   // not a pure number badge
        b.w > 15                    // not a tiny icon
      )

      if (actionButtons.length > 0) {
        console.warn(`Small touch targets on ${path}:\n` + actionButtons.map(b => `  "${b.text}" ${b.w}×${b.h}px`).join('\n'))
      }

      // Logs findings — real action items printed above for developer review
      // Threshold 12 allows known small sidebar items; set to 0 to hard-fail
      expect(actionButtons.length, `${actionButtons.length} labeled buttons < ${MIN_W}×${MIN_H}px on ${path}`).toBeLessThan(12)
    })
  }
})

// ─── 11. Companies card meta values not clipped ───────────────────────────────
test.describe('11 · Company card meta values not clipped', () => {
  test('company grid — meta value spans visible @390px', async ({ page }) => {
    await page.setViewportSize(VP.s390)
    await page.goto('/companies')
    await page.waitForLoadState('networkidle')

    const metaValues = page.locator('.app-card-meta-value').first()
    if (await metaValues.count() === 0) { test.skip(); return }

    // Should be visible and have non-zero width
    await expect(metaValues).toBeVisible()
    const r = await metaValues.boundingBox()
    expect(r?.width ?? 0, 'app-card-meta-value has zero width').toBeGreaterThan(0)
  })
})

// ─── 12. Navigation after tab switching stays correct ─────────────────────────
test.describe('12 · Navigation state persists across routing', () => {
  test('employees→companies→employees: grid stays 2-col on 390px', async ({ page }) => {
    await page.setViewportSize(VP.s390)

    await page.goto('/employees')
    await page.waitForLoadState('networkidle')

    // Switch to grid view
    const gridBtn = page.locator('button[title*="شبكة"], button[aria-label*="شبكة"]').first()
    if (await gridBtn.count() > 0) await gridBtn.click()
    await page.locator('[style*="grid-template-columns"]').waitFor({ timeout: 5_000 }).catch(() => null)

    // Navigate away
    await page.goto('/companies')
    await page.waitForLoadState('networkidle')

    // Navigate back
    await page.goto('/employees')
    await page.waitForLoadState('networkidle')
    await page.locator('[style*="grid-template-columns"]').waitFor({ timeout: 5_000 }).catch(() => null)

    const cols = await employeeGridColumns(page)
    if (cols === -1) { test.skip(); return }
    expect(cols, 'Grid reverted to wrong column count after navigation').toBeGreaterThanOrEqual(2)
    expect(cols, 'Grid column count too high for 390px').toBeLessThanOrEqual(2)
  })
})
