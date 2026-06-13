import { AlertTriangle, Bell, Eye, Save, Settings as SettingsIcon, TrendingUp } from 'lucide-react'
import { useUnifiedSettings } from './UnifiedSettings/useUnifiedSettings'
import { DEFAULT_SETTINGS } from './UnifiedSettings/unifiedSettingsConfig'
import { EmployeeThresholdsSection } from './UnifiedSettings/EmployeeThresholdsSection'
import { CompanyThresholdsSection } from './UnifiedSettings/CompanyThresholdsSection'
import { usePermissions } from '@/utils/permissions'

export default function UnifiedSettings({ isReadOnly }: { isReadOnly?: boolean } = {}) {
  const { canEdit } = usePermissions()
  const resolvedReadOnly = isReadOnly ?? !canEdit('alertsSettings')
  const ctx = useUnifiedSettings({ isReadOnly: resolvedReadOnly })
  const {
    settings, setSettings,
    loading, saving,
    activeTab, setActiveTab,
    expiredSettings,
    employeePreviews, companyPreviews,
    handleSave,
    handleExpiredInclusionChange,
  } = ctx

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* رأس الصفحة */}
      <div className="app-panel p-3">
        <div className="flex items-center gap-2">
          <div className="app-icon-chip">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-neutral-900">إعدادات التنبيهات</h1>
            <p className="mt-0.5 text-[11px] text-slate-500">
              صفحة موحدة لإعدادات الحالات والتنبيهات وألوان الجداول
            </p>
          </div>
        </div>
      </div>

      {/* تبويبات الأقسام */}
      <div className="app-toggle-shell p-1.5">
        <div className="flex gap-1.5 w-full">
          <button
            onClick={() => setActiveTab('employees')}
            className={`flex-1 px-3 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 ${
              activeTab === 'employees' ? 'app-toggle-button-active' : 'app-toggle-button'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Bell className="w-4 h-4" />
              <span>إعدادات الموظفين</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('companies')}
            className={`flex-1 px-3 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 ${
              activeTab === 'companies' ? 'app-toggle-button-active' : 'app-toggle-button'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              <span>إعدادات المؤسسات</span>
            </div>
          </button>
        </div>
      </div>

      {activeTab === 'employees' && (
        <EmployeeThresholdsSection
          settings={settings}
          setSettings={setSettings}
          employeePreviews={employeePreviews}
          isReadOnly={resolvedReadOnly}
        />
      )}

      {activeTab === 'companies' && (
        <CompanyThresholdsSection
          settings={settings}
          setSettings={setSettings}
          companyPreviews={companyPreviews}
          isReadOnly={resolvedReadOnly}
        />
      )}

      {/* تضمين المنتهي */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="app-icon-chip">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900">تضمين المنتهي</h3>
            <p className="text-xs text-neutral-600 mt-0.5">
              تحكم في إظهار العناصر المنتهية داخل التنبيهات والإشعارات.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {(
            [
              { key: 'include_in_alerts' as const, label: 'تضمين المنتهي في صفحة التنبيهات' },
              { key: 'include_in_notifications' as const, label: 'تضمين المنتهي في صفحة الإشعارات' },
            ] as const
          ).map(({ key, label }) => (
            <label
              key={key}
              className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={expiredSettings[key]}
                disabled={resolvedReadOnly}
                onChange={(event) => handleExpiredInclusionChange(key, event.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-neutral-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* أزرار الحفظ */}
      {!resolvedReadOnly && (
        <div className="flex items-center justify-end gap-2.5 bg-white rounded-lg shadow-sm border border-neutral-200 p-3">
          <button
            onClick={() => setSettings(DEFAULT_SETTINGS)}
            className="px-4 py-2 text-sm border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 transition font-semibold"
            disabled={saving}
          >
            استعادة الافتراضي
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="app-button-primary text-sm disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saving ? 'جاري الحفظ...' : 'حفظ جميع التغييرات'}
          </button>
        </div>
      )}

      {resolvedReadOnly && (
        <div className="app-info-block rounded-lg p-3">
          <div className="flex items-start gap-2.5">
            <Eye className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-slate-900">وضع العرض فقط</p>
              <p className="text-xs text-slate-700 mt-0.5">
                ليس لديك صلاحية تعديل الإعدادات. اطلب من المدير إعطاء الصلاحية اللازمة.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ملاحظة توضيحية */}
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-900 mb-1.5">نظام موحد للموظفين والمؤسسات</h4>
            <ul className="text-[13px] text-amber-800 space-y-1 list-disc list-inside">
              <li>
                <strong>المسميات الموحدة:</strong> جميع الأقسام تستخدم نفس المسميات:{' '}
                <span className="font-bold">طارئ - عاجل - متوسط - ساري</span>
              </li>
              <li>
                <strong>إعدادات الموظفين:</strong> تؤثر على ألوان الجداول، الكروت، والتنبيهات
                (الإقامة، العقود، التأمين الصحي، عقد أجير)
              </li>
              <li>
                <strong>إعدادات المؤسسات:</strong> نفس النظام تماماً (السجل التجاري، التأمينات،
                اشتراك قوى، اشتراك مقيم)
              </li>
              <li>
                <strong>الألوان الموحدة:</strong> 🔴 أحمر (طارئ) | 🟠 برتقالي (عاجل) | 🟡 أصفر
                (متوسط) | 🟢 أخضر (ساري)
              </li>
              <li>
                <strong>القاعدة:</strong> أي قيمة أكبر من "متوسط" تعتبر تلقائياً في حالة "ساري"
                (أخضر)
              </li>
              <li>
                <strong>التنعكاس الفوري:</strong> أي تغيير هنا ينعكس تلقائياً على جميع أجزاء النظام
                بعد الحفظ
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
