import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { logger } from '@/utils/logger'

export interface JobTitleRate {
  id: string
  project_id: string
  profession: string
  monthly_rate: number
  created_at: string
  updated_at: string
}

export function useJobTitleRates(projectId: string | undefined) {
  return useQuery({
    queryKey: ['jobTitleRates', projectId],
    queryFn: async () => {
      if (!projectId) return []
      const { data, error } = await supabase
        .from('project_job_title_rates')
        .select('*')
        .eq('project_id', projectId)
        .order('profession')

      if (error) {
        logger.error('Error fetching job title rates:', error)
        throw error
      }
      return (data ?? []) as JobTitleRate[]
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useUpsertJobTitleRate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      projectId,
      profession,
      monthlyRate,
    }: {
      projectId: string
      profession: string
      monthlyRate: number
    }) => {
      // Check-then-insert-or-update (expression index doesn't work with onConflict)
      const { data: existing, error: selectError } = await supabase
        .from('project_job_title_rates')
        .select('id')
        .eq('project_id', projectId)
        .ilike('profession', profession.trim())
        .maybeSingle()

      if (selectError) {
        logger.error('Error checking job title rate:', selectError)
        throw selectError
      }

      if (existing) {
        const { data, error } = await supabase
          .from('project_job_title_rates')
          .update({ monthly_rate: monthlyRate, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single()

        if (error) {
          logger.error('Error updating job title rate:', error)
          throw error
        }
        return data as JobTitleRate
      } else {
        const { data, error } = await supabase
          .from('project_job_title_rates')
          .insert({ project_id: projectId, profession: profession.trim(), monthly_rate: monthlyRate })
          .select()
          .single()

        if (error) {
          logger.error('Error inserting job title rate:', error)
          throw error
        }
        return data as JobTitleRate
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['jobTitleRates', variables.projectId] })
    },
  })
}

export function useDeleteJobTitleRate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from('project_job_title_rates').delete().eq('id', id)
      if (error) {
        logger.error('Error deleting job title rate:', error)
        throw error
      }
      return { id, projectId }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['jobTitleRates', result.projectId] })
    },
  })
}
