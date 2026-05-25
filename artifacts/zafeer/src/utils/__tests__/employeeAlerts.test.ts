import { describe, it, expect } from 'vitest'
import { filterEmployeeAlertsByPriority, type EmployeeAlert } from '../employeeAlerts'

describe('employeeAlerts utils', () => {
  const mockEmployeeAlerts: EmployeeAlert[] = [
    {
      id: '1',
      type: 'contract_expiry',
      priority: 'urgent',
      title: 'ط¹ظ‚ط¯ ظ…ظ†طھظ‡ظٹ',
      message: 'msg',
      employee: {
        id: 'emp-1',
        name: 'ط£ط­ظ…ط¯',
        profession: 'ط­ط±ط¬ظٹ',
        nationality: 'ط³ط¹ظˆط¯ظٹ',
        company_id: 'comp-1',
      },
      company: {
        id: 'comp-1',
        name: 'ط´ط±ظƒط© ط£',
      },
      expiry_date: '2026-05-25',
      days_remaining: -1,
      action_required: 'action',
      created_at: '2026-05-25T00:00:00.000Z',
    },
    {
      id: '2',
      type: 'residence_expiry',
      priority: 'high',
      title: 'ط¥ظ‚ط§ظ…ط© ط¹ط§ط¬ظ„ط©',
      message: 'msg',
      employee: {
        id: 'emp-2',
        name: 'ظ…ط­ظ…ط¯',
        profession: 'ط¹ط§ظ…ظ„',
        nationality: 'ط§ط±ط¯ظ†ظٹ',
        company_id: 'comp-1',
      },
      company: {
        id: 'comp-1',
        name: 'ط´ط±ظƒط© ط£',
      },
      expiry_date: '2026-06-01',
      days_remaining: 5,
      action_required: 'action',
      created_at: '2026-05-25T00:00:00.000Z',
    },
    {
      id: '3',
      type: 'health_insurance_expiry',
      priority: 'medium',
      title: 'طھط£ظ…ظٹظ†',
      message: 'msg',
      employee: {
        id: 'emp-3',
        name: 'ط³ط§ظ…ظٹ',
        profession: 'ظ…ظ‡ظ†ط¯ط³',
        nationality: 'ظ…طµط±ظٹ',
        company_id: 'comp-2',
      },
      company: {
        id: 'comp-2',
        name: 'ط´ط±ظƒط© ط¨',
      },
      expiry_date: '2026-06-15',
      days_remaining: 20,
      action_required: 'action',
      created_at: '2026-05-25T00:00:00.000Z',
    },
  ]

  it('filters by multiple priorities', () => {
    const result = filterEmployeeAlertsByPriority(mockEmployeeAlerts, ['urgent', 'high'])

    expect(result).toHaveLength(2)
    expect(result.map((alert) => alert.priority)).toEqual(['urgent', 'high'])
  })

  it('returns original list when priorities empty', () => {
    const result = filterEmployeeAlertsByPriority(mockEmployeeAlerts, [])

    expect(result).toHaveLength(3)
  })
})
