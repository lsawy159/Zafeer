import type { GeneralSetting } from './SettingControl'
import {
  Globe,
  Shield,
  Clock,
  Database as DatabaseIcon,
  BarChart3,
  Users,
  AlertTriangle,
  Mail,
  BookOpen,
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
  | 'email-settings'
  | 'alert-settings'
  | 'backup'
  | 'activity-logs'
  | 'adhkar-settings'

export const ALLOWED_TABS: TabType[] = [
  'system',
  'sessions',
  'audit',
  'permissions',
  'email-settings',
  'alert-settings',
  'backup',
  'activity-logs',
  'adhkar-settings',
]

export function buildSettingsCategories(
  SystemDefaultsInfo: React.ComponentType,
  BackupTab: React.ComponentType,
  SessionsManager: React.ComponentType,
  AuditDashboard: React.ComponentType,
  PermissionsPanel: React.ComponentType,
  UnifiedSettings: React.ComponentType,
  ActivityLogsEmbedded: React.ComponentType,
  EmailSettingsTab: React.ComponentType,
  AdhkarTab: React.ComponentType
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
      key: 'email-settings',
      label: 'إرسال الإيميلات',
      description:
        'إدارة مستلمي الإيميلات، إعدادات الإرسال التلقائي، ساعات الصمت، وإرسال النسخ والتقارير يدوياً.',
      icon: Mail,
      component: EmailSettingsTab,
    },
    {
      key: 'alert-settings',
      label: 'إعدادات التنبيهات',
      description: 'تخصيص حدود التنبيهات وألوانها وحالاتها: ما يعتبر تنبيهاً حرجاً، والألوان المرتبطة بكل حالة.',
      icon: AlertTriangle,
      component: UnifiedSettings,
    },
    {
      key: 'activity-logs',
      label: 'سجل الأنشطة',
      description: 'عرض كامل لسجل الإجراءات والعمليات التي تمت في النظام مع التوقيت والمستخدم المسؤول.',
      icon: Clock,
      component: ActivityLogsEmbedded,
    },
    {
      key: 'adhkar-settings',
      label: 'الأذكار',
      description: 'إضافة وتعديل وحذف الأذكار المعروضة في التطبيق، وضبط مدة العرض والفاصل الزمني بين الأذكار.',
      icon: BookOpen,
      component: AdhkarTab,
    },
  ]
}
