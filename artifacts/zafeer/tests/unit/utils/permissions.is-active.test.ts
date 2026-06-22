/**
 * T008 — is_active enforcement on hasPermission / canX / hasPermissionFlat
 *
 * اختبارات التحقق من أن المستخدم الموقوف (is_active=false) لا يحصل على أي صلاحية،
 * وأن المستخدم النشط يحتفظ بصلاحياته كما كان.
 */
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { usePermissions } from '@/utils/permissions'
import type { User } from '@/lib/supabase'

// ---------- Mock useAuth ----------

const mockUser = vi.fn<[], User | null>(() => null)

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser() }),
}))

// ---------- Helper: build a minimal User object ----------

function makeUser(overrides: Partial<User>): User {
  return {
    id: 'test-id',
    email: 'test@test.com',
    full_name: 'Test User',
    role: 'manager',
    permissions: [],
    is_active: true,
    created_at: new Date().toISOString(),
    last_login: null,
    username: 'test',
    ...overrides,
  } as User
}

// ---------- Tests ----------

describe('hasPermission — is_active enforcement', () => {
  it('نشط admin → hasPermission يعيد true', () => {
    mockUser.mockReturnValue(makeUser({ role: 'admin', is_active: true }))
    const { result } = renderHook(() => usePermissions())
    expect(result.current.hasPermission('payroll', 'view')).toBe(true)
    expect(result.current.hasPermission('employees', 'edit')).toBe(true)
  })

  it('موقوف admin (role=admin, is_active=false) → hasPermission يعيد false', () => {
    mockUser.mockReturnValue(makeUser({ role: 'admin', is_active: false }))
    const { result } = renderHook(() => usePermissions())
    expect(result.current.hasPermission('payroll', 'view')).toBe(false)
    expect(result.current.hasPermission('employees', 'edit')).toBe(false)
  })

  it('موقوف admin → canView يعيد false', () => {
    mockUser.mockReturnValue(makeUser({ role: 'admin', is_active: false }))
    const { result } = renderHook(() => usePermissions())
    expect(result.current.canView('payroll')).toBe(false)
    expect(result.current.canView('employees')).toBe(false)
  })

  it('نشط manager مع grant payroll.edit → canEdit يعيد true', () => {
    mockUser.mockReturnValue(
      makeUser({ role: 'manager', is_active: true, permissions: ['payroll.edit'] })
    )
    const { result } = renderHook(() => usePermissions())
    expect(result.current.canEdit('payroll')).toBe(true)
  })

  it('موقوف manager مع نفس grant → canEdit يعيد false', () => {
    mockUser.mockReturnValue(
      makeUser({ role: 'manager', is_active: false, permissions: ['payroll.edit'] })
    )
    const { result } = renderHook(() => usePermissions())
    expect(result.current.canEdit('payroll')).toBe(false)
  })

  it('موقوف manager → canView/canCreate/canDelete كلها false', () => {
    mockUser.mockReturnValue(
      makeUser({
        role: 'manager',
        is_active: false,
        permissions: ['employees.view', 'employees.create', 'employees.delete'],
      })
    )
    const { result } = renderHook(() => usePermissions())
    expect(result.current.canView('employees')).toBe(false)
    expect(result.current.canCreate('employees')).toBe(false)
    expect(result.current.canDelete('employees')).toBe(false)
  })
})

describe('hasPermission vs hasPermissionFlat — تطابق بُعد is_active', () => {
  it('نشط manager مع grant: hasPermission وhasPermissionFlat يتفقان (true)', () => {
    mockUser.mockReturnValue(
      makeUser({ role: 'manager', is_active: true, permissions: ['payroll.view'] })
    )
    const { result } = renderHook(() => usePermissions())
    expect(result.current.hasPermission('payroll', 'view')).toBe(true)
    expect(result.current.checkPermissions(['payroll.view'])).toBe(true)
  })

  it('موقوف manager مع grant: hasPermission وhasPermissionFlat يتفقان (false)', () => {
    mockUser.mockReturnValue(
      makeUser({ role: 'manager', is_active: false, permissions: ['payroll.view'] })
    )
    const { result } = renderHook(() => usePermissions())
    // hasPermission (matrix path)
    expect(result.current.hasPermission('payroll', 'view')).toBe(false)
    // hasPermissionFlat path (via checkPermissions)
    expect(result.current.checkPermissions(['payroll.view'])).toBe(false)
  })

  it('نشط admin: hasPermission وhasPermissionFlat يتفقان (true)', () => {
    mockUser.mockReturnValue(makeUser({ role: 'admin', is_active: true }))
    const { result } = renderHook(() => usePermissions())
    expect(result.current.hasPermission('payroll', 'view')).toBe(true)
    expect(result.current.checkPermissions(['payroll.view'])).toBe(true)
  })

  it('موقوف admin: hasPermission وhasPermissionFlat يتفقان (false)', () => {
    mockUser.mockReturnValue(makeUser({ role: 'admin', is_active: false }))
    const { result } = renderHook(() => usePermissions())
    expect(result.current.hasPermission('payroll', 'view')).toBe(false)
    expect(result.current.checkPermissions(['payroll.view'])).toBe(false)
  })
})
