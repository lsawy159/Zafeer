// Custom fetch for orval-generated hooks — injects auth header from Supabase session

export async function customFetch<T>(
  url: string,
  options: RequestInit,
): Promise<T> {
  // In Vite apps: VITE_API_URL. In Node/tests: API_URL env. Falls back to ''
  const baseUrl = (typeof process !== 'undefined' ? process.env.API_URL : undefined) ?? ''
  const response = await fetch(`${baseUrl}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(error.error ?? `HTTP ${response.status}`)
  }

  return response.json()
}
