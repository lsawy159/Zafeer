import { useEffect, useMemo, useState } from 'react'
import { supabase, Employee, Company } from '@/lib/supabase'
import { AlertCard, Alert } from '@/components/alerts/AlertCard'
import { EmployeeAlertCard, EmployeeAlert } from '@/components/alerts/EmployeeAlertCard'
import { generateCompanyAlertsSync, getAlertsStats, filterAlertsByPriority } from '@/utils/alerts'
import {
  generateEmployeeAlerts,
  enrichEmployeeAlertsWithCompanyData,
  getEmployeeAlertsStats,
  filterEmployeeAlertsByPriority,
} from '@/utils/employeeAlerts'
import { normalizeArabic } from '@/utils/textUtils'
import { Bell, AlertTriangle, Building2, Users, X, CheckCircle2, Mail } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import CompanyCard from '@/components/companies/CompanyCard'
import CompanyModal from '@/components/companies/CompanyModal'
import EmployeeCard from '@/components/employees/EmployeeCard'
import { usePermissions } from '@/utils/permissions'
import { PageHeader } from '@/components/ui/PageHeader'
import { FilterBar } from '@/components/ui/FilterBar'
import { SearchInput } from '@/components/ui/SearchInput'
import { Button } from '@/components/ui/Button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'

interface AlertsProps {
  initialTab?: 'companies' | 'employees' | 'all'
  initialFilter?: 'all' | 'urgent' | 'high' | 'medium' | 'low'
}

type AlertPriority = Alert['priority']
type AlertSortField = 'priority' | 'entity_name' | 'days_remaining'
type SortDirection = 'asc' | 'desc'

const PRIORITY_OPTIONS: Array<{ value: AlertPriority; label: string }> = [
  { value: 'urgent', label: 'طارئ' },
  { value: 'high', label: 'عالي' },
  { value: 'medium', label: 'متوسط' },
  { value: 'low', label: 'خفيف' },
]

const PRIORITY_LABELS: Record<AlertPriority, string> = {
  urgent: 'طارئ',
  high: 'عالي',
  medium: 'متوسط',
  low: 'خفيف',
}

const ALERT_SORT_FIELDS: Array<{ value: AlertSortField; label: string }> = [
  { value: 'priority', label: 'الأولوية' },
  { value: 'entity_name', label: 'اسم الكيان' },
  { value: 'days_remaining', label: 'الأيام المتبقية' },
]

const ALERT_SORT_DIRECTIONS: Array<{ value: SortDirection; label: string }> = [
  { value: 'desc', label: 'تنازلي' },
  { value: 'asc', label: 'تصاعدي' },
]

const PRIORITY_ORDER: Record<AlertPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
}

function getInitialPriorityFilter(initialFilter: AlertsProps['initialFilter']) {
  return initialFilter && initialFilter !== 'all' ? [initialFilter] : []
}

function getPriorityFilterLabel(selected: AlertPriority[]) {
  if (selected.length === 0) {
    return 'جميع الأولويات'
  }

  if (selected.length === PRIORITY_OPTIONS.length) {
    return 'جميع الأولويات'
  }

  if (selected.length <= 2) {
    return selected.map((priority) => PRIORITY_LABELS[priority]).join('، ')
  }

  return `${selected.length} أولويات مختارة`
}

function compareAlerts<T extends { priority: AlertPriority; days_remaining?: number }>(
  left: T,
  right: T,
  sortField: AlertSortField,
  sortDirection: SortDirection,
  getEntityName: (value: T) => string
) {
  const directionFactor = sortDirection === 'asc' ? 1 : -1

  if (sortField === 'priority') {
    return (PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority]) * directionFactor
  }

  if (sortField === 'entity_name') {
    const nameLeft = getEntityName(left).trim()
    const nameRight = getEntityName(right).trim()

    if (!nameLeft && !nameRight) return 0
    if (!nameLeft) return 1
    if (!nameRight) return -1

    return nameLeft.localeCompare(nameRight, 'ar', { sensitivity: 'base' }) * directionFactor
  }

  const daysLeft = left.days_remaining
  const daysRight = right.days_remaining

  if (daysLeft == null && daysRight == null) return 0
  if (daysLeft == null) return 1
  if (daysRight == null) return -1

  return (daysLeft - daysRight) * directionFactor
}

