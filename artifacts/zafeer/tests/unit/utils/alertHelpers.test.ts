import { describe, it, expect } from 'vitest'
import type { Alert } from '@/components/alerts/AlertCard'
import {
  filterAlertsByPriority,
  filterAlertsByType,
  getAlertsStats,
  getUrgentAlerts,
  getExpiredAlerts,
} from '@/utils/alerts/alertHelpers'

// AlertCard is a React component — mock avoids loading Lucide / HijriDateDisplay
vi.mock('@/components/alerts/AlertCard', () => ({}))
vi.mock('@/utils/dateFormatter', () => ({ formatDateShortWithHijri: vi.fn() }))
vi.mock('@/components/ui/HijriDateDisplay', () => ({ HijriDateDisplay: vi.fn() }))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeAlert(
  overrides: Partial<Alert> & { companyId?: string } = {}
): Alert {
  const { companyId, ...rest } = overrides
  return {
    id: 'a1',
    type: 'commercial_registration_expiry',
    priority: 'medium',
    title: 'تنبيه',
    message: 'رسالة',
    company: { id: companyId ?? 'c1', name: 'شركة أ' },
    action_required: 'اتخذ إجراء',
    created_at: '2026-01-15T00:00:00Z',
    ...rest,
  }
}

// ─── filterAlertsByPriority ───────────────────────────────────────────────────

describe('filterAlertsByPriority', () => {
  it('empty priorities → returns all alerts', () => {
    const alerts = [makeAlert({ priority: 'urgent' }), makeAlert({ priority: 'low' })]
    expect(filterAlertsByPriority(alerts, [])).toHaveLength(2)
  })

  it('filter by single priority', () => {
    const alerts = [
      makeAlert({ id: 'u', priority: 'urgent' }),
      makeAlert({ id: 'm', priority: 'medium' }),
    ]
    const result = filterAlertsByPriority(alerts, ['urgent'])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('u')
  })

  it('filter by multiple priorities', () => {
    const alerts = [
      makeAlert({ id: 'u', priority: 'urgent' }),
      makeAlert({ id: 'h', priority: 'high' }),
      makeAlert({ id: 'l', priority: 'low' }),
    ]
    const result = filterAlertsByPriority(alerts, ['urgent', 'high'])
    expect(result).toHaveLength(2)
  })

  it('no matching priority → empty array', () => {
    const alerts = [makeAlert({ priority: 'medium' })]
    expect(filterAlertsByPriority(alerts, ['urgent'])).toHaveLength(0)
  })

  it('empty input → empty result regardless of priorities', () => {
    expect(filterAlertsByPriority([], ['urgent', 'high'])).toHaveLength(0)
  })
})

// ─── filterAlertsByType ───────────────────────────────────────────────────────

describe('filterAlertsByType', () => {
  it('filter commercial_registration_expiry', () => {
    const alerts = [
      makeAlert({ id: 'c', type: 'commercial_registration_expiry' }),
      makeAlert({ id: 'p', type: 'power_subscription_expiry' }),
    ]
    const result = filterAlertsByType(alerts, 'commercial_registration_expiry')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('c')
  })

  it('filter power_subscription_expiry', () => {
    const alerts = [
      makeAlert({ id: 'p1', type: 'power_subscription_expiry' }),
      makeAlert({ id: 'p2', type: 'power_subscription_expiry' }),
      makeAlert({ type: 'commercial_registration_expiry' }),
    ]
    expect(filterAlertsByType(alerts, 'power_subscription_expiry')).toHaveLength(2)
  })

  it('no match → empty array', () => {
    const alerts = [makeAlert({ type: 'commercial_registration_expiry' })]
    expect(filterAlertsByType(alerts, 'moqeem_subscription_expiry')).toHaveLength(0)
  })
})

// ─── getAlertsStats ───────────────────────────────────────────────────────────

