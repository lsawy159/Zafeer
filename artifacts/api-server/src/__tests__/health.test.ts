import { describe, it, expect, vi, beforeAll } from 'vitest'
import request from 'supertest'
import pino from 'pino'

// Mock supabaseAdmin before importing app
vi.mock('../lib/supabaseAdmin.js', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    auth: { admin: {} },
  },
}))

// Use real pino logger with silent level so no output in tests
vi.mock('../lib/logger.js', () => ({
  logger: pino({ level: 'silent' }),
}))

let app: typeof import('../app.js').default

beforeAll(async () => {
  process.env.NODE_ENV = 'test'
  process.env.ALLOWED_ORIGINS = 'http://localhost:5173'
  const mod = await import('../app.js')
  app = mod.default
})

describe('GET /api/healthz', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/healthz')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })
})
