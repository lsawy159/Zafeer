import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface RevenuePnlRow {
  project_id: string
  project_name: string
  period_month: string // YYYY-MM-DD (first of month)
  revenue: number
  labor_cost: number
  margin: number
  margin_pct: number | null
  unbillable_days: number
  unbillable_cost: number
}

export function useRevenuePnl(month?: string, projectId?: string) {
  return useQuery({
    queryKey: ['revenue-pnl', month ?? 'all', projectId ?? 'all'],
    queryFn: async () => {
      // Month filter: 'YYYY-MM' → 'YYYY-MM-01'
      const monthDate = month ? `${month}-01` : null

      let q = supabase
        .from('v_project_month_pnl')
        .select('project_id,project_name,period_month,revenue,labor_cost,margin,margin_pct,unbillable_days,unbillable_cost')

      if (monthDate) {
        q = q.eq('period_month', monthDate)
      }
      if (projectId) {
        q = q.eq('project_id', projectId)
      }

      q = q.order('period_month', { ascending: false }).order('revenue', { ascending: false })

      const { data, error } = await q
      if (error) throw error

      return (data ?? []).map((row) => ({
        project_id: row.project_id as string,
        project_name: row.project_name as string,
        period_month: row.period_month as string,
        revenue: Number(row.revenue) || 0,
        labor_cost: Number(row.labor_cost) || 0,
        margin: Number(row.margin) || 0,
        margin_pct: row.margin_pct !== null ? Number(row.margin_pct) : null,
        unbillable_days: Number(row.unbillable_days) || 0,
        unbillable_cost: Number(row.unbillable_cost) || 0,
      })) as RevenuePnlRow[]
    },
    staleTime: 60_000,
    gcTime: 300_000,
  })
}

// استعلام عدد الرواتب بدون مشروع (FR-029 banner)
export function useUnlinkedPayrollCount(month?: string) {
  return useQuery({
    queryKey: ['unlinked-payroll-count', month ?? 'all'],
    queryFn: async () => {
      if (!month) return 0

      const monthDate = `${month}-01`

      const { data: runs, error: runsError } = await supabase
        .from('payroll_runs')
        .select('id')
        .eq('payroll_month', monthDate)

      if (runsError) throw runsError
      const runIds = (runs ?? []).map((r) => r.id as string)
      if (runIds.length === 0) return 0

      const { count, error } = await supabase
        .from('payroll_entries')
        .select('id', { count: 'exact', head: true })
        .is('project_id', null)
        .in('payroll_run_id', runIds)

      if (error) throw error
      return count ?? 0
    },
    staleTime: 60_000,
  })
}
