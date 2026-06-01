import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import {
  Settings,
  Save,
  RefreshCw,
  Database as DatabaseIcon,
  Clock,
  Shield,
  BellOff,
  Bell,
} from 'lucide-react'
import { supabase, type Notification } from '@/lib/supabase'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/utils/permissions'
import { DeferredNotificationModal } from '@/components/settings/DeferredNotificationModal'
import ActivityLogsPage from '@/pages/ActivityLogs'
import SessionsManager from '@/components/settings/SessionsManager'
import { BackupTab } from '@/components/settings/tabs/BackupTab'
import AuditDashboard from '@/components/settings/AuditDashboard'
import ConfirmationDialog from '@/components/dialogs/ConfirmationDialog'
import { PermissionsPanel } from '@/pages/Permissions'
import UnifiedSettings from '@/components/settings/UnifiedSettings'
import { Button } from '@/components/ui/Button'
import { SystemDefaultsInfo } from './settings/SystemDefaultsInfo'
import { EmailSettingsTab } from '@/components/settings/tabs/EmailSettingsTab'
import { SettingControl } from './settings/SettingControl'
import {
  buildSettingsCategories,
  LEGACY_SYSTEM_SETTINGS_KEYS,
  ALLOWED_TABS,
} from './settings/settingsConfig'
import type { TabType, SettingsCategory } from './settings/settingsConfig'

const ActivityLogsEmbedded = () => <ActivityLogsPage embedded />

