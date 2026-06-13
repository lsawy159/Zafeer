import { useState, useEffect, useCallback, useRef } from 'react'
import { RotateCcw, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import type { BackupRecord } from '@/lib/backupService'
import { triggerRestore, getRestoreHistoryEntry } from '@/lib/restoreService'
import type { RestoreResult, RestoreHistoryRecord } from '@/lib/restoreService'

const TABLE_NAMES_AR: Record<string, string> = {
  users: 'المستخدمون',
  system_settings: 'إعدادات النظام',
  companies: 'الشركات',
  projects: 'المشاريع',
  employees: 'الموظفون',
  project_job_title_rates: 'معدلات الوظائف',
  saved_searches: 'عمليات البحث المحفوظة',
  notifications: 'الإشعارات',
  read_alerts: 'التنبيهات المقروءة',
  employee_obligation_headers: 'رؤوس التزامات الموظفين',
  employee_obligation_lines: 'تفاصيل التزامات الموظفين',
  transfer_procedures: 'إجراءات الاستبدال',
  payroll_runs: 'دورات الرواتب',
  payroll_entries: 'قيود الرواتب',
  payroll_entry_components: 'مكونات قيود الرواتب',
  payroll_slips: 'كشوفات الرواتب',
  extract_invoices: 'فواتير الاستخراجات',
  extract_invoice_lines: 'تفاصيل فواتير الاستخراجات',
}

const STATUS_LABELS: Record<string, string> = {
  creating_snapshot: 'جارٍ إنشاء snapshot الوقائي...',
  reading_file: 'جارٍ قراءة ملف النسخة...',
  staging_data: 'جارٍ تحضير البيانات...',
  restoring_data: 'جارٍ استعادة البيانات (لا تغلق الصفحة)...',
}

const STATUS_PROGRESS: Record<string, number> = {
  creating_snapshot: 25,
  reading_file: 50,
  staging_data: 65,
  restoring_data: 80,
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const day = String(d.getUTCDate()).padStart(2, '0')
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const year = d.getUTCFullYear()
  return `${day}/${month}/${year}`
}

interface Props {
  backup: BackupRecord
  onClose: () => void
}

type Step = 'preview' | 'confirm' | 'progress' | 'result'

export function RestorePreviewModal({ backup, onClose }: Props) {
  const [step, setStep] = useState<Step>('preview')
  const [confirmDate, setConfirmDate] = useState('')
  const [confirmWord, setConfirmWord] = useState('')
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null)
  const [restoreEntry, setRestoreEntry] = useState<RestoreHistoryRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const backupDateFormatted = formatDate(backup.started_at)
  const canSubmit = confirmDate === backupDateFormatted && confirmWord === 'استعادة'

  const pollRestoreStatus = useCallback(async (restoreId: string) => {
    const interval = setInterval(async () => {
      const entry = await getRestoreHistoryEntry(restoreId)
      if (!entry) return
      setRestoreEntry(entry)
      if (entry.status === 'completed' || entry.status === 'failed') {
        clearInterval(interval)
        intervalRef.current = null
        setStep('result')
      }
    }, 2000)
    intervalRef.current = interval
    return interval
  }, [])

  const handleRestore = async () => {
    if (!canSubmit) return
    setStep('progress')
    setError(null)

    try {
      const result = await triggerRestore(backup.id, confirmDate, confirmWord)
      setRestoreResult(result)

      if (result.success) {
        setStep('result')
        return
      }

      if (result.restore_id) {
        await pollRestoreStatus(result.restore_id)
        setTimeout(() => {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        }, 10 * 60 * 1000)
      } else {
        setError(result.error_message_ar ?? 'حدث خطأ غير متوقع')
        setStep('result')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع')
      setStep('result')
    }
  }

  const currentStatus = restoreEntry?.status ?? 'creating_snapshot'
  const progressPct = step === 'progress'
    ? (STATUS_PROGRESS[currentStatus] ?? 25)
    : (restoreEntry?.status === 'completed' ? 100 : 0)

  const tableRecordCounts = backup.table_record_counts ?? {}
  const totalRecords = Object.values(tableRecordCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="app-modal-surface max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-orange-100 rounded-full">
              <RotateCcw className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-neutral-900">استعادة النسخة الاحتياطية</h3>
              <p className="text-sm text-neutral-500">{backupDateFormatted}</p>
            </div>
          </div>

          {/* Step 1: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
                  <div className="text-sm text-orange-800">
                    <p className="font-bold mb-1">تحذير: عملية لا يمكن التراجع عنها</p>
                    <p>ستُحذف جميع البيانات الحالية واستبدالها ببيانات هذه النسخة. سيُنشأ snapshot وقائي تلقائياً قبل البدء.</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-neutral-700 mb-2">
                  الجداول في هذه النسخة ({Object.keys(tableRecordCounts).length} جدول — {totalRecords.toLocaleString('ar-SA')} سجل)
                </p>
                <div className="border border-neutral-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="text-right p-3 font-medium text-neutral-600">الجدول</th>
                        <th className="text-left p-3 font-medium text-neutral-600">عدد السجلات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(tableRecordCounts).map(([table, count], idx) => (
                        <tr key={table} className={idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}>
                          <td className="p-3 text-neutral-700">{TABLE_NAMES_AR[table] ?? table}</td>
                          <td className="p-3 text-neutral-600 text-left font-mono">{count.toLocaleString('ar-SA')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={onClose} className="app-button-secondary flex-1 justify-center">
                  إلغاء
                </button>
                <button onClick={() => setStep('confirm')} className="app-button-danger flex-1 justify-center">
                  متابعة للتأكيد
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Double Confirmation */}
          {step === 'confirm' && (
            <div className="space-y-5">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 font-medium">
                  أدخل المعلومات التالية للتأكيد على المسؤولية الكاملة عن هذه العملية
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  تاريخ النسخة (مثال: {backupDateFormatted})
                </label>
                <input
                  type="text"
                  value={confirmDate}
                  onChange={e => setConfirmDate(e.target.value)}
                  placeholder={backupDateFormatted}
                  className="app-input w-full font-mono"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  اكتب كلمة <span className="font-bold text-red-600">استعادة</span> للتأكيد
                </label>
                <input
                  type="text"
                  value={confirmWord}
                  onChange={e => setConfirmWord(e.target.value)}
                  placeholder="استعادة"
                  className="app-input w-full"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep('preview')} className="app-button-secondary flex-1 justify-center">
                  رجوع
                </button>
                <button
                  onClick={handleRestore}
                  disabled={!canSubmit}
                  className="app-button-danger flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCcw className="w-4 h-4" />
                  تنفيذ الاستعادة
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Progress */}
          {step === 'progress' && (
            <div className="space-y-6">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
                <p className="text-lg font-medium text-neutral-800">
                  {STATUS_LABELS[currentStatus] ?? 'جارٍ المعالجة...'}
                </p>
                <p className="text-sm text-neutral-500 mt-1">لا تغلق هذه الصفحة أثناء العملية</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm text-neutral-600">
                  <span>التقدم</span>
                  <span>{progressPct}%</span>
                </div>
                <div className="h-3 bg-neutral-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2 text-sm text-neutral-500">
                {(['creating_snapshot', 'reading_file', 'staging_data', 'restoring_data'] as const).map(s => {
                  const pct = STATUS_PROGRESS[s]
                  const done = pct < progressPct
                  const active = s === currentStatus
                  return (
                    <div key={s} className={`flex items-center gap-2 ${active ? 'text-orange-700 font-medium' : done ? 'text-green-700' : 'text-neutral-400'}`}>
                      {done ? <CheckCircle className="w-4 h-4" /> : active ? <Loader2 className="w-4 h-4 animate-spin" /> : <div className="w-4 h-4 rounded-full border-2 border-current" />}
                      {STATUS_LABELS[s]}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 4: Result */}
          {step === 'result' && (
            <div className="space-y-4">
              {restoreResult?.success || restoreEntry?.status === 'completed' ? (
                <div className="text-center space-y-3">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                  <p className="text-xl font-bold text-green-700">تمت الاستعادة بنجاح</p>
                  <p className="text-sm text-neutral-600">
                    تم استعادة النظام إلى نسخة {backupDateFormatted} بنجاح.
                  </p>
                  {(restoreResult?.snapshot_id ?? restoreEntry?.snapshot_id) && (
                    <p className="text-sm text-neutral-500">
                      تم حفظ snapshot وقائي من البيانات السابقة تلقائياً.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-center">
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-3" />
                    <p className="text-xl font-bold text-red-700">فشلت الاستعادة</p>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800">
                      {restoreResult?.error_message_ar ?? error ?? 'حدث خطأ غير متوقع'}
                    </p>
                  </div>

                  {(restoreResult?.snapshot_id ?? restoreEntry?.snapshot_id) && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-green-800 font-medium">البيانات لم تتغير</p>
                      <p className="text-sm text-green-700 mt-1">
                        العملية أُلغيت تلقائياً وبياناتك في أمان. Snapshot وقائي محفوظ يمكنك الرجوع إليه يدوياً إذا لزم.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <button onClick={onClose} className="app-button-secondary w-full justify-center mt-4">
                إغلاق
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
