import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

const protectedRoutes = [
  '/dashboard',
  '/employees',
  '/companies',
  '/projects',
  '/transfer-procedures',
  '/alerts',
  '/notifications',
  '/payroll-deductions',
  '/extracts',
  '/reports',
  '/import-export',
  '/admin-settings',
] as const

function getSupabaseEnv() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are required for self-cleaning Playwright setup.')
  }

  return { supabaseUrl, supabaseAnonKey }
}

async function getSupabaseAccessToken(page: Page) {
  const storageState = await page.context().storageState()

  for (const origin of storageState.origins) {
    for (const item of origin.localStorage) {
      if (!item.name.includes('-auth-token')) continue

      const parsed = JSON.parse(item.value) as { access_token?: string }
      if (parsed.access_token) return parsed.access_token
    }
  }

  throw new Error('Could not find Supabase access token in Playwright storage state.')
}

async function createTemporaryProject(request: APIRequestContext, page: Page, projectName: string) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv()
  const accessToken = await getSupabaseAccessToken(page)

  const response = await request.post(`${supabaseUrl}/rest/v1/projects`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'return=representation',
    },
    data: {
      name: projectName,
      description: 'Playwright temporary project for detail modal verification',
      status: 'active',
    },
  })

  expect(response.ok(), `project create failed with ${response.status()}`).toBeTruthy()

  const body = (await response.json()) as Array<{ id: string }>
  const createdProject = body[0]

  if (!createdProject?.id) {
    throw new Error('Project creation did not return an id.')
  }

  return createdProject.id
}

async function deleteTemporaryProject(request: APIRequestContext, page: Page, projectId: string) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv()
  const accessToken = await getSupabaseAccessToken(page)

  const response = await request.post(`${supabaseUrl}/functions/v1/admin-projects`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      'x-action': 'delete',
    },
    data: { id: projectId },
  })

  expect(response.ok(), `project cleanup failed with ${response.status()}`).toBeTruthy()
}

test.describe('authenticated app access', () => {
  for (const route of protectedRoutes) {
    test(`admin can open ${route}`, async ({ page }) => {
      await page.goto(route)

      await expect(page).not.toHaveURL(/\/login(?:$|[?#])/)
      await expect(page.locator('body')).not.toContainText('غير مصرح')
      await expect(page.locator('body')).not.toContainText('ليس لديك صلاحية')
    })
  }

  test('projects page exposes project list and job-rate surface with self-cleaning project data', async ({ page, request }) => {
    const projectName = `Playwright Project ${Date.now()}`
    let projectId: string | null = null

    try {
      projectId = await createTemporaryProject(request, page, projectName)

      await page.goto('/projects')

      await expect(page).not.toHaveURL(/\/login(?:$|[?#])/)
      await expect(page.locator('body')).not.toContainText('غير مصرح')

      await page.locator('input[placeholder*="مشروع"]').fill(projectName)
      await expect(page.getByText(projectName, { exact: true })).toBeVisible({ timeout: 10_000 })

      await page.getByText(projectName, { exact: true }).click()
      await expect(page.getByRole('button', { name: 'أسعار المهن' })).toBeVisible({ timeout: 10_000 })
    } finally {
      if (projectId) {
        await deleteTemporaryProject(request, page, projectId)
      }
    }
  })
})
