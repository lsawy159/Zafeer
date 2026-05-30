import { useEffect, useMemo, useState } from 'react'
import { type ReactNode } from 'react'
import { supabase, Employee, Company } from '@/lib/supabase'
import { Alert } from '@/components/alerts/AlertCard'
import { EmployeeAlert } from '@/components/alerts/EmployeeAlertCard'
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
import { usePermissions } from '@/utils/permissions'
import { useAlertsStats } from '@/hooks/useAlertsStats'
import { useSnoozedAlerts } from '@/hooks/useSnoozedAlerts'
import {
  DEFAULT_EXPIRED_INCLUSION,
  getExpiredInclusionSettings,
  type ExpiredInclusionSettings,
} from '@/utils/expiredInclusionSettings'

// ─── Types & Constants ────────────────────────────────────────────────────────

export type AlertPriority = Alert['priority']
export type AlertSortField = 'priority' | 'entity_name' | 'days_remaining'
export type SortDirection = 'asc' | 'desc'
export type AlertsCardFilter = 'منتهي' | 'طارئ' | 'عاجل' | 'متوسط' | 'companies' | 'employees' | 'مؤجلة' | null

export type AlertTableRow =
  | { kind: 'company'; alert: Alert }
  | { kind: 'employee'; alert: EmployeeAlert }

interface AlertsProps {
  initialTab?: 'companies' | 'employees' | 'all' | 'deferred'
  initialFilter?: 'all' | 'urgent' | 'high' | 'medium' | 'low'
}

export const PRIORITY_OPTIONS: Array<{ value: AlertPriority; label: string }> = [
  { value: 'urgent', label: 'طارئ' },
  { value: 'high', label: 'عالي' },
  { value: 'medium', label: 'متوسط' },
  { value: 'low', label: 'خفيف' },
]

export const PRIORITY_LABELS: Record<AlertPriority, string> = {
  urgent: 'طارئ',
  high: 'عالي',
  medium: 'متوسط',
  low: 'خفيف',
}

const PRIORITY_ORDER: Record<AlertPriority, number> = { urgent: 4, high: 3, medium: 2, low: 1 }

export const ALERT_GRID_CLASS = 'grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-3'

function getInitialPriorityFilter(f: AlertsProps['initialFilter']): AlertPriority[] {
  return f && f !== 'all' ? [f as AlertPriority] : []
}

export function getPriorityFilterLabel(selected: AlertPriority[]): string {
  if (selected.length === 0 || selected.length === PRIORITY_OPTIONS.length) return 'جميع الأولويات'
  if (selected.length <= 2) return selected.map((p) => PRIORITY_LABELS[p]).join('، ')
  return `${selected.length} أولويات مختارة`
}

