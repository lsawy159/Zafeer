import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, Company } from '@/lib/supabase'
import { logger } from '@/utils/logger'

interface PaginationOptions {
  page?: number
  size?: number
}

export const ALL_COMPANIES_QUERY_KEY = ['companies-all'] as const

export function useAllCompanies(enabled = true) {
  return useQuery({
    queryKey: ALL_COMPANIES_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select(
          'id,name,unified_number,labor_subscription_number,commercial_registration_expiry,social_insurance_expiry,ending_subscription_power_date,ending_subscription_moqeem_date,ending_subscription_insurance_date,commercial_registration_status,social_insurance_status,current_employees,max_employees,additional_fields,created_at,updated_at,notes,exemptions,social_insurance_number,company_type,employee_count'
        )
        .order('created_at', { ascending: false })
      if (error) {
        logger.error('Error fetching all companies:', error)
        throw error
      }
      return (data ?? []) as Company[]
    },
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled,
  })
}

export function useCompanies(options?: PaginationOptions) {
  const page = options?.page || 0
  const size = options?.size || 50

  return useQuery({
    queryKey: ['companies', page, size],
    queryFn: async () => {
      const from = page * size
      const to = from + size - 1

      const { data, error } = await supabase
        .from('companies')
        .select(
          'id,name,unified_number,labor_subscription_number,commercial_registration_expiry,social_insurance_expiry,ending_subscription_power_date,ending_subscription_moqeem_date,ending_subscription_insurance_date,commercial_registration_status,social_insurance_status,current_employees,max_employees,additional_fields,created_at,updated_at,notes,exemptions,social_insurance_number,company_type,employee_count',
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) {
        logger.error('Error fetching companies:', error)
        throw error
      }
      return data as Company[]
    },
    staleTime: 60 * 1000,
  })
}

export function useCreateCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (company: Partial<Company>) => {
      const { data, error } = await supabase.from('companies').insert([company]).select().single()

      if (error) {
        logger.error('Error creating company:', error)
        throw error
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
    },
  })
}

export function useUpdateCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Company> & { id: string }) => {
      const { data, error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        logger.error('Error updating company:', error)
        throw error
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
    },
  })
}

export function useDeleteCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('companies').delete().eq('id', id)

      if (error) {
        logger.error('Error deleting company:', error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
    },
  })
}
