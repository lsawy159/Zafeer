import type { GeneralSetting } from './SettingControl'
import {
  Globe,
  Shield,
  FileText,
  Clock,
  Database as DatabaseIcon,
  Bell,
  BarChart3,
  Users,
  AlertTriangle,
} from 'lucide-react'

export interface SettingsCategory {
  key: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  settings?: GeneralSetting[]
  component?: React.ComponentType
}

export type TabType =
  | 'system'
  | 'sessions'
  | 'audit'
  | 'permissions'
  | 'reports'
  | 'advanced-notifications'
  | 'alert-settings'
  | 'backup'
  | 'activity-logs'

export const ALLOWED_TABS: TabType[] = [
  'system',
  'sessions',
  'audit',
  'permissions',
  'reports',
  'advanced-notifications',
  'alert-settings',
  'backup',
  'activity-logs',
]

export const LEGACY_SYSTEM_SETTINGS_KEYS = [
  'system_timezone',
  'system_language',
  'system_currency',
  'date_format',
  'working_hours_start',
  'working_hours_end',
]

export const REPORTS_SETTINGS: GeneralSetting[] = [
  {
    setting_key: 'report_default_format',
    setting_value: 'excel',
    category: 'reports',
    description: 'تنسيق التقارير الافتراضي',
    setting_type: 'select',
    options: ['excel', 'csv'],
  },
  {
    setting_key: 'report_auto_schedule',
    setting_value: false,
    category: 'reports',
    description: 'تفعيل الجدولة التلقائية للتقارير',
    setting_type: 'boolean',
  },
  {
    setting_key: 'report_recipients',
    setting_value: '',
    category: 'reports',
    description: 'المستلمون الافتراضيون للتقارير (البريد الإلكتروني)',
    setting_type: 'text',
  },
  {
    setting_key: 'report_include_charts',
    setting_value: true,
    category: 'reports',
    description: 'تضمين الرسوم البيانية في التقارير',
    setting_type: 'boolean',
  },
  {
    setting_key: 'report_company_logo',
    setting_value: true,
    category: 'reports',
    description: 'إضافة شعار الشركة للتقارير',
    setting_type: 'boolean',
  },
]

export const NOTIFICATIONS_SETTINGS: GeneralSetting[] = [
  {
    setting_key: 'notification_methods',
    setting_value: 'in_app',
    category: 'notifications',
    description: 'طرق الإرسال',
    setting_type: 'select',
    options: ['in_app', 'email', 'sms', 'all'],
  },
  {
    setting_key: 'notification_frequency',
    setting_value: 'immediate',
    category: 'notifications',
    description: 'تكرار الإشعارات',
    setting_type: 'select',
    options: ['immediate', 'hourly', 'daily', 'weekly'],
  },
  {
    setting_key: 'urgent_notifications',
    setting_value: true,
    category: 'notifications',
    description: 'تفعيل الإشعارات العاجلة',
    setting_type: 'boolean',
  },
  {
    setting_key: 'residence_expiry_days',
    setting_value: 30,
    category: 'notifications',
    description: 'التنبيه قبل انتهاء الإقامة (بالأيام)',
    setting_type: 'number',
  },
  {
    setting_key: 'contract_expiry_days',
    setting_value: 30,
    category: 'notifications',
    description: 'التنبيه قبل انتهاء العقد (بالأيام)',
    setting_type: 'number',
  },
  {
    setting_key: 'quiet_hours_start',
    setting_value: '22:00',
    category: 'notifications',
    description: 'بداية فترة الصمت (لا إشعارات)',
    setting_type: 'time',
  },
  {
    setting_key: 'quiet_hours_end',
    setting_value: '08:00',
    category: 'notifications',
    description: 'نهاية فترة الصمت',
    setting_type: 'time',
  },
]

export function buildSettingsCategories(
  SystemDefaultsInfo: React.ComponentType,
  BackupTab: React.ComponentType,
  SessionsManager: React.ComponentType,
  AuditDashboard: React.ComponentType,
  PermissionsPanel: React.ComponentType,
  UnifiedSettings: React.ComponentType,
  ActivityLogsEmbedded: React.ComponentType
): SettingsCategory[] {
  return [
    {
      key: 'system',
      label: 'إعدادات النظام الأساسية',
      description: 'إعدادات أساسية ثابتة على مستوى النظام وغير قابلة للتعديل من الواجهة.',
      icon: Globe,
      component: SystemDefaultsInfo,
    },
    {
      key: 'backup',
      label: 'النسخ الاحتياطية',
      description: 'جدولة النسخ الاحتياطي التلقائي وعرض سجل العمليات السابقة وتحميل النسخ المحفوظة.',
      icon: DatabaseIcon,
      component: BackupTab,
    },
    {
      key: 'sessions',
      label: 'إدارة الجلسات النشطة',
      description: 'عرض جميع الجلسات المفتوحة حالياً لجميع المستخدمين وإمكانية إنهاء أي جلسة عن بُعد.',
      icon: Users,
      component: SessionsManager,
    },
    {
      key: 'audit',
      label: 'لوحة المراجعة والتدقيق',
      description: 'سجل كامل لكل عمليات الإضافة والتعديل والحذف في النظام مع التوقيت والمستخدم المسؤول.',
      icon: BarChart3,
      component: AuditDashboard,
    },
    {
      key: 'permissions',
      label: 'إدارة الصلاحيات',
      description: 'تحديد صلاحيات كل مستخدم وتعيين الأدوار (مدير / مسؤول / مستخدم) والتحكم في ما يستطيع رؤيته وتعديله.',
      icon: Shield,
      component: PermissionsPanel,
    },
    {
      key: 'reports',
      label: 'إعدادات التقارير',
      description: 'تحديد تنسيق التقارير الافتراضي (Excel/CSV)، جدولة الإرسال التلقائي للبريد الإلكتروني، وإضافة شعار الشركة.',
      icon: FileText,
      settings: REPORTS_SETTINGS,
    },
    {
      key: 'advanced-notifications',
      label: 'إعدادات الإشعارات المتقدمة',
      description: 'التحكم في طريقة الإشعارات (داخل التطبيق / بريد / SMS)، وتحديد عدد الأيام للتنبيه قبل انتهاء الإقامات والعقود، وساعات الصمت.',
      icon: Bell,
      settings: NOTIFICATIONS_SETTINGS,
    },
    {
      key: 'alert-settings',
      label: 'إعدادات التنبيهات',
      description: 'تخصيص حدود التنبيهات وألوانها وحالاتها: ما يُعتبر تنبيهاً حرجاً، والألوان المرتبطة بكل حالة.',
      icon: AlertTriangle,
      component: UnifiedSettings,
    },
    {
      key: 'activity-logs',
      label: 'سجل الأنشطة',
      description: 'عرض كامل سجل الإجراءات والعمليات التي تمت في النظام مع التوقيت والمستخدم المسؤول.',
      icon: Clock,
      component: ActivityLogsEmbedded,
    },
  ]
}
