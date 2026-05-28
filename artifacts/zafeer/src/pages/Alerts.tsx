import { useEffect, useMemo, useState } from 'react'
import { supabase, Employee, Company } from '@/lib/supabase'
import { type ReactNode } from 'react'
import { AlertCard, Alert } from '@/components/alerts/AlertCard'
import { EmployeeAlertCard, EmployeeAlert } from '@/components/alerts/EmployeeAlertCard'
import { AlertSnoozeModal } from '@/components/alerts/AlertSnoozeModal'
import { generateCompanyAlertsSync, getAlertsStats, filterAlertsByPriority } from '@/utils/alerts'
import {
  generateEmployeeAlerts,
  enrichEmployeeAlertsWithCompanyData,
  getEmployeeAlertsStats,
  filterEmployeeAlertsByPriority,
  getEmployeeNotificationThresholdsPublic,
  DEFAULT_EMPLOYEE_THRESHOLDS as DEFAULT_EMPLOYEE_NOTIFICATION_THRESHOLDS,
} from '@/utils/employeeAlerts'
import { normalizeArabic } from '@/utils/textUtils'
import { formatDateShortWithHijri } from '@/utils/dateFormatter'
import { HijriDateDisplay } from '@/components/ui/HijriDateDisplay'
import {
  Bell,
  AlertTriangle,
  Building2,
  Users,
  X,
  CheckCircle2,
  Mail,
  ArrowUpDown,
  Clock,
  List,
  LayoutGrid,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import CompanyCard from '@/components/companies/CompanyCard'
import CompanyModal from '@/components/companies/CompanyModal'
import EmployeeCard from '@/components/employees/EmployeeCard'
import { usePermissions } from '@/utils/permissions'
import { useAlertsStats } from '@/hooks/useAlertsStats'
import { useSnoozedAlerts } from '@/hooks/useSnoozedAlerts'
import { PageHeader } from '@/components/ui/PageHeader'
import { FilterBar } from '@/components/ui/FilterBar'
import { SearchInput } from '@/components/ui/SearchInput'
import { Button } from '@/components/ui/Button'
import {
  DEFAULT_EXPIRED_INCLUSION,
  getExpiredInclusionSettings,
  type ExpiredInclusionSettings,
} from '@/utils/expiredInclusionSettings'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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
  initialTab?: 'companies' | 'employees' | 'all' | 'deferred'
  initialFilter?: 'all' | 'urgent' | 'high' | 'medium' | 'low'
}

type AlertPriority = Alert['priority']
type AlertSortField = 'priority' | 'entity_name' | 'days_remaining'
type SortDirection = 'asc' | 'desc'
type AlertsCardFilter =
  | 'منتهي'
  | 'طارئ'
  | 'عاجل'
  | 'متوسط'
  | 'companies'
  | 'employees'
  | 'مؤجلة'
  | null

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

const PRIORITY_ORDER: Record<AlertPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
}

const PRIORITY_BADGE: Record<AlertPriority, ReactNode> = {
  urgent: (
    <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
      طارئ
    </span>
  ),
  high: (
    <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
      عاجل
    </span>
  ),
  medium: (
    <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
      متوسط
    </span>
  ),
  low: (
    <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
      خفيف
    </span>
  ),
}

