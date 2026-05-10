import { X } from 'lucide-react'

type CommercialRegStatus = 'all' | 'expired' | 'expiring_soon' | 'valid'
type PowerSubscriptionStatus = 'all' | 'expired' | 'expiring_soon' | 'valid'
type MoqeemSubscriptionStatus = 'all' | 'expired' | 'expiring_soon' | 'valid'
type EmployeeCountFilter = 'all' | '1' | '2' | '3' | '4+'
type AvailableSlotsFilter = 'all' | '0' | '1' | '2' | '3' | '4+'
type DateRange = 'all' | 'last_month' | 'last_3_months' | 'last_year' | 'custom'
type ExemptionsFilter = 'all' | 'تم الاعفاء' | 'لم يتم الاعفاء' | 'أخرى'

interface CompaniesFiltersModalProps {
  activeFiltersCount: number
  commercialRegStatus: CommercialRegStatus
  setCommercialRegStatus: (v: CommercialRegStatus) => void
  powerSubscriptionStatus: PowerSubscriptionStatus
  setPowerSubscriptionStatus: (v: PowerSubscriptionStatus) => void
  moqeemSubscriptionStatus: MoqeemSubscriptionStatus
  setMoqeemSubscriptionStatus: (v: MoqeemSubscriptionStatus) => void
  employeeCountFilter: EmployeeCountFilter
  setEmployeeCountFilter: (v: EmployeeCountFilter) => void
  availableSlotsFilter: AvailableSlotsFilter
  setAvailableSlotsFilter: (v: AvailableSlotsFilter) => void
  dateRangeFilter: DateRange
  setDateRangeFilter: (v: DateRange) => void
  customStartDate: string
  setCustomStartDate: (v: string) => void
  customEndDate: string
  setCustomEndDate: (v: string) => void
  exemptionsFilter: ExemptionsFilter
  setExemptionsFilter: (v: ExemptionsFilter) => void
  clearFilters: () => void
  onClose: () => void
}

