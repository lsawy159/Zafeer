import { useMutation, useQueryClient } from '@tanstack/react-query'
import { logger } from '@/utils/logger'
import { supabase } from '@/lib/supabase'

async function invokeAdminProjects<T>(
  action: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-projects', {
    body,
    headers: { 'x-action': action },
  })

  if (error) {
    const message = (data as { error?: string } | null)?.error ?? error.message
    throw new Error(message)
  }

  return data as T
}

export function useUpdateExtractLine(invoiceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ lineId, attendanceDays, totalDaysInMonth, monthlyRate }: {
      lineId: string
      attendanceDays: number
      totalDaysInMonth: number
      monthlyRate: number
    }) => {
      return invokeAdminProjects('update-extract-line', {
        lineId,
        attendanceDays,
        totalDaysInMonth,
        monthlyRate,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extract', invoiceId] })
    },
    onError: (error) => {
      logger.error('Error updating extract line:', error)
    },
  })
}

export function useAddExtractLine(invoiceId: string, projectId: string, totalDaysInMonth: number) {
  const queryClient = useQueryClient()
  void projectId
  void totalDaysInMonth

  return useMutation({
    mutationFn: async ({ employeeId, attendanceDays }: {
      employeeId: string
      attendanceDays: number
    }) => {
      return invokeAdminProjects('add-extract-line', {
        id: invoiceId,
        employeeId,
        attendanceDays,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extract', invoiceId] })
    },
    onError: (error) => {
      logger.error('Error adding extract line:', error)
    },
  })
}

export function useDeleteExtractLine(invoiceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (lineId: string) => {
      return invokeAdminProjects('delete-extract-line', { lineId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extract', invoiceId] })
    },
    onError: (error) => {
      logger.error('Error deleting extract line:', error)
    },
  })
}
