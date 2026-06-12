import {
  Home,
  Users,
  Building2,
  Briefcase,
  Truck,
  AlertCircle,
  BarChart3,
  Wallet,
  Upload,
  Bell,
  Settings,
  Sliders,
} from 'lucide-react'
import type { ComponentType } from 'react'

export type NavGroupId = 'operational' | 'admin'

export interface NavItem {
  id: string
  labelAr: string
  labelEn: string
  icon: ComponentType<{ className?: string }>
  to: string
  requiredPermission?: string
  group: NavGroupId
  order: number
}

export interface NavGroup {
  id: NavGroupId
  labelAr: string
  labelEn: string
  items: NavItem[]
}

export const NAV_ITEMS: NavItem[] = [
  // Operational Group
  {
    id: 'dashboard',
    labelAr: 'لوحة التحكم',
    labelEn: 'Dashboard',
    icon: Home,
    to: '/dashboard',
    group: 'operational',
    order: 1,
  },
  {
    id: 'employees',
    labelAr: 'الموظفون',
    labelEn: 'Employees',
    icon: Users,
    to: '/employees',
    group: 'operational',
    order: 2,
  },
  {
    id: 'companies',
    labelAr: 'الشركات',
    labelEn: 'Companies',
    icon: Building2,
    to: '/companies',
    group: 'operational',
    order: 3,
  },
  {
    id: 'projects',
    labelAr: 'المشاريع',
    labelEn: 'Projects',
    icon: Briefcase,
    to: '/projects',
    group: 'operational',
    order: 4,
  },
  {
    id: 'transfer-procedures',
    labelAr: 'إجراءات النقل',
    labelEn: 'Transfer Procedures',
    icon: Truck,
    to: '/transfer-procedures',
    group: 'operational',
    order: 5,
  },
  {
    id: 'alerts',
    labelAr: 'التنبيهات',
    labelEn: 'Alerts',
    icon: AlertCircle,
    to: '/alerts',
    group: 'operational',
    order: 7,
  },
  {
    id: 'reports',
    labelAr: 'تقارير المستندات',
    labelEn: 'Reports & Statistics',
    icon: BarChart3,
    to: '/reports',
    group: 'operational',
    order: 8,
  },
  {
    id: 'finance',
    labelAr: 'المالية',
    labelEn: 'Finance',
    icon: Wallet,
    to: '/finance',
    group: 'operational',
    order: 9,
  },
  {
    id: 'import-export',
    labelAr: 'استيراد/تصدير',
    labelEn: 'Import/Export',
    icon: Upload,
    to: '/import-export',
    group: 'operational',
    order: 11,
  },
  // Admin Group
  {
    id: 'settings',
    labelAr: 'الإعدادات',
    labelEn: 'Settings',
    icon: Settings,
    to: '/settings',
    requiredPermission: 'manage_settings',
    group: 'admin',
    order: 1,
  },
  {
    id: 'alerts-admin',
    labelAr: 'التنبيهات',
    labelEn: 'Alerts',
    icon: Bell,
    to: '/alerts',
    requiredPermission: 'manage_settings',
    group: 'admin',
    order: 2,
  },
  {
    id: 'general-settings',
    labelAr: 'الإعدادات العامة',
    labelEn: 'General Settings',
    icon: Sliders,
    to: '/general-settings',
    requiredPermission: 'manage_system',
    group: 'admin',
    order: 3,
  },
]

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'operational',
    labelAr: 'العمليات',
    labelEn: 'Operational',
    items: NAV_ITEMS.filter((item) => item.group === 'operational').sort(
      (a, b) => a.order - b.order
    ),
  },
  {
    id: 'admin',
    labelAr: 'الإدارة',
    labelEn: 'Administration',
    items: NAV_ITEMS.filter((item) => item.group === 'admin').sort((a, b) => a.order - b.order),
  },
]
