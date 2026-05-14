import React, { useState } from 'react'
import { Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function BulkDateModal({
  title,
  selectedCount,
  onConfirm,
  onCancel,
}: {
  title: string
  selectedCount: number
  onConfirm: (date: string) => void
  onCancel: () => void
}) {
  const [selectedDate, setSelectedDate] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedDate) {
      onConfirm(selectedDate)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-surface rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-info-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-900">{title}</h3>
              <p className="text-sm text-neutral-600">{selectedCount} موظف محدد</p>
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                التاريخ الجديد
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus-ring-brand"
                required
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={!selectedDate} className="flex-1">
                تأكيد التعديل
              </Button>
              <Button type="button" onClick={onCancel} className="flex-1" variant="secondary">
                إلغاء
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
