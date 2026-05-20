import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Copy } from 'lucide-react'
import { useExtracts, useDuplicateExtract } from '@/hooks/useExtracts'
import { usePermissions } from '@/utils/permissions'
import { toast } from 'sonner'
import Layout from '@/components/layout/Layout'

function formatPeriodMonth(raw: string): string {
  const d = new Date(raw)
  return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' })
}

function StatusBadge({ status }: { status: 'draft' | 'exported' }) {
  if (status === 'exported') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        مُصدَّر
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
      مسودة
    </span>
  )
}

export default function Extracts() {
  const navigate = useNavigate()
  const { canView, canCreate } = usePermissions()
  const { data: extracts = [], isLoading } = useExtracts()
  const duplicate = useDuplicateExtract()

  if (!canView('extracts')) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-slate-500">
          <div className="text-center">
            <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p>ليس لديك صلاحية عرض المستخلصات</p>
          </div>
        </div>
      </Layout>
    )
  }

  const handleDuplicate = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    duplicate.mutate(id, {
      onSuccess: () => toast.success('تم إنشاء نسخة جديدة من المستخلص'),
      onError: () => toast.error('فشل إنشاء النسخة'),
    })
  }

  return (
    <Layout>
    <div className="space-y-4 p-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">المستخلصات</h1>
          <p className="text-sm text-slate-500 mt-0.5">فواتير التكاليف الشهرية للمشاريع الخارجية</p>
        </div>
        {canCreate('extracts') && (
          <button
            onClick={() => navigate('/extracts/new')}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition"
          >
            <Plus className="h-4 w-4" />
            مستخلص جديد
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-slate-500">جاري التحميل...</div>
        ) : extracts.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 text-sm">لا توجد مستخلصات بعد</p>
            {canCreate('extracts') && (
              <button
                onClick={() => navigate('/extracts/new')}
                className="mt-3 text-sm text-primary hover:underline"
              >
                أنشئ مستخلصاً الآن
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-right font-medium text-slate-600">المشروع</th>
                  <th className="py-3 px-4 text-right font-medium text-slate-600">الفترة</th>
                  <th className="py-3 px-4 text-center font-medium text-slate-600">الإصدار</th>
                  <th className="py-3 px-4 text-center font-medium text-slate-600">الموظفون</th>
                  <th className="py-3 px-4 text-right font-medium text-slate-600">الإجمالي (ريال)</th>
                  <th className="py-3 px-4 text-center font-medium text-slate-600">الحالة</th>
                  <th className="py-3 px-2 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {extracts.map((extract) => (
                  <tr
                    key={extract.id}
                    onClick={() => navigate(`/extracts/${extract.id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      {extract.projects?.name ?? '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {formatPeriodMonth(extract.period_month)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center h-5 w-7 rounded bg-slate-100 text-xs font-mono text-slate-600">
                        v{extract.version}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600">
                      {extract.employee_count}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-mono">
                      {Number(extract.total_amount).toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={extract.status} />
                    </td>
                    <td className="py-3 px-2">
                      {canCreate('extracts') && (
                        <button
                          onClick={(e) => handleDuplicate(e, extract.id)}
                          disabled={duplicate.isPending}
                          title="نسخ كإصدار جديد"
                          className="text-slate-400 hover:text-primary transition disabled:opacity-40"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </Layout>
  )
}
