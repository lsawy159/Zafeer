import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { EmployeeAlert } from '@/utils/employeeAlerts'
import type { Alert } from '@/components/alerts/AlertCard'

// Hoisted mock fns — available inside vi.mock factory AND in tests
const mockGenerateEmployeeAlerts = vi.hoisted(() => vi.fn<typeof import('@/utils/employeeAlerts').generateEmployeeAlerts>())
const mockGenerateCompanyAlertsSync = vi.hoisted(() => vi.fn<typeof import('@/utils/alerts').generateCompanyAlertsSync>())

vi.mock('@/utils/employeeAlerts', () => ({
  generateEmployeeAlerts: mockGenerateEmployeeAlerts,
}))

vi.mock('@/utils/alerts', () => ({
  generateCompanyAlertsSync: mockGenerateCompanyAlertsSync,
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/supabase', () => ({ supabase: {} }))

vi.mock('@/components/alerts/AlertCard', () => ({}))

// Import after mocks are wired
import { alertCache } from '@/utils/alertCache'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockEmployee = { id: 'e1', name: 'أحمد' } as unknown as import('@/lib/supabase').Employee
const mockCompany = { id: 'c1', name: 'شركة أ' } as unknown as import('@/lib/supabase').Company

const empAlerts: EmployeeAlert[] = [
  { employeeId: 'e1', type: 'passport_expiry', message: 'تنتهي الإقامة', severity: 'warning' } as EmployeeAlert,
]

const compAlerts: Alert[] = [
  { id: 'a1', type: 'license_expiry', message: 'تنتهي الرخصة', severity: 'critical' } as Alert,
]

beforeEach(() => {
  vi.useFakeTimers()
  alertCache.invalidateAll()
  vi.clearAllMocks()
})

afterEach(() => {
  alertCache.invalidateAll()
  vi.useRealTimers()
})

// ─── Employee alerts — cache miss / hit ───────────────────────────────────────

describe('getEmployeeAlerts', () => {
  it('cache miss → calls generator and returns result', async () => {
    mockGenerateEmployeeAlerts.mockResolvedValueOnce(empAlerts)

    const result = await alertCache.getEmployeeAlerts([mockEmployee], [mockCompany])

    expect(result).toEqual(empAlerts)
    expect(mockGenerateEmployeeAlerts).toHaveBeenCalledTimes(1)
  })

  it('cache hit → returns cached data without calling generator', async () => {
    mockGenerateEmployeeAlerts.mockResolvedValue(empAlerts)

    await alertCache.getEmployeeAlerts([mockEmployee], [mockCompany])
    const result = await alertCache.getEmployeeAlerts([mockEmployee], [mockCompany])

    expect(result).toEqual(empAlerts)
    expect(mockGenerateEmployeeAlerts).toHaveBeenCalledTimes(1)
  })

  it('forceRefresh=true → calls generator even with valid cache', async () => {
    mockGenerateEmployeeAlerts.mockResolvedValue(empAlerts)

    await alertCache.getEmployeeAlerts([mockEmployee], [mockCompany])
    await alertCache.getEmployeeAlerts([mockEmployee], [mockCompany], true)

    expect(mockGenerateEmployeeAlerts).toHaveBeenCalledTimes(2)
  })

  it('after TTL expiry → cache invalid → calls generator again', async () => {
    mockGenerateEmployeeAlerts.mockResolvedValue(empAlerts)

    await alertCache.getEmployeeAlerts([mockEmployee], [mockCompany])

    // Advance past 2-minute TTL
    vi.advanceTimersByTime(2 * 60 * 1000 + 1)

    await alertCache.getEmployeeAlerts([mockEmployee], [mockCompany])

    expect(mockGenerateEmployeeAlerts).toHaveBeenCalledTimes(2)
  })

  it('after invalidateEmployeeAlerts → calls generator on next request', async () => {
    mockGenerateEmployeeAlerts.mockResolvedValue(empAlerts)

    await alertCache.getEmployeeAlerts([mockEmployee], [mockCompany])
    alertCache.invalidateEmployeeAlerts()
    await alertCache.getEmployeeAlerts([mockEmployee], [mockCompany])

    expect(mockGenerateEmployeeAlerts).toHaveBeenCalledTimes(2)
  })

  it('concurrent calls → generator called once, both get same result (deduplication)', async () => {
    let resolveGen!: (alerts: EmployeeAlert[]) => void
    const deferred = new Promise<EmployeeAlert[]>((res) => { resolveGen = res })
    mockGenerateEmployeeAlerts.mockReturnValueOnce(deferred)

    // Fire two calls before first one resolves
    const p1 = alertCache.getEmployeeAlerts([mockEmployee], [mockCompany])
    const p2 = alertCache.getEmployeeAlerts([mockEmployee], [mockCompany])

    resolveGen(empAlerts)

    const [r1, r2] = await Promise.all([p1, p2])

    expect(r1).toEqual(empAlerts)
    expect(r2).toEqual(empAlerts)
    expect(mockGenerateEmployeeAlerts).toHaveBeenCalledTimes(1)
  })

  it('different dataset size → cache key mismatch → calls generator again', async () => {
    mockGenerateEmployeeAlerts.mockResolvedValue(empAlerts)

    await alertCache.getEmployeeAlerts([mockEmployee], [mockCompany])
    // Change: 2 employees instead of 1
    await alertCache.getEmployeeAlerts([mockEmployee, mockEmployee], [mockCompany])

    expect(mockGenerateEmployeeAlerts).toHaveBeenCalledTimes(2)
  })
})

// ─── Company alerts — cache miss / hit ───────────────────────────────────────

describe('getCompanyAlerts', () => {
  it('cache miss → calls generator and returns result', async () => {
    mockGenerateCompanyAlertsSync.mockResolvedValueOnce(compAlerts)

    const result = await alertCache.getCompanyAlerts([mockCompany])

    expect(result).toEqual(compAlerts)
    expect(mockGenerateCompanyAlertsSync).toHaveBeenCalledTimes(1)
  })

  it('cache hit → returns cached data without calling generator', async () => {
    mockGenerateCompanyAlertsSync.mockResolvedValue(compAlerts)

    await alertCache.getCompanyAlerts([mockCompany])
    const result = await alertCache.getCompanyAlerts([mockCompany])

    expect(result).toEqual(compAlerts)
    expect(mockGenerateCompanyAlertsSync).toHaveBeenCalledTimes(1)
  })

  it('forceRefresh=true → calls generator even with valid cache', async () => {
    mockGenerateCompanyAlertsSync.mockResolvedValue(compAlerts)

    await alertCache.getCompanyAlerts([mockCompany])
    await alertCache.getCompanyAlerts([mockCompany], true)

    expect(mockGenerateCompanyAlertsSync).toHaveBeenCalledTimes(2)
  })

  it('after invalidateCompanyAlerts → calls generator on next request', async () => {
    mockGenerateCompanyAlertsSync.mockResolvedValue(compAlerts)

    await alertCache.getCompanyAlerts([mockCompany])
    alertCache.invalidateCompanyAlerts()
    await alertCache.getCompanyAlerts([mockCompany])

    expect(mockGenerateCompanyAlertsSync).toHaveBeenCalledTimes(2)
  })
})

// ─── invalidateAll + getCacheStats ───────────────────────────────────────────

describe('invalidateAll', () => {
  it('clears both employee and company caches', async () => {
    mockGenerateEmployeeAlerts.mockResolvedValue(empAlerts)
    mockGenerateCompanyAlertsSync.mockResolvedValue(compAlerts)

    await alertCache.getEmployeeAlerts([mockEmployee], [mockCompany])
    await alertCache.getCompanyAlerts([mockCompany])

    alertCache.invalidateAll()

    const stats = alertCache.getCacheStats()
    expect(stats.employeeCache.valid).toBe(false)
    expect(stats.companyCache.valid).toBe(false)
  })
})

describe('getCacheStats', () => {
  it('returns false for valid when both caches empty', () => {
    const stats = alertCache.getCacheStats()
    expect(stats.employeeCache.valid).toBe(false)
    expect(stats.companyCache.valid).toBe(false)
    expect(stats.employeeCache.count).toBe(0)
    expect(stats.companyCache.count).toBe(0)
  })

  it('returns true and correct count after generation', async () => {
    mockGenerateEmployeeAlerts.mockResolvedValue(empAlerts)
    await alertCache.getEmployeeAlerts([mockEmployee], [mockCompany])

    const stats = alertCache.getCacheStats()
    expect(stats.employeeCache.valid).toBe(true)
    expect(stats.employeeCache.count).toBe(empAlerts.length)
  })

  it('age reflects time elapsed since cache was populated', async () => {
    mockGenerateEmployeeAlerts.mockResolvedValue(empAlerts)
    await alertCache.getEmployeeAlerts([mockEmployee], [mockCompany])

    vi.advanceTimersByTime(30_000) // 30 seconds

    const stats = alertCache.getCacheStats()
    expect(stats.employeeCache.age).toBeGreaterThanOrEqual(30_000)
  })
})
