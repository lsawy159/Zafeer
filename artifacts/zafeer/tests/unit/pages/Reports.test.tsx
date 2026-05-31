import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import Reports from '@/pages/Reports'

const employeesEq = vi.fn(() => ({
  order: vi.fn().mockResolvedValue({ data: [], error: null }),
}))
const companiesOrder = vi.fn().mockResolvedValue({ data: [], error: null })

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'employees') {
        return {
          select: vi.fn(() => ({
            eq: employeesEq,
          })),
        }
      }

      if (table === 'companies') {
        return {
          select: vi.fn(() => ({
            order: companiesOrder,
          })),
        }
      }

      return {
        select: vi.fn(() => ({ order: vi.fn() })),
      }
    }),
  },
}))

vi.mock('@/utils/permissions', () => ({
  usePermissions: () => ({
    canExport: () => true,
  }),
}))

vi.mock('@/components/layout/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/PageHeader', () => ({
  PageHeader: () => <div>page-header</div>,
}))

vi.mock('@/components/stats/StatsDashboard', () => ({
  default: () => <div>stats-dashboard</div>,
}))

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/Select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <div>select-value</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/utils/lazyXlsx', () => ({
  loadXlsx: vi.fn(),
}))

vi.mock('@/utils/autoCompanyStatus', () => ({
  DEFAULT_STATUS_THRESHOLDS: {
    commercial_reg_urgent_days: 7,
    commercial_reg_high_days: 15,
    commercial_reg_medium_days: 30,
  },
  getStatusThresholds: vi.fn().mockResolvedValue({
    commercial_reg_urgent_days: 7,
    commercial_reg_high_days: 15,
    commercial_reg_medium_days: 30,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

describe('Reports employee subscriptions', () => {
  it('excludes soft-deleted employees from reports queries', async () => {
    render(<Reports />)

    await waitFor(() => {
      expect(employeesEq).toHaveBeenCalledWith('is_deleted', false)
    })
  })
})
