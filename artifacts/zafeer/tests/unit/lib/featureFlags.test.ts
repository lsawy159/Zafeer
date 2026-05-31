import { describe, it, expect } from 'vitest'
import { featureFlags, isFeatureEnabled } from '@/lib/featureFlags'

describe('featureFlags', () => {
  it('featureFlags object has useNewPayrollRPC key', () => {
    expect(featureFlags).toHaveProperty('useNewPayrollRPC')
  })

  it('useNewPayrollRPC is a boolean', () => {
    expect(typeof featureFlags.useNewPayrollRPC).toBe('boolean')
  })

  it('isFeatureEnabled returns boolean', () => {
    expect(typeof isFeatureEnabled('useNewPayrollRPC')).toBe('boolean')
  })

  it('isFeatureEnabled matches featureFlags object', () => {
    expect(isFeatureEnabled('useNewPayrollRPC')).toBe(featureFlags.useNewPayrollRPC)
  })

  it('isFeatureEnabled returns false in test env (VITE_USE_NEW_PAYROLL_RPC not set)', () => {
    // In Vitest, VITE_USE_NEW_PAYROLL_RPC is not set → false
    expect(isFeatureEnabled('useNewPayrollRPC')).toBe(false)
  })
})