export function CompaniesFiltersModal({
  activeFiltersCount,
  commercialRegStatus,
  setCommercialRegStatus,
  powerSubscriptionStatus,
  setPowerSubscriptionStatus,
  moqeemSubscriptionStatus,
  setMoqeemSubscriptionStatus,
  employeeCountFilter,
  setEmployeeCountFilter,
  availableSlotsFilter,
  setAvailableSlotsFilter,
  dateRangeFilter,
  setDateRangeFilter,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  exemptionsFilter,
  setExemptionsFilter,
  clearFilters,
  onClose,
}: CompaniesFiltersModalProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 md:items-center md:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-h-[92vh] max-w-4xl flex flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-xl motion-safe-enter md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
          <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-neutral-200">
            <div>
              <h2 className="text-xl font-bold text-neutral-900">الفلاتر والبحث</h2>
              {activeFiltersCount > 0 && (
                <p className="text-sm text-neutral-600 mt-1">{activeFiltersCount} فلتر نشط</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="touch-feedback rounded-lg p-2 transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)] hover:bg-muted"
            >
              <X className="w-5 h-5 text-neutral-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  حالة التسجيل التجاري
                </label>
                <select
                  value={commercialRegStatus}
                  onChange={(e) => setCommercialRegStatus(e.target.value as CommercialRegStatus)}
                  className="focus-ring-brand w-full rounded-md border border-input bg-surface px-3 py-2 text-sm transition-[border-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-out)]"
                >
                  <option value="all">الكل</option>
                  <option value="expired">منتهي</option>
                  <option value="expiring_soon">عاجل</option>
                  <option value="valid">ساري</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  حالة اشتراك قوى
                </label>
                <select
                  value={powerSubscriptionStatus}
                  onChange={(e) =>
                    setPowerSubscriptionStatus(e.target.value as PowerSubscriptionStatus)
                  }
                  className="focus-ring-brand w-full rounded-md border border-input bg-surface px-3 py-2 text-sm transition-[border-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-out)]"
                >
                  <option value="all">الكل</option>
                  <option value="expired">منتهي</option>
                  <option value="expiring_soon">عاجل</option>
                  <option value="valid">ساري</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  حالة اشتراك مقيم
                </label>
                <select
                  value={moqeemSubscriptionStatus}
                  onChange={(e) =>
                    setMoqeemSubscriptionStatus(e.target.value as MoqeemSubscriptionStatus)
                  }
                  className="focus-ring-brand w-full rounded-md border border-input bg-surface px-3 py-2 text-sm transition-[border-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-out)]"
                >
                  <option value="all">الكل</option>
                  <option value="expired">منتهي</option>
                  <option value="expiring_soon">عاجل</option>
                  <option value="valid">ساري</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  عدد الموظفين
                </label>
                <select
                  value={employeeCountFilter}
                  onChange={(e) => setEmployeeCountFilter(e.target.value as EmployeeCountFilter)}
                  className="focus-ring-brand w-full rounded-md border border-input bg-surface px-3 py-2 text-sm transition-[border-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-out)]"
                >
                  <option value="all">الكل</option>
                  <option value="1">موظف واحد</option>
                  <option value="2">موظفان</option>
                  <option value="3">ثلاثة موظفين</option>
                  <option value="4+">أربعة موظفين فأكثر</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  الأماكن الشاغرة
                </label>
                <select
                  value={availableSlotsFilter}
                  onChange={(e) =>
                    setAvailableSlotsFilter(e.target.value as AvailableSlotsFilter)
                  }
                  className="focus-ring-brand w-full rounded-md border border-input bg-surface px-3 py-2 text-sm transition-[border-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-out)]"
                >
                  <option value="all">الكل</option>
                  <option value="0">المؤسسات المكتملة</option>
                  <option value="1">مكان واحد شاغر</option>
                  <option value="2">مكانين شاغرين</option>
                  <option value="3">ثلاثة أماكن شاغرة</option>
                  <option value="4+">أربعة أماكن فأكثر</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  فلتر تاريخ انشاء المؤسسة
                </label>
                <select
                  value={dateRangeFilter}
                  onChange={(e) => setDateRangeFilter(e.target.value as DateRange)}
                  className="focus-ring-brand w-full rounded-md border border-input bg-surface px-3 py-2 text-sm transition-[border-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-out)]"
                >
                  <option value="all">الكل</option>
                  <option value="last_month">آخر شهر</option>
                  <option value="last_3_months">آخر 3 أشهر</option>
                  <option value="last_year">آخر سنة</option>
                  <option value="custom">مخصص</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  الاعفاءات
                </label>
                <select
                  value={exemptionsFilter}
                  onChange={(e) => setExemptionsFilter(e.target.value as ExemptionsFilter)}
                  className="focus-ring-brand w-full rounded-md border border-input bg-surface px-3 py-2 text-sm transition-[border-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-out)]"
                >
                  <option value="all">الكل</option>
                  <option value="تم الاعفاء">تم الاعفاء</option>
                  <option value="لم يتم الاعفاء">لم يتم الاعفاء</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>

              {dateRangeFilter === 'custom' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      من تاريخ
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="focus-ring-brand w-full rounded-md border border-input bg-surface px-3 py-2 text-sm transition-[border-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-out)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      إلى تاريخ
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="focus-ring-brand w-full rounded-md border border-input bg-surface px-3 py-2 text-sm transition-[border-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-out)]"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 flex items-center justify-between border-t border-border bg-muted/30 p-6">
            <button
              onClick={clearFilters}
              disabled={activeFiltersCount === 0}
              className="touch-feedback flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)] hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              مسح جميع الفلاتر
            </button>
            <button
              onClick={onClose}
              className="touch-feedback rounded-md bg-primary px-6 py-2 font-medium text-primary-foreground transition-[transform,filter] duration-[var(--motion-fast)] ease-[var(--ease-out)] hover:brightness-95"
            >
              تطبيق الفلاتر
            </button>
          </div>
        </div>
    </div>
  )
}
