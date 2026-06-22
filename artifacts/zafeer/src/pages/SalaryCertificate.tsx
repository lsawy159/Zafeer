import { useMemo, useState } from 'react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Search, Download, Loader2, UserRound, Building2, IdCard, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { usePermissions } from '@/utils/permissions'
import { useAllEmployeesPage } from '@/hooks/useEmployees'
import type { EmployeeWithRelations } from '@/lib/supabase'
import {
  downloadCertificatePdf,
  CERT_COMPANY_NAME,
  CERT_DEFAULT_MANAGER,
  CERT_DEFAULT_MANAGER_TITLE,
  CERT_DEFAULT_CR,
} from '@/utils/salaryCertificate'

// صيغة التاريخ مطابقة للنموذج الأصلي: YYYY/MM/DD
function todayYYYYMMDD(): string {
  const d = new Date()
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${d.getFullYear()}/${month}/${day}`
}

export default function SalaryCertificate() {
  const { hasPermission } = usePermissions()
  const canView = hasPermission('employees', 'view')

  const { data: employees = [], isLoading } = useAllEmployeesPage(canView)

  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState(false)
  const [found, setFound] = useState<EmployeeWithRelations | null>(null)
  const [managerName, setManagerName] = useState(CERT_DEFAULT_MANAGER)
  const [managerTitle, setManagerTitle] = useState(CERT_DEFAULT_MANAGER_TITLE)
  const [generating, setGenerating] = useState(false)

  const crNumber = useMemo(() => {
    const unified = found?.company?.unified_number
    return unified ? String(unified) : CERT_DEFAULT_CR
  }, [found])

  if (!canView) {
    return (
      <Layout>
        <div className="p-4 md:p-6">
          <div className="app-panel p-8 text-center text-muted-foreground">
            لا تملك صلاحية الوصول لهذه الصفحة.
          </div>
        </div>
      </Layout>
    )
  }

  const handleSearch = () => {
    const q = query.trim()
    setSearched(true)
    if (!q) {
      setFound(null)
      return
    }
    const match = employees.find((e) => String(e.residence_number ?? '').trim() === q)
    setFound(match ?? null)
  }

  const handleGenerate = async () => {
    if (!found) return
    if (!found.salary || Number(found.salary) <= 0) {
      toast.error('لا يوجد راتب مسجّل لهذا الموظف في كارت الموظف')
      return
    }
    setGenerating(true)
    const toastId = toast.loading('جاري توليد الشهادة PDF')
    try {
      await downloadCertificatePdf({
        employeeName: found.name,
        residenceNumber: String(found.residence_number ?? ''),
        crNumber,
        salary: Number(found.salary),
        managerName: managerName.trim() || CERT_DEFAULT_MANAGER,
        managerTitle: managerTitle.trim() || CERT_DEFAULT_MANAGER_TITLE,
        dateStr: todayYYYYMMDD(),
      })
      toast.success('تم تنزيل الشهادة', { id: toastId })
    } catch (err) {
      toast.error('تعذّر توليد الشهادة', { id: toastId })
      throw err
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-4 p-4 md:p-6">
        <PageHeader
          title="تعريف بالراتب"
          description={`إصدار شهادة تعريف بالراتب — ${CERT_COMPANY_NAME}`}
        />

        {/* البحث */}
        <div className="app-panel p-4 md:p-5">
          <label className="mb-2 block text-sm font-semibold text-foreground">
            بحث برقم الإقامة
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              inputMode="numeric"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch()
              }}
              placeholder="أدخل رقم الإقامة ثم اضغط بحث"
              dir="ltr"
              className="flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-left text-sm text-foreground outline-none transition focus:border-[var(--color-primary-800)] focus:shadow-[var(--shadow-focus)]"
            />
            <Button onClick={handleSearch} disabled={isLoading} className="gap-2">
              <Search className="h-4 w-4" />
              {isLoading ? 'جاري التحميل...' : 'بحث'}
            </Button>
          </div>
          {isLoading && (
            <p className="mt-2 text-xs text-muted-foreground">جاري تحميل بيانات الموظفين...</p>
          )}
        </div>

        {/* نتيجة البحث */}
        {searched && !found && !isLoading && (
          <div className="app-panel p-6 text-center text-sm text-muted-foreground">
            لا يوجد موظف بهذا رقم الإقامة.
          </div>
        )}

        {found && (
          <div className="app-panel space-y-5 p-4 md:p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoRow icon={<UserRound className="h-4 w-4" />} label="اسم الموظف" value={found.name} />
              <InfoRow
                icon={<IdCard className="h-4 w-4" />}
                label="رقم الإقامة"
                value={String(found.residence_number ?? '—')}
                ltr
              />
              <InfoRow
                icon={<Building2 className="h-4 w-4" />}
                label="المؤسسة / السجل التجاري"
                value={`${found.company?.name ?? CERT_COMPANY_NAME} • ${crNumber}`}
              />
              <InfoRow
                icon={<Wallet className="h-4 w-4" />}
                label="الراتب الشهري"
                value={found.salary ? `${Number(found.salary).toLocaleString('en-US')} ريال` : 'غير مسجّل'}
                ltr
              />
            </div>

            {/* بيانات المدير (تتكتب وقت الطباعة) */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  اسم المدير
                </label>
                <input
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--color-primary-800)]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  صفة المدير
                </label>
                <input
                  value={managerTitle}
                  onChange={(e) => setManagerTitle(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--color-primary-800)]"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleGenerate} disabled={generating} className="gap-2">
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                توليد الشهادة PDF
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

function InfoRow({
  icon,
  label,
  value,
  ltr,
}: {
  icon: React.ReactNode
  label: string
  value: string
  ltr?: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5">
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-100)] text-[var(--color-primary-900)]">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div
          className="truncate text-sm font-semibold text-foreground"
          dir={ltr ? 'ltr' : 'auto'}
          style={ltr ? { textAlign: 'right' } : undefined}
        >
          {value}
        </div>
      </div>
    </div>
  )
}
