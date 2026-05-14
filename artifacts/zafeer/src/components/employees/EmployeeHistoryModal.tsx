import { X, FolderKanban, History, Loader2, ArrowLeft } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEmployeeProjectHistory } from '@/hooks/useEmployeeProjectHistory'
import { Employee } from '@/lib/supabase'

interface EmployeeHistoryModalProps {
  employee: Employee
  onClose: () => void
}

export function EmployeeHistoryModal({ employee, onClose }: EmployeeHistoryModalProps) {
  const { data: history, isLoading, isError } = useEmployeeProjectHistory(employee.id)

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  const modal = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-50 p-2">
              <History className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-900">سجل نقل المشاريع</h3>
              <p className="text-sm text-neutral-500">{employee.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 transition hover:bg-black/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
            </div>
          ) : isError ? (
            <div className="text-center py-12 text-red-500 text-sm">
              تعذر تحميل سجل المشاريع
            </div>
          ) : !history || history.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                <FolderKanban className="w-8 h-8 text-neutral-300" />
              </div>
              <p className="text-neutral-500 font-medium">لا يوجد سجل نقل مشاريع</p>
              <p className="text-sm text-neutral-400 mt-1">
                سيتم تسجيل نقل الموظف بين المشاريع تلقائياً عند التعديل
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline */}
              <div className="space-y-1">
                {history.map((record, index) => (
                  <div key={record.id} className="relative flex gap-4 pb-6">
                    {/* Vertical line */}
                    {index < history.length - 1 && (
                      <div className="absolute right-[19px] top-10 bottom-0 w-0.5 bg-neutral-200" />
                    )}
                    {/* Icon dot */}
                    <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-violet-100 border-2 border-violet-200 flex items-center justify-center">
                      <FolderKanban className="w-4 h-4 text-violet-600" />
                    </div>
                    {/* Card */}
                    <div className="flex-1">
                      <p className="text-xs text-neutral-400 mb-2 mt-1">
                        {formatDate(record.transferred_at)}
                      </p>
                      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                        {/* From */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-neutral-500 w-8">من</span>
                          <span className="flex-1 text-sm font-medium text-neutral-700 bg-white rounded-lg px-3 py-1.5 border border-neutral-200">
                            {record.from_project_name || (
                              <span className="text-neutral-400 italic">بدون مشروع</span>
                            )}
                          </span>
                        </div>
                        {/* Arrow */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-8" />
                          <ArrowLeft className="w-4 h-4 text-violet-400 rotate-180" />
                        </div>
                        {/* To */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-neutral-500 w-8">إلى</span>
                          <span className="flex-1 text-sm font-medium text-violet-700 bg-violet-50 rounded-lg px-3 py-1.5 border border-violet-100">
                            {record.to_project_name || (
                              <span className="text-neutral-400 italic">بدون مشروع</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
