import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import type { MatchedEmployee } from '@/utils/extractCalculations'

interface AttendanceMatchSummaryProps {
  rows: MatchedEmployee[]
  totalDaysInMonth: number
}

export default function AttendanceMatchSummary({
  rows,
  totalDaysInMonth,
}: AttendanceMatchSummaryProps) {
  const matched = rows.filter((r) => r.matchStatus === 'matched')
  const unknown = rows.filter((r) => r.matchStatus === 'unknown')
  const invalidDays = rows.filter((r) => r.matchStatus === 'invalid_days')

  return (
    <div className="space-y-3" dir="rtl">
      {/* ملخص */}
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="p-2 bg-green-50 rounded-lg border border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto mb-1" />
          <div className="font-bold text-green-700">{matched.length}</div>
          <div className="text-xs text-green-600">موظف مطابق</div>
        </div>
        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
          <XCircle className="h-4 w-4 text-slate-400 mx-auto mb-1" />
          <div className="font-bold text-slate-600">{unknown.length}</div>
          <div className="text-xs text-slate-500">رقم غير معروف</div>
        </div>
        <div className={`p-2 rounded-lg border ${invalidDays.length > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
          <AlertTriangle className={`h-4 w-4 mx-auto mb-1 ${invalidDays.length > 0 ? 'text-red-500' : 'text-slate-400'}`} />
          <div className={`font-bold ${invalidDays.length > 0 ? 'text-red-700' : 'text-slate-600'}`}>{invalidDays.length}</div>
          <div className={`text-xs ${invalidDays.length > 0 ? 'text-red-600' : 'text-slate-500'}`}>أيام تجاوزت {totalDaysInMonth}</div>
        </div>
      </div>

      {invalidDays.length > 0 && (
        <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          <p className="font-medium mb-1">أيام حضور غير صالحة (تمنع المتابعة):</p>
          <ul className="space-y-0.5">
            {invalidDays.map((r) => (
              <li key={r.residenceNumber}>
                {r.employeeName || r.residenceNumber} — {r.attendanceDays} يوم
              </li>
            ))}
          </ul>
        </div>
      )}

      {unknown.length > 0 && (
        <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
          <p className="font-medium mb-1">أرقام إقامة غير مسجّلة (يُتجاهل الصف):</p>
          <ul className="space-y-0.5">
            {unknown.map((r) => (
              <li key={r.residenceNumber}>{r.residenceNumber}</li>
            ))}
          </ul>
        </div>
      )}

      {/* جدول المطابقات الناجحة */}
      {matched.length > 0 && (
        <div className="overflow-y-auto max-h-48 rounded-lg border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="py-1.5 px-2 text-right text-slate-600 font-medium">الاسم</th>
                <th className="py-1.5 px-2 text-center text-slate-600 font-medium">الأيام</th>
                <th className="py-1.5 px-2 text-right text-slate-600 font-medium">المبلغ (ريال)</th>
              </tr>
            </thead>
            <tbody>
              {matched.map((r) => (
                <tr key={r.residenceNumber} className="border-t border-slate-100">
                  <td className="py-1.5 px-2 text-slate-700">{r.employeeName}</td>
                  <td className="py-1.5 px-2 text-center text-slate-600">{r.attendanceDays}</td>
                  <td className="py-1.5 px-2 text-slate-700 font-mono">
                    {r.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
