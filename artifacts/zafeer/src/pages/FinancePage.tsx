import { lazy, Suspense, useEffect, useRef } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { BadgeMinus, FileText, HandCoins, ReceiptText, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/ui/PageHeader'
import { usePermissions } from '@/utils/permissions'

const ExtractsTab = lazy(() => import('./finance/ExtractsTab'))
const PayrollRunsTab = lazy(() => import('./finance/PayrollRunsTab'))
const ObligationsTab = lazy(() => import('./finance/ObligationsTab'))
const DeductionsTab = lazy(() => import('./finance/DeductionsTab'))
const RevenueTab = lazy(() => import('./finance/RevenueTab'))

type FinanceTab = 'extracts' | 'payroll' | 'obligations' | 'deductions' | 'revenue'

const TAB_META = {
  extracts: {
    label: 'المستخلصات',
    description: 'فواتير التكاليف الشهرية للمشاريع الخارجية',
    Icon: FileText,
  },
  payroll: {
    label: 'مسيرات الرواتب',
    description: 'إنشاء ومراجعة واعتماد مسيرات الرواتب',
    Icon: HandCoins,
  },
  obligations: {
    label: 'الالتزامات',
    description: 'تكاليف دفعتها الشركة مسبقاً على الموظفين',
    Icon: ReceiptText,
  },
  deductions: {
    label: 'الاستقطاعات والجزاءات',
    description: 'التنفيذ الشهري الفعلي للاستقطاع من الراتب',
    Icon: BadgeMinus,
  },
  revenue: {
    label: 'الإيرادات والربحية',
    description: 'ربط المستخلصات بتكلفة العمالة وهوامش المشاريع',
    Icon: TrendingUp,
  },
} satisfies Record<FinanceTab, { label: string; description: string; Icon: typeof FileText }>

const Loading = () => (
  <div className="py-12 text-center text-sm text-foreground-tertiary">جاري التحميل...</div>
)

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
  const { canView } = usePermissions()

  const canSeeExtracts = canView('extracts')
  const canSeePayroll = canView('payroll')
  const canSeeRevenue = canView('revenue')
  const defaultTab: FinanceTab | null =
    canSeeExtracts ? 'extracts'
    : canSeePayroll ? 'payroll'
    : canSeeRevenue ? 'revenue'
    : null

  const tabs: Array<{ id: FinanceTab; label: string; show: boolean }> = [
    { id: 'extracts' as const, label: TAB_META.extracts.label, show: canSeeExtracts },
    { id: 'payroll' as const, label: TAB_META.payroll.label, show: canSeePayroll },
    { id: 'obligations' as const, label: TAB_META.obligations.label, show: canSeePayroll },
    { id: 'deductions' as const, label: TAB_META.deductions.label, show: canSeePayroll },
    { id: 'revenue' as const, label: TAB_META.revenue.label, show: canSeeRevenue },
  ].filter((tab) => tab.show)

  const rawTab = searchParams.get('tab') as FinanceTab | null
  const allowedTabs = tabs.map((tab) => tab.id)
  const activeTab: FinanceTab =
    defaultTab && rawTab && allowedTabs.includes(rawTab) ? rawTab : (defaultTab ?? 'extracts')
  const activeMeta = TAB_META[activeTab]

  useEffect(() => {
    if (defaultTab && rawTab && rawTab !== activeTab) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set('tab', activeTab)
        next.delete('action')
        next.delete('id')
        return next
      }, { replace: true })
    }
  }, [activeTab, defaultTab, rawTab, setSearchParams])

  if (!defaultTab) {
    return <NoPermissionRedirect />
  }

  const setTab = (tab: FinanceTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('tab', tab)
      next.delete('action')
      next.delete('id')
      return next
    })
  }

  return (
    <Layout>
      <div dir="rtl" className="app-page app-tech-grid">
        <PageHeader
          title="المالية"
          description={activeMeta.description}
          breadcrumbs={[{ label: 'الرئيسية', href: '/dashboard' }, { label: 'المالية' }]}
          className="mb-6"
        />

        <div className="app-panel mb-6 overflow-hidden">
          <div className="grid grid-cols-1 border-b border-border sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {tabs.map((tab) => {
              const Icon = TAB_META[tab.id].Icon
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTab(tab.id)}
                  className={`app-tab-button ${
                    activeTab === tab.id
                      ? 'app-tab-button-active'
                      : 'hover:bg-surface-secondary hover:text-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

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
