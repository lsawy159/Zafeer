// Custom fetch for orval-generated hooks — injects auth header from Supabase session

export async function customFetch<T>(
  url: string,
  options: RequestInit,
): Promise<T> {
  // In Vite apps: VITE_API_URL. In Node/tests: API_URL env. Falls back to ''
  const baseUrl = (typeof process !== 'undefined' ? process.env.API_URL : undefined) ?? ''

  // Get auth token from Supabase session (if in browser)
  // Supabase v2 stores the session under key: sb-{projectRef}-auth-token
  let authToken: string | null = null
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const sbKey = Object.keys(localStorage).find(
        (k) => k.startsWith('sb-') && k.endsWith('-auth-token'),
      )
      if (sbKey) {
        const session = JSON.parse(localStorage.getItem(sbKey) ?? '{}')
        authToken = session.access_token ?? session.session?.access_token ?? null
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`)
  }

  const response = await fetch(`${baseUrl}${url}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    const message =
      typeof error?.error === 'string'
        ? error.error
        : typeof error?.message === 'string'
          ? error.message
          : `HTTP ${response.status}`

    const apiError = new Error(message) as Error & { status?: number; body?: unknown }
    apiError.status = response.status
    apiError.body = error
    throw apiError
  }

  return response.json()
}
