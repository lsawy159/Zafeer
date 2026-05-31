import { describe, it, expect } from 'vitest'
import {
  normalizePermissions,
  flatPermissionsToMatrix,
  matrixToFlatPermissions,
  normalizePermissionsFlat,
  defaultPermissions,
  adminPermissions,
} from '@/utils/permissions'

// ─── normalizePermissions ─────────────────────────────────────────────────────

describe('normalizePermissions', () => {
  it('admin role always gets full permissions regardless of data', () => {
    const r = normalizePermissions([], 'admin')
    expect(r.employees.view).toBe(true)
    expect(r.employees.create).toBe(true)
    expect(r.companies.delete).toBe(true)
    expect(r.payroll.view).toBe(true)
  })

  it('admin role ignores passed permissions (master key)', () => {
    const empty = normalizePermissions({}, 'admin')
    const withPerms = normalizePermissions({ employees: { view: false } }, 'admin')
    expect(empty.employees.view).toBe(true)
    expect(withPerms.employees.view).toBe(true)
  })

  it('returns all-false (deny by default) for null permissions', () => {
    const r = normalizePermissions(null)
    expect(r.employees.view).toBe(false)
    expect(r.employees.create).toBe(false)
    expect(r.companies.view).toBe(false)
  })

  it('returns all-false for undefined permissions', () => {
    const r = normalizePermissions(undefined)
    expect(r.employees.view).toBe(false)
  })

  it('processes flat string[] format', () => {
    const r = normalizePermissions(['employees.view', 'companies.create'])
    expect(r.employees.view).toBe(true)
    expect(r.employees.create).toBe(false)
    expect(r.companies.create).toBe(true)
    expect(r.companies.view).toBe(false)
  })

  it('processes object Record format with true values', () => {
    const r = normalizePermissions({
      employees: { view: true, create: false },
    })
    expect(r.employees.view).toBe(true)
    expect(r.employees.create).toBe(false)
  })

  it('supports legacy string "true" values', () => {
    const r = normalizePermissions({
      employees: { view: 'true' },
    })
    expect(r.employees.view).toBe(true)
  })

  it('ignores unknown sections (not in schema)', () => {
    const r = normalizePermissions({ unknownSection: { view: true } })
    expect((r as Record<string, unknown>).unknownSection).toBeUndefined()
  })
})

// ─── flatPermissionsToMatrix ──────────────────────────────────────────────────

describe('flatPermissionsToMatrix', () => {
  it('converts employees.view to matrix', () => {
    const m = flatPermissionsToMatrix(['employees.view'])
    expect(m.employees.view).toBe(true)
    expect(m.employees.create).toBe(false)
  })

  it('converts multiple permissions', () => {
    const m = flatPermissionsToMatrix(['employees.view', 'employees.create', 'companies.delete'])
    expect(m.employees.view).toBe(true)
    expect(m.employees.create).toBe(true)
    expect(m.companies.delete).toBe(true)
    expect(m.companies.view).toBe(false)
  })

  it('ignores invalid permission strings', () => {
    const m = flatPermissionsToMatrix(['invalid.action', 'employees.nonexistent'])
    expect(m.employees.view).toBe(false)
  })

  it('returns all-false for empty array', () => {
    const m = flatPermissionsToMatrix([])
    expect(m.employees.view).toBe(false)
    expect(m.companies.create).toBe(false)
  })

  it('returns all-false for non-array input', () => {
    const m = flatPermissionsToMatrix('employees.view' as unknown as string[])
    expect(m.employees.view).toBe(false)
  })
})

// ─── matrixToFlatPermissions ──────────────────────────────────────────────────

describe('matrixToFlatPermissions', () => {
  it('converts matrix to flat array — only true values', () => {
    const m = flatPermissionsToMatrix(['employees.view', 'companies.create'])
    const flat = matrixToFlatPermissions(m)
    expect(flat).toContain('employees.view')
    expect(flat).toContain('companies.create')
    expect(flat).not.toContain('employees.create')
    expect(flat).not.toContain('companies.view')
  })

  it('returns empty array for all-false matrix', () => {
    expect(matrixToFlatPermissions(defaultPermissions)).toEqual([])
  })

  it('round-trip: flat → matrix → flat preserves permissions', () => {
    const original = ['employees.view', 'companies.create', 'payroll.view']
    const matrix = flatPermissionsToMatrix(original)
    const restored = matrixToFlatPermissions(matrix)
    expect(restored.sort()).toEqual(original.sort())
  })
})

// ─── normalizePermissionsFlat ─────────────────────────────────────────────────

describe('normalizePermissionsFlat', () => {
  it('admin gets all permissions as flat array', () => {
    const flat = normalizePermissionsFlat([], 'admin')
    expect(flat).toContain('employees.view')
    expect(flat).toContain('payroll.view')
    expect(flat.length).toBeGreaterThan(10)
  })

  it('filters out invalid permissions', () => {
    const flat = normalizePermissionsFlat([
      'employees.view',
      'invalid.section',
      'employees.nonexistent',
    ])
    expect(flat).toContain('employees.view')
    expect(flat).not.toContain('invalid.section')
    expect(flat).not.toContain('employees.nonexistent')
  })

  it('returns empty for null input', () => {
    expect(normalizePermissionsFlat(null)).toEqual([])
  })

  it('returns empty for non-array input', () => {
    expect(normalizePermissionsFlat('employees.view')).toEqual([])
  })

  it('preserves valid permissions unchanged', () => {
    const perms = ['employees.view', 'companies.create']
    expect(normalizePermissionsFlat(perms).sort()).toEqual(perms.sort())
  })
})

// ─── defaultPermissions + adminPermissions constants ─────────────────────────

describe('defaultPermissions (Deny by Default)', () => {
  it('all sections are false by default', () => {
    expect(defaultPermissions.employees.view).toBe(false)
    expect(defaultPermissions.companies.create).toBe(false)
    expect(defaultPermissions.payroll.view).toBe(false)
    expect(defaultPermissions.adminSettings.view).toBe(false)
  })
})

describe('adminPermissions (Master Key)', () => {
  it('all sections are true for admin', () => {
    expect(adminPermissions.employees.view).toBe(true)
    expect(adminPermissions.employees.create).toBe(true)
    expect(adminPermissions.companies.delete).toBe(true)
    expect(adminPermissions.payroll.view).toBe(true)
    expect(adminPermissions.adminSettings.view).toBe(true)
    expect(adminPermissions.adminSettings.edit).toBe(true)
  })
})
