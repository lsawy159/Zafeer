import { cn } from '@/lib/utils'
import { StatusBadgeProps } from '@/types'

/**
 * Unified Status Badge Component
 * Replaces 20+ inline badge implementations across the app
 * Ensures consistent styling and semantic color coding
 */
export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const statusColors = {
    active: 'bg-[var(--color-success-subtle)] text-[var(--color-success-foreground)]',
    inactive: 'bg-[var(--color-danger-subtle)] text-[var(--color-danger-foreground)]',
    warning: 'bg-[var(--color-warning-subtle)] text-[var(--color-warning-foreground)]',
    expired: 'bg-[var(--color-muted)] text-muted-foreground',
  }

  return (
    <span
      className={cn('rounded-full px-3 py-1 text-xs font-semibold', statusColors[status], className)}
    >
      {label}
    </span>
  )
}

/**
 * Role Badge (for user roles)
 * Specific styling for admin/manager/user roles
 */
export function RoleBadge({ role, className }: { role: string; className?: string }) {
  const roleColors: Record<string, string> = {
    admin: 'bg-[var(--color-primary-800)] text-white',
    manager: 'bg-[var(--color-info-subtle)] text-[var(--color-info-foreground)]',
    user: 'bg-[var(--color-muted)] text-muted-foreground',
  }

  const label: Record<string, string> = {
    admin: 'مدير',
    manager: 'مسؤول',
    user: 'مستخدم',
  }

  return (
    <span
      className={cn(
        'rounded-full px-3 py-1 text-xs font-medium',
        roleColors[role] || roleColors.user,
        className
      )}
    >
      {label[role] || role}
    </span>
  )
}
