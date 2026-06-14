import { expect, type APIRequestContext, type Page } from '@playwright/test'

function getSupabaseEnv() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are required for self-cleaning Playwright setup.')
  }

  return { supabaseUrl, supabaseAnonKey }
}

export async function getSupabaseAccessToken(page: Page) {
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

export async function getRestHeaders(page: Page) {
  const { supabaseAnonKey } = getSupabaseEnv()
  const accessToken = await getSupabaseAccessToken(page)

  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${accessToken}`,
  }
}

export async function restUpsert<T extends Record<string, unknown>>(
  request: APIRequestContext,
  page: Page,
  table: string,
  data: T | T[],
  onConflict?: string
) {
  const { supabaseUrl } = getSupabaseEnv()
  const headers = await getRestHeaders(page)
  const conflictParam = onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : ''

  const response = await request.post(`${supabaseUrl}/rest/v1/${table}${conflictParam}`, {
    headers: {
      ...headers,
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    data,
  })

  expect(response.ok(), `${table} upsert failed with ${response.status()}`).toBeTruthy()
  return response.json()
}

function buildFilters(filters: Record<string, string | number | boolean>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    params.set(key, `eq.${String(value)}`)
  }
  return params.toString()
}

export async function restInsert<T extends Record<string, unknown>>(
  request: APIRequestContext,
  page: Page,
  table: string,
  data: T
) {
  const { supabaseUrl } = getSupabaseEnv()
  const headers = await getRestHeaders(page)

  const response = await request.post(`${supabaseUrl}/rest/v1/${table}`, {
    headers: {
      ...headers,
      Prefer: 'return=representation',
    },
    data,
  })

  expect(response.ok(), `${table} insert failed with ${response.status()}`).toBeTruthy()

  const body = (await response.json()) as Array<T & { id: string }>
  const createdRow = body[0]

  if (!createdRow?.id) {
    throw new Error(`${table} insert did not return an id.`)
  }

  return createdRow
}

export async function restSelectSingle<T extends Record<string, unknown>>(
  request: APIRequestContext,
  page: Page,
  table: string,
  filters: Record<string, string | number | boolean>,
  select = '*'
) {
  const { supabaseUrl } = getSupabaseEnv()
  const headers = await getRestHeaders(page)
  const filterQuery = buildFilters(filters)
  const response = await request.get(
    `${supabaseUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}&${filterQuery}&limit=1`,
    { headers }
  )

  expect(response.ok(), `${table} select failed with ${response.status()}`).toBeTruthy()
  const body = (await response.json()) as T[]
  return body[0] ?? null
}

export async function restDelete(
  request: APIRequestContext,
  page: Page,
  table: string,
  filters: Record<string, string | number | boolean>
) {
  const { supabaseUrl } = getSupabaseEnv()
  const headers = await getRestHeaders(page)
  const filterQuery = buildFilters(filters)

  const response = await request.delete(`${supabaseUrl}/rest/v1/${table}?${filterQuery}`, {
    headers,
  })

  expect(response.ok(), `${table} delete failed with ${response.status()}`).toBeTruthy()
}
