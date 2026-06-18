import { useMemo } from 'react'
import {
  LayoutDashboard,
  Users,
  Building2,
  FolderKanban,
  Database,
  BarChart3,
  ArrowDownUp,
  Bell,
  Wallet,
  RefreshCcw,
  CalendarDays,
} from 'lucide-react'
import { useAlertsStats } from '@/hooks/useAlertsStats'
import { usePermissions } from '@/utils/permissions'

export function useNavItems() {
  const { alertsStats } = useAlertsStats()
  const { hasPermission } = usePermissions()
  const canAccessFinance =
    hasPermission('extracts', 'view') ||
    hasPermission('payroll', 'view') ||
    hasPermission('revenue', 'view')

  const navItems = useMemo(
    () => [
      {
        path: '/dashboard',
        icon: LayoutDashboard,
        label: 'الرئيسية',
        permission: { section: 'dashboard' as const, action: 'view' },
        badge: null,
      },
      {
        path: '/employees',
        icon: Users,
        label: 'الموظفين',
        permission: { section: 'employees' as const, action: 'view' },
        badge:
          alertsStats.employeeUrgent > 0
            ? { count: alertsStats.employeeUrgent, color: 'red' }
            : null,
        badgeTooltip: 'التنبيهات الطارئة فقط',
      },
      {
        path: '/companies',
        icon: Building2,
        label: 'المؤسسات',
        permission: { section: 'companies' as const, action: 'view' },
        badge:
          alertsStats.companyUrgent > 0 ? { count: alertsStats.companyUrgent, color: 'red' } : null,
        badgeTooltip: 'التنبيهات الطارئة فقط',
      },
      {
        path: '/projects',
        icon: FolderKanban,
        label: 'المشاريع',
        permission: { section: 'projects' as const, action: 'view' },
        badge: null,
      },
      {
        path: '/transfer-procedures',
        icon: RefreshCcw,
        label: 'إجراءات النقل',
        permission: { section: 'transferProcedures' as const, action: 'view' },
        badge: null,
      },
      {
        path: '/employee-leaves',
        icon: CalendarDays,
        label: 'إجازات الموظفين',
        permission: { section: 'employeeLeaves' as const, action: 'view' },
        badge: null,
      },
      {
        path: '/alerts',
        icon: Bell,
        label: 'التنبيهات',
        permission: { section: 'alerts' as const, action: 'view' },
        badge:
          alertsStats.total > 0
            ? { count: alertsStats.total, color: alertsStats.urgent > 0 ? 'red' : 'blue' }
            : null,
      },
      {
        path: '/finance',
        icon: Wallet,
        label: 'المالية',
        permission: null,
        badge: null,
      },
      {
        path: '/reports',
        icon: BarChart3,
        label: 'تقارير المستندات',
        permission: { section: 'reports' as const, action: 'view' },
        badge: null,
      },
      {
        path: '/import-export',
        icon: ArrowDownUp,
        label: 'استيراد/تصدير',
        permission: { section: 'importExport' as const, action: 'view' },
        badge: null,
      },
      {
        path: '/admin-settings',
        icon: Database,
        label: 'إعدادات النظام',
        permission: { section: 'adminSettings' as const, action: 'view' },
        badge: null,
      },
    ],
    [alertsStats, canAccessFinance]
  )

  const visibleNavItems = useMemo(
    () =>
      navItems.filter((item) => {
        if (item.path === '/finance') {
          return canAccessFinance
        }

        return (
          !item.permission ||
          hasPermission(item.permission.section, item.permission.action as string)
        )
      }),
    [navItems, hasPermission, canAccessFinance]
  )

  const quickSearchItems = useMemo(
    () =>
      visibleNavItems
        .map((item) => ({
          path: item.path,
          label: item.label,
          description: `الانتقال إلى ${item.label}`,
          keywords: [
            item.label,
            item.path,
            item.path.replace('/', ''),
            item.path.includes('employees') ? 'موظف' : '',
            item.path.includes('companies') ? 'مؤسسة' : '',
            item.path.includes('alerts') ? 'تنبيه' : '',
            item.path.includes('transfer') ? 'نقل' : '',
            item.path.includes('finance') ? 'مالية' : '',
            item.path.includes('finance') ? 'راتب' : '',
            item.path.includes('finance') ? 'مستخلص' : '',
            item.path.includes('employee-leaves') ? 'إجازة' : '',
            item.path.includes('employee-leaves') ? 'اجازات' : '',
          ].filter(Boolean),
        })),
    [visibleNavItems]
  )

  return { navItems: visibleNavItems, quickSearchItems, alertsStats }
}
