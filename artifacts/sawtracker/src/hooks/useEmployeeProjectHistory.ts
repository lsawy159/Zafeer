import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ProjectTransferRecord {
  id: string
  from_project_id: string | null
  from_project_name: string | null
  to_project_id: string | null
  to_project_name: string | null
  transferred_at: string
}

export function useEmployeeProjectHistory(employeeId: string) {
  return useQuery({
    queryKey: ['employee-project-history', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('id, details, created_at')
        .eq('entity_type', 'employee')
        .eq('entity_id', employeeId)
        .eq('action', 'project_transfer')
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data || []).map((row) => {
        const details = row.details as Record<string, unknown>
        return {
          id: row.id as string,
          from_project_id: (details?.from_project_id as string) ?? null,
          from_project_name: (details?.from_project_name as string) ?? null,
          to_project_id: (details?.to_project_id as string) ?? null,
          to_project_name: (details?.to_project_name as string) ?? null,
          transferred_at: (details?.timestamp as string) ?? (row.created_at as string),
        } as ProjectTransferRecord
      })
    },
    enabled: !!employeeId,
  })
}
