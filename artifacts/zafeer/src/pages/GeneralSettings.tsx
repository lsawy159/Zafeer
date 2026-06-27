import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import {
  Settings,
  Users,
  Clock,
  Shield,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/utils/permissions'
import ActivityLogsPage from '@/pages/ActivityLogs'
import SessionsManager from '@/components/settings/SessionsManager'
import { BackupTab } from '@/components/settings/tabs/BackupTab'
import AuditDashboard from '@/components/settings/AuditDashboard'
import { PermissionsPanel } from '@/pages/Permissions'
import UnifiedSettings from '@/components/settings/UnifiedSettings'
import { SystemDefaultsInfo } from './settings/SystemDefaultsInfo'
import { EmailSettingsTab } from '@/components/settings/tabs/EmailSettingsTab'
import { AdhkarTab } from '@/components/adhkar/AdhkarTab'
import {
  buildSettingsCategories,
  ALLOWED_TABS,
} from './settings/settingsConfig'
import type { TabType, SettingsCategory } from './settings/settingsConfig'

const ActivityLogsEmbedded = () => <ActivityLogsPage embedded />

export default function GeneralSettings() {
  const { user } = useAuth()
  const { canView } = usePermissions()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabType>('system')
  const [settingsCount, setSettingsCount] = useState<number | null>(null)
  const [activeUsersCount, setActiveUsersCount] = useState<number | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)

  const hasViewPermission = canView('adminSettings')
  const isAdmin = user?.role === 'admin' && user?.is_active === true

  const tabPermissions: Record<string, boolean> = {
    system: isAdmin,
    backup: isAdmin,
    sessions: isAdmin,
    audit: isAdmin,
    permissions: isAdmin,
    'email-settings': isAdmin,
    'alert-settings': isAdmin,
    'activity-logs': isAdmin,
    'adhkar-settings': isAdmin,
  }

  const hasAnyTabAccess = Object.values(tabPermissions).some(Boolean)

  const loadStats = async () => {
    try {
      const { count } = await supabase
        .from('system_settings')
        .select('id', { count: 'exact', head: true })
      if (count != null) setSettingsCount(count)

      const { data: latest } = await supabase
        .from('system_settings')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (latest?.updated_at) setLastUpdatedAt(latest.updated_at as string)

      const { count: usersCount } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
      if (usersCount != null) setActiveUsersCount(usersCount)
    } catch {
      // non-blocking
    }
  }

  useEffect(() => {
    if (user && hasViewPermission) {
      void loadStats()
    }
  }, [user, hasViewPermission])

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
    EmailSettingsTab,
    AdhkarTab
  )

  const settingsCategories = allSettingsCategories.filter(
    (cat) => tabPermissions[cat.key] ?? true
  )

  const activeCategory = settingsCategories.find((cat) => cat.key === activeTab)

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
                </div>

                <div className="p-3">
                  {activeCategory.component ? (
                    <activeCategory.component />
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
                  {settingsCount ?? '—'}
                </h3>
                <p className="text-xs text-foreground-secondary">إجمالي الإعدادات</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm border border-green-200 p-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-foreground">{activeUsersCount ?? '—'}</h3>
                <p className="text-xs text-foreground-secondary">المستخدمون النشطون</p>
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
                  {lastUpdatedAt
                    ? new Date(lastUpdatedAt).toLocaleDateString('ar-SA')
                    : '—'}
                </h3>
                <p className="text-xs text-foreground-secondary">آخر تحديث</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
