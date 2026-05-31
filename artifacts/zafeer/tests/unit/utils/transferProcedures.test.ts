import { describe, it, expect } from 'vitest'
import {
  TRANSFER_PROCEDURE_STATUS_OPTIONS,
  NEW_TRANSFER_PROCEDURE_STATUS_OPTIONS,
  TRANSFER_PROCEDURE_TEMPLATE_COLUMNS,
  isTransferProcedureStatus,
  isNewTransferProcedureStatus,
} from '@/utils/transferProcedures'

describe('TRANSFER_PROCEDURE_STATUS_OPTIONS', () => {
  it('contains منقول as a valid status', () => {
    expect(TRANSFER_PROCEDURE_STATUS_OPTIONS).toContain('منقول')
  })

  it('contains all expected statuses', () => {
    const expected = [
      'منقول',
      'تحت إجراء النقل',
      'بانتظار موافقة الكفيل',
      'بانتظار موافقة العامل',
      'بانتظار فترة الإشعار',
      'بإنتظار الجوازات',
      'ليس على الكفالة',
      'بإنتظار رخصة العمل',
    ]
    for (const status of expected) {
      expect(TRANSFER_PROCEDURE_STATUS_OPTIONS).toContain(status)
    }
  })

  it('has 8 statuses', () => {
    expect(TRANSFER_PROCEDURE_STATUS_OPTIONS.length).toBe(8)
  })
})

describe('NEW_TRANSFER_PROCEDURE_STATUS_OPTIONS', () => {
  it('excludes منقول from new status options', () => {
    expect(NEW_TRANSFER_PROCEDURE_STATUS_OPTIONS).not.toContain('منقول')
  })

  it('has one less status than TRANSFER_PROCEDURE_STATUS_OPTIONS', () => {
    expect(NEW_TRANSFER_PROCEDURE_STATUS_OPTIONS.length).toBe(
      TRANSFER_PROCEDURE_STATUS_OPTIONS.length - 1
    )
  })

  it('contains all statuses except منقول', () => {
    for (const status of TRANSFER_PROCEDURE_STATUS_OPTIONS) {
      if (status === 'منقول') {
        expect(NEW_TRANSFER_PROCEDURE_STATUS_OPTIONS).not.toContain(status)
      } else {
        expect(NEW_TRANSFER_PROCEDURE_STATUS_OPTIONS).toContain(status)
      }
    }
  })
})

describe('TRANSFER_PROCEDURE_TEMPLATE_COLUMNS', () => {
  it('contains all required Excel columns', () => {
    expect(TRANSFER_PROCEDURE_TEMPLATE_COLUMNS).toContain('الاسم')
    expect(TRANSFER_PROCEDURE_TEMPLATE_COLUMNS).toContain('رقم الإقامة')
    expect(TRANSFER_PROCEDURE_TEMPLATE_COLUMNS).toContain('الحالة')
  })

  it('has 7 columns', () => {
    expect(TRANSFER_PROCEDURE_TEMPLATE_COLUMNS.length).toBe(7)
  })
})

describe('isTransferProcedureStatus', () => {
  it('returns true for valid status', () => {
    for (const status of TRANSFER_PROCEDURE_STATUS_OPTIONS) {
      expect(isTransferProcedureStatus(status)).toBe(true)
    }
  })

  it('returns false for invalid status', () => {
    expect(isTransferProcedureStatus('حالة غير موجودة')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isTransferProcedureStatus('')).toBe(false)
  })

  it('returns true for منقول', () => {
    expect(isTransferProcedureStatus('منقول')).toBe(true)
  })
})

describe('isNewTransferProcedureStatus', () => {
  it('returns false for منقول (excluded from new)', () => {
    expect(isNewTransferProcedureStatus('منقول')).toBe(false)
  })

  it('returns true for all new statuses', () => {
    for (const status of NEW_TRANSFER_PROCEDURE_STATUS_OPTIONS) {
      expect(isNewTransferProcedureStatus(status)).toBe(true)
    }
  })

  it('returns false for invalid string', () => {
    expect(isNewTransferProcedureStatus('غير صحيح')).toBe(false)
  })
})
