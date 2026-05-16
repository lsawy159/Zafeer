import { AlertTriangle } from 'lucide-react'
import { HijriDateDisplay } from '@/components/ui/HijriDateDisplay'
import { formatDateShortWithHijri } from '@/utils/dateFormatter'

interface ExpiryStatusRowProps {
  label: string
  date: string | null | undefined
  daysRemaining: number | null
}

export function ExpiryStatusRow({ label, date, daysRemaining }: ExpiryStatusRowProps) {
  const getStatusColor = (days: number | null) => {
    if (days === null) return 'text-success-600 bg-green-50 border-green-200'
    if (days < 0) return 'text-red-600 bg-red-50 border-red-200'
    if (days <= 7) return 'text-red-600 bg-red-50 border-red-200'
    if (days <= 15) return 'text-warning-600 bg-orange-50 border-orange-200'
    if (days <= 30) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-success-600 bg-green-50 border-green-200'
  }

  return (
    <div
      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border ${getStatusColor(daysRemaining)}`}
    >
      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium">{label}: </span>
        <span className="text-xs">
          {date ? (
            <>
              <HijriDateDisplay date={date}>{formatDateShortWithHijri(date)}</HijriDateDisplay>
              {daysRemaining !== null &&
                (daysRemaining < 0 ? ' (منتهية)' : ` (${daysRemaining} يوم)`)}
            </>
          ) : (
            'غير محدد'
          )}
        </span>
      </div>
    </div>
  )
}
