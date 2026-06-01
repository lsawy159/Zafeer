/**
 * PERMISSIONS_SCHEMA.ts
 *
 * المصدر الوحيد لجميع أقسام الصلاحيات والأفعال
 * Single Source of Truth للنظام الذكي للصلاحيات
 *
 * فوائد الاستخدام:
 * - إضافة قسم جديد: سطر واحد فقط → يظهر في الواجهة تلقائيًا
 * - الأفعال الديناميكية: أي تغيير هنا ينعكس على كل مكان
 * - عدم تكرار الكود: لا محاكاة أو hardcoding
 */

/**
 * الأقسام والأفعال المسموح بها
 * كل قسم يحتوي على:
 * - label: الاسم المعروض بالعربية
 * - actions: مصفوفة الأفعال المتاحة للقسم
 */
export const PERMISSION_SECTIONS = {
  // [active] — dashboard.view
  dashboard: {
    label: 'الرئيسية',
    description: 'عرض لوحة المؤشرات الرئيسية فقط.',
    actions: ['view'] as const,
  },
  // [active] — employees.{view,create,edit,delete}
  employees: {
    label: 'الموظفين',
    description: 'إدارة بيانات الموظفين وسجلاتهم الأساسية.',
    actions: ['view', 'create', 'edit', 'delete'] as const,
  },
  // [active] — companies.{view,create,edit,delete}
  companies: {
    label: 'المؤسسات',
    description: 'إدارة المؤسسات والكيانات المرتبطة بالموظفين.',
    actions: ['view', 'create', 'edit', 'delete'] as const,
  },
  // [active] — projects.{view,create,edit,delete}
  projects: {
    label: 'المشاريع',
    description: 'إدارة المشاريع وربط الموظفين وطلبات النقل بها.',
    actions: ['view', 'create', 'edit', 'delete'] as const,
  },
  // [active] — transferProcedures.{view,create,edit,delete,import,export}
  transferProcedures: {
    label: 'إجراءات النقل',
    description: 'صفحة تشغيلية مستقلة لإدارة طلبات النقل، تحديث حالتها، ثم تحويل الطلب إلى موظف.',
    actions: ['view', 'create', 'edit', 'delete', 'import', 'export'] as const,
  },
  // [active] — alerts.view
  alerts: {
    label: 'التنبيهات',
    description: 'متابعة التنبيهات والإشعارات المهمة داخل النظام.',
    actions: ['view'] as const,
  },
  // [active] — reports.{view,export}
  reports: {
    label: 'التقارير',
    description: 'عرض التقارير النظامية وتصديرها فقط، بدون منح صلاحيات الرواتب أو النقل تلقائيًا.',
    actions: ['view', 'export'] as const,
  },
  // [active] — payroll.{view,create,delete,export}
  payroll: {
    label: 'الرواتب والاستقطاعات',
    description: 'صلاحية مستقلة لمسيرات الرواتب والاستقطاعات، منفصلة تمامًا عن التقارير.',
    actions: ['view', 'create', 'delete', 'export'] as const,
  },
  // [active] — activityLogs.view; embedded tab in adminSettings; key retained for future narrowing
  activityLogs: {
    label: 'سجل النشاطات',
    description: 'عرض سجل العمليات والتغييرات داخل النظام.',
    actions: ['view'] as const,
  },
  // [active] — importExport.{view,import,export}
  importExport: {
    label: 'استيراد/تصدير',
    description:
      'صفحة ملفات Excel فقط. صلاحيتها لا تعني إدارة إجراءات النقل نفسها، بل استيرادها وتصديرها كملفات.',
    actions: ['view', 'import', 'export'] as const,
  },
  // [active] — users.{view,create,edit}; users.delete: [orphaned] removed — no frontend delete path for public.users
  users: {
    label: 'المستخدمين',
    description: 'الوصول إلى شاشة إدارة المستخدمين وصلاحياتهم.',
    actions: ['view', 'create', 'edit'] as const,
  },
  // [active] — extracts.{view,create,edit,delete,export}; served via /finance redirect
  extracts: {
    label: 'المستخلصات',
    description: 'إنشاء وتصدير فواتير التكاليف الشهرية للمشاريع الخارجية.',
    actions: ['view', 'create', 'edit', 'delete', 'export'] as const,
  },
  // [active] — revenue.{view,manage}
  revenue: {
    label: 'الإيرادات والربحية',
    description: 'عرض تقارير الإيرادات والهامش للمشاريع. يجمع بيانات المستخلصات والرواتب.',
    actions: ['view', 'manage'] as const,
    // view: يتيح عرض تبويب الإيرادات وجدول P&L والأرقام الإجمالية للوضع النقدي
    // manage: يتيح إضافةً لـ view — فتح قائمة الالتزامات المسددة وتنفيذ حذفها النهائي
  },
  // [active] — adminSettings.{view,edit}; governs: system tab + advanced-notifications tab
  adminSettings: {
    label: 'إعدادات النظام',
    description: 'إعدادات النظام الأساسية وإعدادات الإشعارات العامة.',
    actions: ['view', 'edit'] as const,
  },
  // [active] — backupSettings.{view,edit}; governs backup tab in /admin-settings
  backupSettings: {
    label: 'النسخ الاحتياطية',
    description: 'عرض وإدارة النسخ الاحتياطية وجدولتها.',
    actions: ['view', 'edit'] as const,
  },
  // [active] — sessionsManagement.{view,delete}; governs sessions tab in /admin-settings
  sessionsManagement: {
    label: 'إدارة الجلسات',
    description: 'عرض الجلسات النشطة وإنهاء أي جلسة عن بُعد.',
    actions: ['view', 'delete'] as const,
  },
  // [active] — emailSettings.{view,edit}; governs email-settings tab in /admin-settings
  emailSettings: {
    label: 'إعدادات الإيميلات',
    description: 'إدارة مستلمي الإيميلات وإعدادات الإرسال التلقائي.',
    actions: ['view', 'edit'] as const,
  },
  // [active] — alertsSettings.{view,edit}; governs alert-settings tab in /admin-settings
  alertsSettings: {
    label: 'إعدادات التنبيهات',
    description: 'تخصيص حدود التنبيهات وألوانها وحالاتها.',
    actions: ['view', 'edit'] as const,
  },
  // [orphaned] — centralizedSettings.{view,edit}: old /centralized-settings route redirected into
  // /admin-settings umbrella; no active RLS/RPC enforcement; subsumed by adminSettings.
  // Removed from editable catalog per T007 (see research.md Audit Catalog).
} as const