describe('getAlertsStats', () => {
  it('empty array → all zeros', () => {
    const stats = getAlertsStats([])
    expect(stats.total).toBe(0)
    expect(stats.totalAlerts).toBe(0)
    expect(stats.urgent).toBe(0)
    expect(stats.high).toBe(0)
    expect(stats.medium).toBe(0)
    expect(stats.low).toBe(0)
  })

  it('total = unique companies, totalAlerts = raw count', () => {
    // 2 alerts from same company
    const alerts = [
      makeAlert({ id: 'a1', priority: 'urgent', companyId: 'c1' }),
      makeAlert({ id: 'a2', priority: 'medium', companyId: 'c1' }),
    ]
    const stats = getAlertsStats(alerts)
    expect(stats.totalAlerts).toBe(2)
    expect(stats.total).toBe(1) // 1 unique company
  })

  it('per-company max priority: urgent + medium same company → company counted as urgent', () => {
    const alerts = [
      makeAlert({ id: 'a1', priority: 'medium', companyId: 'c1' }),
      makeAlert({ id: 'a2', priority: 'urgent', companyId: 'c1' }),
    ]
    const stats = getAlertsStats(alerts)
    expect(stats.urgent).toBe(1)
    expect(stats.medium).toBe(0)
  })

  it('two companies with different priorities counted separately', () => {
    const alerts = [
      makeAlert({ id: 'a1', priority: 'urgent', companyId: 'c1' }),
      makeAlert({ id: 'a2', priority: 'low', companyId: 'c2' }),
    ]
    const stats = getAlertsStats(alerts)
    expect(stats.total).toBe(2)
    expect(stats.urgent).toBe(1)
    expect(stats.low).toBe(1)
  })

  it('type counts: commercialRegAlerts, powerAlerts, moqeemAlerts', () => {
    const alerts = [
      makeAlert({ type: 'commercial_registration_expiry', companyId: 'c1' }),
      makeAlert({ type: 'commercial_registration_expiry', companyId: 'c2' }),
      makeAlert({ type: 'power_subscription_expiry', companyId: 'c3' }),
      makeAlert({ type: 'moqeem_subscription_expiry', companyId: 'c4' }),
    ]
    const stats = getAlertsStats(alerts)
    expect(stats.commercialRegAlerts).toBe(2)
    expect(stats.powerAlerts).toBe(1)
    expect(stats.moqeemAlerts).toBe(1)
  })

  it('alerts without company.id are excluded from per-company counts', () => {
    // company.id missing — ignored in max priority tracking
    const alert = { ...makeAlert(), company: { id: '', name: 'بدون' } }
    const stats = getAlertsStats([alert])
    expect(stats.total).toBe(0) // empty string is falsy → filtered out
    expect(stats.totalAlerts).toBe(1)
  })
})

// ─── getUrgentAlerts ──────────────────────────────────────────────────────────

describe('getUrgentAlerts', () => {
  it('includes urgent priority', () => {
    const alerts = [makeAlert({ id: 'u', priority: 'urgent' }), makeAlert({ id: 'l', priority: 'low' })]
    const result = getUrgentAlerts(alerts)
    expect(result.map((a) => a.id)).toContain('u')
    expect(result.map((a) => a.id)).not.toContain('l')
  })

  it('includes high priority', () => {
    const alerts = [makeAlert({ id: 'h', priority: 'high' }), makeAlert({ id: 'm', priority: 'medium' })]
    expect(getUrgentAlerts(alerts).map((a) => a.id)).toContain('h')
    expect(getUrgentAlerts(alerts).map((a) => a.id)).not.toContain('m')
  })

  it('excludes medium and low', () => {
    const alerts = [makeAlert({ priority: 'medium' }), makeAlert({ priority: 'low' })]
    expect(getUrgentAlerts(alerts)).toHaveLength(0)
  })
})

// ─── getExpiredAlerts ─────────────────────────────────────────────────────────

describe('getExpiredAlerts', () => {
  it('days_remaining < 0 → included', () => {
    const alerts = [makeAlert({ id: 'exp', days_remaining: -5 }), makeAlert({ id: 'ok', days_remaining: 10 })]
    const result = getExpiredAlerts(alerts)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('exp')
  })

  it('days_remaining === 0 → NOT included (not yet expired)', () => {
    expect(getExpiredAlerts([makeAlert({ days_remaining: 0 })])).toHaveLength(0)
  })

  it('days_remaining undefined → NOT included', () => {
    expect(getExpiredAlerts([makeAlert({ days_remaining: undefined })])).toHaveLength(0)
  })
})