type AlertTableRow =
  | { kind: 'company'; alert: Alert }
  | { kind: 'employee'; alert: EmployeeAlert }

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
  const { refreshStats } = useAlertsStats()
  const {
    snoozedAlertIds,
    snoozedAlertsById,
    unsnoozeAlert,
    refreshSnoozedAlerts,
  } = useSnoozedAlerts()
  // Reserved for future use: employees state
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [employees, setEmployees] = useState<Employee[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [companyAlerts, setCompanyAlerts] = useState<Alert[]>([])
  const [employeeAlerts, setEmployeeAlerts] = useState<EmployeeAlert[]>([])
  const [readAlerts, setReadAlerts] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'companies' | 'employees' | 'all' | 'deferred'>(
    initialTab
  )

  // [NEW] تبويب لـ "جديد" و "مقروء"
  const [readFilterTab, setReadFilterTab] = useState<'new' | 'read'>('new')
  const [alertStatusFilter, setAlertStatusFilter] = useState<'all' | 'active' | 'expired'>('all')
  const [cardFilter, setCardFilter] = useState<AlertsCardFilter>(null)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [thresholds, setThresholds] = useState(DEFAULT_EMPLOYEE_NOTIFICATION_THRESHOLDS)

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
  const [snoozeTarget, setSnoozeTarget] = useState<Alert | EmployeeAlert | null>(null)
  const [expiredInclusion, setExpiredInclusion] = useState<ExpiredInclusionSettings>(
    DEFAULT_EXPIRED_INCLUSION
  )
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

  useEffect(() => {
    void getExpiredInclusionSettings().then(setExpiredInclusion)
  }, [])

  useEffect(() => {
    void getEmployeeNotificationThresholdsPublic().then(setThresholds)
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

  const handleOpenSnooze = (alertId: string) => {
    const companyAlert = companyAlerts.find((alert) => alert.id === alertId)
    if (companyAlert) {
      setSnoozeTarget(companyAlert)
      return
    }

    const employeeAlert = employeeAlerts.find((alert) => alert.id === alertId)
    if (employeeAlert) {
      setSnoozeTarget(employeeAlert)
    }
  }

  const handleUnsnooze = async (alertId: string) => {
    try {
      await unsnoozeAlert(alertId)
      refreshStats()
    } catch (error) {
      console.error('خطأ في إلغاء التأجيل:', error)
    }
  }

  // إحصائيات التنبيهات (فقط غير المقروءة و urgent/high) - هذه خاصة بالصفحة الداخلية
  const includeExpiredAlerts = expiredInclusion.include_in_alerts
  const visibleCompanyAlerts = (includeExpiredAlerts ? companyAlerts : companyAlerts.filter(
    (alert) =>
      alert.days_remaining === undefined ||
      alert.days_remaining === null ||
      alert.days_remaining >= 0
  )).filter((alert) => !snoozedAlertIds.has(alert.id))
  const visibleEmployeeAlerts = (includeExpiredAlerts ? employeeAlerts : employeeAlerts.filter(
    (alert) =>
      alert.days_remaining === undefined ||
      alert.days_remaining === null ||
      alert.days_remaining >= 0
  )).filter((alert) => !snoozedAlertIds.has(alert.id))
  const deferredCompanyAlerts = companyAlerts.filter((alert) => snoozedAlertIds.has(alert.id))
  const deferredEmployeeAlerts = employeeAlerts.filter((alert) => snoozedAlertIds.has(alert.id))

  const unreadCompanyAlerts = visibleCompanyAlerts.filter(
    (alert) =>
      !readAlerts.has(alert.id) && (alert.priority === 'urgent' || alert.priority === 'high')
  )
  const unreadEmployeeAlerts = visibleEmployeeAlerts.filter(
    (alert) =>
      !readAlerts.has(alert.id) && (alert.priority === 'urgent' || alert.priority === 'high')
  )

  const statsCompanyAlerts = includeExpiredAlerts
    ? unreadCompanyAlerts
    : unreadCompanyAlerts.filter(
        (alert) =>
          alert.days_remaining === undefined ||
          alert.days_remaining === null ||
          alert.days_remaining >= 0
      )
  const statsEmployeeAlerts = includeExpiredAlerts
    ? unreadEmployeeAlerts
    : unreadEmployeeAlerts.filter(
        (alert) =>
          alert.days_remaining === undefined ||
          alert.days_remaining === null ||
          alert.days_remaining >= 0
      )

  const companyAlertsStats = getAlertsStats(statsCompanyAlerts)
  const employeeAlertsStats = getEmployeeAlertsStats(statsEmployeeAlerts)
  const totalAlerts = companyAlertsStats.total + employeeAlertsStats.total
  const totalDeferredAlerts = deferredCompanyAlerts.length + deferredEmployeeAlerts.length
  const totalExpiredAlerts = [...visibleCompanyAlerts, ...visibleEmployeeAlerts].filter(
    (alert) => (alert.days_remaining ?? 0) < 0
  ).length
  const totalUrgentAlerts =
    visibleCompanyAlerts.filter(
      (alert) => alert.priority === 'urgent' && (alert.days_remaining ?? 0) >= 0
    ).length +
    visibleEmployeeAlerts.filter(
      (alert) => alert.priority === 'urgent' && (alert.days_remaining ?? 0) >= 0
    ).length
  const totalHighAlerts =
    visibleCompanyAlerts.filter((alert) => alert.priority === 'high').length +
    visibleEmployeeAlerts.filter((alert) => alert.priority === 'high').length
  const totalMediumAlerts =
    visibleCompanyAlerts.filter((alert) => alert.priority === 'medium').length +
    visibleEmployeeAlerts.filter((alert) => alert.priority === 'medium').length
  const maxUrgent = Math.max(
    thresholds.contract_urgent_days,
    thresholds.hired_worker_contract_urgent_days,
    thresholds.residence_urgent_days,
    thresholds.health_insurance_urgent_days
  )
  const maxHigh = Math.max(
    thresholds.contract_high_days,
    thresholds.hired_worker_contract_high_days,
    thresholds.residence_high_days,
    thresholds.health_insurance_high_days
  )
  const maxMedium = Math.max(
    thresholds.contract_medium_days,
    thresholds.hired_worker_contract_medium_days,
    thresholds.residence_medium_days,
    thresholds.health_insurance_medium_days
  )

  // [MODIFIED] فلترة التنبيهات بناءً على التبويب "جديد" أو "مقروء"

  // [NEW] حساب عدد المقروءة (لأجل تبويب "مقروء")
  const normalizedSearchTerm = normalizeArabic(searchTerm).trim().toLowerCase()

  const filteredCompanyAlerts = useMemo(() => {
    let filtered = visibleCompanyAlerts.filter((alert) => {
      if (cardFilter === 'employees') return false
      if (cardFilter === 'منتهي') return (alert.days_remaining ?? 0) < 0
      if (cardFilter === 'طارئ') {
        return alert.priority === 'urgent' && (alert.days_remaining ?? 0) >= 0
      }
      if (cardFilter === 'عاجل') return alert.priority === 'high'
      if (cardFilter === 'متوسط') return alert.priority === 'medium'
      return alert.priority === 'urgent' || alert.priority === 'high'
    })

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
    visibleCompanyAlerts,
    alertStatusFilter,
    cardFilter,
    activeFilter,
    normalizedSearchTerm,
    readFilterTab,
    readAlerts,
    alertSortField,
    alertSortDir,
  ])

  const filteredEmployeeAlerts = useMemo(() => {
    let filtered = visibleEmployeeAlerts.filter((alert) => {
      if (cardFilter === 'companies') return false
      if (cardFilter === 'منتهي') return (alert.days_remaining ?? 0) < 0
      if (cardFilter === 'طارئ') {
        return alert.priority === 'urgent' && (alert.days_remaining ?? 0) >= 0
      }
      if (cardFilter === 'عاجل') return alert.priority === 'high'
      if (cardFilter === 'متوسط') return alert.priority === 'medium'
      return alert.priority === 'urgent' || alert.priority === 'high'
    })

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
    visibleEmployeeAlerts,
    alertStatusFilter,
    cardFilter,
    activeFilter,
    normalizedSearchTerm,
    readFilterTab,
    readAlerts,
    alertSortField,
    alertSortDir,
  ])

  const filteredDeferredCompanyAlerts = useMemo(() => {
    let filtered = deferredCompanyAlerts.filter((alert) => {
      if (cardFilter === 'employees') return false
      if (cardFilter === 'منتهي') return (alert.days_remaining ?? 0) < 0
      if (cardFilter === 'طارئ') {
        return alert.priority === 'urgent' && (alert.days_remaining ?? 0) >= 0
      }
      if (cardFilter === 'عاجل') return alert.priority === 'high'
      if (cardFilter === 'متوسط') return alert.priority === 'medium'
      return alert.priority === 'urgent' || alert.priority === 'high'
    })

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

    return [...filtered].sort((left, right) =>
      compareAlerts(left, right, alertSortField, alertSortDir, (alert) => alert.company.name)
    )
  }, [
    deferredCompanyAlerts,
    alertStatusFilter,
    cardFilter,
    activeFilter,
    normalizedSearchTerm,
    alertSortField,
    alertSortDir,
  ])

  const filteredDeferredEmployeeAlerts = useMemo(() => {
    let filtered = deferredEmployeeAlerts.filter((alert) => {
      if (cardFilter === 'companies') return false
      if (cardFilter === 'منتهي') return (alert.days_remaining ?? 0) < 0
      if (cardFilter === 'طارئ') {
        return alert.priority === 'urgent' && (alert.days_remaining ?? 0) >= 0
      }
      if (cardFilter === 'عاجل') return alert.priority === 'high'
      if (cardFilter === 'متوسط') return alert.priority === 'medium'
      return alert.priority === 'urgent' || alert.priority === 'high'
    })

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

    return [...filtered].sort((left, right) =>
      compareAlerts(left, right, alertSortField, alertSortDir, (alert) => alert.employee.name)
    )
  }, [
    deferredEmployeeAlerts,
    alertStatusFilter,
    cardFilter,
    activeFilter,
    normalizedSearchTerm,
    alertSortField,
    alertSortDir,
  ])

  const alertTableRows: AlertTableRow[] = useMemo(() => {
    const companyRows =
      activeTab === 'all' || activeTab === 'companies'
        ? filteredCompanyAlerts.map((alert) => ({ kind: 'company' as const, alert }))
        : activeTab === 'deferred'
          ? filteredDeferredCompanyAlerts.map((alert) => ({ kind: 'company' as const, alert }))
        : []
    const employeeRows =
      activeTab === 'all' || activeTab === 'employees'
        ? filteredEmployeeAlerts.map((alert) => ({ kind: 'employee' as const, alert }))
        : activeTab === 'deferred'
          ? filteredDeferredEmployeeAlerts.map((alert) => ({ kind: 'employee' as const, alert }))
        : []

    return [...companyRows, ...employeeRows]
  }, [
    activeTab,
    filteredCompanyAlerts,
    filteredEmployeeAlerts,
    filteredDeferredCompanyAlerts,
    filteredDeferredEmployeeAlerts,
  ])

  const readCompanyAlertsCount = visibleCompanyAlerts.filter((alert) => readAlerts.has(alert.id)).length
  const readEmployeeAlertsCount = visibleEmployeeAlerts.filter((alert) => readAlerts.has(alert.id)).length
  const totalReadAlerts = readCompanyAlertsCount + readEmployeeAlertsCount
  const companyCardsToRender =
    activeTab === 'deferred' ? filteredDeferredCompanyAlerts : filteredCompanyAlerts
  const employeeCardsToRender =
    activeTab === 'deferred' ? filteredDeferredEmployeeAlerts : filteredEmployeeAlerts
  const alertSummaryCards = [
    {
      key: null as AlertsCardFilter,
      title: 'إجمالي التنبيهات',
      value: totalAlerts,
      label: '',
      accentClass: '',
      valueClass: 'text-foreground',
    },
    {
      key: 'منتهي' as AlertsCardFilter,
      title: 'منتهي',
      value: totalExpiredAlerts,
      label: 'أقل من 0 يوم',
      accentClass: 'border-red-500/20 bg-red-500/5',
      valueClass: 'text-red-600 dark:text-red-300',
    },
    {
      key: 'طارئ' as AlertsCardFilter,
      title: 'طارئ',
      value: totalUrgentAlerts,
      label: `0 - ${maxUrgent} يوم`,
      accentClass: 'border-red-500/20 bg-red-500/5',
      valueClass: 'text-red-600 dark:text-red-300',
    },
    {
      key: 'عاجل' as AlertsCardFilter,
      title: 'عاجل',
      value: totalHighAlerts,
      label: `${maxUrgent + 1} - ${maxHigh} يوم`,
      accentClass: 'border-orange-500/20 bg-orange-500/5',
      valueClass: 'text-orange-600 dark:text-orange-300',
    },
    {
      key: 'متوسط' as AlertsCardFilter,
      title: 'متوسط',
      value: totalMediumAlerts,
      label: `${maxHigh + 1} - ${maxMedium} يوم`,
      accentClass: 'border-yellow-500/20 bg-yellow-500/5',
      valueClass: 'text-yellow-600 dark:text-yellow-300',
    },
    {
      key: 'companies' as AlertsCardFilter,
      title: 'تنبيهات المؤسسات',
      value: companyAlertsStats.total,
      label: '',
      accentClass: '',
      valueClass: 'text-foreground',
    },
    {
      key: 'employees' as AlertsCardFilter,
      title: 'تنبيهات الموظفين',
      value: employeeAlertsStats.total,
      label: '',
      accentClass: '',
      valueClass: 'text-foreground',
    },
    {
      key: 'مؤجلة' as AlertsCardFilter,
      title: 'مؤجلة',
      value: totalDeferredAlerts,
      label: '',
      accentClass: 'border-amber-500/20 bg-amber-500/5',
      valueClass: 'text-amber-600 dark:text-amber-300',
    },
  ]

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
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8 mb-8">
          {alertSummaryCards.map((card) => {
            const isActive = card.key === null ? cardFilter === null : cardFilter === card.key
            const handleClick = () => {
              if (card.key === null) {
                setCardFilter(null)
                setActiveTab('all')
                return
              }

              const nextFilter = cardFilter === card.key ? null : card.key
              setCardFilter(nextFilter)

              if (card.key === 'companies' || card.key === 'employees') {
                setActiveTab(nextFilter === null ? 'all' : card.key)
              } else if (card.key === 'مؤجلة') {
                setActiveTab(nextFilter === null ? 'all' : 'deferred')
              }
            }

            return (
              <div
                key={String(card.key ?? 'all')}
                onClick={handleClick}
                className={`app-panel cursor-pointer px-2 py-2 text-center transition-shadow ${card.accentClass} ${
                  isActive ? 'ring-2 ring-offset-1 ring-primary shadow-md' : 'hover:shadow-sm'
                }`}
              >
                <div className="text-[10px] font-medium leading-4 text-foreground-secondary md:text-[11px]">
                  {card.title}
                </div>
                <div className={`text-base font-bold leading-none md:text-lg ${card.valueClass}`}>
                  {card.value.toLocaleString('en-US')}
                </div>
                <div className="text-[10px] leading-4 text-foreground-secondary md:text-[11px]">
                  {card.label}
                </div>
              </div>
            )
          })}
        </div>

        {/* فلاتر البحث والتنقل */}
        <div className="app-panel mb-8 v3-panel">
          <div className="v3-bar">
            {/* Entity type chips */}
            <div className="v3-chips">
              <button type="button" onClick={() => setActiveTab('all')} className={`v3-chip ${activeTab === 'all' ? 'v3-on' : ''}`}>الكل ({totalAlerts})</button>
              <button type="button" onClick={() => setActiveTab('companies')} className={`v3-chip ${activeTab === 'companies' ? 'v3-on' : ''}`}>مؤسسات ({companyAlertsStats.total})</button>
              <button type="button" onClick={() => setActiveTab('employees')} className={`v3-chip ${activeTab === 'employees' ? 'v3-on' : ''}`}>موظفين ({employeeAlertsStats.total})</button>
              <button type="button" onClick={() => setActiveTab('deferred')} className={`v3-chip ${activeTab === 'deferred' ? 'v3-on' : ''}`}>مؤجلة ({totalDeferredAlerts})</button>
            </div>

            {/* Read/New chips */}
            <div className="v3-chips">
              <button type="button" onClick={() => setReadFilterTab('new')} className={`v3-chip ${readFilterTab === 'new' ? 'v3-on' : ''}`}>جديدة ({totalAlerts})</button>
              <button type="button" onClick={() => setReadFilterTab('read')} className={`v3-chip ${readFilterTab === 'read' ? 'v3-on' : ''}`}>مقروءة ({totalReadAlerts})</button>
            </div>

            <div className="v3-vsep" />

            {/* Search */}
            <SearchInput
              type="text"
              placeholder="البحث..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              wrapperClassName="v3-search"
            />

            <div className="v3-vsep" />

            {/* Priority */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" className="h-9 px-3 text-sm">
                  <span className="truncate max-w-[120px]">{getPriorityFilterLabel(activeFilter)}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={8} className="w-56">
                <DropdownMenuLabel>اختر الأولويات</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => clearPriorityFilter()}>جميع الأولويات</DropdownMenuItem>
                <DropdownMenuSeparator />
                {PRIORITY_OPTIONS.map((option) => (
                  <DropdownMenuCheckboxItem key={option.value} checked={activeFilter.includes(option.value)} onCheckedChange={() => togglePriorityFilter(option.value)} onSelect={(event) => event.preventDefault()}>
                    {option.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Secondary controls */}
            <div className="v3-secondary">
              <Select value={alertStatusFilter} onValueChange={(value) => setAlertStatusFilter(value as typeof alertStatusFilter)}>
                <SelectTrigger className="h-9 min-w-[100px] text-sm"><SelectValue placeholder="الحالة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="expired">منتهي</SelectItem>
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" className="h-9 w-9 px-0" title="الترتيب">
                    <ArrowUpDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={8} className="w-52">
                  <DropdownMenuLabel>الترتيب</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={`${alertSortField}_${alertSortDir}`}
                    onValueChange={(value) => {
                      const parts = value.split('_')
                      const dir = parts.pop() as SortDirection
                      setAlertSortField(parts.join('_') as AlertSortField)
                      setAlertSortDir(dir)
                    }}
                  >
                    <DropdownMenuRadioItem value="priority_desc">الأولوية ↓</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="priority_asc">الأولوية ↑</DropdownMenuRadioItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioItem value="entity_name_desc">اسم الكيان ↓</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="entity_name_asc">اسم الكيان ↑</DropdownMenuRadioItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioItem value="days_remaining_desc">الأيام المتبقية ↓</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="days_remaining_asc">الأيام المتبقية ↑</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="app-toggle-shell">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`app-toggle-button ${viewMode === 'table' ? 'app-toggle-button-active' : ''}`}
                title="عرض جدول"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`app-toggle-button ${viewMode === 'grid' ? 'app-toggle-button-active' : ''}`}
                title="عرض بطاقات"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>

            {/* Action */}
            {readFilterTab === 'new' && totalAlerts > 0 && (
              <Button onClick={handleMarkAllAsRead} variant="default" className="h-9 px-3 text-sm whitespace-nowrap">
                <CheckCircle2 className="w-4 h-4" />
                <span>اطلع على الكل</span>
              </Button>
            )}
            {readFilterTab === 'read' && totalReadAlerts > 0 && (
              <Button onClick={handleMarkAllAsUnread} variant="secondary" className="h-9 px-3 text-sm whitespace-nowrap">
                <Mail className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* عرض التنبيهات */}
        {viewMode === 'table' ? (
          <div className="app-panel overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="sticky top-0 z-[1] bg-neutral-50 shadow-sm">
                <tr className="border-b border-neutral-200 text-right">
                  <th className="px-3 py-3 font-semibold text-neutral-700">م</th>
                  <th className="px-3 py-3 font-semibold text-neutral-700">نوع الكيان</th>
                  <th className="px-3 py-3 font-semibold text-neutral-700">اسم الكيان</th>
                  <th className="px-3 py-3 font-semibold text-neutral-700">نوع التنبيه</th>
                  <th className="px-3 py-3 font-semibold text-neutral-700">الأولوية</th>
                  <th className="px-3 py-3 font-semibold text-neutral-700">الأيام المتبقية</th>
                  <th className="px-3 py-3 font-semibold text-neutral-700">تاريخ الانتهاء</th>
                  <th className="px-3 py-3 font-semibold text-neutral-700">الحالة</th>
                  <th className="px-3 py-3 font-semibold text-neutral-700">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {alertTableRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-3 text-neutral-500">
                        <Bell className="h-10 w-10 text-neutral-300" />
                        <div>
                          <div className="text-base font-medium text-neutral-900">
                            {searchTerm
                              ? 'لا توجد نتائج'
                              : readFilterTab === 'new'
                                ? 'لا توجد تنبيهات جديدة'
                                : 'لا توجد تنبيهات مقروءة'}
                          </div>
                          <div className="mt-1 text-sm text-neutral-500">
                            {searchTerm
                              ? `لم يتم العثور على تنبيهات تحتوي على "${searchTerm}"`
                              : readFilterTab === 'new'
                                ? 'جميع مؤسساتك وموظفيك محدثون ولا يحتاجون إلى إجراءات فورية'
                                : 'لم تقم بالاطلاع على أي تنبيهات بعد'}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  alertTableRows.map((row, index) => {
                    const entityName =
                      row.kind === 'company' ? row.alert.company.name : row.alert.employee.name
                    const entityType = row.kind === 'company' ? 'مؤسسة' : 'موظف'
                    const isRead = readAlerts.has(row.alert.id)
                    const snoozedRecord = snoozedAlertsById.get(row.alert.id)
                    const daysRemaining = row.alert.days_remaining
                    const expiryDate = row.alert.expiry_date

                    return (
                      <tr
                        key={row.alert.id}
                        className="cursor-pointer transition-colors hover:bg-neutral-50"
                        onClick={() =>
                          row.kind === 'company'
                            ? handleShowCompanyCard(row.alert.company.id)
                            : void handleViewEmployee(row.alert.employee.id)
                        }
                      >
                        <td className="px-3 py-3 text-xs text-neutral-500">{index + 1}</td>
                        <td className="px-3 py-3">
                          <span className="inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                            {entityType}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-medium text-neutral-900">{entityName}</td>
                        <td className="px-3 py-3 text-neutral-700">{row.alert.title}</td>
                        <td className="px-3 py-3">{PRIORITY_BADGE[row.alert.priority]}</td>
                        <td className="px-3 py-3">
                          {daysRemaining == null ? (
                            <span className="text-neutral-400">—</span>
                          ) : (
                            <span
                              className={
                                daysRemaining < 0 ? 'font-medium text-red-600' : 'text-neutral-700'
                              }
                            >
                              {daysRemaining}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-neutral-600">
                          {expiryDate ? (
                            <HijriDateDisplay date={expiryDate}>
                              {formatDateShortWithHijri(expiryDate)}
                            </HijriDateDisplay>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {activeTab === 'deferred' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              {snoozedRecord?.is_deferred
                                ? 'مؤجل حتى تفعيل يدوي'
                                : snoozedRecord?.snoozed_until
                                  ? `مؤجل حتى ${new Date(snoozedRecord.snoozed_until).toLocaleDateString('ar-SA')}`
                                  : 'مؤجل'}
                            </span>
                          ) : isRead ? (
                            <span className="text-xs text-neutral-400">مقروء</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                              جديد
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3" onClick={(event) => event.stopPropagation()}>
                          {activeTab === 'deferred' ? (
                            <button
                              type="button"
                              onClick={() => void handleUnsnooze(row.alert.id)}
                              className="text-xs text-amber-700 underline-offset-2 hover:text-amber-800 hover:underline"
                            >
                              إلغاء التأجيل
                            </button>
                          ) : isRead ? (
                            <button
                              type="button"
                              onClick={() => handleMarkAsUnread(row.alert.id)}
                              className="text-xs text-neutral-500 underline-offset-2 hover:text-neutral-700 hover:underline"
                            >
                              إلغاء القراءة
                            </button>
                          ) : (
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handleMarkAsRead(row.alert.id)}
                                className="text-xs text-primary underline-offset-2 hover:underline"
                              >
                                تحديد كمقروء
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenSnooze(row.alert.id)}
                                className="text-xs text-amber-700 underline-offset-2 hover:text-amber-800 hover:underline"
                              >
                                تأجيل
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-8">
            {/* تنبيهات المؤسسات */}
            {(activeTab === 'all' || activeTab === 'companies' || activeTab === 'deferred') &&
              companyCardsToRender.length > 0 && (
                <div>
                  <div className="mb-6 flex items-center gap-3">
                    <Building2 className="h-6 w-6 text-primary" />
                    <h2 className="text-xl font-bold text-neutral-900">
                      {activeTab === 'deferred' ? 'التنبيهات المؤجلة للمؤسسات' : 'تنبيهات المؤسسات'}
                    </h2>
                    <span className="rounded-full bg-primary/15 px-2 py-1 text-sm font-medium text-foreground">
                      {companyCardsToRender.length}
                    </span>
                  </div>
                  <div className={ALERT_GRID_CLASS}>
                    {companyCardsToRender.map((alert) => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        onShowCompanyCard={handleShowCompanyCard}
                        onMarkAsRead={handleMarkAsRead}
                        onMarkAsUnread={handleMarkAsUnread}
                        onSnooze={activeTab !== 'deferred' ? handleOpenSnooze : undefined}
                        onUnsnooze={activeTab === 'deferred' ? handleUnsnooze : undefined}
                        isRead={readAlerts.has(alert.id)}
                        isSnoozed={snoozedAlertIds.has(alert.id)}
                        snoozedUntil={snoozedAlertsById.get(alert.id)?.snoozed_until ?? null}
                      />
                    ))}
                  </div>
                </div>
              )}

            {/* تنبيهات الموظفين */}
            {(activeTab === 'all' || activeTab === 'employees' || activeTab === 'deferred') &&
              employeeCardsToRender.length > 0 && (
                <div>
                  <div className="mb-6 flex items-center gap-3">
                    <Users className="h-6 w-6 text-foreground-secondary" />
                    <h2 className="text-xl font-bold text-neutral-900">
                      {activeTab === 'deferred' ? 'التنبيهات المؤجلة للموظفين' : 'تنبيهات الموظفين'}
                    </h2>
                    <span className="rounded-full bg-surface-secondary px-2 py-1 text-sm font-medium text-foreground-secondary">
                      {employeeCardsToRender.length}
                    </span>
                  </div>
                  <div className={ALERT_GRID_CLASS}>
                    {employeeCardsToRender.map((alert) => (
                      <EmployeeAlertCard
                        key={alert.id}
                        alert={alert}
                        onViewEmployee={handleViewEmployee}
                        onMarkAsRead={handleMarkAsRead}
                        onMarkAsUnread={handleMarkAsUnread}
                        onSnooze={activeTab !== 'deferred' ? handleOpenSnooze : undefined}
                        onUnsnooze={activeTab === 'deferred' ? handleUnsnooze : undefined}
                        isRead={readAlerts.has(alert.id)}
                        isSnoozed={snoozedAlertIds.has(alert.id)}
                        snoozedUntil={snoozedAlertsById.get(alert.id)?.snoozed_until ?? null}
                      />
                    ))}
                  </div>
                </div>
              )}

            {/* لا توجد نتائج */}
            {companyCardsToRender.length === 0 && employeeCardsToRender.length === 0 && (
              <div className="rounded-xl border border-neutral-200 bg-surface p-12 text-center shadow-sm">
                <Bell className="mx-auto mb-4 h-16 w-16 text-neutral-300" />
                <h3 className="mb-2 text-lg font-medium text-neutral-900">
                  {searchTerm
                    ? 'لا توجد نتائج'
                    : activeTab === 'deferred'
                      ? 'لا توجد تنبيهات مؤجلة'
                      : readFilterTab === 'new'
                      ? 'لا توجد تنبيهات جديدة'
                      : 'لا توجد تنبيهات مقروءة'}
                </h3>
                <p className="text-neutral-600">
                  {searchTerm
                    ? `لم يتم العثور على تنبيهات تحتوي على "${searchTerm}"`
                    : activeTab === 'deferred'
                      ? 'لا توجد تنبيهات في تبويب المؤجلة حالياً'
                      : readFilterTab === 'new'
                      ? 'جميع مؤسساتك وموظفيك محدثون ولا يحتاجون إلى إجراءات فورية'
                      : 'لم تقم بالاطلاع على أي تنبيهات بعد'}
                </p>
              </div>
            )}
          </div>
        )}
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

      {snoozeTarget && (
        <AlertSnoozeModal
          alertId={snoozeTarget.id}
          alertTitle={snoozeTarget.title}
          open={Boolean(snoozeTarget)}
          onClose={() => setSnoozeTarget(null)}
          onSuccess={() => {
            refreshStats()
            refreshSnoozedAlerts()
            setSnoozeTarget(null)
          }}
        />
      )}
    </Layout>
  )
}
