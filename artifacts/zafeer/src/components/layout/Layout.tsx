import { ReactNode, useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import {
  Menu,
  X,
  ChevronRight,
  LogOut,
  Moon,
  Sun,
  RefreshCw,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip'
import { usePermissions } from '@/utils/permissions'
import { useThemeMode, useFontMode } from '@/hooks/useUiPreferences'
import { MobileBottomNav } from './MobileBottomNav'
import { PillHeader } from './PillHeader'
import { useNavItems } from '@/hooks/useNavItems'

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { user, signOut } = useAuth()
  const { navItems, quickSearchItems, alertsStats } = useNavItems()

  // State for sidebar collapse (desktop)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    return saved ? JSON.parse(saved) : false
  })

  // State for mobile sidebar open/close
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // [Refresh] State + handler — تحديث بيانات الصفحة الحالية بدون reload للمتصفح
  const queryClient = useQueryClient()
  const [refreshState, setRefreshState] = useState<'idle' | 'loading' | 'success'>('idle')
  const handleRefresh = useCallback(async () => {
    if (refreshState === 'loading') return
    setRefreshState('loading')
    try {
      await queryClient.invalidateQueries({ refetchType: 'all' })
      window.dispatchEvent(new CustomEvent('app:refresh-current-page'))
      setRefreshState('success')
      window.setTimeout(() => setRefreshState('idle'), 1200)
    } catch {
      setRefreshState('idle')
    }
  }, [queryClient, refreshState])

  // Save collapse state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed))
  }, [isCollapsed])

  // Close mobile sidebar when route changes
  useEffect(() => {
    setIsMobileOpen(false)
  }, [location.pathname])

  // Close mobile sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileOpen) {
        setIsMobileOpen(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isMobileOpen])

  const { hasPermission } = usePermissions()
  const { isDark, toggleTheme } = useThemeMode()
  const { fontMode, setFontMode } = useFontMode()

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/login'
  }


  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen bg-background text-foreground" dir="rtl">
        <PillHeader
          isDark={isDark}
          toggleTheme={toggleTheme}
          alertsCount={alertsStats.total}
          userName={user?.full_name || user?.email || 'مستخدم'}
          userRole={user?.role === 'admin' ? 'مدير' : 'مستخدم'}
          onSignOut={handleSignOut}
          fontMode={fontMode}
          onFontChange={setFontMode}
          quickSearchItems={quickSearchItems}
        />

        <div className="flex relative">
          {/* Mobile Backdrop */}
          {isMobileOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-[var(--motion-base)] ease-[var(--ease-out)] lg:hidden"
              onClick={() => setIsMobileOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* Sidebar - Modern Flat Design */}
          <aside
            className={`
              fixed lg:sticky top-0 inset-inline-end-0 lg:self-start
              ${isCollapsed ? 'w-16' : 'w-72'}
              ${isMobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
              h-screen lg:h-auto lg:min-h-screen
              app-sidebar border-s border-border bg-surface dark:bg-[var(--color-card)] backdrop-blur-md
              shadow-[var(--shadow-lg)]
              z-50 lg:z-auto
              transition-all duration-[var(--motion-base)] ease-[var(--ease-in-out)]
              flex flex-col
            `}
          >
            {/* Logo Section at Top */}
            <div className="flex-shrink-0 border-b border-border bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setIsMobileOpen(!isMobileOpen)}
                  className="lg:hidden rounded-[var(--radius-lg)] border border-border bg-surface p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={isMobileOpen ? 'إغلاق القائمة الجانبية' : 'فتح القائمة الجانبية'}
                >
                  {isMobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>

                {/* Logo */}
                {!isCollapsed ? (
                  <Link
                    to="/dashboard"
                    className="flex flex-col items-center transition-opacity hover:opacity-90 flex-1"
                  >
                    <div className="rounded-[var(--radius-xl)] border border-border bg-surface px-3 py-2 shadow-[var(--shadow-sm)]">
                      <img src="/logo.png" alt="ZaFeer" className="h-14 w-auto dark:hidden" />
                      <img src="/logo-dark.png" alt="ZaFeer" className="h-14 w-auto hidden dark:block" />
                    </div>
                  </Link>
                ) : (
                  <Link
                    to="/dashboard"
                    className="flex items-center justify-center transition-opacity hover:opacity-90 flex-1"
                  >
                    <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-2 shadow-[var(--shadow-sm)]">
                      <img src="/logo.png" alt="ZaFeer" className="h-10 w-auto dark:hidden" />
                      <img src="/logo-dark.png" alt="ZaFeer" className="h-10 w-auto hidden dark:block" />
                    </div>
                  </Link>
                )}

                {/* Collapse Button (Desktop only) */}
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="hidden lg:flex rounded-[var(--radius-lg)] border border-border bg-surface p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={isCollapsed ? 'توسيع الشريط الجانبي' : 'طي الشريط الجانبي'}
                >
                  <ChevronRight
                    className={`w-3.5 h-3.5 transition-transform duration-300 ${
                      isCollapsed ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* [Refresh] Refresh-current-page button */}
            <div className={cn('flex-shrink-0 px-3 pt-3 pb-1', isCollapsed && 'px-2')}>
              <button
                onClick={handleRefresh}
                disabled={refreshState === 'loading'}
                aria-label="تحديث بيانات الصفحة الحالية"
                title="تحديث بيانات الصفحة الحالية"
                className={cn(
                  'group relative w-full flex items-center justify-center gap-2 rounded-xl text-sm font-semibold',
                  'transition-all duration-300 ease-out overflow-hidden border shadow-sm',
                  isCollapsed ? 'p-2.5' : 'px-4 py-2.5',
                  refreshState === 'idle' &&
                    'bg-[var(--color-primary-100)] dark:bg-[var(--color-primary-800)]/20 text-[var(--color-primary-900)] dark:text-[var(--color-primary-200)] border-[var(--color-primary-800)]/20 hover:shadow-[var(--shadow-sm)] hover:scale-[1.02] active:scale-[0.98]',
                  refreshState === 'loading' &&
                    'bg-[var(--color-primary-100)] dark:bg-[var(--color-primary-800)]/30 text-[var(--color-primary-900)] dark:text-[var(--color-primary-100)] border-[var(--color-primary-800)]/30 cursor-wait',
                  refreshState === 'success' &&
                    'bg-[var(--color-success-subtle)] text-[var(--color-success-foreground)] border-[var(--color-success-foreground)]/30 shadow-[var(--shadow-sm)]'
                )}
              >
                {/* Shimmer */}
                {refreshState === 'idle' && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:translate-x-full transition-transform duration-700 ease-out"
                  />
                )}
                {/* Pulse ring */}
                {refreshState === 'loading' && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-[var(--radius-lg)] ring-2 ring-[var(--color-primary-800)]/30 animate-pulse"
                  />
                )}
                {/* Icon */}
                <span className="relative z-10 flex items-center justify-center">
                  {refreshState === 'success' ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <RefreshCw
                      className={cn(
                        'h-5 w-5 transition-transform',
                        refreshState === 'loading' && 'animate-spin'
                      )}
                    />
                  )}
                </span>
                {/* Label (hidden when collapsed) */}
                {!isCollapsed && (
                  <span className="relative z-10">
                    {refreshState === 'loading'
                      ? 'جاري التحديث...'
                      : refreshState === 'success'
                        ? 'تم التحديث'
                        : 'تحديث الصفحة'}
                  </span>
                )}
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems
                .filter((item) => {
                  return (
                    !item.permission ||
                    hasPermission(item.permission.section, item.permission.action as string)
                  )
                })
                .map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.path
                  const hasBadge = item.badge && item.badge.count > 0

                  const navItem = (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`
                        group relative flex items-center justify-between
                        ${isCollapsed ? 'px-2.5 justify-center' : 'px-3.5'}
                        py-2.5 rounded-xl border
                        transition-all duration-[var(--motion-fast)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]
                        ${
                          isActive
                            ? 'border-[var(--color-primary-800)]/40 bg-[var(--color-primary-800)] text-white font-semibold shadow-[var(--shadow-sm)]'
                            : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground'
                        }
                      `}
                    >
                      <div
                        className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'} flex-1 min-w-0`}
                      >
                        <Icon
                          className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
                            isActive ? 'scale-110' : 'group-hover:scale-105'
                          }`}
                        />
                        {!isCollapsed && <span className="text-[12px] truncate">{item.label}</span>}
                      </div>

                      {hasBadge &&
                        !isCollapsed &&
                        (item.badgeTooltip ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`
                                flex items-center justify-center
                                min-w-[18px] h-[18px] px-1 rounded-full
                                text-[10px] font-bold text-white
                                shadow-sm transition-transform duration-200
                                ${item.badge?.color === 'red' ? 'bg-[var(--color-danger-500)]' : 'bg-[var(--color-neutral-700)]'}
                                ${isActive ? 'scale-110' : 'group-hover:scale-105'}
                              `}
                              >
                                {item.badge!.count > 99 ? '99+' : item.badge!.count}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="bg-neutral-900 text-white">
                              {item.badgeTooltip}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <div
                            className={`
                            flex items-center justify-center
                            min-w-[18px] h-[18px] px-1 rounded-full
                            text-[10px] font-bold text-white
                            shadow-sm transition-transform duration-200
                            ${item.badge?.color === 'red' ? 'bg-[var(--color-danger-500)]' : 'bg-[var(--color-neutral-700)]'}
                            ${isActive ? 'scale-110' : 'group-hover:scale-105'}
                          `}
                          >
                            {item.badge!.count > 99 ? '99+' : item.badge!.count}
                          </div>
                        ))}

                      {hasBadge && isCollapsed && (
                        <div
                          className={`
                          absolute -top-0.5 -right-0.5
                          h-2 w-2 rounded-full
                          ${item.badge?.color === 'red' ? 'bg-[var(--color-danger-500)]' : 'bg-[var(--color-neutral-700)]'}
                          ring-2 ring-white dark:ring-neutral-950
                        `}
                        />
                      )}

                      {/* Active indicator */}
                      {isActive && (
                        <div className="absolute inset-inline-start-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-[var(--color-primary-800)] rounded-e-full" />
                      )}
                    </Link>
                  )

                  // Wrap with Tooltip when collapsed
                  if (isCollapsed) {
                    return (
                      <Tooltip key={item.path}>
                        <TooltipTrigger asChild>{navItem}</TooltipTrigger>
                        <TooltipContent side="right" className="bg-neutral-900 text-white">
                          <div className="flex items-center gap-2">
                            <span>{item.label}</span>
                            {hasBadge && (
                              <span
                                className={`
                                px-1.5 py-0.5 rounded text-xs font-bold
                                ${item.badge?.color === 'red' ? 'bg-[var(--color-danger-500)]' : 'bg-[var(--color-neutral-700)]'}
                              `}
                              >
                                {item.badge!.count > 99 ? '99+' : item.badge!.count}
                              </span>
                            )}
                          </div>
                          {item.badgeTooltip && (
                            <div className="mt-1 text-[10px] text-neutral-300">
                              {item.badgeTooltip}
                            </div>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    )
                  }

                  return navItem
                })}
            </nav>

            {/* User Actions Section at Bottom */}
            <div className="mt-auto border-t border-border bg-surface/80 p-2">
              {!isCollapsed ? (
                <div className="space-y-1">
                  <button
                    onClick={toggleTheme}
                    className="w-full group relative flex items-center gap-2.5 rounded-[var(--radius-lg)] px-3 py-2 text-muted-foreground transition-all duration-200 ease-in-out hover:bg-muted hover:text-foreground"
                    type="button"
                  >
                    {isDark ? (
                      <Sun className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <Moon className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span className="text-xs">{isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}</span>
                  </button>
                  <button
                    onClick={async () => {
                      await handleSignOut()
                    }}
                    className="w-full group relative flex items-center gap-2.5 rounded-[var(--radius-lg)] px-3 py-2 text-muted-foreground transition-all duration-200 ease-in-out hover:bg-[var(--color-danger-subtle)] hover:text-[var(--color-danger-foreground)]"
                    data-testid="logout-btn-mobile"
                  >
                    <LogOut className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs">تسجيل خروج</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={toggleTheme}
                        className="rounded-[var(--radius-lg)] p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        type="button"
                      >
                        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-neutral-900 text-white">
                      {isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={async () => {
                          await handleSignOut()
                        }}
                        className="rounded-[var(--radius-lg)] p-2 text-muted-foreground transition-colors hover:bg-[var(--color-danger-subtle)] hover:text-[var(--color-danger-foreground)]"
                        data-testid="logout-btn"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-neutral-900 text-white">
                      تسجيل خروج
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>
          </aside>

          {/* Main Content */}
          <main
            className={`flex-1 pb-20 pt-16 lg:pb-0 lg:pt-16 transition-all duration-300 ${isCollapsed ? 'lg:ml-0' : ''}`}
          >
            {children}
          </main>
        </div>

        <button
          onClick={toggleTheme}
          type="button"
          className="fixed bottom-24 inset-inline-start-4 z-40 flex items-center gap-2 rounded-full border border-border bg-surface/95 px-3 py-2 text-foreground shadow-[var(--shadow-lg)] backdrop-blur lg:hidden"
          aria-label={isDark ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span className="text-xs font-medium">{isDark ? 'فاتح' : 'داكن'}</span>
        </button>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav navItems={navItems} />
      </div>
    </TooltipProvider>
  )
}