export default function GeneralSettings() {
  const { user } = useAuth()
  const { canView, canEdit } = usePermissions()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabType>('system')
  const [settings, setSettings] = useState<
    Record<string, string | number | boolean | Record<string, unknown> | null>
  >({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showConfirmReset, setShowConfirmReset] = useState(false)
  const [resetTabKey, setResetTabKey] = useState<TabType | null>(null)
  const [deferredNotifications, setDeferredNotifications] = useState<Notification[]>([])
  const [deferredLoading, setDeferredLoading] = useState(false)
  const [snoozeTarget, setSnoozeTarget] = useState<Notification | null>(null)

  const hasViewPermission = canView('adminSettings')
  const hasEditPermission = canEdit('adminSettings')

  const tabPermissions: Record<string, boolean> = {
    system: canView('adminSettings'),
    'advanced-notifications': canView('adminSettings'),
    backup: canView('backupSettings'),
    sessions: canView('sessionsManagement'),
    audit: canView('activityLogs'),
    permissions: canView('users'),
    'email-settings': canView('emailSettings'),
    'alert-settings': canView('alertsSettings'),
    'activity-logs': canView('activityLogs'),
  }

  const hasAnyTabAccess = Object.values(tabPermissions).some(Boolean)

  const cleanupLegacySystemSettings = async () => {
    try {
      const table = supabase.from('system_settings') as unknown as {
        delete?: () => { in: (column: string, values: string[]) => Promise<{ error: unknown }> }
      }

      if (!table.delete) {
        return
      }

      const { error } = await table.delete().in('setting_key', LEGACY_SYSTEM_SETTINGS_KEYS)

      if (error) {
        console.error('Error cleaning legacy system settings:', error)
      }
    } catch (error) {
      console.error('Error cleaning legacy system settings:', error)
    }
  }

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key,setting_value')

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading settings:', error)
      }

      if (data) {
        const settingsMap: Record<
          string,
          string | number | boolean | Record<string, unknown> | null
        > = {}
        data.forEach((row: { setting_key: string; setting_value: unknown }) => {
          const raw = row.setting_value
          if (typeof raw === 'string') {
            try {
              settingsMap[row.setting_key] = JSON.parse(raw)
            } catch {
              settingsMap[row.setting_key] = raw
            }
          } else {
            settingsMap[row.setting_key] = raw as string | number | boolean | null
          }
        })
        setSettings(settingsMap)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user && hasViewPermission) {
      if (hasEditPermission) {
        cleanupLegacySystemSettings()
      }
      loadSettings()
    } else {
      setIsLoading(false)
    }
  }, [user, hasViewPermission, hasEditPermission])

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && ALLOWED_TABS.includes(tab as TabType) && (tabPermissions[tab] ?? true)) {
      setActiveTab(tab as TabType)
    } else if (!tab || !tabPermissions[activeTab]) {
      const firstAccessible = ALLOWED_TABS.find((t) => tabPermissions[t] ?? true)
      if (firstAccessible) setActiveTab(firstAccessible)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const loadDeferredNotifications = useCallback(async () => {
    setDeferredLoading(true)
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .or('snoozed_until.not.is.null,is_deferred.eq.true')
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
      setDeferredNotifications((data ?? []) as Notification[])
    } finally {
      setDeferredLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'advanced-notifications' && user?.role === 'admin') {
      loadDeferredNotifications()
    }
  }, [activeTab, user, loadDeferredNotifications])

  const handleActivateDeferred = async (id: number) => {
    const { error } = await supabase
      .from('notifications')
      .update({ snoozed_until: null, is_deferred: false })
      .eq('id', id)
    if (error) {
      toast.error('فشل التفعيل')
      return
    }
    toast.success('تم تفعيل الإشعار')
    loadDeferredNotifications()
  }

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  if (!user || !hasAnyTabAccess) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-2xl font-bold text-foreground mb-2">غير مصرح</h2>
            <p className="text-foreground-secondary">
              عذراً، ليس لديك صلاحية لعرض هذه الصفحة.
            </p>
          </div>
        </div>
      </Layout>
    )
  }

  const allSettingsCategories: SettingsCategory[] = buildSettingsCategories(
    SystemDefaultsInfo,
    BackupTab,
    SessionsManager,
    AuditDashboard,
    PermissionsPanel,
    UnifiedSettings,
    ActivityLogsEmbedded,
    EmailSettingsTab
  )

  const settingsCategories = allSettingsCategories.filter(
    (cat) => tabPermissions[cat.key] ?? true
  )

  const saveActiveTabSettings = async () => {
    if (!hasEditPermission) {
      toast.error('ليس لديك صلاحية لتعديل الإعدادات')
      return
    }

    const categoryToSave = settingsCategories.find((cat) => cat.key === activeTab)
    if (!categoryToSave || !categoryToSave.settings) {
      toast.info('هذا التبويب يدير الحفظ من داخل مكونه الخاص')
      return
    }

    setIsSaving(true)
    try {
      const rows = categoryToSave.settings.map((setting) => {
        const currentValue = settings[setting.setting_key] ?? setting.setting_value
        return {
          setting_key: setting.setting_key,
          setting_value: JSON.stringify(currentValue),
        }
      })

      // قراءة القيم الحالية قبل الحفظ لبناء diff
      interface ChangedSetting { key_label: string; old_value: string; new_value: string }
      let oldValuesMap: Record<string, string> = {}
      try {
        const keys = rows.map((r) => r.setting_key)
        const { data: oldRows } = await supabase
          .from('system_settings')
          .select('setting_key,setting_value')
          .in('setting_key', keys)
        if (oldRows) {
          oldValuesMap = Object.fromEntries(oldRows.map((r: { setting_key: string; setting_value: string }) => [r.setting_key, r.setting_value]))
        }
      } catch { /* non-blocking */ }

      const { error } = await supabase.from('system_settings').upsert(rows, { onConflict: 'setting_key' })

      if (error) {
        console.error('Error saving settings:', error)
        toast.error('فشل حفظ الإعدادات. يرجى المحاولة مرة أخرى.')
        return
      }

      // تسجيل النشاط مع diff (non-blocking)
      try {
        const changedSettings: ChangedSetting[] = rows
          .filter((r) => oldValuesMap[r.setting_key] !== r.setting_value)
          .map((r) => ({
            key_label: r.setting_key,
            old_value: oldValuesMap[r.setting_key] ?? '—',
            new_value: r.setting_value,
          }))
        await supabase.from('activity_log').insert({
          entity_type: 'settings',
          action: 'تحديث إعدادات النظام',
          details: { changed_settings: changedSettings, changed_count: changedSettings.length },
        })
      } catch { /* non-blocking */ }

      toast.success('تم حفظ إعدادات هذا التبويب بنجاح')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('حدث خطأ أثناء حفظ إعدادات التبويب')
    } finally {
      setIsSaving(false)
    }
  }

  const resetToDefaults = (tabKey: TabType) => {
    if (!hasEditPermission) {
      toast.error('ليس لديك صلاحية لتعديل الإعدادات')
      return
    }
    setResetTabKey(tabKey)
    setShowConfirmReset(true)
  }

  const getChangedSettings = () => {
    if (!resetTabKey) return []

    const categoryToReset = settingsCategories.find((cat) => cat.key === resetTabKey)
    if (!categoryToReset || !categoryToReset.settings) return []

    return categoryToReset.settings
      .filter((setting) => {
        const currentValue = settings[setting.setting_key]
        const defaultValue = setting.setting_value
        return currentValue !== undefined && currentValue !== defaultValue
      })
      .map((setting) => ({
        ...setting,
        currentValue: settings[setting.setting_key],
        defaultValue: setting.setting_value,
      }))
  }

  const handleConfirmReset = () => {
    if (!resetTabKey) return

    const defaultSettings: Record<
      string,
      string | number | boolean | Record<string, unknown> | null
    > = {}
    const categoryToReset = settingsCategories.find((cat) => cat.key === resetTabKey)

    if (categoryToReset && categoryToReset.settings) {
      categoryToReset.settings.forEach((setting) => {
        defaultSettings[setting.setting_key] = setting.setting_value
      })
    }

    setSettings((prev) => ({
      ...prev,
      ...defaultSettings,
    }))

    const categoryLabel = categoryToReset?.label || 'الإعدادات'
    toast.success(`تم إعادة تعيين ${categoryLabel} إلى القيم الافتراضية`)
    setShowConfirmReset(false)
    setResetTabKey(null)
  }

  const updateSetting = (
    key: string,
    value: string | number | boolean | Record<string, unknown> | null
  ) => {
    if (!hasEditPermission) {
      toast.error('ليس لديك صلاحية لتعديل الإعدادات')
      return
    }
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const activeCategory = settingsCategories.find((cat) => cat.key === activeTab)
  const shouldBlockForLoading = isLoading && Boolean(activeCategory?.settings)

  if (shouldBlockForLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="app-page app-tech-grid">
        <div className="mb-3 flex items-center gap-2">
          <div className="app-icon-chip p-2">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">إعدادات النظام</h1>
            <p className="mt-0.5 text-xs text-foreground-secondary">
              إدارة إعدادات النظام والإعدادات العامة
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-1">
            <div className="app-panel sticky top-3 p-2.5">
              <h3 className="font-semibold text-foreground mb-2 text-xs">فئات الإعدادات</h3>
              <nav className="space-y-1">
                {settingsCategories.map((category) => {
                  const Icon = category.icon
                  return (
                    <button
                      key={category.key}
                      onClick={() => handleTabChange(category.key as TabType)}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-right text-xs transition-all duration-200 ${
                        activeTab === category.key
                          ? 'bg-primary/15 text-foreground shadow-soft ring-1 ring-primary/40'
                          : 'text-foreground-secondary hover:bg-surface-secondary-50 hover:text-foreground'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 ${activeTab === category.key ? 'text-foreground' : 'text-foreground-tertiary'}`}
                      />
                      <span className="font-medium">{category.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          <div className="lg:col-span-3">
            {activeCategory && (
              <div className="app-panel overflow-hidden">
                <div className="bg-surface-secondary-50 border-b border-border-200 px-4 py-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <activeCategory.icon className="w-5 h-5 text-foreground" />
                      <div>
                        <h2 className="text-sm font-semibold text-foreground">
                          {activeCategory.label}
                        </h2>
                        <p className="text-xs text-foreground-tertiary mt-0.5 max-w-lg leading-relaxed">
                          {activeCategory.description}
                        </p>
                      </div>
                    </div>
                    {hasEditPermission && activeCategory.settings && activeCategory.settings.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => resetToDefaults(activeTab)}
                          variant="secondary"
                          size="sm"
                          className="text-xs"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          استعادة
                        </Button>
                        <Button
                          onClick={saveActiveTabSettings}
                          disabled={isSaving}
                          size="sm"
                          className="text-xs"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {isSaving ? 'جاري...' : 'حفظ هذا التبويب'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3">
                  {activeCategory.component ? (
                    <activeCategory.component />
                  ) : activeCategory.settings ? (
                    <div className="space-y-3">
                      {activeCategory.settings.map((setting) => (
                        <div
                          key={setting.setting_key}
                          className="border-b border-border-100 pb-2.5 last:border-b-0 last:pb-0"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex-1">
                              <h3 className="font-medium text-foreground text-sm mb-0.5">
                                {setting.description}
                              </h3>
                              <p className="text-xs text-foreground-tertiary">
                                المفتاح:{' '}
                                <code className="bg-surface-secondary-100 px-1 py-0.5 rounded text-xs">
                                  {setting.setting_key}
                                </code>
                              </p>
                            </div>
                            <div className="sm:w-56">
                              <SettingControl
                                setting={setting}
                                value={settings[setting.setting_key]}
                                disabled={!hasEditPermission}
                                onChange={updateSetting}
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      {activeTab === 'advanced-notifications' && user?.role === 'admin' && (
                        <div className="pt-3 mt-1 border-t border-border-100">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <BellOff className="w-4 h-4 text-foreground-secondary" />
                              <h3 className="font-medium text-foreground text-sm">الإشعارات المؤجلة</h3>
                              {deferredNotifications.length > 0 && (
                                <span className="text-xs bg-surface-secondary-100 text-foreground-secondary px-1.5 py-0.5 rounded-full">
                                  {deferredNotifications.length}
                                </span>
                              )}
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-xs"
                              onClick={loadDeferredNotifications}
                              disabled={deferredLoading}
                            >
                              <RefreshCw className={`w-3 h-3 ${deferredLoading ? 'animate-spin' : ''}`} />
                            </Button>
                          </div>
                          {deferredLoading ? (
                            <p className="text-xs text-foreground-tertiary text-center py-4">
                              جاري التحميل...
                            </p>
                          ) : deferredNotifications.length === 0 ? (
                            <p className="text-xs text-foreground-tertiary text-center py-4">
                              لا توجد إشعارات مؤجلة
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {deferredNotifications.map((n) => (
                                <div
                                  key={n.id}
                                  className="flex items-start justify-between gap-3 rounded-xl border border-border-100 bg-surface-secondary-50 px-3 py-2.5"
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">
                                      {n.title}
                                    </p>
                                    <p className="text-xs text-foreground-tertiary mt-0.5">
                                      {n.is_deferred
                                        ? 'مؤجل حتى يُفعل يدوياً'
                                        : n.snoozed_until
                                          ? `مؤجل حتى: ${new Date(n.snoozed_until).toLocaleDateString('ar-SA')}`
                                          : ''}
                                    </p>
                                  </div>
                                  <div className="flex gap-1.5 shrink-0">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      className="text-xs"
                                      onClick={() => setSnoozeTarget(n)}
                                    >
                                      تعديل
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="text-xs"
                                      onClick={() => handleActivateDeferred(n.id)}
                                    >
                                      <Bell className="w-3 h-3" />
                                      تفعيل
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-foreground-tertiary">
                      <activeCategory.icon className="w-10 h-10 mx-auto mb-2 text-foreground-tertiary" />
                      <p className="text-xs">لا توجد إعدادات متاحة في هذا القسم</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="app-panel border-primary/30 bg-primary/10 p-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-foreground shadow-sm">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-foreground">
                  {settingsCategories.reduce((acc, cat) => acc + (cat.settings?.length || 0), 0)}
                </h3>
                <p className="text-xs text-foreground-secondary">إجمالي الإعدادات</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm border border-green-200 p-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
                <DatabaseIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-foreground">{settingsCategories.length}</h3>
                <p className="text-xs text-foreground-secondary">فئات الإعدادات</p>
              </div>
            </div>
          </div>

          <div className="app-panel border-border-200 bg-surface-secondary-50 p-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-secondary-800 shadow-sm">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-foreground">
                  {new Date().toLocaleDateString('ar-SA')}
                </h3>
                <p className="text-xs text-foreground-secondary">آخر تحديث</p>
              </div>
            </div>
          </div>
        </div>

        <ConfirmationDialog
          isOpen={showConfirmReset}
          onClose={() => {
            setShowConfirmReset(false)
            setResetTabKey(null)
          }}
          onConfirm={handleConfirmReset}
          title="إعادة تعيين الإعدادات"
          message={`سيتم إعادة تعيين ${settingsCategories.find((cat) => cat.key === resetTabKey)?.label || 'الإعدادات'} إلى القيم الافتراضية`}
          confirmText="تأكيد"
          cancelText="إلغاء"
          isDangerous={true}
          icon="alert"
        >
          {getChangedSettings().length > 0 && (
            <div className="app-info-block max-h-60 overflow-y-auto rounded-lg p-4">
              <p className="mb-3 text-sm font-semibold text-foreground">
                الإعدادات التي ستتغير:
              </p>
              <div className="space-y-2">
                {getChangedSettings().map((setting) => (
                  <div
                    key={setting.setting_key}
                    className="rounded border border-primary/20 bg-surface p-3"
                  >
                    <p className="text-sm font-medium text-foreground">{setting.description}</p>
                    <div className="flex items-center justify-between mt-2 text-xs">
                      <div>
                        <span className="text-foreground-secondary">الحالي: </span>
                        <code className="bg-surface-secondary-100 px-2 py-1 rounded text-foreground-secondary font-mono">
                          {String(setting.currentValue)}
                        </code>
                      </div>
                      <div className="text-foreground-tertiary">←</div>
                      <div>
                        <code className="bg-green-100 px-2 py-1 rounded text-green-700 font-mono">
                          {String(setting.defaultValue)}
                        </code>
                        <span className="text-foreground-secondary"> :الافتراضي</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {getChangedSettings().length === 0 && (
            <div className="bg-surface-secondary-50 border border-border-200 rounded-lg p-4 text-center">
              <p className="text-sm text-foreground-secondary">
                ✓ جميع الإعدادات موجودة بالفعل على قيمها الافتراضية
              </p>
            </div>
          )}
        </ConfirmationDialog>

        {snoozeTarget && (
          <DeferredNotificationModal
            notification={snoozeTarget}
            open={!!snoozeTarget}
            onClose={() => setSnoozeTarget(null)}
            onSuccess={() => {
              setSnoozeTarget(null)
              loadDeferredNotifications()
            }}
          />
        )}
      </div>
    </Layout>
  )
}
