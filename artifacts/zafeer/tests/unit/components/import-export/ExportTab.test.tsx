import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import ExportTab from '@/components/import-export/ExportTab'

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

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}))

describe('ExportTab employee loading', () => {
  it('excludes soft-deleted employees from export queries', async () => {
    render(<ExportTab initialExportType="employees" hideTypeSelector />)

    await waitFor(() => {
      expect(employeesEq).toHaveBeenCalledWith('is_deleted', false)
    })
  })
})
