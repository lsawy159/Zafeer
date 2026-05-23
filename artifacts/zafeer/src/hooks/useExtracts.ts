import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { logger } from '@/utils/logger'
import { useAuth } from '@/contexts/AuthContext'
import { useDeleteAdminExtract } from '@workspace/api-client-react'
import type { MatchedEmployee } from '@/utils/extractCalculations'

export interface ExtractInvoice {
  id: string
  project_id: string
  period_month: string
  version: number
  status: 'draft' | 'exported'
  total_amount: number
  employee_count: number
  total_days_in_month: number
  created_by: string
  created_at: string
  exported_at: string | null
  projects?: { name: string } | null
}

export interface ExtractInvoiceLine {
  id: string
  invoice_id: string
  employee_id: string | null
  employee_name_snapshot: string
  residence_number_snapshot: number
  profession_snapshot: string
  monthly_rate_snapshot: number
  attendance_days: number
  total_days_in_month: number
  amount: number
  created_at: string
}

export interface ExtractInvoiceWithLines extends ExtractInvoice {
  extract_invoice_lines: ExtractInvoiceLine[]
}

export function useExtracts() {
  return useQuery({
    queryKey: ['extracts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('extract_invoices')
        .select('*, projects(name)')
        .order('created_at', { ascending: false })

      if (error) {
        logger.error('Error fetching extracts:', error)
        throw error
      }
      return (data ?? []) as ExtractInvoice[]
    },
    staleTime: 30 * 1000,
  })
}

export function useExtract(id: string | undefined) {
  return useQuery({
    queryKey: ['extract', id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('extract_invoices')
        .select('*, extract_invoice_lines(*), projects(name)')
        .eq('id', id)
        .single()

      if (error) {
        logger.error('Error fetching extract:', error)
        throw error
      }
      return data as ExtractInvoiceWithLines
    },
    enabled: !!id,
    staleTime: 15 * 1000,
  })
}

export interface CreateExtractInput {
  projectId: string
  periodMonth: string   // 'YYYY-MM-01'
  totalDays: number
  lines: MatchedEmployee[]
}

export function useCreateExtract() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ projectId, periodMonth, totalDays, lines }: CreateExtractInput) => {
      if (!user?.id) throw new Error('المستخدم غير مُعرَّف')

      const rpcLines = lines
        .filter((l) => l.matchStatus === 'matched')
        .map((l) => ({
          employee_id: l.employeeId || null,
          employee_name: l.employeeName,
          residence_number: l.residenceNumber,
          profession: l.profession,
          monthly_rate: l.monthlyRate,
          attendance_days: l.attendanceDays,
          amount: l.amount,
        }))

      const { data, error } = await supabase.rpc('create_extract_invoice', {
        p_project_id: projectId,
        p_period_month: periodMonth,
        p_total_days: totalDays,
        p_lines: rpcLines,
        p_created_by: user.id,
      })

      if (error) {
        logger.error('Error creating extract:', error)
        throw error
      }
      return data as string
    },
    onSuccess: (invoiceId) => {
      queryClient.invalidateQueries({ queryKey: ['extracts'] })
      navigate(`/extracts/${invoiceId}`)
    },
  })
}

export function useMarkExported() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error } = await supabase
        .from('extract_invoices')
        .update({ status: 'exported', exported_at: new Date().toISOString() })
        .eq('id', invoiceId)

      if (error) {
        logger.error('Error marking extract as exported:', error)
        throw error
      }
    },
    onSuccess: (_, invoiceId) => {
      queryClient.invalidateQueries({ queryKey: ['extracts'] })
      queryClient.invalidateQueries({ queryKey: ['extract', invoiceId] })
    },
  })
}

export function useDuplicateExtract() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (sourceId: string) => {
      if (!user?.id) throw new Error('المستخدم غير مُعرَّف')

      const { data, error } = await supabase.rpc('duplicate_extract_invoice', {
        p_source_id: sourceId,
        p_created_by: user.id,
      })

      if (error) {
        logger.error('Error duplicating extract:', error)
        throw error
      }
      return data as string
    },
    onSuccess: (newInvoiceId) => {
      queryClient.invalidateQueries({ queryKey: ['extracts'] })
      navigate(`/extracts/${newInvoiceId}`)
    },
  })
}

export function useDeleteExtract() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const baseMutation = useDeleteAdminExtract()

  return useMutation({
    mutationFn: async (extractId: string) => {
      return baseMutation.mutateAsync({ id: extractId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extracts'] })
      queryClient.removeQueries({ queryKey: ['extract'] })
      navigate('/extracts')
    },
    onError: (error) => {
      logger.error('Error deleting extract:', error)
    },
  })
}
