import { describe, expect, it } from 'vitest'

import { PERMISSION_SECTIONS } from '@/utils/PERMISSIONS_SCHEMA'
import {
  normalizePermissions,
  flatPermissionsToMatrix,
  matrixToFlatPermissions,
} from '@/utils/permissions'

describe('payroll permissions', () => {
  it('defines payroll as a standalone permission section with edit action', () => {
    expect(PERMISSION_SECTIONS.payroll.label).toBe('الرواتب والاستقطاعات')
    expect(PERMISSION_SECTIONS.payroll.actions).toEqual([
      'view',
      'create',
      'edit',
      'delete',
      'export',
    ])
  })

  it('PermissionMatrix.payroll includes edit field', () => {
    const matrix = normalizePermissions([], 'user')
    expect('edit' in matrix.payroll).toBe(true)
    expect(matrix.payroll.edit).toBe(false) // Deny by Default
  })

  it('canEdit(payroll) is false without grant', () => {
    // no payroll.edit in the flat list
    const matrix = normalizePermissions(['payroll.view', 'payroll.create'], 'user')
    expect(matrix.payroll.edit).toBe(false)
  })

  it('canEdit(payroll) is true with payroll.edit grant', () => {
    const matrix = normalizePermissions(['payroll.edit'], 'user')
    expect(matrix.payroll.edit).toBe(true)
  })

  it('canEdit(payroll) is true for admin (master key)', () => {
    const matrix = normalizePermissions([], 'admin')
    expect(matrix.payroll.edit).toBe(true)
  })

  it('payroll.edit round-trips through flatPermissionsToMatrix → matrixToFlatPermissions', () => {
    const flat = ['payroll.view', 'payroll.edit', 'payroll.export']
    const matrix = flatPermissionsToMatrix(flat)
    expect(matrix.payroll.edit).toBe(true)
    expect(matrix.payroll.create).toBe(false)
    const restored = matrixToFlatPermissions(matrix)
    expect(restored.sort()).toEqual(flat.sort())
  })

  it('payroll.edit normalizes from flat string[] format', () => {
    const normalized = normalizePermissions(['payroll.edit'], 'user')
    expect(normalized.payroll.edit).toBe(true)
    expect(normalized.payroll.view).toBe(false)
    expect(normalized.payroll.create).toBe(false)
  })

  it('does not grant payroll access when only reports permissions exist', () => {
    const normalized = normalizePermissions(
      {
        reports: {
          view: true,
          export: true,
        },
      },
      'user'
    )

    expect(normalized.reports.view).toBe(true)
    expect(normalized.reports.export).toBe(true)
    expect(normalized.payroll.view).toBe(false)
    expect(normalized.payroll.edit).toBe(false)
    expect(normalized.payroll.export).toBe(false)
  })
})
