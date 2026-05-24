import { useMutation, useQueryClient } from '@tanstack/react-query'
import { logger } from '@/utils/logger'
import {
  useUpdateAdminExtractLine,
  useAddAdminExtractLine,
  useDeleteAdminExtractLine,
} from '@workspace/api-client-react'

export function useUpdateExtractLine(invoiceId: string) {
  const queryClient = useQueryClient()
  const baseUpdateMutation = useUpdateAdminExtractLine()

  return useMutation({
    mutationFn: async ({ lineId, attendanceDays, totalDaysInMonth, monthlyRate }: {
      lineId: string
      attendanceDays: number
      totalDaysInMonth: number
      monthlyRate: number
    }) => {
      return baseUpdateMutation.mutateAsync({
        lineId,
        data: {
          attendanceDays,
          totalDaysInMonth,
          monthlyRate,
        },
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
  const baseAddMutation = useAddAdminExtractLine()

  return useMutation({
    mutationFn: async ({ employeeId, attendanceDays }: {
      employeeId: string
      attendanceDays: number
    }) => {
      return baseAddMutation.mutateAsync({
        id: invoiceId,
        data: { employeeId, attendanceDays },
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
  const baseDeleteMutation = useDeleteAdminExtractLine()

  return useMutation({
    mutationFn: async (lineId: string) => {
      return baseDeleteMutation.mutateAsync({ lineId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extract', invoiceId] })
    },
    onError: (error) => {
      logger.error('Error deleting extract line:', error)
    },
  })
}
