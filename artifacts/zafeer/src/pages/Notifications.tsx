import { useState, useEffect, useCallback } from 'react'
import { supabase, Notification, Company, Employee } from '@/lib/supabase'
import { SnoozeModal } from '@/components/notifications/SnoozeModal'
import CompanyDetailModal from '@/components/companies/CompanyDetailModal'
import Layout from '@/components/layout/Layout'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/utils/permissions'
import { generateCompanyAlertsSync } from '@/utils/alerts'
import {
  enrichEmployeeAlertsWithCompanyData,
  generateEmployeeAlerts,
} from '@/utils/employeeAlerts'
import {
  Bell,
  AlertTriangle,
  Calendar,
  Shield,
  Clock,
  Check,
  Trash2,
  RefreshCw,
  Search,
  Mail,
  Building2,
  FileSpreadsheet,
  Send,
  AlertCircle,
  BellOff,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'
import { formatDateShortWithHijri } from '@/utils/dateFormatter'
import { HijriDateDisplay } from '@/components/ui/HijriDateDisplay'
import { toast } from 'sonner'
import ConfirmationDialog from '@/components/dialogs/ConfirmationDialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'

type FilterType = 'all' | 'unread' | 'read'
type PriorityFilter = 'all' | 'urgent' | 'high' | 'medium' | 'low'
type ActiveTab = 'notifications' | 'csv-report' | 'deferred'

type ExpiryNotificationRow = {
  type: string
  title: string
  message: string
  entity_type: 'company' | 'employee'
  entity_id: string
  priority: Notification['priority']
  days_remaining?: number
  target_date?: string
  is_archived: boolean
}

const EXPIRY_NOTIFICATION_TYPES = [
  'commercial_registration_expiry',
  'power_subscription_expiry',
  'moqeem_subscription_expiry',
  'contract_expiry',
  'residence_expiry',
  'health_insurance_expiry',
  'hired_worker_contract_expiry',
]

const CHUNK_SIZE = 400

function getNotificationKey(row: Pick<ExpiryNotificationRow, 'entity_type' | 'entity_id' | 'type'>) {
  return `${row.entity_type}:${row.entity_id}:${row.type}`
}

function toNotificationPriority(priority: 'urgent' | 'high' | 'medium' | 'low'): Notification['priority'] {
  return priority === 'urgent' ? 'critical' : priority
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

function isDeferredNotification(notification: Notification) {
  return (
    notification.is_deferred === true ||
    (!!notification.snoozed_until && new Date(notification.snoozed_until) > new Date())
  )
}

function isExpiryNotification(notification: Notification) {
  return EXPIRY_NOTIFICATION_TYPES.includes(notification.type)
}

function isUrgentOrHighNotification(notification: Notification) {
  return ['critical', 'urgent', 'high'].includes(notification.priority)
}

function countUniqueNotificationEntities(items: Notification[]) {
  return new Set(items.map((item) => `${item.entity_type}:${item.entity_id}`)).size
}

export default function Notifications() {
  const { user } = useAuth()
  const { canView } = usePermissions()
  const isAdmin = user?.role === 'admin' && user?.is_active === true

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [generating, setGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('notifications')

  // CSV Report state
  const [csvSending, setCsvSending] = useState(false)
  const [csvLastSent, setCsvLastSent] = useState<string | null>(null)
  const [csvSendResult, setCsvSendResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [adminEmail, setAdminEmail] = useState<string>('')

  // Snooze modal
  const [snoozeTarget, setSnoozeTarget] = useState<Notification | null>(null)

  // Confirmation Dialogs
  const [showConfirmDeleteOne, setShowConfirmDeleteOne] = useState(false)
  const [notificationToDelete, setNotificationToDelete] = useState<Notification | null>(null)
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false)

  // عرض تفاصيل المؤسسة
  const [companyForDetail, setCompanyForDetail] = useState<Company | null>(null)

  const handleViewCompany = async (entityId: string) => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', entityId)
        .single()
      if (error) throw error
      setCompanyForDetail(data)
    } catch (err) {
      console.error('Error loading company:', err)
      toast.error('فشل تحميل بيانات المؤسسة')
    }
  }

  const loadCsvSettings = useCallback(async () => {
    const { data } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['csv_report_last_sent', 'admin_email'])
    for (const row of data ?? []) {
      if (row.setting_key === 'csv_report_last_sent' && row.setting_value) {
        const val = typeof row.setting_value === 'string' ? row.setting_value : JSON.stringify(row.setting_value)
        setCsvLastSent(val.replace(/^"|"$/g, ''))
      }
      if (row.setting_key === 'admin_email') {
        const val = typeof row.setting_value === 'string' ? row.setting_value : String(row.setting_value ?? '')
        setAdminEmail(val)
      }
    }
  }, [])

  const handleSendCsvReport = async () => {
    setCsvSending(true)
    setCsvSendResult(null)
    try {
      const { data, error } = await supabase.functions.invoke('send-alert-report')
      if (error) throw error
      if (data?.success === false) {
        if (data.error === 'no_admin_email') {
          setCsvSendResult({ ok: false, msg: 'إيميل المسؤول غير مضبوط. اذهب إلى الإعدادات وأضف الإيميل.' })
        } else {
          setCsvSendResult({ ok: false, msg: data.error ?? 'حدث خطأ أثناء الإرسال' })
        }
        return
      }
      if (data?.email_sent === false) {
        setCsvSendResult({ ok: true, msg: 'لا توجد تنبيهات نشطة حالياً — لم يُرسل تقرير.' })
      } else {
        setCsvSendResult({ ok: true, msg: `تم الإرسال بنجاح إلى ${data?.recipient ?? adminEmail}` })
        await loadCsvSettings()
      }
    } catch (err) {
      setCsvSendResult({ ok: false, msg: err instanceof Error ? err.message : 'حدث خطأ غير متوقع' })
    } finally {
      setCsvSending(false)
    }
  }

  useEffect(() => {
    syncExpiryNotificationsFromAlerts()
      .catch((error) => {
        console.error('Error syncing expiry notifications:', error)
        toast.error('فشل مزامنة الإشعارات مع التنبيهات')
      })
      .finally(() => {
        loadNotifications()
      })
    loadCsvSettings()

    // الاشتراك في التحديثات الفورية
    const channel = supabase
      .channel('notifications-page')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          loadNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadCsvSettings])

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(
          'id,type,title,message,entity_type,entity_id,priority,days_remaining,is_read,is_archived,created_at,read_at,target_date,snoozed_until,is_deferred'
        )
        .eq('is_archived', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotifications(data || [])
    } catch (error) {
      console.error('Error loading notifications:', error)
      toast.error('فشل تحميل التنبيهات')
    } finally {
      setLoading(false)
    }
  }

  const syncExpiryNotificationsFromAlerts = async (showToast = false) => {
    const { data: employeesData, error: employeesError } = await supabase
      .from('employees')
      .select(
        'id,company_id,name,profession,nationality,birth_date,phone,passport_number,residence_number,joining_date,contract_expiry,residence_expiry,project_name,bank_account,residence_image_url,salary,health_insurance_expiry,additional_fields,created_at,updated_at,notes,hired_worker_contract_expiry,project_id,is_deleted,deleted_at'
      )

    if (employeesError) throw employeesError

    const { data: companiesData, error: companiesError } = await supabase
      .from('companies')
      .select(
        'id,name,unified_number,labor_subscription_number,commercial_registration_expiry,social_insurance_expiry,ending_subscription_power_date,ending_subscription_moqeem_date,ending_subscription_insurance_date,commercial_registration_status,social_insurance_status,current_employees,max_employees,additional_fields,created_at,updated_at,notes,exemptions,social_insurance_number,company_type,employee_count'
      )

    if (companiesError) throw companiesError

    const employees = (employeesData ?? []) as Employee[]
    const companies = (companiesData ?? []) as Company[]
    const companyAlerts = await generateCompanyAlertsSync(companies)
    const employeeAlerts = enrichEmployeeAlertsWithCompanyData(
      await generateEmployeeAlerts(employees, companies),
      companies
    )

    const generatedRows: ExpiryNotificationRow[] = [
      ...companyAlerts.map((alert) => ({
        type: alert.type,
        title: alert.title,
        message: alert.message,
        entity_type: 'company' as const,
        entity_id: alert.company.id,
        priority: toNotificationPriority(alert.priority),
        days_remaining: alert.days_remaining,
        target_date: alert.expiry_date,
        is_archived: false,
      })),
      ...employeeAlerts.map((alert) => ({
        type: alert.type,
        title: alert.title,
        message: alert.message,
        entity_type: 'employee' as const,
        entity_id: alert.employee.id,
        priority: toNotificationPriority(alert.priority),
        days_remaining: alert.days_remaining,
        target_date: alert.expiry_date,
        is_archived: false,
      })),
    ]

    const { data: existingRows, error: existingError } = await supabase
      .from('notifications')
      .select('id,type,entity_type,entity_id')
      .eq('is_archived', false)
      .in('type', EXPIRY_NOTIFICATION_TYPES)

    if (existingError) throw existingError

    for (const rows of chunkArray(generatedRows, CHUNK_SIZE)) {
      const { error } = await supabase
        .from('notifications')
        .upsert(rows, { onConflict: 'entity_type,entity_id,type' })
      if (error) throw error
    }

    const generatedKeys = new Set(generatedRows.map(getNotificationKey))
    const staleIds = (existingRows ?? [])
      .filter((row) => {
        const key = getNotificationKey({
          entity_type: row.entity_type as 'company' | 'employee',
          entity_id: String(row.entity_id),
          type: row.type,
        })
        return !generatedKeys.has(key)
      })
      .map((row) => row.id)

    for (const ids of chunkArray(staleIds, CHUNK_SIZE)) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_archived: true })
        .in('id', ids)
      if (error) throw error
    }

    const displayCount = new Set(
      generatedRows
        .filter((row) => ['critical', 'urgent', 'high'].includes(row.priority))
        .map((row) => `${row.entity_type}:${row.entity_id}`)
    ).size

    if (showToast) {
      toast.success(`تم توليد ${displayCount} إشعار حسب إعدادات التنبيهات`)
    }

    return displayCount
  }

  const handleGenerateNotifications = async () => {
    setGenerating(true)
    try {
      const generatedCount = await syncExpiryNotificationsFromAlerts(false)
      toast.success(`تم توليد ${generatedCount} تنبيه جديد`)
      await loadNotifications()
    } catch (error) {
      console.error('Error generating notifications:', error)
      toast.error('فشل توليد التنبيهات')
    } finally {
      setGenerating(false)
    }
  }

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)

      if (error) throw error
      loadNotifications()
      toast.success('تم تحديد التنبيه كمقروء')
    } catch {
      toast.error('فشل تحديث التنبيه')
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('is_read', false)
        .eq('is_archived', false)

      if (error) throw error
      loadNotifications()
      toast.success('تم تحديد جميع التنبيهات كمقروءة')
    } catch {
      toast.error('فشل تحديث التنبيهات')
    }
  }

  const handleMarkAsUnread = async (notificationId: number) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: false, read_at: null })
        .eq('id', notificationId)

      if (error) throw error
      loadNotifications()
      toast.success('تم تحديد التنبيه كغير مقروء')
    } catch {
      toast.error('فشل تحديث التنبيه')
    }
  }

  const handleMarkAllAsUnread = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: false, read_at: null })
        .eq('is_read', true)
        .eq('is_archived', false)

      if (error) throw error
      loadNotifications()
      toast.success('تم تحديد جميع التنبيهات كغير مقروءة')
    } catch {
      toast.error('فشل تحديث التنبيهات')
    }
  }

  const handleDelete = async (notification: Notification) => {
    setNotificationToDelete(notification)
    setShowConfirmDeleteOne(true)
  }

  const handleConfirmDeleteOne = async () => {
    if (!notificationToDelete) return

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_archived: true })
        .eq('id', notificationToDelete.id)

      if (error) throw error
      loadNotifications()
      toast.success('تم حذف التنبيه')
      setShowConfirmDeleteOne(false)
      setNotificationToDelete(null)
    } catch {
      toast.error('فشل حذف التنبيه')
    }
  }

  const handleDeleteAll = async () => {
    setShowConfirmDeleteAll(true)
  }

  const handleConfirmDeleteAll = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_archived: true })
        .eq('is_archived', false)

      if (error) throw error
      loadNotifications()
      toast.success('تم حذف جميع التنبيهات')
      setShowConfirmDeleteAll(false)
    } catch {
      toast.error('فشل حذف التنبيهات')
    }
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      critical: 'text-red-600 bg-red-50 border-red-200',
      urgent: 'text-red-600 bg-red-50 border-red-200',
      high: 'text-warning-600 bg-orange-50 border-orange-200',
      medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      low: 'text-info-600 bg-blue-50 border-blue-200',
    }
    return colors[priority] ?? colors.low
  }

  const getPriorityIcon = (priority: string) => {
    if (priority === 'critical' || priority === 'urgent') return <AlertTriangle className="w-5 h-5" />
    if (priority === 'high') return <Clock className="w-5 h-5" />
    return <Calendar className="w-5 h-5" />
  }

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      critical: 'طارئ',
      urgent: 'طارئ',
      high: 'عاجل',
      medium: 'متوسط',
      low: 'منخفض',
    }
    return ({
      critical: 'طارئ',
      urgent: 'طارئ',
      high: 'عاجل',
      medium: 'متوسط',
      low: 'منخفض',
    } as Record<string, string>)[priority] ?? labels[priority] ?? priority
  }

  const handleActivateNow = async (notificationId: number) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ snoozed_until: null, is_deferred: false })
        .eq('id', notificationId)
      if (error) throw error
      toast.success('تم تفعيل الإشعار')
      loadNotifications()
    } catch {
      toast.error('فشل تفعيل الإشعار')
    }
  }

  const deferredNotifications = notifications.filter(isDeferredNotification)

  const filteredNotifications = notifications.filter((notification) => {
    // استثناء المؤجلة والمنتظرة snooze من التبويب النشط
    if (isDeferredNotification(notification)) return false

    if (filterType === 'read' && !notification.is_read) return false
    if (filterType === 'unread' && notification.is_read) return false

    if (priorityFilter === 'urgent' && !['critical', 'urgent'].includes(notification.priority)) {
      return false
    }
    if (priorityFilter !== 'all' && priorityFilter !== 'urgent' && notification.priority !== priorityFilter) {
      return false
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        notification.title.toLowerCase().includes(search) ||
        (notification.message ?? '').toLowerCase().includes(search)
      )
    }

    return true
  })

  const activeCountableNotifications = notifications.filter(
    (notification) =>
      !isDeferredNotification(notification) &&
      isExpiryNotification(notification) &&
      isUrgentOrHighNotification(notification)
  )
  const unreadCount = countUniqueNotificationEntities(
    activeCountableNotifications.filter((notification) => !notification.is_read)
  )
  const readCount = countUniqueNotificationEntities(
    activeCountableNotifications.filter((notification) => notification.is_read)
  )
  const stats = {
    total: countUniqueNotificationEntities(activeCountableNotifications),
    unread: unreadCount,
    urgent: countUniqueNotificationEntities(
      activeCountableNotifications.filter(
        (notification) =>
          (notification.priority === 'critical' || notification.priority === 'urgent') &&
          !notification.is_read
      )
    ),
    high: countUniqueNotificationEntities(
      activeCountableNotifications.filter(
        (notification) => notification.priority === 'high' && !notification.is_read
      )
    ),
    medium: countUniqueNotificationEntities(
      notifications.filter(
        (notification) =>
          !isDeferredNotification(notification) &&
          isExpiryNotification(notification) &&
          notification.priority === 'medium' &&
          !notification.is_read
      )
    ),
  }

  if (!user || !canView('adminSettings')) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-2xl font-bold text-foreground mb-2">غير مصرح</h2>
            <p className="text-foreground-secondary">عذراً، ليس لديك صلاحية لعرض هذه الصفحة.</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Bell className="w-6 h-6 text-info-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">التنبيهات</h1>
              <p className="text-neutral-600 mt-1">
                {unreadCount > 0
                  ? `لديك ${unreadCount} تنبيه غير مقروء`
                  : 'جميع التنبيهات مقروءة'}
              </p>
            </div>
          </div>
          <Button onClick={handleGenerateNotifications} disabled={generating}>
            <RefreshCw className={`w-5 h-5 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'جاري التوليد...' : 'توليد تنبيهات جديدة'}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-neutral-200">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition ${
              activeTab === 'notifications'
                ? 'bg-white border border-b-white border-neutral-200 text-blue-600 -mb-px'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <Bell className="w-4 h-4" />
            الإشعارات
          </button>
          <button
            onClick={() => setActiveTab('csv-report')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition ${
              activeTab === 'csv-report'
                ? 'bg-white border border-b-white border-neutral-200 text-blue-600 -mb-px'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            تقرير CSV
          </button>
          <button
            onClick={() => setActiveTab('deferred')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition ${
              activeTab === 'deferred'
                ? 'bg-white border border-b-white border-neutral-200 text-blue-600 -mb-px'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <BellOff className="w-4 h-4" />
            المؤجلة
            {deferredNotifications.length > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                {deferredNotifications.length}
              </span>
            )}
          </button>
        </div>

        {/* CSV Report Tab */}
        {activeTab === 'csv-report' && (
          <div className="app-panel p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-neutral-900 mb-1">تقرير تنبيهات انتهاء الصلاحيات</h2>
              <p className="text-neutral-500 text-sm">
                إرسال تقرير CSV مضغوط يشمل الموظفين والمؤسسات التي لديها تنبيهات نشطة إلى إيميل المسؤول.
              </p>
            </div>

            {/* admin_email warning — admins only */}
            {isAdmin && !adminEmail && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">إيميل المسؤول غير مضبوط</p>
                  <p className="text-sm text-amber-700 mt-0.5">
                    اذهب إلى <strong>الإعدادات ← إعدادات الإشعارات المتقدمة</strong> وأضف إيميل المسؤول لتفعيل إرسال التقارير.
                  </p>
                </div>
              </div>
            )}

            {/* Last sent */}
            {csvLastSent && (
              <p className="text-sm text-neutral-500">
                آخر إرسال:{' '}
                <span className="font-medium text-neutral-700">
                  {new Date(csvLastSent).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })}
                </span>
              </p>
            )}

            {/* Result message */}
            {csvSendResult && (
              <div className={`flex items-start gap-3 rounded-lg p-4 ${
                csvSendResult.ok
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${csvSendResult.ok ? 'text-green-600' : 'text-red-600'}`} />
                <p className={`text-sm font-medium ${csvSendResult.ok ? 'text-green-800' : 'text-red-800'}`}>
                  {csvSendResult.msg}
                </p>
              </div>
            )}

            <Button
              onClick={handleSendCsvReport}
              disabled={csvSending}
              className="gap-2"
            >
              {csvSending
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> جارٍ الإرسال...</>
                : <><Send className="w-4 h-4" /> إرسال التقرير الآن</>
              }
            </Button>
          </div>
        )}

        {/* Notifications Tab Content */}
        {activeTab === 'notifications' && (<>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="app-panel p-4">
            <div className="text-2xl font-bold text-neutral-900">{stats.total}</div>
            <div className="text-sm text-neutral-600">إجمالي التنبيهات</div>
          </div>
          <div className="bg-blue-50 rounded-xl shadow-sm border border-blue-200 p-4">
            <div className="text-2xl font-bold text-info-600">{stats.unread}</div>
            <div className="text-sm text-info-700">غير مقروء</div>
          </div>
          <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-4">
            <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
            <div className="text-sm text-red-700">طارئ</div>
          </div>
          <div className="bg-orange-50 rounded-xl shadow-sm border border-orange-200 p-4">
            <div className="text-2xl font-bold text-warning-600">{stats.high}</div>
            <div className="text-sm text-warning-700">عاجل</div>
          </div>
          <div className="bg-yellow-50 rounded-xl shadow-sm border border-yellow-200 p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.medium}</div>
            <div className="text-sm text-yellow-700">متوسط</div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="app-panel mb-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="البحث في التنبيهات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-4 pr-10"
                />
              </div>
            </div>

            {/* Filter by Read Status */}
            <div>
              <Select
                value={filterType}
                onValueChange={(value) => setFilterType(value as FilterType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="حالة القراءة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع التنبيهات</SelectItem>
                  <SelectItem value="unread">غير مقروء</SelectItem>
                  <SelectItem value="read">مقروء</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter by Priority */}
            <div>
              <Select
                value={priorityFilter}
                onValueChange={(value) => setPriorityFilter(value as PriorityFilter)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="الأولوية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأولويات</SelectItem>
                  <SelectItem value="urgent">طارئ فقط</SelectItem>
                  <SelectItem value="high">عاجل فقط</SelectItem>
                  <SelectItem value="medium">متوسط فقط</SelectItem>
                  <SelectItem value="low">منخفض فقط</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-4">
            {unreadCount > 0 && (
              <Button onClick={handleMarkAllAsRead} variant="default" size="sm">
                <Check className="w-4 h-4" />
                تحديد الكل كمقروء
              </Button>
            )}
            {readCount > 0 && (
              <Button onClick={handleMarkAllAsUnread} variant="secondary" size="sm">
                <Mail className="w-4 h-4" />
                تحديد الكل كغير مقروء
              </Button>
            )}
            {notifications.length > 0 && (
              <Button onClick={handleDeleteAll} variant="destructive" size="sm">
                <Trash2 className="w-4 h-4" />
                حذف الكل
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-surface rounded-xl shadow-sm border border-neutral-200 p-12 text-center">
            <Bell className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">
              لا توجد تنبيهات
            </h3>
            <p className="text-neutral-600">
              {notifications.length === 0
                ? 'لم يتم توليد أي تنبيهات بعد. اضغط على "توليد تنبيهات جديدة" أعلاه.'
                : 'لا توجد نتائج تطابق الفلاتر المحددة'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-surface rounded-xl shadow-sm border-2 p-6 transition ${
                  !notification.is_read ? 'border-blue-200 bg-blue-50/30' : 'border-neutral-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Priority Icon */}
                  <div className={`p-3 rounded-xl ${getPriorityColor(notification.priority)}`}>
                    {getPriorityIcon(notification.priority)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3
                        className={`text-lg font-semibold ${!notification.is_read ? 'text-neutral-900' : 'text-neutral-700'}`}
                      >
                        {notification.title}
                      </h3>
                      {!notification.is_read && (
                        <span className="flex-shrink-0 w-3 h-3 bg-blue-600 rounded-full"></span>
                      )}
                    </div>

                    <p className="text-neutral-600 mb-3">{notification.message}</p>

                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(notification.priority)}`}
                      >
                        {getPriorityLabel(notification.priority)}
                      </span>

                      {notification.days_remaining != null && (
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            notification.days_remaining < 0
                              ? 'bg-red-100 text-red-700'
                              : notification.days_remaining <= 7
                                ? 'bg-orange-100 text-warning-700'
                                : 'bg-blue-100 text-info-700'
                          }`}
                        >
                          {notification.days_remaining < 0
                            ? `منتهي منذ ${String(Math.abs(notification.days_remaining))} يوم`
                            : `باقي ${String(notification.days_remaining)} يوم`}
                        </span>
                      )}

                      <span className="text-sm text-neutral-500">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: ar,
                        })}
                      </span>

                      {notification.target_date && (
                        <span className="text-sm text-neutral-500">
                          <HijriDateDisplay date={notification.target_date}>
                            التاريخ المستهدف:{' '}
                            {formatDateShortWithHijri(notification.target_date)}
                          </HijriDateDisplay>
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4">
                      {!notification.is_read ? (
                        <Button
                          onClick={() => handleMarkAsRead(notification.id)}
                          variant="default"
                          size="sm"
                        >
                          <Check className="w-4 h-4" />
                          تحديد كمقروء
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleMarkAsUnread(notification.id)}
                          variant="secondary"
                          size="sm"
                        >
                          <Mail className="w-4 h-4" />
                          تحديد كغير مقروء
                        </Button>
                      )}
                      {notification.entity_type === 'company' && notification.entity_id && (
                        <Button
                          onClick={() => handleViewCompany(String(notification.entity_id!))}
                          variant="secondary"
                          size="sm"
                        >
                          <Building2 className="w-4 h-4" />
                          عرض المؤسسة
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          onClick={() => setSnoozeTarget(notification)}
                          variant="secondary"
                          size="sm"
                        >
                          <BellOff className="w-4 h-4" />
                          تأجيل
                        </Button>
                      )}
                      <Button
                        onClick={() => handleDelete(notification)}
                        variant="destructive"
                        size="sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        حذف
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </>)}

        {/* Deferred Tab Content */}
        {activeTab === 'deferred' && (
          <div>
            {deferredNotifications.length === 0 ? (
              <div className="bg-surface rounded-xl shadow-sm border border-neutral-200 p-12 text-center">
                <BellOff className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
                <h3 className="text-lg font-medium text-neutral-900 mb-2">لا توجد إشعارات مؤجلة</h3>
                <p className="text-neutral-600">الإشعارات التي تؤجّلها ستظهر هنا.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {deferredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="bg-surface rounded-xl shadow-sm border-2 border-amber-200 bg-amber-50/20 p-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-600">
                        <BellOff className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-neutral-700 mb-1">{notification.title}</h3>
                        <p className="text-neutral-500 mb-2">{notification.message}</p>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500">
                          {notification.is_deferred && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                              معطَّل يدوياً
                            </span>
                          )}
                          {notification.snoozed_until && !notification.is_deferred && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-info-700 font-medium">
                              مؤجل حتى {new Date(notification.snoozed_until).toLocaleDateString('ar-SA')}
                            </span>
                          )}
                          {notification.days_remaining != null && (
                            <span className="text-neutral-400">
                              باقي {notification.days_remaining} يوم
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button
                            onClick={() => handleActivateNow(notification.id)}
                            variant="default"
                            size="sm"
                          >
                            <Bell className="w-4 h-4" />
                            تفعيل الآن
                          </Button>
                          <Button
                            onClick={() => setSnoozeTarget(notification)}
                            variant="secondary"
                            size="sm"
                          >
                            <Clock className="w-4 h-4" />
                            تعديل التأجيل
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Snooze Modal */}
        {snoozeTarget && (
          <SnoozeModal
            notification={snoozeTarget}
            open={!!snoozeTarget}
            onClose={() => setSnoozeTarget(null)}
            onSuccess={loadNotifications}
          />
        )}

        {/* Delete Confirmation Dialogs */}
        <ConfirmationDialog
          isOpen={showConfirmDeleteOne}
          onClose={() => {
            setShowConfirmDeleteOne(false)
            setNotificationToDelete(null)
          }}
          onConfirm={handleConfirmDeleteOne}
          title="حذف التنبيه"
          message={`هل أنت متأكد من حذف هذا التنبيه: "${notificationToDelete?.title}"؟`}
          confirmText="حذف"
          cancelText="إلغاء"
          isDangerous={true}
          icon="alert"
        />

        <ConfirmationDialog
          isOpen={showConfirmDeleteAll}
          onClose={() => setShowConfirmDeleteAll(false)}
          onConfirm={handleConfirmDeleteAll}
          title="حذف جميع التنبيهات"
          message="هل أنت متأكد من حذف جميع التنبيهات؟ هذا الإجراء لا يمكن التراجع عنه."
          confirmText="حذف"
          cancelText="إلغاء"
          isDangerous={true}
          icon="alert"
        />
      </div>

      {companyForDetail && (
        <CompanyDetailModal
          company={companyForDetail}
          onClose={() => setCompanyForDetail(null)}
          getAvailableSlotsColor={() => 'text-neutral-600'}
          getAvailableSlotsTextColor={() => 'text-neutral-600'}
          getAvailableSlotsText={() => ''}
        />
      )}
    </Layout>
  )
}
