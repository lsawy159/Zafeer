import { describe, it, expect } from 'vitest'
import {
  getEmployeeBusinessFields,
  buildEmployeeBusinessAdditionalFields,
  HIRED_WORKER_CONTRACT_STATUS_OPTIONS,
} from '@/utils/employeeBusinessFields'

describe('employeeBusinessFields', () => {
  // ─── getEmployeeBusinessFields ────────────────────────────────────────────

  describe('getEmployeeBusinessFields', () => {
    it('empty additional_fields → defaults', () => {
      const result = getEmployeeBusinessFields({ additional_fields: {} })
      expect(result.hired_worker_contract_status).toBe('بدون أجير')
      expect(result.bank_name).toBe('')
    })

    it('null additional_fields → defaults', () => {
      const result = getEmployeeBusinessFields({ additional_fields: null })
      expect(result.hired_worker_contract_status).toBe('بدون أجير')
      expect(result.bank_name).toBe('')
    })

    it('valid enum value preserved', () => {
      const result = getEmployeeBusinessFields({
        additional_fields: { hired_worker_contract_status: 'بإنتظار إجراءات النقل' },
      })
      expect(result.hired_worker_contract_status).toBe('بإنتظار إجراءات النقل')
    })

    it('invalid enum value → fallback بدون أجير', () => {
      const result = getEmployeeBusinessFields({
        additional_fields: { hired_worker_contract_status: 'قيمة_غير_صحيحة' },
      })
      expect(result.hired_worker_contract_status).toBe('بدون أجير')
    })

    it('non-string enum value → fallback', () => {
      const result = getEmployeeBusinessFields({
        additional_fields: { hired_worker_contract_status: 123 },
      })
      expect(result.hired_worker_contract_status).toBe('بدون أجير')
    })

    it('bank_name trimmed', () => {
      const result = getEmployeeBusinessFields({
        additional_fields: { bank_name: '  البنك الأهلي  ' },
      })
      expect(result.bank_name).toBe('البنك الأهلي')
    })

    it('hired_worker_contract_expiry present → forces status to أجير', () => {
      const result = getEmployeeBusinessFields({
        additional_fields: { hired_worker_contract_status: 'بدون أجير' },
        hired_worker_contract_expiry: '2026-12-31',
      })
      expect(result.hired_worker_contract_status).toBe('أجير')
    })

    it('hired_worker_contract_expiry empty string → does NOT force أجير', () => {
      const result = getEmployeeBusinessFields({
        additional_fields: { hired_worker_contract_status: 'بدون أجير' },
        hired_worker_contract_expiry: '',
      })
      expect(result.hired_worker_contract_status).toBe('بدون أجير')
    })

    it('hired_worker_contract_expiry null → does NOT force أجير', () => {
      const result = getEmployeeBusinessFields({
        additional_fields: { hired_worker_contract_status: 'بإنتظار إجراءات النقل' },
        hired_worker_contract_expiry: null,
      })
      expect(result.hired_worker_contract_status).toBe('بإنتظار إجراءات النقل')
    })

    it('all three valid options accepted', () => {
      for (const opt of HIRED_WORKER_CONTRACT_STATUS_OPTIONS) {
        const result = getEmployeeBusinessFields({
          additional_fields: { hired_worker_contract_status: opt },
        })
        expect(result.hired_worker_contract_status).toBe(opt)
      }
    })
  })

  // ─── buildEmployeeBusinessAdditionalFields ────────────────────────────────

  describe('buildEmployeeBusinessAdditionalFields', () => {
    it('merges with existing fields, preserves unknown keys', () => {
      const result = buildEmployeeBusinessAdditionalFields(
        { someOtherField: 'value', count: 5 },
        { bank_name: 'بنك الرياض' },
      )
      expect(result.someOtherField).toBe('value')
      expect(result.count).toBe(5)
      expect(result.bank_name).toBe('بنك الرياض')
    })

    it('undefined currentFields → uses empty base', () => {
      const result = buildEmployeeBusinessAdditionalFields(undefined, { bank_name: 'test' })
      expect(result.bank_name).toBe('test')
    })

    it('invalid status → fallback بدون أجير', () => {
      const result = buildEmployeeBusinessAdditionalFields(undefined, {
        hired_worker_contract_status: 'غير_صحيح',
      })
      expect(result.hired_worker_contract_status).toBe('بدون أجير')
    })

    it('with hired_worker_contract_expiry → forces أجير', () => {
      const result = buildEmployeeBusinessAdditionalFields(undefined, {
        hired_worker_contract_status: 'بدون أجير',
        hired_worker_contract_expiry: '2026-12-31',
      })
      expect(result.hired_worker_contract_status).toBe('أجير')
    })

    it('bank_name trimmed in output', () => {
      const result = buildEmployeeBusinessAdditionalFields(undefined, {
        bank_name: '  بنك الإمارات  ',
      })
      expect(result.bank_name).toBe('بنك الإمارات')
    })

    it('no input → all defaults', () => {
      const result = buildEmployeeBusinessAdditionalFields(undefined, {})
      expect(result.hired_worker_contract_status).toBe('بدون أجير')
      expect(result.bank_name).toBe('')
    })
  })
})