export default function Alerts({ initialTab = 'all', initialFilter = 'all' }: AlertsProps) {
  const { canView } = usePermissions()
  // Reserved for future use: employees state
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [employees, setEmployees] = useState<Employee[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [companyAlerts, setCompanyAlerts] = useState<Alert[]>([])
  const [employeeAlerts, setEmployeeAlerts] = useState<EmployeeAlert[]>([])
  const [readAlerts, setReadAlerts] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'companies' | 'employees' | 'all'>(initialTab)

  // [NEW] تبويب لـ "جديد" و "مقروء"
  const [readFilterTab, setReadFilterTab] = useState<'new' | 'read'>('new')
  const [alertStatusFilter, setAlertStatusFilter] = useState<'all' | 'active' | 'expired'>('all')

  const [activeFilter, setActiveFilter] = useState<AlertPriority[]>(() =>
    getInitialPriorityFilter(initialFilter)
  )
  const [alertSortField, setAlertSortField] = useState<AlertSortField>('priority')
  const [alertSortDir, setAlertSortDir] = useState<SortDirection>('desc')
  const [searchTerm, setSearchTerm] = useState('')
  const [showCompanyCard, setShowCompanyCard] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showEmployeeCard, setShowEmployeeCard] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<
    (Employee & { company: Company }) | null
  >(null)
  const navigate = useNavigate()
  const togglePriorityFilter = (priority: AlertPriority) => {
    setActiveFilter((current) =>
      current.includes(priority)
        ? current.filter((item) => item !== priority)
        : [...current, priority]
    )
  }

  const clearPriorityFilter = () => {
    setActiveFilter([])
  }
  // شبكة خاصة بكروت التنبيهات - أعرض من الكروت العادية لاستيعاب المحتوى
  const ALERT_GRID_CLASS = 'grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-3'

  useEffect(() => {
    fetchData()
    loadReadAlerts()
  }, [])

  // التحقق من صلاحية العرض - بعد جميع الـ hooks
  if (!canView('alerts')) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Bell className="w-16 h-16 mx-auto mb-4 text-danger-500" />
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">غير مصرح</h2>
            <p className="text-neutral-600">عذراً، ليس لديك صلاحية لعرض هذه الصفحة.</p>
          </div>
        </div>
      </Layout>
    )
  }

  // جلب التنبيهات المقروءة من قاعدة البيانات
  const loadReadAlerts = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('read_alerts')
        .select('alert_id')
        .eq('user_id', user.id)

      if (error) throw error

      const readAlertIds = new Set(data?.map((r) => r.alert_id) || [])
      setReadAlerts(readAlertIds)
    } catch (error) {
      console.error('خطأ في جلب التنبيهات المقروءة:', error)
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)

      // جلب الموظفين
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select(
          'id,company_id,name,profession,nationality,birth_date,phone,passport_number,residence_number,joining_date,contract_expiry,residence_expiry,project_name,bank_account,residence_image_url,salary,health_insurance_expiry,additional_fields,created_at,updated_at,notes,hired_worker_contract_expiry,project_id,is_deleted,deleted_at'
        )

      if (employeesError) throw employeesError

      // جلب المؤسسات
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select(
          'id,name,unified_number,labor_subscription_number,commercial_registration_expiry,social_insurance_expiry,ending_subscription_power_date,ending_subscription_moqeem_date,ending_subscription_insurance_date,commercial_registration_status,social_insurance_status,current_employees,max_employees,additional_fields,created_at,updated_at,notes,exemptions,social_insurance_number,company_type,employee_count'
        )

      if (companiesError) throw companiesError

      setEmployees(employeesData || [])
      setCompanies(companiesData || [])

      if (employeesData && companiesData) {
        // توليد تنبيهات المؤسسات
        const companyAlertsGenerated = await generateCompanyAlertsSync(companiesData)
        setCompanyAlerts(companyAlertsGenerated)

        // توليد تنبيهات الموظفين
        const employeeAlertsGenerated = await generateEmployeeAlerts(employeesData, companiesData)
        const enrichedEmployeeAlerts = enrichEmployeeAlertsWithCompanyData(
          employeeAlertsGenerated,
          companiesData
        )
        setEmployeeAlerts(enrichedEmployeeAlerts)
      }
    } catch (error) {
      console.error('خطأ في جلب البيانات:', error)
    } finally {
      setLoading(false)
    }
  }

  // Reserved for future use: handleViewCompany function
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleViewCompany = (companyId: string) => {
    navigate(`/companies?id=${companyId}`)
  }

  const handleShowCompanyCard = (companyId: string) => {
    const company = companies.find((c) => c.id === companyId)
    if (company) {
      setSelectedCompany(company)
      setShowCompanyCard(true)
    }
  }

  const handleViewEmployee = async (employeeId: string) => {
    try {
      // جلب بيانات الموظف من قاعدة البيانات
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select(
          'id,company_id,name,profession,nationality,birth_date,phone,passport_number,residence_number,joining_date,contract_expiry,residence_expiry,project_name,bank_account,residence_image_url,salary,health_insurance_expiry,additional_fields,created_at,updated_at,notes,hired_worker_contract_expiry,project_id,is_deleted,deleted_at'
        )
        .eq('id', employeeId)
        .single()

      if (employeeError) throw employeeError

      if (employeeData) {
        // جلب بيانات المؤسسة المرتبطة بالموظف
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select(
            'id,name,unified_number,labor_subscription_number,commercial_registration_expiry,social_insurance_expiry,ending_subscription_power_date,ending_subscription_moqeem_date,ending_subscription_insurance_date,commercial_registration_status,social_insurance_status,current_employees,max_employees,additional_fields,created_at,updated_at,notes,exemptions,social_insurance_number,company_type,employee_count'
          )
          .eq('id', employeeData.company_id)
          .single()

        if (companyError) throw companyError

        if (companyData) {
          // إعداد بيانات الموظف مع المؤسسة
          const employeeWithCompany = {
            ...employeeData,
            company: companyData,
          } as Employee & { company: Company }

          setSelectedEmployee(employeeWithCompany)
          setShowEmployeeCard(true)
        }
      }
    } catch (error) {
      console.error('خطأ في جلب بيانات الموظف:', error)
    }
  }

  const handleCloseEmployeeCard = () => {
    setShowEmployeeCard(false)
    setSelectedEmployee(null)
  }

  const handleUpdateEmployee = async () => {
    // إعادة جلب البيانات بعد التحديث
    await fetchData()
  }

  const handleEditCompany = (company: Company) => {
    setSelectedCompany(company)
    setShowEditModal(true)
    // إغلاق modal عرض المؤسسة عند فتح modal التعديل
    setShowCompanyCard(false)
  }

  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setSelectedCompany(null)
  }

  const handleEditModalSuccess = async () => {
    // إعادة جلب البيانات بعد التعديل
    await fetchData()
    // إعادة جلب بيانات المؤسسة المحددة لتحديثها
    if (selectedCompany) {
      const { data: updatedCompany, error } = await supabase
        .from('companies')
        .select(
          'id,name,unified_number,labor_subscription_number,commercial_registration_expiry,social_insurance_expiry,ending_subscription_power_date,ending_subscription_moqeem_date,ending_subscription_insurance_date,commercial_registration_status,social_insurance_status,current_employees,max_employees,additional_fields,created_at,updated_at,notes,exemptions,social_insurance_number,company_type,employee_count'
        )
        .eq('id', selectedCompany.id)
        .single()

      if (!error && updatedCompany) {
        setSelectedCompany(updatedCompany)
        // إعادة فتح modal عرض المؤسسة مع البيانات المحدثة
        setShowCompanyCard(true)
      }
    }
    // إغلاق modal التعديل
    setShowEditModal(false)
  }

  const handleMarkAsRead = async (alertId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        console.error('المستخدم غير مسجل دخول')
        return
      }

      // حفظ التنبيه كمقروء في قاعدة البيانات
      const { error } = await supabase.from('read_alerts').upsert(
        {
          user_id: user.id,
          alert_id: alertId,
          read_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,alert_id',
        }
      )

      if (error) throw error

      // تحديث حالة التنبيه محلياً
      setReadAlerts((prev) => new Set([...prev, alertId]))
    } catch (error) {
      console.error('خطأ في حفظ التنبيه كمقروء:', error)
    }
  }

  // [NEW] دالة لتمييز كل التنبيهات "الجديدة" كمقروءة
  const handleMarkAllAsRead = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        console.error('المستخدم غير مسجل دخول')
        return
      }

      // 1. جمع كل الـ IDs غير المقروءة
      const unreadCompanyAlertIds = companyAlerts
        .filter((alert) => !readAlerts.has(alert.id))
        .map((alert) => alert.id)

      const unreadEmployeeAlertIds = employeeAlerts
        .filter((alert) => !readAlerts.has(alert.id))
        .map((alert) => alert.id)

      const allUnreadIds = [...unreadCompanyAlertIds, ...unreadEmployeeAlertIds]

      if (allUnreadIds.length === 0) return

      // 2. تحضير السجلات للإرسال
      const recordsToUpsert = allUnreadIds.map((alertId) => ({
        user_id: user.id,
        alert_id: alertId,
        read_at: new Date().toISOString(),
      }))

      // 3. إرسالها إلى قاعدة البيانات
      const { error } = await supabase.from('read_alerts').upsert(recordsToUpsert, {
        onConflict: 'user_id,alert_id',
      })

      if (error) throw error

      // 4. تحديث الحالة المحلية
      setReadAlerts((prev) => new Set([...prev, ...allUnreadIds]))
    } catch (error) {
      console.error('خطأ في حفظ جميع التنبيهات كمقروءة:', error)
    }
  }

  // دالة لإعادة تنبيه واحد إلى غير مقروء
  const handleMarkAsUnread = async (alertId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        console.error('المستخدم غير مسجل دخول')
        return
      }

      // حذف السجل من جدول read_alerts
      const { error } = await supabase
        .from('read_alerts')
        .delete()
        .eq('user_id', user.id)
        .eq('alert_id', alertId)

      if (error) throw error

      // تحديث حالة التنبيه محلياً
      setReadAlerts((prev) => {
        const newSet = new Set(prev)
        newSet.delete(alertId)
        return newSet
      })
    } catch (error) {
      console.error('خطأ في إعادة التنبيه إلى غير مقروء:', error)
    }
  }

  // دالة لإعادة جميع التنبيهات المقروءة إلى غير مقروءة
  const handleMarkAllAsUnread = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        console.error('المستخدم غير مسجل دخول')
        return
      }

      // 1. جمع كل الـ IDs المقروءة
      const readCompanyAlertIds = companyAlerts
        .filter((alert) => readAlerts.has(alert.id))
        .map((alert) => alert.id)

      const readEmployeeAlertIds = employeeAlerts
        .filter((alert) => readAlerts.has(alert.id))
        .map((alert) => alert.id)

      const allReadIds = [...readCompanyAlertIds, ...readEmployeeAlertIds]

      if (allReadIds.length === 0) return

      // 2. حذف جميع السجلات المقروءة من قاعدة البيانات
      const { error } = await supabase
        .from('read_alerts')
        .delete()
        .eq('user_id', user.id)
        .in('alert_id', allReadIds)

      if (error) throw error

      // 3. تحديث الحالة المحلية
      setReadAlerts(new Set())
    } catch (error) {
      console.error('خطأ في إعادة جميع التنبيهات إلى غير مقروءة:', error)
    }
  }

  // إحصائيات التنبيهات (فقط غير المقروءة و urgent/high) - هذه خاصة بالصفحة الداخلية
  const unreadCompanyAlerts = companyAlerts.filter(
    (alert) =>
      !readAlerts.has(alert.id) && (alert.priority === 'urgent' || alert.priority === 'high')
  )
  const unreadEmployeeAlerts = employeeAlerts.filter(
    (alert) =>
      !readAlerts.has(alert.id) && (alert.priority === 'urgent' || alert.priority === 'high')
  )

  const companyAlertsStats = getAlertsStats(unreadCompanyAlerts)
  const employeeAlertsStats = getEmployeeAlertsStats(unreadEmployeeAlerts)
  const totalAlerts = companyAlertsStats.total + employeeAlertsStats.total
  const totalUrgentAlerts = companyAlertsStats.urgent + employeeAlertsStats.urgent

  // [MODIFIED] فلترة التنبيهات بناءً على التبويب "جديد" أو "مقروء"

  // [NEW] حساب عدد المقروءة (لأجل تبويب "مقروء")
  const normalizedSearchTerm = normalizeArabic(searchTerm).trim().toLowerCase()

  const filteredCompanyAlerts = useMemo(() => {
    let filtered = companyAlerts.filter(
      (alert) => alert.priority === 'urgent' || alert.priority === 'high'
    )

    if (alertStatusFilter !== 'all') {
      filtered = filtered.filter((alert) =>
        alertStatusFilter === 'expired'
          ? (alert.days_remaining ?? 0) <= 0
          : (alert.days_remaining ?? 0) > 0
      )
    }

    if (activeFilter.length > 0) {
      filtered = filterAlertsByPriority(filtered, activeFilter)
    }

    if (normalizedSearchTerm) {
      filtered = filtered.filter(
        (alert) =>
          normalizeArabic(alert.company.name).toLowerCase().includes(normalizedSearchTerm) ||
          normalizeArabic(alert.title).toLowerCase().includes(normalizedSearchTerm)
      )
    }

    if (readFilterTab === 'new') {
      filtered = filtered.filter((alert) => !readAlerts.has(alert.id))
    } else {
      filtered = filtered.filter((alert) => readAlerts.has(alert.id))
    }

    return [...filtered].sort((left, right) =>
      compareAlerts(left, right, alertSortField, alertSortDir, (alert) => alert.company.name)
    )
  }, [
    companyAlerts,
    alertStatusFilter,
    activeFilter,
    normalizedSearchTerm,
    readFilterTab,
    readAlerts,
    alertSortField,
    alertSortDir,
  ])

  const filteredEmployeeAlerts = useMemo(() => {
    let filtered = employeeAlerts.filter(
      (alert) => alert.priority === 'urgent' || alert.priority === 'high'
    )

    if (alertStatusFilter !== 'all') {
      filtered = filtered.filter((alert) =>
        alertStatusFilter === 'expired'
          ? (alert.days_remaining ?? 0) <= 0
          : (alert.days_remaining ?? 0) > 0
      )
    }

    if (activeFilter.length > 0) {
      filtered = filterEmployeeAlertsByPriority(filtered, activeFilter)
    }

    if (normalizedSearchTerm) {
      filtered = filtered.filter(
        (alert) =>
          normalizeArabic(alert.employee.name).toLowerCase().includes(normalizedSearchTerm) ||
          normalizeArabic(alert.company.name).toLowerCase().includes(normalizedSearchTerm) ||
          normalizeArabic(alert.title).toLowerCase().includes(normalizedSearchTerm)
      )
    }

    if (readFilterTab === 'new') {
      filtered = filtered.filter((alert) => !readAlerts.has(alert.id))
    } else {
      filtered = filtered.filter((alert) => readAlerts.has(alert.id))
    }

    return [...filtered].sort((left, right) =>
      compareAlerts(left, right, alertSortField, alertSortDir, (alert) => alert.employee.name)
    )
  }, [
    employeeAlerts,
    alertStatusFilter,
    activeFilter,
    normalizedSearchTerm,
    readFilterTab,
    readAlerts,
    alertSortField,
    alertSortDir,
  ])

  const readCompanyAlertsCount = companyAlerts.filter((alert) => readAlerts.has(alert.id)).length
  const readEmployeeAlertsCount = employeeAlerts.filter((alert) => readAlerts.has(alert.id)).length
  const totalReadAlerts = readCompanyAlertsCount + readEmployeeAlertsCount

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="app-page app-tech-grid">
        <PageHeader
          title="التنبيهات"
          description={`عرض ذكي للتنبيهات بحسب الأولوية وحالة القراءة. الحالي: ${totalAlerts} جديد و ${totalReadAlerts} مقروء.`}
          breadcrumbs={[{ label: 'الرئيسية', href: '/dashboard' }, { label: 'التنبيهات' }]}
          className="mb-6"
        />

        {/* إحصائيات سريعة (تبقى كما هي، تعرض غير المقروء فقط لهذه الصفحة) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
          <div className="app-panel p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-tertiary mb-1">إجمالي التنبيهات</p>
                <p className="text-3xl font-bold text-foreground">{totalAlerts}</p>
              </div>
              <div className="app-icon-chip">
                <Bell className="w-7 h-7" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 mb-1">تنبيهات طارئة وعاجلة</p>
                <p className="text-3xl font-bold text-red-600">{totalUrgentAlerts}</p>
              </div>
              <div className="rounded-xl bg-red-100 p-3 text-red-600">
                <AlertTriangle className="w-7 h-7" />
              </div>
            </div>
          </div>

          <div className="app-panel p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-tertiary mb-1">تنبيهات المؤسسات</p>
                <p className="text-3xl font-bold text-foreground">{companyAlertsStats.total}</p>
              </div>
              <div className="app-icon-chip">
                <Building2 className="w-7 h-7" />
              </div>
            </div>
          </div>

          <div className="app-panel p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-tertiary mb-1">تنبيهات الموظفين</p>
                <p className="text-3xl font-bold text-foreground">{employeeAlertsStats.total}</p>
              </div>
              <div className="rounded-xl bg-surface-secondary p-3 text-foreground-secondary">
                <Users className="w-7 h-7" />
              </div>
            </div>
          </div>
        </div>

        {/* فلاتر البحث والتنقل */}
        <div className="app-panel mb-8 p-6">
          {/* تبويبات (المؤسسات / الموظفين) */}
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="app-toggle-shell w-fit">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  activeTab === 'all' ? 'app-tab-button-active' : 'app-tab-button'
                }`}
              >
                الكل ({totalAlerts})
              </button>
              <button
                onClick={() => setActiveTab('companies')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  activeTab === 'companies' ? 'app-tab-button-active' : 'app-tab-button'
                }`}
              >
                المؤسسات ({companyAlertsStats.total})
              </button>
              <button
                onClick={() => setActiveTab('employees')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  activeTab === 'employees' ? 'app-tab-button-active' : 'app-tab-button'
                }`}
              >
                الموظفين ({employeeAlertsStats.total})
              </button>
            </div>

            {/* البحث والفلاتر */}
            <FilterBar>
              <SearchInput
                type="text"
                placeholder="البحث في التنبيهات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                wrapperClassName="min-w-[220px] flex-1"
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" className="justify-between min-w-[180px]">
                    <span className="truncate">الأولويات: {getPriorityFilterLabel(activeFilter)}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" sideOffset={8} className="w-56">
                  <DropdownMenuLabel>اختر الأولويات</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => clearPriorityFilter()}>
                    جميع الأولويات
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {PRIORITY_OPTIONS.map((option) => (
                    <DropdownMenuCheckboxItem
                      key={option.value}
                      checked={activeFilter.includes(option.value)}
                      onCheckedChange={() => togglePriorityFilter(option.value)}
                      onSelect={(event) => event.preventDefault()}
                    >
                      {option.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Select
                value={alertStatusFilter}
                onValueChange={(value) => setAlertStatusFilter(value as typeof alertStatusFilter)}
              >
                <SelectTrigger className="min-w-[160px]">
                  <SelectValue placeholder="حالة التنبيه" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="expired">منتهي</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={alertSortField}
                onValueChange={(value) => setAlertSortField(value as AlertSortField)}
              >
                <SelectTrigger className="min-w-[180px]">
                  <SelectValue placeholder="اختر الترتيب" />
                </SelectTrigger>
                <SelectContent>
                  {ALERT_SORT_FIELDS.map((field) => (
                    <SelectItem key={field.value} value={field.value}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={alertSortDir}
                onValueChange={(value) => setAlertSortDir(value as SortDirection)}
              >
                <SelectTrigger className="min-w-[140px]">
                  <SelectValue placeholder="اتجاه" />
                </SelectTrigger>
                <SelectContent>
                  {ALERT_SORT_DIRECTIONS.map((direction) => (
                    <SelectItem key={direction.value} value={direction.value}>
                      {direction.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterBar>
          </div>

          {/* [NEW] تبويبات (جديد / مقروء) */}
          <div className="border-t border-neutral-200 pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="app-toggle-shell w-full sm:w-auto">
                <button
                  onClick={() => setReadFilterTab('new')}
                  className={`px-6 py-2 rounded-md font-medium transition-colors w-1/2 sm:w-auto ${
                    readFilterTab === 'new' ? 'app-toggle-button-active' : 'app-toggle-button'
                  }`}
                >
                  تنبيهات جديدة ({totalAlerts})
                </button>
                <button
                  onClick={() => setReadFilterTab('read')}
                  className={`px-6 py-2 rounded-md font-medium transition-colors w-1/2 sm:w-auto ${
                    readFilterTab === 'read' ? 'app-toggle-button-active' : 'app-toggle-button'
                  }`}
                >
                  مقروءة ({totalReadAlerts})
                </button>
              </div>

              {/* [NEW] زر تم الاطلاع على الكل */}
              {readFilterTab === 'new' && totalAlerts > 0 && (
                <Button onClick={handleMarkAllAsRead} variant="default">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>تم الاطلاع على الكل</span>
                </Button>
              )}

              {/* [NEW] زر إعادة الكل إلى غير مقروء */}
              {readFilterTab === 'read' && totalReadAlerts > 0 && (
                <Button onClick={handleMarkAllAsUnread} variant="secondary">
                  <Mail className="w-5 h-5" />
                  <span>إعادة الكل إلى غير مقروء</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* عرض التنبيهات (مقسّمة الآن) */}
        <div className="space-y-8">
          {/* تنبيهات المؤسسات */}
          {(activeTab === 'all' || activeTab === 'companies') &&
            filteredCompanyAlerts.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Building2 className="w-6 h-6 text-primary" />
                  <h2 className="text-xl font-bold text-neutral-900">تنبيهات المؤسسات</h2>
                  <span className="rounded-full bg-primary/15 px-2 py-1 text-sm font-medium text-foreground">
                    {filteredCompanyAlerts.length}
                  </span>
                </div>
                <div className={ALERT_GRID_CLASS}>
                  {filteredCompanyAlerts.map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      onShowCompanyCard={handleShowCompanyCard}
                      onMarkAsRead={handleMarkAsRead}
                      onMarkAsUnread={handleMarkAsUnread}
                      isRead={readAlerts.has(alert.id)} // [MODIFIED] تمرير حالة القراءة للبطاقة
                    />
                  ))}
                </div>
              </div>
            )}

          {/* تنبيهات الموظفين */}
          {(activeTab === 'all' || activeTab === 'employees') &&
            filteredEmployeeAlerts.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Users className="w-6 h-6 text-foreground-secondary" />
                  <h2 className="text-xl font-bold text-neutral-900">تنبيهات الموظفين</h2>
                  <span className="rounded-full bg-surface-secondary px-2 py-1 text-sm font-medium text-foreground-secondary">
                    {filteredEmployeeAlerts.length}
                  </span>
                </div>
                <div className={ALERT_GRID_CLASS}>
                  {filteredEmployeeAlerts.map((alert) => (
                    <EmployeeAlertCard
                      key={alert.id}
                      alert={alert}
                      onViewEmployee={handleViewEmployee}
                      onMarkAsRead={handleMarkAsRead}
                      onMarkAsUnread={handleMarkAsUnread}
                      isRead={readAlerts.has(alert.id)} // [MODIFIED] تمرير حالة القراءة للبطاقة
                    />
                  ))}
                </div>
              </div>
            )}

          {/* لا توجد نتائج */}
          {filteredCompanyAlerts.length === 0 && filteredEmployeeAlerts.length === 0 && (
            <div className="bg-surface rounded-xl shadow-sm border border-neutral-200 p-12 text-center">
              <Bell className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
              <h3 className="text-lg font-medium text-neutral-900 mb-2">
                {searchTerm
                  ? 'لا توجد نتائج'
                  : readFilterTab === 'new'
                    ? 'لا توجد تنبيهات جديدة'
                    : 'لا توجد تنبيهات مقروءة'}
              </h3>
              <p className="text-neutral-600">
                {searchTerm
                  ? `لم يتم العثور على تنبيهات تحتوي على "${searchTerm}"`
                  : readFilterTab === 'new'
                    ? 'جميع مؤسساتك وموظفيك محدثون ولا يحتاجون إلى إجراءات فورية'
                    : 'لم تقم بالاطلاع على أي تنبيهات بعد'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* كارت المؤسسة المنبثق (لا تغيير) */}
      {showCompanyCard && selectedCompany && (
        <div
          className="fixed inset-0 z-[100] bg-foreground/55 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowCompanyCard(false)}
        >
          <div className="app-modal-surface max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
            {/* Header */}
            <div className="app-modal-header flex items-center justify-between px-6 py-4">
              <h2 className="text-xl font-bold text-neutral-900">تفاصيل المؤسسة</h2>
              <Button onClick={() => setShowCompanyCard(false)} variant="ghost" size="icon">
                <X className="w-6 h-6 text-neutral-500" />
              </Button>
            </div>

            {/* Company Card */}
            <div className="p-6">
              <CompanyCard
                company={{
                  ...selectedCompany,
                  employee_count: 0,
                  available_slots: 0,
                  max_employees: selectedCompany.max_employees || 4,
                }}
                onEdit={handleEditCompany}
                onDelete={() => {}} // يمكن إضافة وظيفة حذف إذا لزم الأمر
                getAvailableSlotsColor={(slots) =>
                  slots > 0 ? 'text-success-600' : 'text-red-600'
                }
                getAvailableSlotsTextColor={(slots) =>
                  slots > 0 ? 'text-success-600' : 'text-red-600'
                }
                getAvailableSlotsText={(slots) => `متاح: ${slots} أماكن`}
              />
            </div>
          </div>
        </div>
      )}

      {/* كارت الموظف المنبثق */}
      {showEmployeeCard && selectedEmployee && (
        <EmployeeCard
          employee={selectedEmployee}
          onClose={handleCloseEmployeeCard}
          onUpdate={handleUpdateEmployee}
        />
      )}

      {/* Modal تعديل المؤسسة */}
      {showEditModal && (
        <CompanyModal
          isOpen={showEditModal}
          company={selectedCompany}
          onClose={handleCloseEditModal}
          onSuccess={handleEditModalSuccess}
        />
      )}
    </Layout>
  )
}
