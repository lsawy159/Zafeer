/**
 * ZaFeer App - Visual Audit Script
 * يفحص التطبيق كمستخدم: login، تنقل، dark mode، flash
 */

import { chromium } from '@playwright/test'
import { writeFileSync, mkdirSync } from 'fs'

const BASE_URL = 'http://localhost:5173'
const CREDS = { username: 'admin@zafeer.com', password: 'aass1122@' }
const SCREENSHOTS_DIR = 'd:/00_Main_Projects/Zafeer/playwright-tests/screenshots'

mkdirSync(SCREENSHOTS_DIR, { recursive: true })

const issues = []
const log = (msg) => console.log(`[AUDIT] ${msg}`)
const warn = (msg) => { console.warn(`[WARN] ${msg}`); issues.push(msg) }

async function screenshot(page, name) {
  const path = `${SCREENSHOTS_DIR}/${name}.png`
  await page.screenshot({ path, fullPage: false })
  log(`Screenshot: ${name}.png`)
  return path
}

async function checkConsoleErrors(page, label) {
  // Console errors already captured via listener
}

async function run() {
  const browser = await chromium.launch({ headless: true, slowMo: 100 })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar-SA',
  })
  const page = await context.newPage()

  const consoleErrors = []
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(`[${msg.type()}] ${msg.text()}`)
  })
  page.on('pageerror', err => consoleErrors.push(`[pageerror] ${err.message}`))

  // ──────────────────────────────────────────────
  // 1. صفحة Login
  // ──────────────────────────────────────────────
  log('=== 1. Login Page ===')
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 })
  await page.waitForTimeout(1000)
  await screenshot(page, '01-initial-load')

  const title = await page.title()
  log(`Tab title: "${title}"`)
  if (!title.includes('ZaFeer') && !title.includes('زفير')) warn(`Tab title wrong: "${title}"`)

  const url = page.url()
  log(`URL after load: ${url}`)
  if (!url.includes('/login')) warn(`Not redirected to /login - went to: ${url}`)

  // فحص الشعار في صفحة Login
  const loginLogo = await page.locator('img[alt="ZaFeer"]').first()
  const logoVisible = await loginLogo.isVisible().catch(() => false)
  log(`Login logo visible: ${logoVisible}`)
  if (!logoVisible) warn('Login logo not visible')

  // ──────────────────────────────────────────────
  // 2. تسجيل الدخول
  // ──────────────────────────────────────────────
  log('=== 2. Login Flow ===')
  await page.fill('input[type="text"], input[id="login-username"]', CREDS.username)
  await page.fill('input[type="password"], input[id="login-password"]', CREDS.password)
  await screenshot(page, '02-before-login')

  const t0 = Date.now()
  await page.click('button[type="submit"]')

  // انتظر navigation أو خطأ
  try {
    await page.waitForURL('**/dashboard**', { timeout: 10000 })
    const loginTime = Date.now() - t0
    log(`Login + redirect took: ${loginTime}ms`)
    if (loginTime > 5000) warn(`Login slow: ${loginTime}ms`)
  } catch {
    await screenshot(page, '02b-login-failed')
    warn('Login did not redirect to dashboard within 10s')
    await browser.close()
    return finish(consoleErrors, issues)
  }

  await page.waitForTimeout(1500) // انتظر auth state يستقر
  await screenshot(page, '03-dashboard-loaded')

  // فحص "غير مصرح" لا يظهر
  const unauthorized = await page.locator('text=غير مصرح').first()
  const hasUnauth = await unauthorized.isVisible().catch(() => false)
  if (hasUnauth) warn('"غير مصرح" visible on dashboard!')
  else log('"غير مصرح" not visible ✓')

  // ──────────────────────────────────────────────
  // 3. فحص الـ Sidebar
  // ──────────────────────────────────────────────
  log('=== 3. Sidebar ===')
  const sidebar = await page.locator('aside').first()
  const sidebarVisible = await sidebar.isVisible().catch(() => false)
  log(`Sidebar visible: ${sidebarVisible}`)
  if (!sidebarVisible) warn('Sidebar not visible on dashboard')

  // ──────────────────────────────────────────────
  // 4. التنقل بين الصفحات - فحص Flash
  // ──────────────────────────────────────────────
  log('=== 4. Navigation Flash Test ===')
  const pages = [
    { path: '/employees', name: 'Employees' },
    { path: '/companies', name: 'Companies' },
    { path: '/dashboard', name: 'Dashboard-return' },
  ]

  for (const p of pages) {
    log(`Navigating to ${p.path}...`)
    const navStart = Date.now()

    // التقط frames خلال الـ navigation
    let flashDetected = false
    const frameListener = async () => {
      try {
        // فحص لو الصفحة بيضاء أو فارغة
        const bodyBg = await page.evaluate(() => {
          const body = document.body
          return window.getComputedStyle(body).backgroundColor
        })
        if (bodyBg === 'rgba(0, 0, 0, 0)' || bodyBg === 'transparent') {
          flashDetected = true
        }
      } catch { /* ignore */ }
    }

    await page.click(`a[href="${p.path}"]`, { timeout: 5000 }).catch(async () => {
      // لو مش لقي link، اذهب مباشرة
      await page.goto(BASE_URL + p.path)
    })

    await page.waitForTimeout(800)
    await frameListener()
    const navTime = Date.now() - navStart
    log(`${p.name}: ${navTime}ms, flash: ${flashDetected}`)
    if (flashDetected) warn(`Flash detected on ${p.name}`)
    await screenshot(page, `05-nav-${p.name.toLowerCase()}`)

    // فحص "غير مصرح" بعد كل navigation
    const unauth = await page.locator('text=غير مصرح').first()
    const hasU = await unauth.isVisible().catch(() => false)
    if (hasU) warn(`"غير مصرح" appeared after navigating to ${p.path}`)
  }

  // ──────────────────────────────────────────────
  // 5. Dark Mode
  // ──────────────────────────────────────────────
  log('=== 5. Dark Mode ===')
  // اضغط زر الـ theme toggle
  const themeBtn = await page.locator('button[aria-label*="الوضع"], button[aria-label*="داكن"], button[aria-label*="فاتح"]').first()
  const themeBtnExists = await themeBtn.isVisible().catch(() => false)
  if (themeBtnExists) {
    await themeBtn.click()
    await page.waitForTimeout(500)
    const htmlClass = await page.evaluate(() => document.documentElement.className)
    log(`HTML classes after theme toggle: "${htmlClass}"`)
    const isDark = htmlClass.includes('dark')
    log(`Dark mode active: ${isDark}`)
    if (!isDark) warn('Dark mode class not applied to <html>')
    await screenshot(page, '06-dark-mode')

    // فحص نصوص مقروءة في dark mode
    const textColor = await page.evaluate(() => {
      const heading = document.querySelector('h1, h2, h3')
      if (!heading) return 'no heading found'
      return window.getComputedStyle(heading).color
    })
    log(`Heading color in dark mode: ${textColor}`)
    if (textColor === 'rgb(0, 0, 0)') warn('Dark mode heading still black — text invisible!')

    // ارجع لـ light mode
    await themeBtn.click()
    await page.waitForTimeout(300)
  } else {
    warn('Theme toggle button not found')
  }

  // ──────────────────────────────────────────────
  // 6. فحص الألوان الأساسية - هل Electric Blue لا يزال موجود؟
  // ──────────────────────────────────────────────
  log('=== 6. Color Check ===')
  const primaryColor = await page.evaluate(() => {
    return getComputedStyle(document.documentElement).getPropertyValue('--color-primary-800').trim()
  })
  log(`--color-primary-800: "${primaryColor}"`)
  if (primaryColor.includes('91%') || primaryColor.includes('0050cb')) {
    warn(`Electric Blue still active! primary-800 = "${primaryColor}"`)
  } else {
    log('Color tokens look correct ✓')
  }

  await browser.close()
  return finish(consoleErrors, issues)
}

function finish(consoleErrors, issues) {
  console.log('\n' + '═'.repeat(60))
  console.log('AUDIT REPORT')
  console.log('═'.repeat(60))

  if (consoleErrors.length > 0) {
    console.log(`\n🔴 Console Errors (${consoleErrors.length}):`)
    consoleErrors.forEach(e => console.log('  ' + e))
  } else {
    console.log('\n✅ No console errors')
  }

  if (issues.length > 0) {
    console.log(`\n⚠️  Issues Found (${issues.length}):`)
    issues.forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`))
  } else {
    console.log('\n✅ No issues found')
  }

  console.log(`\n📸 Screenshots saved to: d:/00_Main_Projects/Zafeer/playwright-tests/screenshots/`)
  console.log('═'.repeat(60))

  writeFileSync(
    'd:/00_Main_Projects/Zafeer/playwright-tests/audit-report.json',
    JSON.stringify({ consoleErrors, issues, timestamp: new Date().toISOString() }, null, 2)
  )
}

run().catch(err => {
  console.error('AUDIT FAILED:', err.message)
  process.exit(1)
})
