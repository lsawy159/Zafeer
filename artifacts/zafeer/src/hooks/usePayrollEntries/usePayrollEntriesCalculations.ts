import { ObligationType } from '@/lib/supabase'
import { PayrollObligationBucketKey } from '@/utils/payrollObligationBuckets'

export const PAYROLL_COMPONENT_CODE_OVERTIME = 'OVERTIME'

export function getLineStatus(amountDue: number, amountPaid: number): 'unpaid' | 'partial' | 'paid' {
  if (amountPaid <= 0) return 'unpaid'
  if (amountPaid >= amountDue) return 'paid'
  return 'partial'
}

export function getPayrollBucketType(bucket: PayrollObligationBucketKey): ObligationType {
  switch (bucket) {
    case 'transfer_renewal': return 'transfer'
    case 'penalty': return 'penalty'
    case 'advance': return 'advance'
    case 'other':
    default: return 'other'
  }
}

export function lineMatchesBucket(type: ObligationType, bucket: PayrollObligationBucketKey): boolean {
  if (bucket === 'transfer_renewal') return type === 'transfer' || type === 'renewal'
  return type === getPayrollBucketType(bucket)
}

export function getBucketForObligationType(type: ObligationType): PayrollObligationBucketKey {
  switch (type) {
    case 'transfer':
    case 'renewal': return 'transfer_renewal'
    case 'penalty': return 'penalty'
    case 'advance': return 'advance'
    case 'other':
    default: return 'other'
  }
}
