import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertTriangle, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useJobTitleRates, useUpsertJobTitleRate, useDeleteJobTitleRate } from '@/hooks/useJobTitleRates'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'

interface JobTitleRatesModalProps {
  projectId: string
  projectName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function JobTitleRatesModal({
  projectId,
  projectName,
  open,
  onOpenChange,
}: JobTitleRatesModalProps) {
  const { data: rates = [], isLoading: ratesLoading } = useJobTitleRates(projectId)
  const upsertRate = useUpsertJobTitleRate()
  const deleteRate = useDeleteJobTitleRate()

  const { data: professions = [] } = useQuery({
    queryKey: ['projectProfessions', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('profession')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .not('profession', 'is', null)

      if (error) throw error

      const unique = [
        ...new Set(
          (data ?? [])
            .map((e) => (e.profession as string | null)?.trim())
            .filter(Boolean) as string[]
        ),
      ].sort()

      return unique
    },
    enabled: open && !!projectId,
  })

  const allProfessions = [
    ...new Set([
      ...professions,
      ...rates.map((r) => r.profession),
    ]),
  ].sort()

  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [savingProfession, setSavingProfession] = useState<string | null>(null)

  const getRateForProfession = (profession: string) =>
    rates.find((r) => r.profession.trim().toLowerCase() === profession.trim().toLowerCase())

  const handleSave = async (profession: string) => {
    const rawVal = editValues[profession.trim().toLowerCase()]
    if (!rawVal) return

    const monthlyRate = parseFloat(rawVal)
    if (isNaN(monthlyRate) || monthlyRate <= 0) {
      toast.error('السعر يجب أن يكون رقماً موجباً')
      return
    }

    setSavingProfession(profession)
    try {
      await upsertRate.mutateAsync({ projectId, profession, monthlyRate })
      toast.success(`تم حفظ سعر "${profession}"`)
      setEditValues((prev) => {
        const next = { ...prev }
        delete next[profession.trim().toLowerCase()]
        return next
      })
    } catch {
      toast.error('فشل حفظ السعر')
    } finally {
      setSavingProfession(null)
    }
  }

  const handleDelete = async (rateId: string, profession: string) => {
    try {
      await deleteRate.mutateAsync({ id: rateId, projectId })
      toast.success(`تم حذف سعر "${profession}"`)
    } catch {
      toast.error('فشل حذف السعر')
    }
  }

  if (!open) return null

  const modal = (
    // z-[120] > ProjectDetailModal z-[110]
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60"
      dir="rtl"
      onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false) }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-base font-semibold text-slate-800">
            أسعار المهن — {projectName}
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {ratesLoading ? (
            <div className="py-8 text-center text-slate-500">جاري التحميل...</div>
          ) : allProfessions.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              لا توجد مهن مسجّلة لموظفي هذا المشروع
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-slate-500 mb-3">
                أدخل السعر الشهري (ريال) لكل مهنة حسب اتفاقية المشروع
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-slate-600">
                    <th className="py-2 text-right font-medium">المهنة</th>
                    <th className="py-2 text-right font-medium">السعر الشهري (ريال)</th>
                    <th className="py-2 w-28" />
                  </tr>
                </thead>
                <tbody>
                  {allProfessions.map((profession) => {
                    const existingRate = getRateForProfession(profession)
                    const key = profession.trim().toLowerCase()
                    const editVal = editValues[key]
                    const currentVal =
                      editVal !== undefined
                        ? editVal
                        : existingRate
                          ? String(existingRate.monthly_rate)
                          : ''
                    const isSaving = savingProfession === profession
                    const isDirty = editVal !== undefined

                    return (
                      <tr key={profession} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="py-2 pr-1">
                          <div className="flex items-center gap-1">
                            {!existingRate && (
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            )}
                            <span>{profession}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={currentVal}
                            onChange={(e) =>
                              setEditValues((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            className="h-8 w-36 text-right"
                          />
                        </td>
                        <td className="py-2 pl-1">
                          <div className="flex items-center gap-1">
                            {isDirty && (
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 px-2"
                                onClick={() => handleSave(profession)}
                                disabled={isSaving}
                              >
                                <Save className="h-3 w-3 ml-1" />
                                {isSaving ? '...' : 'حفظ'}
                              </Button>
                            )}
                            {existingRate && !isDirty && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-red-500 hover:text-red-700"
                                onClick={() => handleDelete(existingRate.id, profession)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {allProfessions.some((p) => !getRateForProfession(p)) && (
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  مهن بلا سعر لن تظهر في حساب المستخلص
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-slate-200 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 ml-1" />
            إغلاق
          </Button>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
