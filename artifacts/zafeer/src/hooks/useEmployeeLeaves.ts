import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, EmployeeLeave, EmployeeLeaveWithEmployee } from '@/lib/supabase'
import { logger } from '@/utils/logger'

export const EMPLOYEE_LEAVES_QUERY_KEY = ['employee-leaves-all'] as const

export interface CreateEmployeeLeaveInput {
  employee_id: string
  start_date: string
  end_date: string
  notes?: string | null
}

export interface UpdateEmployeeLeaveInput {
  id: string
  start_date: string
  end_date: string
  notes?: string | null
}

export function useEmployeeLeaves() {
  return useQuery({
    queryKey: EMPLOYEE_LEAVES_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_leaves')
        .select('id,employee_id,start_date,end_date,notes,created_by,created_at,updated_at,employee:employees(id,name,residence_number)')
        .order('start_date', { ascending: false })
      if (error) {
        logger.error('Error fetching employee leaves:', error)
        throw error
      }
      return (data ?? []) as unknown as EmployeeLeaveWithEmployee[]
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useEmployeeLeavesByEmployee(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['employee-leaves-by-employee', employeeId],
    queryFn: async () => {
      if (!employeeId) return []
      const { data, error } = await supabase
        .from('employee_leaves')
        .select('id,employee_id,start_date,end_date,notes,created_by,created_at,updated_at')
        .eq('employee_id', employeeId)
        .order('start_date', { ascending: false })
      if (error) {
        logger.error('Error fetching employee leaves by employee:', error)
        throw error
      }
      return (data ?? []) as EmployeeLeave[]
    },
    enabled: !!employeeId,
  })
}

export function useCreateEmployeeLeave() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateEmployeeLeaveInput) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('employee_leaves')
        .insert({ ...input, created_by: user?.id ?? null })
        .select()
        .single()
      if (error) {
        logger.error('Error creating employee leave:', error)
        throw error
      }
      return data as EmployeeLeave
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMPLOYEE_LEAVES_QUERY_KEY })
    },
  })
}

export function useUpdateEmployeeLeave() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...fields }: UpdateEmployeeLeaveInput) => {
      const { data, error } = await supabase
        .from('employee_leaves')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) {
        logger.error('Error updating employee leave:', error)
        throw error
      }
      return data as EmployeeLeave
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMPLOYEE_LEAVES_QUERY_KEY })
    },
  })
}

export function useDeleteEmployeeLeave() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('employee_leaves')
        .delete()
        .eq('id', id)
      if (error) {
        logger.error('Error deleting employee leave:', error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMPLOYEE_LEAVES_QUERY_KEY })
    },
  })
}
