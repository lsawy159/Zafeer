import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export interface AllocationInput {
  project_id: string
  days_allocated: number
  allocated_cost: number
  notes?: string | null
}

export interface ProjectAllocationRow extends AllocationInput {
  id: string
  payroll_entry_id: string
  created_at: string
  updated_at: string
}

const TOLERANCE = 0.01

/** Fetches entry from DB and validates allocation totals against gross_amount + attendance_days. */
export async function validateAllocations(
  entryId: string,
  allocations: AllocationInput[]
): Promise<boolean> {
  const { data: entry, error } = await supabase
    .from('payroll_entries')
    .select('gross_amount, attendance_days')
    .eq('id', entryId)
    .single()

  if (error || !entry) {
    toast.error('تعذّر جلب بيانات إدخال الراتب')
    return false
  }

  const totalCost = allocations.reduce((s, a) => s + a.allocated_cost, 0)
  const totalDays = allocations.reduce((s, a) => s + a.days_allocated, 0)
  const grossAmount = Number(entry.gross_amount)
  const attendanceDays = Number(entry.attendance_days)

  if (Math.abs(totalCost - grossAmount) > TOLERANCE || Math.abs(totalDays - attendanceDays) > TOLERANCE) {
    toast.error('مجموع التوزيع لا يساوي إجمالي الراتب / الأيام')
    return false
  }

  return true
}

export function useProjectAllocations(entryId?: string) {
  return useQuery({
    queryKey: ['project-allocations', entryId],
    enabled: Boolean(entryId),
    queryFn: async () => {
      if (!entryId) return [] as ProjectAllocationRow[]
      const { data, error } = await supabase
        .from('payroll_entry_project_allocations')
        .select('id, payroll_entry_id, project_id, days_allocated, allocated_cost, notes, created_at, updated_at')
        .eq('payroll_entry_id', entryId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as ProjectAllocationRow[]
    },
    staleTime: 30_000,
  })
}

export function useUpsertProjectAllocations() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      entryId,
      allocations,
    }: {
      entryId: string
      allocations: AllocationInput[]
    }) => {
      const valid = await validateAllocations(entryId, allocations)
      if (!valid) throw new Error('validation_failed')

      const rows = allocations.map((a) => ({
        project_id: a.project_id,
        days_allocated: a.days_allocated,
        allocated_cost: a.allocated_cost,
        notes: a.notes ?? null,
      }))

      const { error } = await supabase.rpc('upsert_payroll_allocations', {
        p_entry_id: entryId,
        p_rows: rows,
      })
      if (error) throw error
    },
    onSuccess: (_data, { entryId }) => {
      queryClient.invalidateQueries({ queryKey: ['project-allocations', entryId] })
      queryClient.invalidateQueries({ queryKey: ['revenue-pnl'] })
    },
    onError: (err) => {
      if ((err as Error).message !== 'validation_failed') {
        toast.error('حدث خطأ أثناء حفظ التوزيع')
      }
    },
  })
}
