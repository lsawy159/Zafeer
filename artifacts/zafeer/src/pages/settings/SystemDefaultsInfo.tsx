export function SystemDefaultsInfo() {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border-200 bg-surface-secondary-50 p-3">
        <h3 className="mb-1 text-sm font-semibold text-foreground">ثوابت النظام</h3>
        <p className="text-xs leading-relaxed text-foreground-secondary">
          هذه القيم أساسية في النظام وتمت إزالتها من الإعدادات القابلة للتعديل.
        </p>
      </div>

      <div className="space-y-2">
        <div className="rounded-lg border border-border-100 bg-surface p-3">
          <p className="text-xs text-foreground-tertiary">المنطقة الزمنية</p>
          <p className="text-sm font-medium text-foreground">Asia/Riyadh</p>
        </div>

        <div className="rounded-lg border border-border-100 bg-surface p-3">
          <p className="text-xs text-foreground-tertiary">لغة النظام</p>
          <p className="text-sm font-medium text-foreground">العربية</p>
        </div>

        <div className="rounded-lg border border-border-100 bg-surface p-3">
          <p className="text-xs text-foreground-tertiary">العملة</p>
          <p className="text-sm font-medium text-foreground">الريال السعودي (SAR)</p>
        </div>

        <div className="rounded-lg border border-border-100 bg-surface p-3">
          <p className="text-xs text-foreground-tertiary">تنسيق التاريخ</p>
          <p className="text-sm font-medium text-foreground">ar-SA</p>
        </div>
      </div>
    </div>
  )
}
