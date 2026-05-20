import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { logger } from '@/utils/logger'
import { calcAmount } from '@/utils/extractCalculations'

export function useUpdateExtractLine(invoiceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ lineId, attendanceDays, totalDaysInMonth, monthlyRate }: {
      lineId: string
      attendanceDays: number
      totalDaysInMonth: number
      monthlyRate: number
    }) => {
      const amount = calcAmount(monthlyRate, totalDaysInMonth, attendanceDays)

      const { error: lineErr } = await supabase
        .from('extract_invoice_lines')
        .update({ attendance_days: attendanceDays, amount })
        .eq('id', lineId)

      if (lineErr) {
        logger.error('Error updating extract line:', lineErr)
        throw lineErr
      }

      const { error: recalcErr } = await supabase.rpc('recalculate_extract_totals', {
        p_invoice_id: invoiceId,
      })

      if (recalcErr) {
        logger.error('Error recalculating extract totals:', recalcErr)
        throw recalcErr
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extract', invoiceId] })
    },
  })
}

export function useAddExtractLine(invoiceId: string, projectId: string, totalDaysInMonth: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ employeeId, attendanceDays }: {
      employeeId: string
      attendanceDays: number
    }) => {
      // جلب بيانات الموظف (snapshot)
      const { data: emp, error: empErr } = await supabase
        .from('employees')
        .select('id, name, profession, residence_number')
        .eq('id', employeeId)
        .single()

      if (empErr || !emp) {
        throw new Error('لم يُعثر على بيانات الموظف')
      }

      const profession = emp.profession?.trim() ?? ''

      if (!profession) {
        throw new Error('هذا الموظف بلا مهنة — لا يمكن إضافته')
      }

      // جلب السعر من project_job_title_rates في وقت الإضافة
      const { data: rateRow, error: rateErr } = await supabase
        .from('project_job_title_rates')
        .select('monthly_rate')
        .eq('project_id', projectId)
        .ilike('profession', profession)
        .maybeSingle()

      if (rateErr) {
        logger.error('Error fetching rate for add line:', rateErr)
        throw rateErr
      }

      if (!rateRow) {
        throw new Error(`لا يوجد سعر لمهنة "${profession}" في هذا المشروع`)
      }

      const monthlyRate = Number(rateRow.monthly_rate)
      const amount = calcAmount(monthlyRate, totalDaysInMonth, attendanceDays)

      const { error: insertErr } = await supabase
        .from('extract_invoice_lines')
        .insert({
          invoice_id: invoiceId,
          employee_id: emp.id,
          employee_name_snapshot: emp.name,
          residence_number_snapshot: emp.residence_number ?? 0,
          profession_snapshot: profession,
          monthly_rate_snapshot: monthlyRate,
          attendance_days: attendanceDays,
          total_days_in_month: totalDaysInMonth,
          amount,
        })

      if (insertErr) {
        logger.error('Error inserting extract line:', insertErr)
        throw insertErr
      }

      const { error: recalcErr } = await supabase.rpc('recalculate_extract_totals', {
        p_invoice_id: invoiceId,
      })

      if (recalcErr) {
        logger.error('Error recalculating after add:', recalcErr)
        throw recalcErr
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extract', invoiceId] })
    },
  })
}

export function useDeleteExtractLine(invoiceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (lineId: string) => {
      const { error: deleteErr } = await supabase
        .from('extract_invoice_lines')
        .delete()
        .eq('id', lineId)

      if (deleteErr) {
        logger.error('Error deleting extract line:', deleteErr)
        throw deleteErr
      }

      const { error: recalcErr } = await supabase.rpc('recalculate_extract_totals', {
        p_invoice_id: invoiceId,
      })

      if (recalcErr) {
        logger.error('Error recalculating after delete:', recalcErr)
        throw recalcErr
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extract', invoiceId] })
    },
  })
}