export function compareAlerts<T extends { priority: AlertPriority; days_remaining?: number }>(
  left: T, right: T, sortField: AlertSortField, sortDirection: SortDirection, getEntityName: (v: T) => string
) {
  const dir = sortDirection === 'asc' ? 1 : -1
  if (sortField === 'priority') return (PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority]) * dir
  if (sortField === 'entity_name') {
    const nl = getEntityName(left).trim()
    const nr = getEntityName(right).trim()
    if (!nl && !nr) return 0
    if (!nl) return 1
    if (!nr) return -1
    return nl.localeCompare(nr, 'ar', { sensitivity: 'base' }) * dir
  }
  const dl = left.days_remaining, dr = right.days_remaining
  if (dl == null && dr == null) return 0
  if (dl == null) return 1
  if (dr == null) return -1
  return (dl - dr) * dir
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAlertsPage({ initialTab = 'all', initialFilter = 'all' }: AlertsProps = {}) {
  const { canView } = usePermissions()
  const { refreshStats } = useAlertsStats()
  const { snoozedAlertIds, snoozedAlertsById, unsnoozeAlert, refreshSnoozedAlerts } = useSnoozedAlerts()

  const [employees, setEmployees] = useState<Employee[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [companyAlerts, setCompanyAlerts] = useState<Alert[]>([])
  const [employeeAlerts, setEmployeeAlerts] = useState<EmployeeAlert[]>([])
  const [readAlerts, setReadAlerts] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'companies' | 'employees' | 'all' | 'deferred'>(initialTab)
  const [readFilterTab, setReadFilterTab] = useState<'new' | 'read'>('new')
  const [alertStatusFilter, setAlertStatusFilter] = useState<'all' | 'active' | 'expired'>('all')
  const [cardFilter, setCardFilter] = useState<AlertsCardFilter>(null)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [thresholds, setThresholds] = useState(DEFAULT_EMPLOYEE_NOTIFICATION_THRESHOLDS)
  const [activeFilter, setActiveFilter] = useState<AlertPriority[]>(() => getInitialPriorityFilter(initialFilter))
  const [alertSortField, setAlertSortField] = useState<AlertSortField>('priority')
  const [alertSortDir, setAlertSortDir] = useState<SortDirection>('desc')
  const [searchTerm, setSearchTerm] = useState('')
  const [showCompanyCard, setShowCompanyCard] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showEmployeeCard, setShowEmployeeCard] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<(Employee & { company: Company }) | null>(null)
  const [snoozeTarget, setSnoozeTarget] = useState<Alert | EmployeeAlert | null>(null)
  const [expiredInclusion, setExpiredInclusion] = useState<ExpiredInclusionSettings>(DEFAULT_EXPIRED_INCLUSION)

  const togglePriorityFilter = (priority: AlertPriority) => {
    setActiveFilter((cur) => cur.includes(priority) ? cur.filter((item) => item !== priority) : [...cur, priority])
  }
  const clearPriorityFilter = () => setActiveFilter([])

  const loadReadAlerts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase.from('read_alerts').select('alert_id').eq('user_id', user.id)
      if (error) throw error
      setReadAlerts(new Set(data?.map((r) => r.alert_id) || []))
    } catch (err) { console.error('خطأ في جلب التنبيهات المقروءة:', err) }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id,company_id,name,profession,nationality,birth_date,phone,passport_number,residence_number,joining_date,contract_expiry,residence_expiry,project_name,bank_account,residence_image_url,salary,health_insurance_expiry,additional_fields,created_at,updated_at,notes,hired_worker_contract_expiry,project_id,is_deleted,deleted_at')
        .eq('is_deleted', false)
      if (employeesError) throw employeesError

      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id,name,unified_number,labor_subscription_number,commercial_registration_expiry,social_insurance_expiry,ending_subscription_power_date,ending_subscription_moqeem_date,ending_subscription_insurance_date,commercial_registration_status,social_insurance_status,current_employees,max_employees,additional_fields,created_at,updated_at,notes,exemptions,social_insurance_number,company_type,employee_count')
      if (companiesError) throw companiesError

      setEmployees(employeesData || [])
      setCompanies(companiesData || [])

      if (employeesData && companiesData) {
        const companyAlertsGenerated = await generateCompanyAlertsSync(companiesData)
        setCompanyAlerts(companyAlertsGenerated)
        const employeeAlertsGenerated = await generateEmployeeAlerts(employeesData, companiesData)
        setEmployeeAlerts(enrichEmployeeAlertsWithCompanyData(employeeAlertsGenerated, companiesData))
      }
    } catch (err) { console.error('خطأ في جلب البيانات:', err) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData(); loadReadAlerts() }, [])
  useEffect(() => { void getExpiredInclusionSettings().then(setExpiredInclusion) }, [])
  useEffect(() => { void getEmployeeNotificationThresholdsPublic().then(setThresholds) }, [])

  const handleShowCompanyCard = (companyId: string) => {
    const company = companies.find((c) => c.id === companyId)
    if (company) { setSelectedCompany(company); setShowCompanyCard(true) }
  }

  const handleViewEmployee = async (employeeId: string) => {
    try {
      const { data: emp, error: empError } = await supabase
        .from('employees')
        .select('id,company_id,name,profession,nationality,birth_date,phone,passport_number,residence_number,joining_date,contract_expiry,residence_expiry,project_name,bank_account,residence_image_url,salary,health_insurance_expiry,additional_fields,created_at,updated_at,notes,hired_worker_contract_expiry,project_id,is_deleted,deleted_at')
        .eq('id', employeeId)
        .single()
      if (empError) throw empError
      if (!emp) return
      const { data: co, error: coError } = await supabase
        .from('companies')
        .select('id,name,unified_number,labor_subscription_number,commercial_registration_expiry,social_insurance_expiry,ending_subscription_power_date,ending_subscription_moqeem_date,ending_subscription_insurance_date,commercial_registration_status,social_insurance_status,current_employees,max_employees,additional_fields,created_at,updated_at,notes,exemptions,social_insurance_number,company_type,employee_count')
        .eq('id', emp.company_id)
        .single()
      if (coError) throw coError
      if (co) { setSelectedEmployee({ ...emp, company: co } as Employee & { company: Company }); setShowEmployeeCard(true) }
    } catch (err) { console.error('خطأ في جلب بيانات الموظف:', err) }
  }

  const handleCloseEmployeeCard = () => { setShowEmployeeCard(false); setSelectedEmployee(null) }
  const handleUpdateEmployee = async () => { await fetchData() }

  const handleEditCompany = (company: Company) => {
    setSelectedCompany(company)
    setShowEditModal(true)
    setShowCompanyCard(false)
  }

  const handleCloseEditModal = () => { setShowEditModal(false); setSelectedCompany(null) }

  const handleEditModalSuccess = async () => {
    await fetchData()
    if (selectedCompany) {
      const { data: updated, error } = await supabase
        .from('companies')
        .select('id,name,unified_number,labor_subscription_number,commercial_registration_expiry,social_insurance_expiry,ending_subscription_power_date,ending_subscription_moqeem_date,ending_subscription_insurance_date,commercial_registration_status,social_insurance_status,current_employees,max_employees,additional_fields,created_at,updated_at,notes,exemptions,social_insurance_number,company_type,employee_count')
        .eq('id', selectedCompany.id)
        .single()
      if (!error && updated) { setSelectedCompany(updated); setShowCompanyCard(true) }
    }
    setShowEditModal(false)
  }

  const handleMarkAsRead = async (alertId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase.from('read_alerts').upsert({ user_id: user.id, alert_id: alertId, read_at: new Date().toISOString() }, { onConflict: 'user_id,alert_id' })
      if (error) throw error
      setReadAlerts((prev) => new Set([...prev, alertId]))
    } catch (err) { console.error('خطأ في حفظ التنبيه كمقروء:', err) }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const allUnreadIds = [
        ...companyAlerts.filter((a) => !readAlerts.has(a.id)).map((a) => a.id),
        ...employeeAlerts.filter((a) => !readAlerts.has(a.id)).map((a) => a.id),
      ]
      if (allUnreadIds.length === 0) return
      const { error } = await supabase.from('read_alerts').upsert(
        allUnreadIds.map((alertId) => ({ user_id: user.id, alert_id: alertId, read_at: new Date().toISOString() })),
        { onConflict: 'user_id,alert_id' }
      )
      if (error) throw error
      setReadAlerts((prev) => new Set([...prev, ...allUnreadIds]))
    } catch (err) { console.error('خطأ في حفظ جميع التنبيهات كمقروءة:', err) }
  }

  const handleMarkAsUnread = async (alertId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase.from('read_alerts').delete().eq('user_id', user.id).eq('alert_id', alertId)
      if (error) throw error
      setReadAlerts((prev) => { const s = new Set(prev); s.delete(alertId); return s })
    } catch (err) { console.error('خطأ في إعادة التنبيه إلى غير مقروء:', err) }
  }

  const handleMarkAllAsUnread = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const allReadIds = [
        ...companyAlerts.filter((a) => readAlerts.has(a.id)).map((a) => a.id),
        ...employeeAlerts.filter((a) => readAlerts.has(a.id)).map((a) => a.id),
      ]
      if (allReadIds.length === 0) return
      const { error } = await supabase.from('read_alerts').delete().eq('user_id', user.id).in('alert_id', allReadIds)
      if (error) throw error
      setReadAlerts(new Set())
    } catch (err) { console.error('خطأ في إعادة جميع التنبيهات إلى غير مقروءة:', err) }
  }

  const handleOpenSnooze = (alertId: string) => {
    const ca = companyAlerts.find((a) => a.id === alertId)
    if (ca) { setSnoozeTarget(ca); return }
    const ea = employeeAlerts.find((a) => a.id === alertId)
    if (ea) setSnoozeTarget(ea)
  }

  const handleUnsnooze = async (alertId: string) => {
    try { await unsnoozeAlert(alertId); refreshStats() }
    catch (err) { console.error('خطأ في إلغاء التأجيل:', err) }
  }

  // Computed values
  const includeExpiredAlerts = expiredInclusion.include_in_alerts
  const visibleCompanyAlerts = (includeExpiredAlerts ? companyAlerts : companyAlerts.filter((a) => (a.days_remaining ?? 0) >= 0)).filter((a) => !snoozedAlertIds.has(a.id))
  const visibleEmployeeAlerts = (includeExpiredAlerts ? employeeAlerts : employeeAlerts.filter((a) => (a.days_remaining ?? 0) >= 0)).filter((a) => !snoozedAlertIds.has(a.id))
  const deferredCompanyAlerts = companyAlerts.filter((a) => snoozedAlertIds.has(a.id))
  const deferredEmployeeAlerts = employeeAlerts.filter((a) => snoozedAlertIds.has(a.id))

  const unreadCompanyAlerts = visibleCompanyAlerts.filter((a) => !readAlerts.has(a.id) && (a.priority === 'urgent' || a.priority === 'high'))
  const unreadEmployeeAlerts = visibleEmployeeAlerts.filter((a) => !readAlerts.has(a.id) && (a.priority === 'urgent' || a.priority === 'high'))
  const statsCompanyAlerts = includeExpiredAlerts ? unreadCompanyAlerts : unreadCompanyAlerts.filter((a) => (a.days_remaining ?? 0) >= 0)
  const statsEmployeeAlerts = includeExpiredAlerts ? unreadEmployeeAlerts : unreadEmployeeAlerts.filter((a) => (a.days_remaining ?? 0) >= 0)

  const companyAlertsStats = getAlertsStats(statsCompanyAlerts)
  const employeeAlertsStats = getEmployeeAlertsStats(statsEmployeeAlerts)
  const totalAlerts = companyAlertsStats.total + employeeAlertsStats.total
  const totalDeferredAlerts = deferredCompanyAlerts.length + deferredEmployeeAlerts.length
  const totalExpiredAlerts = [...visibleCompanyAlerts, ...visibleEmployeeAlerts].filter((a) => (a.days_remaining ?? 0) < 0).length
  const totalUrgentAlerts = visibleCompanyAlerts.filter((a) => a.priority === 'urgent' && (a.days_remaining ?? 0) >= 0).length + visibleEmployeeAlerts.filter((a) => a.priority === 'urgent' && (a.days_remaining ?? 0) >= 0).length
  const totalHighAlerts = visibleCompanyAlerts.filter((a) => a.priority === 'high').length + visibleEmployeeAlerts.filter((a) => a.priority === 'high').length
  const totalMediumAlerts = visibleCompanyAlerts.filter((a) => a.priority === 'medium').length + visibleEmployeeAlerts.filter((a) => a.priority === 'medium').length
  const maxUrgent = Math.max(thresholds.contract_urgent_days, thresholds.hired_worker_contract_urgent_days, thresholds.residence_urgent_days, thresholds.health_insurance_urgent_days)
  const maxHigh = Math.max(thresholds.contract_high_days, thresholds.hired_worker_contract_high_days, thresholds.residence_high_days, thresholds.health_insurance_high_days)
  const maxMedium = Math.max(thresholds.contract_medium_days, thresholds.hired_worker_contract_medium_days, thresholds.residence_medium_days, thresholds.health_insurance_medium_days)
  const normalizedSearchTerm = normalizeArabic(searchTerm).trim().toLowerCase()

  const readCompanyAlertsCount = visibleCompanyAlerts.filter((a) => readAlerts.has(a.id)).length
  const readEmployeeAlertsCount = visibleEmployeeAlerts.filter((a) => readAlerts.has(a.id)).length
  const totalReadAlerts = readCompanyAlertsCount + readEmployeeAlertsCount

  const filteredCompanyAlerts = useMemo(() => {
    let filtered = visibleCompanyAlerts.filter((alert) => {
      if (cardFilter === 'employees') return false
      if (cardFilter === 'منتهي') return (alert.days_remaining ?? 0) < 0
      if (cardFilter === 'طارئ') return alert.priority === 'urgent' && (alert.days_remaining ?? 0) >= 0
      if (cardFilter === 'عاجل') return alert.priority === 'high'
      if (cardFilter === 'متوسط') return alert.priority === 'medium'
      return alert.priority === 'urgent' || alert.priority === 'high'
    })
    if (alertStatusFilter !== 'all') filtered = filtered.filter((a) => alertStatusFilter === 'expired' ? (a.days_remaining ?? 0) <= 0 : (a.days_remaining ?? 0) > 0)
    if (activeFilter.length > 0) filtered = filterAlertsByPriority(filtered, activeFilter)
    if (normalizedSearchTerm) filtered = filtered.filter((a) => normalizeArabic(a.company.name).toLowerCase().includes(normalizedSearchTerm) || normalizeArabic(a.title).toLowerCase().includes(normalizedSearchTerm))
    if (readFilterTab === 'new') filtered = filtered.filter((a) => !readAlerts.has(a.id))
    else filtered = filtered.filter((a) => readAlerts.has(a.id))
    return [...filtered].sort((l, r) => compareAlerts(l, r, alertSortField, alertSortDir, (a) => a.company.name))
  }, [visibleCompanyAlerts, alertStatusFilter, cardFilter, activeFilter, normalizedSearchTerm, readFilterTab, readAlerts, alertSortField, alertSortDir])

  const filteredEmployeeAlerts = useMemo(() => {
    let filtered = visibleEmployeeAlerts.filter((alert) => {
      if (cardFilter === 'companies') return false
      if (cardFilter === 'منتهي') return (alert.days_remaining ?? 0) < 0
      if (cardFilter === 'طارئ') return alert.priority === 'urgent' && (alert.days_remaining ?? 0) >= 0
      if (cardFilter === 'عاجل') return alert.priority === 'high'
      if (cardFilter === 'متوسط') return alert.priority === 'medium'
      return alert.priority === 'urgent' || alert.priority === 'high'
    })
    if (alertStatusFilter !== 'all') filtered = filtered.filter((a) => alertStatusFilter === 'expired' ? (a.days_remaining ?? 0) <= 0 : (a.days_remaining ?? 0) > 0)
    if (activeFilter.length > 0) filtered = filterEmployeeAlertsByPriority(filtered, activeFilter)
    if (normalizedSearchTerm) filtered = filtered.filter((a) => normalizeArabic(a.employee.name).toLowerCase().includes(normalizedSearchTerm) || normalizeArabic(a.company.name).toLowerCase().includes(normalizedSearchTerm) || normalizeArabic(a.title).toLowerCase().includes(normalizedSearchTerm))
    if (readFilterTab === 'new') filtered = filtered.filter((a) => !readAlerts.has(a.id))
    else filtered = filtered.filter((a) => readAlerts.has(a.id))
    return [...filtered].sort((l, r) => compareAlerts(l, r, alertSortField, alertSortDir, (a) => a.employee.name))
  }, [visibleEmployeeAlerts, alertStatusFilter, cardFilter, activeFilter, normalizedSearchTerm, readFilterTab, readAlerts, alertSortField, alertSortDir])

  const filteredDeferredCompanyAlerts = useMemo(() => {
    let filtered = deferredCompanyAlerts.filter((alert) => {
      if (cardFilter === 'employees') return false
      if (cardFilter === 'منتهي') return (alert.days_remaining ?? 0) < 0
      if (cardFilter === 'طارئ') return alert.priority === 'urgent' && (alert.days_remaining ?? 0) >= 0
      if (cardFilter === 'عاجل') return alert.priority === 'high'
      if (cardFilter === 'متوسط') return alert.priority === 'medium'
      return alert.priority === 'urgent' || alert.priority === 'high'
    })
    if (alertStatusFilter !== 'all') filtered = filtered.filter((a) => alertStatusFilter === 'expired' ? (a.days_remaining ?? 0) <= 0 : (a.days_remaining ?? 0) > 0)
    if (activeFilter.length > 0) filtered = filterAlertsByPriority(filtered, activeFilter)
    if (normalizedSearchTerm) filtered = filtered.filter((a) => normalizeArabic(a.company.name).toLowerCase().includes(normalizedSearchTerm) || normalizeArabic(a.title).toLowerCase().includes(normalizedSearchTerm))
    return [...filtered].sort((l, r) => compareAlerts(l, r, alertSortField, alertSortDir, (a) => a.company.name))
  }, [deferredCompanyAlerts, alertStatusFilter, cardFilter, activeFilter, normalizedSearchTerm, alertSortField, alertSortDir])

  const filteredDeferredEmployeeAlerts = useMemo(() => {
    let filtered = deferredEmployeeAlerts.filter((alert) => {
      if (cardFilter === 'companies') return false
      if (cardFilter === 'منتهي') return (alert.days_remaining ?? 0) < 0
      if (cardFilter === 'طارئ') return alert.priority === 'urgent' && (alert.days_remaining ?? 0) >= 0
      if (cardFilter === 'عاجل') return alert.priority === 'high'
      if (cardFilter === 'متوسط') return alert.priority === 'medium'
      return alert.priority === 'urgent' || alert.priority === 'high'
    })
    if (alertStatusFilter !== 'all') filtered = filtered.filter((a) => alertStatusFilter === 'expired' ? (a.days_remaining ?? 0) <= 0 : (a.days_remaining ?? 0) > 0)
    if (activeFilter.length > 0) filtered = filterEmployeeAlertsByPriority(filtered, activeFilter)
    if (normalizedSearchTerm) filtered = filtered.filter((a) => normalizeArabic(a.employee.name).toLowerCase().includes(normalizedSearchTerm) || normalizeArabic(a.company.name).toLowerCase().includes(normalizedSearchTerm) || normalizeArabic(a.title).toLowerCase().includes(normalizedSearchTerm))
    return [...filtered].sort((l, r) => compareAlerts(l, r, alertSortField, alertSortDir, (a) => a.employee.name))
  }, [deferredEmployeeAlerts, alertStatusFilter, cardFilter, activeFilter, normalizedSearchTerm, alertSortField, alertSortDir])

  const alertTableRows: AlertTableRow[] = useMemo(() => {
    const companyRows = activeTab === 'all' || activeTab === 'companies' ? filteredCompanyAlerts.map((a) => ({ kind: 'company' as const, alert: a })) : activeTab === 'deferred' ? filteredDeferredCompanyAlerts.map((a) => ({ kind: 'company' as const, alert: a })) : []
    const employeeRows = activeTab === 'all' || activeTab === 'employees' ? filteredEmployeeAlerts.map((a) => ({ kind: 'employee' as const, alert: a })) : activeTab === 'deferred' ? filteredDeferredEmployeeAlerts.map((a) => ({ kind: 'employee' as const, alert: a })) : []
    return [...companyRows, ...employeeRows]
  }, [activeTab, filteredCompanyAlerts, filteredEmployeeAlerts, filteredDeferredCompanyAlerts, filteredDeferredEmployeeAlerts])

  const companyCardsToRender = activeTab === 'deferred' ? filteredDeferredCompanyAlerts : filteredCompanyAlerts
  const employeeCardsToRender = activeTab === 'deferred' ? filteredDeferredEmployeeAlerts : filteredEmployeeAlerts

  const alertSummaryCards = [
    { key: null as AlertsCardFilter, title: 'إجمالي التنبيهات', value: totalAlerts, label: '', accentClass: '', valueClass: 'text-foreground' },
    { key: 'منتهي' as AlertsCardFilter, title: 'منتهي', value: totalExpiredAlerts, label: 'أقل من 0 يوم', accentClass: 'border-red-500/20 bg-red-500/5', valueClass: 'text-red-600 dark:text-red-300' },
    { key: 'طارئ' as AlertsCardFilter, title: 'طارئ', value: totalUrgentAlerts, label: `0 - ${maxUrgent} يوم`, accentClass: 'border-red-500/20 bg-red-500/5', valueClass: 'text-red-600 dark:text-red-300' },
    { key: 'عاجل' as AlertsCardFilter, title: 'عاجل', value: totalHighAlerts, label: `${maxUrgent + 1} - ${maxHigh} يوم`, accentClass: 'border-orange-500/20 bg-orange-500/5', valueClass: 'text-orange-600 dark:text-orange-300' },
    { key: 'متوسط' as AlertsCardFilter, title: 'متوسط', value: totalMediumAlerts, label: `${maxHigh + 1} - ${maxMedium} يوم`, accentClass: 'border-yellow-500/20 bg-yellow-500/5', valueClass: 'text-yellow-600 dark:text-yellow-300' },
    { key: 'companies' as AlertsCardFilter, title: 'تنبيهات المؤسسات', value: companyAlertsStats.total, label: '', accentClass: '', valueClass: 'text-foreground' },
    { key: 'employees' as AlertsCardFilter, title: 'تنبيهات الموظفين', value: employeeAlertsStats.total, label: '', accentClass: '', valueClass: 'text-foreground' },
    { key: 'مؤجلة' as AlertsCardFilter, title: 'مؤجلة', value: totalDeferredAlerts, label: '', accentClass: 'border-amber-500/20 bg-amber-500/5', valueClass: 'text-amber-600 dark:text-amber-300' },
  ]

  return {
    canView,
    loading,
    // State
    activeTab, setActiveTab, readFilterTab, setReadFilterTab,
    alertStatusFilter, setAlertStatusFilter, cardFilter, setCardFilter,
    viewMode, setViewMode, searchTerm, setSearchTerm,
    activeFilter, togglePriorityFilter, clearPriorityFilter,
    alertSortField, setAlertSortField, alertSortDir, setAlertSortDir,
    showCompanyCard, setShowCompanyCard, selectedCompany,
    showEditModal, showEmployeeCard, selectedEmployee,
    snoozeTarget, setSnoozeTarget,
    readAlerts, snoozedAlertIds, snoozedAlertsById,
    // Computed
    totalAlerts, totalReadAlerts, totalDeferredAlerts,
    companyAlertsStats, employeeAlertsStats,
    alertSummaryCards, alertTableRows, companyCardsToRender, employeeCardsToRender,
    // Handlers
    handleShowCompanyCard, handleViewEmployee, handleCloseEmployeeCard, handleUpdateEmployee,
    handleEditCompany, handleCloseEditModal, handleEditModalSuccess,
    handleMarkAsRead, handleMarkAsUnread, handleMarkAllAsRead, handleMarkAllAsUnread,
    handleOpenSnooze, handleUnsnooze,
    refreshStats, refreshSnoozedAlerts,
  }
}