/**
 * قائمة تسميات الأفعال المترجمة
 */
export const ACTION_LABELS: Record<string, string> = {
  view: 'عرض',
  create: 'إضافة',
  edit: 'تعديل',
  delete: 'حذف',
  import: 'استيراد',
  export: 'تصدير',
}

/**
 * قائمة أسماء الأقسام الصحيحة (للتحقق والطبطين)
 */
export const VALID_PERMISSION_SECTIONS = Object.keys(
  PERMISSION_SECTIONS
) as (keyof typeof PERMISSION_SECTIONS)[]

/**
 * نسخة المخطط (للمتابعة والترقيات المستقبلية)
 */
export const PERMISSION_SCHEMA_VERSION = '2.1'

/**
 * Helper: الحصول على الأفعال المسموح بها لقسم معين
 */
export function getActionsForSection(
  sectionName: keyof typeof PERMISSION_SECTIONS
): readonly string[] {
  return PERMISSION_SECTIONS[sectionName]?.actions ?? []
}

/**
 * Helper: الحصول على تسمية القسم بالعربية
 */
export function getSectionLabel(sectionName: keyof typeof PERMISSION_SECTIONS): string {
  return PERMISSION_SECTIONS[sectionName]?.label ?? sectionName
}

/**
 * Helper: التحقق من صحة قسم معين
 */
export function isValidSection(
  sectionName: string
): sectionName is keyof typeof PERMISSION_SECTIONS {
  return sectionName in PERMISSION_SECTIONS
}

/**
 * Helper: التحقق من صحة فعل معين لقسم معين
 */
export function isValidAction(
  sectionName: keyof typeof PERMISSION_SECTIONS,
  action: string
): boolean {
  const validActions = getActionsForSection(sectionName)
  return validActions.includes(action as never)
}
