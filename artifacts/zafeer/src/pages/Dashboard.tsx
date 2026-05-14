import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase, Employee, Company } from '@/lib/supabase'
import {
  Users,
  Building2,
  AlertTriangle,
  Bell,
  LayoutDashboard,
  TrendingUp,
  MapPin,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { MetricCard } from '@/components/ui/MetricCard'
import {
  enrichEmployeeAlertsWithCompanyData,
  getEmployeeNotificationThresholdsPublic,
  DEFAULT_EMPLOYEE_THRESHOLDS,
  type EmployeeAlert,
} from '@/utils/employeeAlerts'
import { alertCache } from '@/utils/alertCache'
import type { Alert } from '@/components/alerts/AlertCard'
import { getStatusThresholds, DEFAULT_STATUS_THRESHOLDS } from '@/utils/autoCompanyStatus'
import { usePermissions } from '@/utils/permissions'
import { useAllEmployeesPage } from '@/hooks/useEmployees'
import { useAllCompanies } from '@/hooks/useCompanies'
import { useAlertsStats } from '@/hooks/useAlertsStats'
import { DashboardCompaniesTab } from './dashboard/DashboardCompaniesTab'
import { DashboardEmployeesTab } from './dashboard/DashboardEmployeesTab'
import { calculateDashboardStats, type DashboardStats } from './dashboard/dashboardStats'


export default function Dashboard() {
  const { canView } = usePermissions()
  const navigate = useNavigate()

  // React Query hooks for data
  const { data: employees = [], isLoading: isLoadingEmployees } = useAllEmployeesPage()
  const { data: companies = [], isLoading: isLoadingCompanies } = useAllCompanies()
  const { alertsStats } = useAlertsStats()

  // Fetch real total counts (bypasses pagination)
  const { data: totalCompaniesCount = 0 } = useQuery({
    queryKey: ['companies-total-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('companies')
        .select('id', { count: 'exact', head: true })
      return count ?? 0
    },
    staleTime: 60 * 1000,
  })

  const { data: totalEmployeesCount = 0 } = useQuery({
    queryKey: ['employees-total-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('is_deleted', false)
      return count ?? 0
    },
    staleTime: 60 * 1000,
  })

  const [companyThresholds, setCompanyThresholds] = useState(DEFAULT_STATUS_THRESHOLDS)
  const [employeeThresholds, setEmployeeThresholds] = useState(DEFAULT_EMPLOYEE_THRESHOLDS)
  const [companyAlerts, setCompanyAlerts] = useState<Alert[]>([])
  const [employeeAlerts, setEmployeeAlerts] = useState<EmployeeAlert[]>([])
  const [activeTab, setActiveTab] = useState<'companies' | 'employees'>('companies')
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    totalCompanies: 0,
    fullCompanies: 0,
    companiesWithFewSlots: 0,
    totalAvailableSlots: 0,
    totalContractSlots: 0,
    avgEmployeesPerCompany: 0,
    utilizationRate: 0,
    // إحصائيات العقود (5 فئات)
    expiredContracts: 0,
    urgentContracts: 0,
    highContracts: 0,
    mediumContracts: 0,
    validContracts: 0,
    // إحصائيات الإقامات (5 فئات)
    expiredResidences: 0,
    urgentResidences: 0,
    highResidences: 0,
    mediumResidences: 0,
    validResidences: 0,
    // إحصائيات التأمين الصحي (5 فئات)
    expiredInsurance: 0,
    urgentInsurance: 0,
    highInsurance: 0,
    mediumInsurance: 0,
    validInsurance: 0,
    // إحصائيات عقد أجير (5 فئات)
    expiredHiredWorkerContracts: 0,
    urgentHiredWorkerContracts: 0,
    highHiredWorkerContracts: 0,
    mediumHiredWorkerContracts: 0,
    validHiredWorkerContracts: 0,
    // إحصائيات السجل التجاري (5 فئات)
    expiredCommercialReg: 0,
    urgentCommercialReg: 0,
    highCommercialReg: 0,
    mediumCommercialReg: 0,
    validCommercialReg: 0,
    // إحصائيات اشتراك قوى (5 فئات)
    expiredPower: 0,
    urgentPower: 0,
    highPower: 0,
    mediumPower: 0,
    validPower: 0,
    // إحصائيات اشتراك مقيم (5 فئات)
    expiredMoqeem: 0,
    urgentMoqeem: 0,
    highMoqeem: 0,
    mediumMoqeem: 0,
    validMoqeem: 0,
  })

  // Load thresholds on mount
  useEffect(() => {
    const loadThresholds = async () => {
      const [companyThresholdsData, employeeThresholdsData] = await Promise.all([
        getStatusThresholds(),
        getEmployeeNotificationThresholdsPublic(),
      ])
      setCompanyThresholds(companyThresholdsData)
      setEmployeeThresholds(employeeThresholdsData)
    }
    loadThresholds()
  }, [])

  // Load read alerts on mount
  useEffect(() => {
    const loadReadAlerts = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        await supabase.from('read_alerts').select('alert_id').eq('user_id', user.id)
      } catch (error) {
        console.error('خطأ في جلب التنبيهات المقروءة:', error)
      }
    }
    loadReadAlerts()
  }, [])

  // Calculate stats when data changes
  useEffect(() => {
    if (employees && employees.length > 0 && companies && companies.length > 0) {
      setStats(calculateDashboardStats(employees, companies, companyThresholds, employeeThresholds))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, companies, companyThresholds, employeeThresholds])

  // Generate alerts when data changes
  useEffect(() => {
    if (employees && employees.length > 0 && companies && companies.length > 0) {
      // Use requestIdleCallback for non-critical work
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        ;(
          window.requestIdleCallback as (
            callback: IdleRequestCallback,
            options?: IdleRequestOptions
          ) => number
        )(
          async () => {
            const companyAlertsGenerated = await alertCache.getCompanyAlerts(companies)
            setCompanyAlerts(companyAlertsGenerated)

            const employeeAlertsGenerated = await alertCache.getEmployeeAlerts(employees, companies)
            const enrichedEmployeeAlerts = enrichEmployeeAlertsWithCompanyData(
              employeeAlertsGenerated,
              companies
            )
            setEmployeeAlerts(enrichedEmployeeAlerts)
          },
          { timeout: 2000 }
        )
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(async () => {
          const companyAlertsGenerated = await alertCache.getCompanyAlerts(companies)
          setCompanyAlerts(companyAlertsGenerated)

          const employeeAlertsGenerated = await alertCache.getEmployeeAlerts(employees, companies)
          const enrichedEmployeeAlerts = enrichEmployeeAlertsWithCompanyData(
            employeeAlertsGenerated,
            companies
          )
          setEmployeeAlerts(enrichedEmployeeAlerts)
        }, 100)
      }
    }
  }, [employees, companies])



  // استخدام نفس مصدر حساب التنبيهات المستخدم في الشريط الجانبي لضمان التطابق
  const companyUrgentAndHighAlerts = alertsStats.companyUrgent
  const employeeUrgentAndHighAlerts = alertsStats.employeeUrgent

  // التحقق من الصلاحية دون إرجاع مبكر للحفاظ على ترتيب الـ Hooks
  const unauthorized = !canView('dashboard')

  const loading = isLoadingEmployees || isLoadingCompanies

  return (
    <Layout>
      {unauthorized ? (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <LayoutDashboard className="w-16 h-16 mx-auto mb-4 text-danger-500" />
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">غير مصرح</h2>
            <p className="text-neutral-600">عذراً، ليس لديك صلاحية لعرض هذه الصفحة.</p>
          </div>
        </div>
      ) : (
        <div className="app-page app-tech-grid">
          {loading ? (
            <div className="space-y-3">
              <div className="app-panel p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      جاري تجهيز لوحة التحكم
                    </p>
                    <p className="text-xs text-foreground-secondary">
                      نحمّل الإحصائيات والتنبيهات الأساسية الآن.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="app-panel animate-pulse p-3">
                    <div className="mb-3 h-3 w-24 rounded bg-surface-secondary" />
                    <div className="mb-2 h-7 w-16 rounded bg-surface-secondary" />
                    <div className="h-3 w-20 rounded bg-surface-secondary" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="mb-2 motion-safe-enter">
                <PageHeader
                  title="لوحة التحكم"
                  description="ملخص فوري للإحصائيات والتنبيهات مع مؤشرات الأداء الحالية."
                  breadcrumbs={[{ label: 'الرئيسية' }]}
                  actions={
                    <>
                      <Button variant="secondary" size="sm" onClick={() => navigate('/alerts')}>
                        جميع التنبيهات
                      </Button>
                      <Button size="sm" onClick={() => navigate('/reports')} className="bg-[#000000ed] hover:bg-primary-600">
                        التقارير
                      </Button>
                    </>
                  }
                  className="mb-0"
                />
              </div>

              <div className="mb-2 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="عدد المؤسسات"
                  value={totalCompaniesCount}
                  trendLabel="مؤسسة مسجلة"
                  icon={<Building2 className="h-5 w-5" />}
                  accent="success"
                  onClick={() => navigate('/companies')}
                />
                <StatCard
                  title="عدد الموظفين"
                  value={totalEmployeesCount}
                  trendLabel="موظف مسجل"
                  icon={<Users className="h-5 w-5" />}
                  accent="info"
                  onClick={() => navigate('/employees')}
                />
                <StatCard
                  title="تنبيهات المؤسسات"
                  value={companyUrgentAndHighAlerts}
                  trendLabel="طارئة وعاجلة"
                  icon={<AlertTriangle className="h-5 w-5" />}
                  accent="warning"
                  onClick={() => navigate('/alerts?tab=companies')}
                />
                <StatCard
                  title="تنبيهات الموظفين"
                  value={employeeUrgentAndHighAlerts}
                  trendLabel="طارئة وعاجلة"
                  icon={<Bell className="h-5 w-5" />}
                  accent="danger"
                  onClick={() => navigate('/alerts?tab=employees')}
                />
              </div>

              <div className="mb-2 grid grid-cols-1 gap-4 md:grid-cols-3">
                <MetricCard
                  title="معدل الاستفادة"
                  value={`${stats.utilizationRate}%`}
                  subtitle="من السعة المتاحة"
                  trend={stats.utilizationRate >= 75 ? 4 : -3}
                  icon={<TrendingUp className="h-4 w-4" />}
                />
                <MetricCard
                  title="أماكن شاغرة"
                  value={stats.totalAvailableSlots.toString()}
                  subtitle="مكان متاح للإضافة"
                  icon={<MapPin className="h-4 w-4" />}
                />
                <MetricCard
                  title="متوسط الموظفين"
                  value={(stats.totalCompanies > 0
                    ? Math.round(stats.totalEmployees / stats.totalCompanies)
                    : 0
                  ).toString()}
                  subtitle="لكل مؤسسة"
                  icon={<Users className="h-4 w-4" />}
                />
              </div>

              {/* نظام التبويبات */}
              <div className="app-panel mb-3">
                {/* شريط التبويبات */}
                <div className="flex border-b border-border">
                  <button
                    onClick={() => setActiveTab('companies')}
                    className={`app-tab-button text-xs ${
                      activeTab === 'companies'
                        ? 'app-tab-button-active'
                        : 'hover:bg-surface-secondary hover:text-foreground'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>المؤسسات</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('employees')}
                    className={`app-tab-button text-xs ${
                      activeTab === 'employees'
                        ? 'app-tab-button-active'
                        : 'hover:bg-surface-secondary hover:text-foreground'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>الموظفين</span>
                  </button>
                </div>

                {/* محتوى التبويبات */}
                <div className="p-3">
                  {activeTab === 'companies' ? (
                    <DashboardCompaniesTab
                      stats={stats}
                      companyThresholds={companyThresholds}
                      companies={companies}
                      employees={employees}
                    />
                  ) : (
                    <DashboardEmployeesTab
                      stats={stats}
                      employeeThresholds={employeeThresholds}
                      employees={employees}
                      companies={companies}
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </Layout>
  )
}
