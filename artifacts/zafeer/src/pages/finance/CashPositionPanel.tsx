import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/utils/permissions'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface ObligationSummary {
  total_prepaid: number
  total_collected: number
  total_remaining: number
}

interface PaidObligation {
  id: string
  employee_id: string
  title: string
  total_amount: number
  status: string
}

function useCashPositionData() {
  return useQuery({
    queryKey: ['cash-position'],
    queryFn: async () => {
      const [
        { data: headers, error: headersError },
        { data: lines, error: linesError },
      ] = await Promise.all([
        supabase
          .from('employee_obligation_headers')
          .select('id, total_amount, status')
          .in('status', ['active', 'partially_paid']),
        supabase
          .from('employee_obligation_lines')
          .select('amount_paid, header:employee_obligation_headers!inner(status)')
          .filter('employee_obligation_headers.status', 'in', '("active","partially_paid")'),
      ])

      if (headersError) throw headersError

      const total_prepaid = (headers ?? []).reduce((s, h) => s + Number(h.total_amount || 0), 0)

      if (linesError) throw linesError

      const total_collected = (lines ?? []).reduce((s, l) => s + Number(l.amount_paid || 0), 0)

      return {
        total_prepaid,
        total_collected,
        total_remaining: total_prepaid - total_collected,
      } as ObligationSummary
    },
    staleTime: 60_000,
  })
}

function usePaidObligations() {
  return useQuery({
    queryKey: ['paid-obligations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_obligation_headers')
        .select('id, employee_id, title, total_amount, status')
        .eq('status', 'paid')
        .order('title', { ascending: true })

      if (error) throw error
      return (data ?? []) as PaidObligation[]
    },
    staleTime: 60_000,
    enabled: false, // يُحمَّل عند الطلب فقط
  })
}

function useDeletePaidObligation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (headerId: string) => {
      const { error } = await supabase
        .from('employee_obligation_headers')
        .delete()
        .eq('id', headerId)
        .eq('status', 'paid') // حماية إضافية
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paid-obligations'] })
      queryClient.invalidateQueries({ queryKey: ['cash-position'] })
      toast.success('تم حذف الالتزام المسدد')
    },
    onError: () => toast.error('حدث خطأ أثناء الحذف'),
  })
}

function PaidObligationsPopout({ onClose }: { onClose: () => void }) {
  const { data: obligations = [], isLoading, refetch } = usePaidObligations()
  const deleteObligation = useDeletePaidObligation()
  const [confirmId, setConfirmId] = useState<string | null>(null)

  useEffect(() => {
    void refetch()
  }, [])

  const handleDelete = async (id: string) => {
    await deleteObligation.mutateAsync(id)
    setConfirmId(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-surface rounded-2xl border border-border-200 p-5 w-full max-w-lg shadow-xl max-h-[70vh] overflow-y-auto"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-foreground">الالتزامات المسددة بالكامل</h3>
          <button onClick={onClose} className="text-foreground-tertiary hover:text-foreground">×</button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : obligations.length === 0 ? (
          <p className="text-center text-sm text-foreground-tertiary py-6">لا توجد التزامات مسددة</p>
        ) : (
          <div className="space-y-2">
            {obligations.map((ob) => (
              <div key={ob.id} className="flex items-center justify-between rounded-xl border border-border-100 bg-surface-secondary-50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{ob.title}</p>
                  <p className="text-xs text-foreground-tertiary">
                    {Number(ob.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س
                  </p>
                </div>
                {confirmId === ob.id ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => void handleDelete(ob.id)}
                      disabled={deleteObligation.isPending}
                      className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      تأكيد الحذف
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="rounded-lg border border-border-200 px-2.5 py-1 text-xs font-medium text-foreground-secondary"
                    >
                      إلغاء
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmId(ob.id)}
                    className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    حذف
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function CashPositionPanel() {
  const { hasPermission } = usePermissions()
  const canManageRevenue = hasPermission('revenue', 'manage')
  const { data, isLoading } = useCashPositionData()
  const [showPaid, setShowPaid] = useState(false)

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2 }) + ' ر.س'

  return (
    <div className="rounded-2xl border border-border-200 bg-surface p-4 space-y-3" dir="rtl">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground">الوضع النقدي للالتزامات</h3>
        {canManageRevenue && (
          <button
            type="button"
            onClick={() => setShowPaid(true)}
            className="text-xs text-primary hover:underline"
          >
            عرض المسدد بالكامل
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-blue-50 p-3">
            <p className="text-xs text-blue-600 font-medium mb-1">إجمالي ما دُفع مسبقاً</p>
            <p className="text-base font-bold text-blue-900 tabular-nums">{fmt(data?.total_prepaid ?? 0)}</p>
          </div>
          <div className="rounded-xl bg-green-50 p-3">
            <p className="text-xs text-green-600 font-medium mb-1">إجمالي المُحصَّل</p>
            <p className="text-base font-bold text-green-900 tabular-nums">{fmt(data?.total_collected ?? 0)}</p>
          </div>
          <div className="rounded-xl bg-orange-50 p-3">
            <p className="text-xs text-orange-600 font-medium mb-1">المتبقي</p>
            <p className="text-base font-bold text-orange-900 tabular-nums">{fmt(data?.total_remaining ?? 0)}</p>
          </div>
        </div>
      )}

      {showPaid && <PaidObligationsPopout onClose={() => setShowPaid(false)} />}
    </div>
  )
}
