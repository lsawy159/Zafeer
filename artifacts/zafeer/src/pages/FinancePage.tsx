import { lazy, Suspense } from 'react'
import { useSearchParams, Navigate } from 'react-router-dom'
import { usePermissions } from '@/utils/permissions'
import Layout from '@/components/layout/Layout'
import { toast } from 'sonner'
import { useEffect, useRef } from 'react'

const ExtractsTab = lazy(() => import('./finance/ExtractsTab'))
const PayrollRunsTab = lazy(() => import('./finance/PayrollRunsTab'))
const ObligationsTab = lazy(() => import('./finance/ObligationsTab'))
const DeductionsTab = lazy(() => import('./finance/DeductionsTab'))
const RevenueTab = lazy(() => import('./finance/RevenueTab'))

type FinanceTab = 'extracts' | 'payroll' | 'obligations' | 'deductions' | 'revenue'

const TAB_LABELS: Record<FinanceTab, string> = {
  extracts: 'المستخلصات',
  payroll: 'مسيرات الرواتب',
  obligations: 'الالتزامات',
  deductions: 'الاستقطاعات والجزاءات',
  revenue: 'الإيرادات والربحية',
}

const Loading = () => (
  <div className="py-12 text-center text-sm text-foreground-tertiary">جاري التحميل...</div>
)

// يُظهر toast مرة واحدة عند redirect من صفحة بدون صلاحية
function NoPermissionRedirect() {
  const shown = useRef(false)
  useEffect(() => {
    if (!shown.current) {
      shown.current = true
      toast.error('ليس لديك صلاحية الوصول للصفحة المالية')
    }
  }, [])
  return <Navigate to="/dashboard" replace />
}

export default function FinancePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { canView, hasPermission } = usePermissions()

  const canSeeExtracts = canView('extracts')
  const canSeePayroll = canView('payroll')
  const canSeeRevenue = canView('revenue')

  // FR-006: أول tab يملك المستخدم صلاحيته
  const defaultTab: FinanceTab | null =
    canSeeExtracts ? 'extracts'
    : canSeePayroll ? 'payroll'
    : canSeeRevenue ? 'revenue'
    : null

  // H4: مستخدم بدون أي صلاحية → redirect
  if (!defaultTab) {
    return <NoPermissionRedirect />
  }

  const rawTab = searchParams.get('tab') as FinanceTab | null
  const activeTab: FinanceTab = rawTab && Object.keys(TAB_LABELS).includes(rawTab) ? rawTab : defaultTab

  const setTab = (tab: FinanceTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('tab', tab)
      // محو sub-params عند تغيير التبويب
      next.delete('action')
      next.delete('id')
      return next
    })
  }

  const tabs: Array<{ id: FinanceTab; label: string; show: boolean }> = [
    { id: 'extracts' as const, label: TAB_LABELS.extracts, show: canSeeExtracts },
    { id: 'payroll' as const, label: TAB_LABELS.payroll, show: canSeePayroll },
    { id: 'obligations' as const, label: TAB_LABELS.obligations, show: canSeePayroll },
    { id: 'deductions' as const, label: TAB_LABELS.deductions, show: canSeePayroll },
    { id: 'revenue' as const, label: TAB_LABELS.revenue, show: canSeeRevenue },
  ].filter((t) => t.show)

  return (
    <Layout>
      <div dir="rtl" className="space-y-4">
        {/* Tab bar */}
        <div className="flex flex-wrap gap-2 border-b border-border-200 pb-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'border border-border-200 bg-surface text-foreground-secondary hover:bg-surface-secondary-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content — SC-001: lazy loaded */}
        <div>
          {activeTab === 'extracts' && canSeeExtracts && (
            <Suspense fallback={<Loading />}>
              <ExtractsTab />
            </Suspense>
          )}
          {activeTab === 'payroll' && canSeePayroll && (
            <Suspense fallback={<Loading />}>
              <PayrollRunsTab />
            </Suspense>
          )}
          {activeTab === 'obligations' && canSeePayroll && (
            <Suspense fallback={<Loading />}>
              <ObligationsTab />
            </Suspense>
          )}
          {activeTab === 'deductions' && canSeePayroll && (
            <Suspense fallback={<Loading />}>
              <DeductionsTab />
            </Suspense>
          )}
          {activeTab === 'revenue' && canSeeRevenue && (
            <Suspense fallback={<Loading />}>
              <RevenueTab />
            </Suspense>
          )}
        </div>
      </div>
    </Layout>
  )
}
