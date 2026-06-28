import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, devices } from '@playwright/test'

const e2eDir = __dirname
const repoRoot = path.resolve(e2eDir, '..')
const authoredTestsDir = path.resolve(e2eDir, 'playwright')
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'
const adminStorageStatePath = path.join(authoredTestsDir, '.auth', 'admin.json')

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return

  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue

    const [, key, rawValue] = match
    if (process.env[key] !== undefined) continue

    process.env[key] = rawValue.trim().replace(/^["']|["']$/g, '')
  }
}

loadEnvFile(path.join(repoRoot, '.env.local'))
loadEnvFile(path.join(repoRoot, 'artifacts', 'zafeer', '.env'))
loadEnvFile(path.join(e2eDir, '.env'))

process.env.TEST_USER_EMAIL ??= process.env.ADMIN_EMAIL
process.env.TEST_USER_PASSWORD ??= process.env.ADMIN_PASSWORD

export default defineConfig({
  testDir: './playwright',
  testMatch: ['**/*.setup.ts', '**/*.public.spec.ts', '**/*.auth.spec.ts'],
  testIgnore: [
    '**/test-*.spec.ts',
    '**/*debug*.spec.ts',
    '**/*delete*.spec.ts',
  ],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'setup',
      testMatch: '**/*.setup.ts',
    },
    {
      name: 'public',
      testMatch: '**/*.public.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      testMatch: '**/*.auth.spec.ts',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: adminStorageStatePath,
      },
    },
  ],
  webServer: [
    {
      command: 'pnpm --dir .. --filter @workspace/zafeer run dev',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})
