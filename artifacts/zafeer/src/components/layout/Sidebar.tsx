import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { NAV_GROUPS } from './nav-config'
import { useAuth } from '@/contexts/AuthContext'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const location = useLocation()
  const { user } = useAuth()
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close on route change (mobile)
  useEffect(() => {
    if (isMobile && onClose) {
      onClose()
    }
  }, [location.pathname, isMobile, onClose])

  // Filter nav groups and items based on permissions and role
  const isAdmin = user?.role === 'admin'

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      // Admin items only visible to admins
      if (item.requiredPermission && !isAdmin) return false
      return true
    }),
  })).filter((group) => group.items.length > 0)

  const sidebarContent = (
    <nav className="flex flex-col h-full bg-surface dark:bg-[var(--color-card)] border-s border-border">
      {/* Close button for mobile */}
      {isMobile && (
        <div className="flex justify-end p-4 border-b border-border">
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-[var(--radius-lg)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
            aria-label="إغلاق القائمة الجانبية"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Nav Groups */}
      <div className="flex-1 overflow-y-auto py-[14px]">
        {visibleGroups.map((group, groupIndex) => (
          <div key={group.id} className="mb-[14px]">
            {/* Group Label (show if multiple groups) */}
            {visibleGroups.length > 1 && (
              <div className="px-5 py-1.5 mt-4 first:mt-0">
                <h3 className="eyebrow">
                  {group.labelAr}
                </h3>
              </div>
            )}

            {/* Group Items */}
            <div className="flex flex-col gap-0.5 px-[10px]">
              {group.items.map((item) => {
                const isActive = location.pathname === item.to
                const Icon = item.icon

                return (
                  <Link
                    key={item.id}
                    to={item.to}
                    className={cn(
                      'relative flex items-center gap-3 px-3 py-[9px] rounded-[var(--radius-lg)] text-sm font-medium transition-all duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]',
                      isActive
                        ? 'bg-[var(--color-primary-100)] text-[var(--color-primary-900)] dark:bg-[var(--color-primary-800)]/30 dark:text-[var(--color-primary-200)] font-semibold'
                        : 'text-[var(--color-neutral-700)] dark:text-[var(--color-neutral-300)] hover:bg-muted'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <span
                        className="absolute inset-inline-start-[6px] top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-full bg-[var(--color-primary-800)] dark:bg-[var(--color-primary-300)]"
                        aria-hidden="true"
                      />
                    )}
                    <Icon className="h-[18px] w-[18px] flex-shrink-0" aria-hidden="true" />
                    <span className="flex-1">{item.labelAr}</span>
                  </Link>
                )
              })}
            </div>

            {/* Divider between groups */}
            {groupIndex < visibleGroups.length - 1 && (
              <div className="my-4 mx-2 h-px bg-border" />
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      {user && (
        <div className="border-t border-border p-[14px] flex items-center gap-[10px]">
          <div
            className="h-9 w-9 rounded-full bg-[var(--color-primary-800)] text-white flex items-center justify-center text-xs font-bold flex-shrink-0"
            aria-hidden="true"
          >
            {(user.full_name || user.username || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {user.full_name || user.username}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {user.role === 'admin' ? 'مدير' : user.role === 'manager' ? 'مسؤول' : 'مستخدم'}
            </p>
          </div>
        </div>
      )}
    </nav>
  )

  // Mobile: render as off-canvas drawer
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        {isOpen && (
          <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden="true" />
        )}

        {/* Drawer */}
        <div
          className={cn(
            'fixed inset-y-0 inset-inline-end-0 z-50 w-64 transform transition-transform duration-200 ease-in-out',
            isOpen ? 'translate-x-0' : 'translate-x-full'
          )}
        >
          {sidebarContent}
        </div>
      </>
    )
  }

  // Desktop: render as fixed sidebar
  return (
    <div className="hidden md:block w-[268px] h-screen border-s border-border">
      {sidebarContent}
    </div>
  )
}
