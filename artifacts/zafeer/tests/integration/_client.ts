import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const PRODUCTION_REF = 'acnkrijhndgbnxabfklx'

function getTestEnv() {
  const url = process.env['SUPABASE_TEST_URL']
  const anonKey = process.env['SUPABASE_TEST_ANON_KEY']

  if (!url || !anonKey) {
    throw new Error(
      '[FR-013] Missing SUPABASE_TEST_URL or SUPABASE_TEST_ANON_KEY environment variables. ' +
        'Integration tests require a dedicated test environment.'
    )
  }

  if (url.includes(PRODUCTION_REF)) {
    throw new Error(
      `[FR-013][SC-005] Integration tests must NOT target production (ref: ${PRODUCTION_REF}). ` +
        `Set SUPABASE_TEST_URL to a test-ci environment URL.`
    )
  }

  return { url, anonKey }
}

export function createIntegrationClient(): SupabaseClient {
  const { url, anonKey } = getTestEnv()
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export async function signInAs(
  client: SupabaseClient,
  email: string,
  password: string
): Promise<void> {
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) {
    throw new Error(`signInAs(${email}) failed: ${error.message}`)
  }
}

export async function signOut(client: SupabaseClient): Promise<void> {
  await client.auth.signOut()
}

export function getAdminCredentials() {
  const email = process.env['INTEGRATION_ADMIN_EMAIL']
  const password = process.env['INTEGRATION_ADMIN_PASSWORD']
  if (!email || !password) {
    throw new Error('Missing INTEGRATION_ADMIN_EMAIL or INTEGRATION_ADMIN_PASSWORD')
  }
  return { email, password }
}

export function getNopermCredentials() {
  const email = process.env['INTEGRATION_NOPERM_EMAIL']
  const password = process.env['INTEGRATION_NOPERM_PASSWORD']
  if (!email || !password) {
    throw new Error('Missing INTEGRATION_NOPERM_EMAIL or INTEGRATION_NOPERM_PASSWORD')
  }
  return { email, password }
}
