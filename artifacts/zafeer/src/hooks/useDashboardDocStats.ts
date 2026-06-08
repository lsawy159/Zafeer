import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface DocStatsEmployee {
  id: string
  company_id: string | null
  contract_expiry: string | null
  residence_expiry: string | null
  health_insurance_expiry: string | null
  hired_worker_contract_expiry: string | null
}

export interface DocStatsCompany {
  id: string
  commercial_registration_expiry: string | null
  ending_subscription_power_date: string | null
  ending_subscription_moqeem_date: string | null
}

export function useDashboardDocStats() {
  const empQ = useQuery({
    queryKey: ['dashboard-doc-stats-employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id,company_id,contract_expiry,residence_expiry,health_insurance_expiry,hired_worker_contract_expiry')
        .eq('is_deleted', false)
        .range(0, 4999)
      if (error) throw error
      return (data ?? []) as DocStatsEmployee[]
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })

  const coQ = useQuery({
    queryKey: ['dashboard-doc-stats-companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id,commercial_registration_expiry,ending_subscription_power_date,ending_subscription_moqeem_date')
        .range(0, 999)
      if (error) throw error
      return (data ?? []) as DocStatsCompany[]
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })

  return {
    docEmployees: empQ.data ?? [],
    docCompanies: coQ.data ?? [],
    isLoadingDocStats: empQ.isLoading || coQ.isLoading,
  }
}
