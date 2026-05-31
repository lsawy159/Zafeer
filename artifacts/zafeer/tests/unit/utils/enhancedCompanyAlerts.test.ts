import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Company } from '@/lib/supabase'
import {
  generateEnhancedCompanyAlerts,
  getEnhancedAlertsStats,
  filterEnhancedAlertsByMultipleCriteria,
  getCriticalAlerts,
  generateAlertSummaryReport,
  type EnhancedAlert,
} from '@/utils/enhancedCompanyAlerts'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))

// Fix today at midnight UTC — avoids sub-day precision issues with differenceInDays
const TODAY = new Date('2026-01-15T00:00:00.000Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(TODAY)
})

afterEach(() => {
  vi.useRealTimers()
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysFromToday(n: number): string {
  const d = new Date(TODAY)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function makeCompany(
  id: string,
  commercial_registration_expiry?: string
): Company {
  return {
    id,
    name: `شركة-${id}`,
    commercial_registration_expiry,
  } as unknown as Company
}

function makeAlert(overrides: Partial<EnhancedAlert> = {}): EnhancedAlert {
  return {
    id: 'test-alert',
    type: 'commercial_registration_expiry',
    priority: 'urgent',
    title: 'تنبيه',
    message: 'رسالة',
    company: { id: 'c1', name: 'شركة' },
    days_remaining: -5,
    action_required: 'اتخذ إجراء',
    created_at: TODAY.toISOString(),
    risk_level: 'critical',
    estimated_cost: 'SAR 200 - 800',
    alert_type: 'commercial_registration_expiry',
    document_category: 'legal',
    renewal_complexity: 'moderate',
    estimated_renewal_time: '1-3 أيام',
    related_documents: [],
    compliance_risk: 'critical',
    business_impact: 'critical',
    suggested_actions: [],
    renewal_cost_estimate: { min: 500, max: 2000, currency: 'SAR' },
    responsible_department: 'Legal Affairs',
    renewal_history: [],
    ...overrides,
  }
}

// ─── generateEnhancedCompanyAlerts ───────────────────────────────────────────

describe('generateEnhancedCompanyAlerts', () => {
  it('empty companies → empty alerts', () => {
    expect(generateEnhancedCompanyAlerts([])).toHaveLength(0)
  })

  it('company without expiry → no alert', () => {
    expect(generateEnhancedCompanyAlerts([makeCompany('c1')])).toHaveLength(0)
  })

  it('daysRemaining = 91 → no alert (above 90 threshold)', () => {
    expect(generateEnhancedCompanyAlerts([makeCompany('c1', daysFromToday(91))])).toHaveLength(0)
  })

  it('daysRemaining = 90 → alert generated (at boundary)', () => {
    expect(generateEnhancedCompanyAlerts([makeCompany('c1', daysFromToday(90))])).toHaveLength(1)
  })

  it('daysRemaining < 0 → priority=urgent, risk_level=critical', () => {
    const alerts = generateEnhancedCompanyAlerts([makeCompany('c1', daysFromToday(-1))])
    expect(alerts[0].priority).toBe('urgent')
    expect(alerts[0].risk_level).toBe('critical')
    expect(alerts[0].compliance_risk).toBe('critical')
    expect(alerts[0].business_impact).toBe('critical')
  })

  it('daysRemaining = 0 → priority=urgent (≤ 30), risk_level=high', () => {
    const alerts = generateEnhancedCompanyAlerts([makeCompany('c1', daysFromToday(0))])
    expect(alerts[0].priority).toBe('urgent')
    expect(alerts[0].risk_level).toBe('high')
  })

  it('daysRemaining = 30 → priority=urgent, risk_level=high', () => {
    const alerts = generateEnhancedCompanyAlerts([makeCompany('c1', daysFromToday(30))])
    expect(alerts[0].priority).toBe('urgent')
    expect(alerts[0].risk_level).toBe('high')
    expect(alerts[0].business_impact).toBe('significant')
  })

  it('daysRemaining = 31 → priority=medium, risk_level=medium', () => {
    const alerts = generateEnhancedCompanyAlerts([makeCompany('c1', daysFromToday(31))])
    expect(alerts[0].priority).toBe('medium')
    expect(alerts[0].risk_level).toBe('medium')
    expect(alerts[0].business_impact).toBe('moderate')
  })

  it('daysRemaining = 60 → priority=medium', () => {
    const alerts = generateEnhancedCompanyAlerts([makeCompany('c1', daysFromToday(60))])
    expect(alerts[0].priority).toBe('medium')
  })

  it('daysRemaining = 61 → priority=low, risk_level=low, business_impact=minimal', () => {
    const alerts = generateEnhancedCompanyAlerts([makeCompany('c1', daysFromToday(61))])
    expect(alerts[0].priority).toBe('low')
    expect(alerts[0].risk_level).toBe('low')
    expect(alerts[0].business_impact).toBe('minimal')
  })

  it('daysRemaining < 7 → estimated_renewal_time = 1-3 أيام', () => {
    const alerts = generateEnhancedCompanyAlerts([makeCompany('c1', daysFromToday(5))])
    expect(alerts[0].estimated_renewal_time).toBe('1-3 أيام')
  })

  it('daysRemaining >= 7 → estimated_renewal_time = 1-2 أسبوع', () => {
    const alerts = generateEnhancedCompanyAlerts([makeCompany('c1', daysFromToday(30))])
    expect(alerts[0].estimated_renewal_time).toBe('1-2 أسبوع')
  })

  it('sorting: urgent before medium before low', () => {
    const companies = [
      makeCompany('c-low', daysFromToday(70)),    // low
      makeCompany('c-urgent', daysFromToday(10)), // urgent
      makeCompany('c-medium', daysFromToday(45)), // medium
    ]
    const alerts = generateEnhancedCompanyAlerts(companies)
    expect(alerts[0].priority).toBe('urgent')
    expect(alerts[1].priority).toBe('medium')
    expect(alerts[2].priority).toBe('low')
  })

  it('same priority sorted by days_remaining ascending', () => {
    const companies = [
      makeCompany('far', daysFromToday(25)),
      makeCompany('near', daysFromToday(5)),
    ]
    const alerts = generateEnhancedCompanyAlerts(companies)
    // both urgent — nearer expiry first
    expect(alerts[0].days_remaining).toBeLessThan(alerts[1].days_remaining!)
  })

  it('generates correct id format', () => {
    const expiry = daysFromToday(10)
    const alerts = generateEnhancedCompanyAlerts([makeCompany('c99', expiry)])
    expect(alerts[0].id).toBe(`enhanced_c99_${expiry}`)
  })
})

// ─── getEnhancedAlertsStats ───────────────────────────────────────────────────

describe('getEnhancedAlertsStats', () => {
  it('empty → all zeros', () => {
    const stats = getEnhancedAlertsStats([])
    expect(stats.total).toBe(0)
    expect(stats.urgent).toBe(0)
    expect(stats.medium).toBe(0)
    expect(stats.low).toBe(0)
  })

  it('counts total, urgent, medium, low correctly', () => {
    const alerts = [
      makeAlert({ priority: 'urgent' }),
      makeAlert({ priority: 'urgent' }),
      makeAlert({ priority: 'medium' }),
      makeAlert({ priority: 'low' }),
    ]
    const stats = getEnhancedAlertsStats(alerts)
    expect(stats.total).toBe(4)
    expect(stats.urgent).toBe(2)
    expect(stats.medium).toBe(1)
    expect(stats.low).toBe(1)
  })

  it('byRisk breakdown', () => {
    const alerts = [
      makeAlert({ compliance_risk: 'critical' }),
      makeAlert({ compliance_risk: 'high' }),
      makeAlert({ compliance_risk: 'high' }),
      makeAlert({ compliance_risk: 'medium' }),
      makeAlert({ compliance_risk: 'low' }),
    ]
    const { byRisk } = getEnhancedAlertsStats(alerts)
    expect(byRisk.critical).toBe(1)
    expect(byRisk.high).toBe(2)
    expect(byRisk.medium).toBe(1)
    expect(byRisk.low).toBe(1)
  })

  it('byDocumentCategory counts', () => {
    const alerts = [
      makeAlert({ document_category: 'legal' }),
      makeAlert({ document_category: 'legal' }),
      makeAlert({ document_category: 'financial' }),
      makeAlert({ document_category: 'operational' }),
    ]
    const { byDocumentCategory } = getEnhancedAlertsStats(alerts)
    expect(byDocumentCategory.legal).toBe(2)
    expect(byDocumentCategory.financial).toBe(1)
    expect(byDocumentCategory.operational).toBe(1)
  })

  it('govDocsAlerts count', () => {
    const alerts = [
      makeAlert({ alert_type: 'commercial_registration_expiry' }),
      makeAlert({ alert_type: 'government_docs_renewal' }),
    ]
    const stats = getEnhancedAlertsStats(alerts)
    expect(stats.commercialRegAlerts).toBe(1)
    expect(stats.govDocsAlerts).toBe(1)
  })
})

// ─── filterEnhancedAlertsByMultipleCriteria ───────────────────────────────────

describe('filterEnhancedAlertsByMultipleCriteria', () => {
  const alerts = [
    makeAlert({ id: 'a1', priority: 'urgent', compliance_risk: 'critical', document_category: 'legal', business_impact: 'critical', alert_type: 'commercial_registration_expiry' }),
    makeAlert({ id: 'a2', priority: 'medium', compliance_risk: 'medium', document_category: 'financial', business_impact: 'moderate', alert_type: 'government_docs_renewal' }),
    makeAlert({ id: 'a3', priority: 'low', compliance_risk: 'low', document_category: 'operational', business_impact: 'minimal', alert_type: 'commercial_registration_expiry' }),
  ]

  it('no criteria → returns all', () => {
    expect(filterEnhancedAlertsByMultipleCriteria(alerts, {})).toHaveLength(3)
  })

  it('filter by priority', () => {
    const result = filterEnhancedAlertsByMultipleCriteria(alerts, { priority: ['urgent'] })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a1')
  })

  it('filter by complianceRisk', () => {
    const result = filterEnhancedAlertsByMultipleCriteria(alerts, { complianceRisk: ['critical'] })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a1')
  })

  it('filter by documentCategory', () => {
    const result = filterEnhancedAlertsByMultipleCriteria(alerts, { documentCategory: ['financial'] })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a2')
  })

  it('filter by alertType', () => {
    const result = filterEnhancedAlertsByMultipleCriteria(alerts, {
      alertType: ['commercial_registration_expiry'],
    })
    expect(result).toHaveLength(2)
  })

  it('multiple criteria → AND logic (intersection)', () => {
    const result = filterEnhancedAlertsByMultipleCriteria(alerts, {
      priority: ['urgent', 'medium'],
      documentCategory: ['financial'],
    })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a2')
  })
})

// ─── getCriticalAlerts ────────────────────────────────────────────────────────

describe('getCriticalAlerts', () => {
  it('priority=urgent → included', () => {
    expect(getCriticalAlerts([makeAlert({ priority: 'urgent', compliance_risk: 'low', business_impact: 'minimal' })])).toHaveLength(1)
  })

  it('compliance_risk=critical → included even if priority is low', () => {
    expect(getCriticalAlerts([makeAlert({ priority: 'low', compliance_risk: 'critical', business_impact: 'minimal' })])).toHaveLength(1)
  })

  it('business_impact=critical → included', () => {
    expect(getCriticalAlerts([makeAlert({ priority: 'low', compliance_risk: 'low', business_impact: 'critical' })])).toHaveLength(1)
  })

  it('medium priority, low risk → excluded', () => {
    expect(getCriticalAlerts([makeAlert({ priority: 'medium', compliance_risk: 'low', business_impact: 'minimal' })])).toHaveLength(0)
  })
})

// ─── generateAlertSummaryReport ───────────────────────────────────────────────

describe('generateAlertSummaryReport', () => {
  it('empty → zeros and empty collections', () => {
    const report = generateAlertSummaryReport([])
    expect(report.total).toBe(0)
    expect(report.criticalCount).toBe(0)
    expect(report.estimatedRenewalCosts).toEqual({ min: 0, max: 0, currency: 'SAR' })
    expect(report.departments).toEqual({})
    expect(report.timeline).toEqual({ overdue: 0, urgent: 0, upcoming: 0 })
  })

  it('sums estimatedRenewalCosts from all alerts', () => {
    const alerts = [
      makeAlert({ renewal_cost_estimate: { min: 100, max: 500, currency: 'SAR' } }),
      makeAlert({ renewal_cost_estimate: { min: 200, max: 1000, currency: 'SAR' } }),
    ]
    const report = generateAlertSummaryReport(alerts)
    expect(report.estimatedRenewalCosts.min).toBe(300)
    expect(report.estimatedRenewalCosts.max).toBe(1500)
  })

  it('departments accumulated by responsible_department', () => {
    const alerts = [
      makeAlert({ responsible_department: 'Legal' }),
      makeAlert({ responsible_department: 'Legal' }),
      makeAlert({ responsible_department: 'HR' }),
    ]
    const report = generateAlertSummaryReport(alerts)
    expect(report.departments['Legal']).toBe(2)
    expect(report.departments['HR']).toBe(1)
  })

  it('timeline.overdue = alerts with days_remaining < 0', () => {
    const alerts = [
      makeAlert({ days_remaining: -5 }),
      makeAlert({ days_remaining: -1 }),
      makeAlert({ days_remaining: 10 }),
    ]
    expect(generateAlertSummaryReport(alerts).timeline.overdue).toBe(2)
  })

  it('timeline.urgent = priority=urgent alerts', () => {
    const alerts = [
      makeAlert({ priority: 'urgent' }),
      makeAlert({ priority: 'medium' }),
    ]
    expect(generateAlertSummaryReport(alerts).timeline.urgent).toBe(1)
  })
})
