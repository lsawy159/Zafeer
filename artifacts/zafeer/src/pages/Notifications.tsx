import { useState, useEffect, useCallback } from 'react'
import { supabase, Notification, Company } from '@/lib/supabase'
import { SnoozeModal } from '@/components/notifications/SnoozeModal'
import CompanyDetailModal from '@/components/companies/CompanyDetailModal'
import Layout from '@/components/layout/Layout'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/utils/permissions'
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
    loadNotifications()
    loadCsvSettings()

    // ط§ظ„ط§ط´طھط±ط§ظƒ ظپظٹ ط§ظ„طھط­ط¯ظٹط«ط§طھ ط§ظ„ظپظˆط±ظٹط©
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
      toast.error('ظپط´ظ„ طھط­ظ…ظٹظ„ ط§ظ„طھظ†ط¨ظٹظ‡ط§طھ')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateNotifications = async () => {
    setGenerating(true)
    try {
      const { data, error } = await supabase.rpc('generate_expiry_notifications')

      if (error) throw error

      toast.success(`طھظ… طھظˆظ„ظٹط¯ ${data?.length || 0} طھظ†ط¨ظٹظ‡ ط¬ط¯ظٹط¯`)
      loadNotifications()
    } catch (error) {
      console.error('Error generating notifications:', error)
      toast.error('ظپط´ظ„ طھظˆظ„ظٹط¯ ط§ظ„طھظ†ط¨ظٹظ‡ط§طھ')
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
      toast.success('طھظ… طھط­ط¯ظٹط¯ ط§ظ„طھظ†ط¨ظٹظ‡ ظƒظ…ظ‚ط±ظˆط،')
    } catch {
      toast.error('ظپط´ظ„ طھط­ط¯ظٹط« ط§ظ„طھظ†ط¨ظٹظ‡')
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
      toast.success('طھظ… طھط­ط¯ظٹط¯ ط¬ظ…ظٹط¹ ط§ظ„طھظ†ط¨ظٹظ‡ط§طھ ظƒظ…ظ‚ط±ظˆط،ط©')
    } catch {
      toast.error('ظپط´ظ„ طھط­ط¯ظٹط« ط§ظ„طھظ†ط¨ظٹظ‡ط§طھ')
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
      toast.success('طھظ… طھط­ط¯ظٹط¯ ط§ظ„طھظ†ط¨ظٹظ‡ ظƒط؛ظٹط± ظ…ظ‚ط±ظˆط،')
    } catch {
      toast.error('ظپط´ظ„ طھط­ط¯ظٹط« ط§ظ„طھظ†ط¨ظٹظ‡')
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
      toast.success('طھظ… طھط­ط¯ظٹط¯ ط¬ظ…ظٹط¹ ط§ظ„طھظ†ط¨ظٹظ‡ط§طھ ظƒط؛ظٹط± ظ…ظ‚ط±ظˆط،ط©')
    } catch {
      toast.error('ظپط´ظ„ طھط­ط¯ظٹط« ط§ظ„طھظ†ط¨ظٹظ‡ط§طھ')
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
      toast.success('طھظ… ط­ط°ظپ ط§ظ„طھظ†ط¨ظٹظ‡')
      setShowConfirmDeleteOne(false)
      setNotificationToDelete(null)
    } catch {
      toast.error('ظپط´ظ„ ط­ط°ظپ ط§ظ„طھظ†ط¨ظٹظ‡')
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
      toast.success('طھظ… ط­ط°ظپ ط¬ظ…ظٹط¹ ط§ظ„طھظ†ط¨ظٹظ‡ط§طھ')
      setShowConfirmDeleteAll(false)
    } catch {
      toast.error('ظپط´ظ„ ط­ط°ظپ ط§ظ„طھظ†ط¨ظٹظ‡ط§طھ')
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
      critical: 'عاجل',
      urgent: 'عاجل',
      high: 'تحذير',
      medium: 'تنبيه',
      low: 'منخفض',
    }
    return labels[priority] ?? priority
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

  const deferredNotifications = notifications.filter((n) => {
    return n.is_deferred === true || (!!n.snoozed_until && new Date(n.snoozed_until) > new Date())
  })

  const filteredNotifications = notifications.filter((notification) => {
    // استثناء المؤجلة والمنتظرة snooze من التبويب النشط
    if (notification.is_deferred) return false
    if (notification.snoozed_until && new Date(notification.snoozed_until) > new Date()) return false

    if (filterType === 'read' && !notification.is_read) return false
    if (filterType === 'unread' && notification.is_read) return false

    if (priorityFilter !== 'all' && notification.priority !== priorityFilter) return false

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        notification.title.toLowerCase().includes(search) ||
        (notification.message ?? '').toLowerCase().includes(search)
      )
    }

    return true
  })

  const unreadCount = notifications.filter((n) => !n.is_read).length
  const readCount = notifications.filter((n) => n.is_read).length
  const stats = {
    total: notifications.length,
    unread: unreadCount,
    urgent: notifications.filter((n) => (n.priority === 'critical' || n.priority === 'urgent') && !n.is_read).length,
    high: notifications.filter((n) => n.priority === 'high' && !n.is_read).length,
    medium: notifications.filter((n) => n.priority === 'medium' && !n.is_read).length,
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
              <h1 className="text-3xl font-bold text-neutral-900">ط§ظ„طھظ†ط¨ظٹظ‡ط§طھ</h1>
              <p className="text-neutral-600 mt-1">
                {unreadCount > 0
                  ? `ظ„ط¯ظٹظƒ ${unreadCount} طھظ†ط¨ظٹظ‡ ط؛ظٹط± ظ…ظ‚ط±ظˆط،`
                  : 'ط¬ظ…ظٹط¹ ط§ظ„طھظ†ط¨ظٹظ‡ط§طھ ظ…ظ‚ط±ظˆط،ط©'}
              </p>
            </div>
          </div>
          <Button onClick={handleGenerateNotifications} disabled={generating}>
            <RefreshCw className={`w-5 h-5 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'ط¬ط§ط±ظٹ ط§ظ„طھظˆظ„ظٹط¯...' : 'طھظˆظ„ظٹط¯ طھظ†ط¨ظٹظ‡ط§طھ ط¬ط¯ظٹط¯ط©'}
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
            <div className="text-sm text-neutral-600">ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„طھظ†ط¨ظٹظ‡ط§طھ</div>
          </div>
          <div className="bg-blue-50 rounded-xl shadow-sm border border-blue-200 p-4">
            <div className="text-2xl font-bold text-info-600">{stats.unread}</div>
            <div className="text-sm text-info-700">ط؛ظٹط± ظ…ظ‚ط±ظˆط،</div>
          </div>
          <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-4">
            <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
            <div className="text-sm text-red-700">ط¹ط§ط¬ظ„</div>
          </div>
          <div className="bg-orange-50 rounded-xl shadow-sm border border-orange-200 p-4">
            <div className="text-2xl font-bold text-warning-600">{stats.high}</div>
            <div className="text-sm text-warning-700">ط¹ط§ط¬ظ„</div>
          </div>
          <div className="bg-yellow-50 rounded-xl shadow-sm border border-yellow-200 p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.medium}</div>
            <div className="text-sm text-yellow-700">ظ…طھظˆط³ط·</div>
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
                  placeholder="ط§ظ„ط¨ط­ط« ظپظٹ ط§ظ„طھظ†ط¨ظٹظ‡ط§طھ..."
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
                  <SelectValue placeholder="ط­ط§ظ„ط© ط§ظ„ظ‚ط±ط§ط،ط©" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ط¬ظ…ظٹط¹ ط§ظ„طھظ†ط¨ظٹظ‡ط§طھ</SelectItem>
                  <SelectItem value="unread">ط؛ظٹط± ظ…ظ‚ط±ظˆط،</SelectItem>
                  <SelectItem value="read">ظ…ظ‚ط±ظˆط،</SelectItem>
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
                  <SelectValue placeholder="ط§ظ„ط£ظˆظ„ظˆظٹط©" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ط¬ظ…ظٹط¹ ط§ظ„ط£ظˆظ„ظˆظٹط§طھ</SelectItem>
                  <SelectItem value="urgent">ط¹ط§ط¬ظ„ ظپظ‚ط·</SelectItem>
                  <SelectItem value="high">ط¹ط§ط¬ظ„ ظپظ‚ط·</SelectItem>
                  <SelectItem value="medium">ظ…طھظˆط³ط· ظپظ‚ط·</SelectItem>
                  <SelectItem value="low">ظ…ظ†ط®ظپط¶ ظپظ‚ط·</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-4">
            {unreadCount > 0 && (
              <Button onClick={handleMarkAllAsRead} variant="default" size="sm">
                <Check className="w-4 h-4" />
                طھط­ط¯ظٹط¯ ط§ظ„ظƒظ„ ظƒظ…ظ‚ط±ظˆط،
              </Button>
            )}
            {readCount > 0 && (
              <Button onClick={handleMarkAllAsUnread} variant="secondary" size="sm">
                <Mail className="w-4 h-4" />
                طھط­ط¯ظٹط¯ ط§ظ„ظƒظ„ ظƒط؛ظٹط± ظ…ظ‚ط±ظˆط،
              </Button>
            )}
            {notifications.length > 0 && (
              <Button onClick={handleDeleteAll} variant="destructive" size="sm">
                <Trash2 className="w-4 h-4" />
                ط­ط°ظپ ط§ظ„ظƒظ„
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
              ظ„ط§ طھظˆط¬ط¯ طھظ†ط¨ظٹظ‡ط§طھ
            </h3>
            <p className="text-neutral-600">
              {notifications.length === 0
                ? 'ظ„ظ… ظٹطھظ… طھظˆظ„ظٹط¯ ط£ظٹ طھظ†ط¨ظٹظ‡ط§طھ ط¨ط¹ط¯. ط§ط¶ط؛ط· ط¹ظ„ظ‰ "طھظˆظ„ظٹط¯ طھظ†ط¨ظٹظ‡ط§طھ ط¬ط¯ظٹط¯ط©" ط£ط¹ظ„ط§ظ‡.'
                : 'ظ„ط§ طھظˆط¬ط¯ ظ†طھط§ط¦ط¬ طھط·ط§ط¨ظ‚ ط§ظ„ظپظ„ط§طھط± ط§ظ„ظ…ط­ط¯ط¯ط©'}
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
                            ? `ظ…ظ†طھظ‡ظٹ ظ…ظ†ط° ${String(Math.abs(notification.days_remaining))} ظٹظˆظ…`
                            : `ط¨ط§ظ‚ظٹ ${String(notification.days_remaining)} ظٹظˆظ…`}
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
                            ط§ظ„طھط§ط±ظٹط® ط§ظ„ظ…ط³طھظ‡ط¯ظپ:{' '}
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
                          طھط­ط¯ظٹط¯ ظƒظ…ظ‚ط±ظˆط،
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleMarkAsUnread(notification.id)}
                          variant="secondary"
                          size="sm"
                        >
                          <Mail className="w-4 h-4" />
                          طھط­ط¯ظٹط¯ ظƒط؛ظٹط± ظ…ظ‚ط±ظˆط،
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
          title="ط­ط°ظپ ط§ظ„طھظ†ط¨ظٹظ‡"
          message={`ظ‡ظ„ ط£ظ†طھ ظ…طھط£ظƒط¯ ظ…ظ† ط­ط°ظپ ظ‡ط°ط§ ط§ظ„طھظ†ط¨ظٹظ‡: "${notificationToDelete?.title}"طں`}
          confirmText="ط­ط°ظپ"
          cancelText="ط¥ظ„ط؛ط§ط،"
          isDangerous={true}
          icon="alert"
        />

        <ConfirmationDialog
          isOpen={showConfirmDeleteAll}
          onClose={() => setShowConfirmDeleteAll(false)}
          onConfirm={handleConfirmDeleteAll}
          title="ط­ط°ظپ ط¬ظ…ظٹط¹ ط§ظ„طھظ†ط¨ظٹظ‡ط§طھ"
          message="ظ‡ظ„ ط£ظ†طھ ظ…طھط£ظƒط¯ ظ…ظ† ط­ط°ظپ ط¬ظ…ظٹط¹ ط§ظ„طھظ†ط¨ظٹظ‡ط§طھطں ظ‡ط°ط§ ط§ظ„ط¥ط¬ط±ط§ط، ظ„ط§ ظٹظ…ظƒظ† ط§ظ„طھط±ط§ط¬ط¹ ط¹ظ†ظ‡."
          confirmText="ط­ط°ظپ"
          cancelText="ط¥ظ„ط؛ط§ط،"
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
