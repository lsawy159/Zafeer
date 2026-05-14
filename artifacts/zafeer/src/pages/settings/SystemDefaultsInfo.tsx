export function SystemDefaultsInfo() {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border-200 bg-surface-secondary-50 p-3">
        <h3 className="mb-1 text-sm font-semibold text-gray-900">ثوابت النظام</h3>
        <p className="text-xs leading-relaxed text-gray-600">
          هذه القيم أساسية في النظام وتمت إزالتها من الإعدادات القابلة للتعديل.
        </p>
      </div>

      <div className="space-y-2">
        <div className="rounded-lg border border-border-100 bg-surface p-3">
          <p className="text-xs text-gray-500">المنطقة الزمنية</p>
          <p className="text-sm font-medium text-gray-900">Asia/Riyadh</p>
        </div>

        <div className="rounded-lg border border-border-100 bg-surface p-3">
          <p className="text-xs text-gray-500">لغة النظام</p>
          <p className="text-sm font-medium text-gray-900">العربية</p>
        </div>

        <div className="rounded-lg border border-border-100 bg-surface p-3">
          <p className="text-xs text-gray-500">العملة</p>
          <p className="text-sm font-medium text-gray-900">الريال السعودي (SAR)</p>
        </div>

        <div className="rounded-lg border border-border-100 bg-surface p-3">
          <p className="text-xs text-gray-500">تنسيق التاريخ</p>
          <p className="text-sm font-medium text-gray-900">ar-SA</p>
        </div>
      </div>
    </div>
  )
}
