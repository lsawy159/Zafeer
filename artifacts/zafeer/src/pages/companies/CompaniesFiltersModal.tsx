import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { MultiSelectDropdown } from '@/components/ui/MultiSelectDropdown'

type AvailableSlotsFilter = 'all' | '0' | '1' | '2' | '3' | '4+'
type ExemptionsFilter = string

interface CompaniesFiltersModalProps {
  activeFiltersCount: number
  commercialRegStatus: string[]
  setCommercialRegStatus: (v: string[]) => void
  powerSubscriptionStatus: string[]
  setPowerSubscriptionStatus: (v: string[]) => void
  moqeemSubscriptionStatus: string[]
  setMoqeemSubscriptionStatus: (v: string[]) => void
  employeeCountMin: number | null
  setEmployeeCountMin: (v: number | null) => void
  employeeCountMax: number | null
  setEmployeeCountMax: (v: number | null) => void
  availableSlotsFilter: AvailableSlotsFilter
  setAvailableSlotsFilter: (v: AvailableSlotsFilter) => void
  createdAtFrom: string | null
  setCreatedAtFrom: (v: string | null) => void
  createdAtTo: string | null
  setCreatedAtTo: (v: string | null) => void
  exemptionsFilter: ExemptionsFilter
  setExemptionsFilter: (v: ExemptionsFilter) => void
  showAlertsOnly: boolean
  setShowAlertsOnly: (v: boolean) => void
  clearFilters: () => void
  onClose: () => void
}

const companyStatusOptions = [
  { value: 'expired', label: 'منتهي' },
  { value: 'expiring_soon', label: 'عاجل / متوسط' },
  { value: 'valid', label: 'ساري' },
]

export function CompaniesFiltersModal({
  activeFiltersCount,
  commercialRegStatus,
  setCommercialRegStatus,
  powerSubscriptionStatus,
  setPowerSubscriptionStatus,
  moqeemSubscriptionStatus,
  setMoqeemSubscriptionStatus,
  employeeCountMin,
  setEmployeeCountMin,
  employeeCountMax,
  setEmployeeCountMax,
  availableSlotsFilter,
  setAvailableSlotsFilter,
  createdAtFrom,
  setCreatedAtFrom,
  createdAtTo,
  setCreatedAtTo,
  exemptionsFilter,
  setExemptionsFilter,
  showAlertsOnly,
  setShowAlertsOnly,
  clearFilters,
  onClose,
}: CompaniesFiltersModalProps) {
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 p-0 md:items-center md:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-xl motion-safe-enter md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-neutral-200 p-6">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">الفلاتر والبحث</h2>
            {activeFiltersCount > 0 && (
              <p className="mt-1 text-sm text-neutral-600">{activeFiltersCount} فلتر نشط</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="touch-feedback rounded-lg p-2 transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)] hover:bg-muted"
          >
            <X className="h-5 w-5 text-neutral-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                حالة التسجيل التجاري
              </label>
              <MultiSelectDropdown
                options={companyStatusOptions}
                selected={commercialRegStatus}
                onChange={setCommercialRegStatus}
                placeholder="جميع حالات التسجيل التجاري"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">حالة قوى</label>
              <MultiSelectDropdown
                options={companyStatusOptions}
                selected={powerSubscriptionStatus}
                onChange={setPowerSubscriptionStatus}
                placeholder="جميع حالات قوى"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                حالة مقيم
              </label>
              <MultiSelectDropdown
                options={companyStatusOptions}
                selected={moqeemSubscriptionStatus}
                onChange={setMoqeemSubscriptionStatus}
                placeholder="جميع حالات مقيم"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                عدد الموظفين من
              </label>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={employeeCountMin ?? ''}
                onChange={(e) =>
                  setEmployeeCountMin(e.target.value === '' ? null : Number(e.target.value))
                }
                className="focus-ring-brand w-full rounded-md border border-input bg-surface px-3 py-2 text-sm transition-[border-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-out)]"
                placeholder="اختياري"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                عدد الموظفين إلى
              </label>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={employeeCountMax ?? ''}
                onChange={(e) =>
                  setEmployeeCountMax(e.target.value === '' ? null : Number(e.target.value))
                }
                className="focus-ring-brand w-full rounded-md border border-input bg-surface px-3 py-2 text-sm transition-[border-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-out)]"
                placeholder="اختياري"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                الأماكن الشاغرة
              </label>
              <select
                value={availableSlotsFilter}
                onChange={(e) => setAvailableSlotsFilter(e.target.value as AvailableSlotsFilter)}
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
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                تاريخ الإنشاء من
              </label>
              <input
                type="date"
                value={createdAtFrom ?? ''}
                onChange={(e) => setCreatedAtFrom(e.target.value === '' ? null : e.target.value)}
                className="focus-ring-brand w-full rounded-md border border-input bg-surface px-3 py-2 text-sm transition-[border-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-out)]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                تاريخ الإنشاء إلى
              </label>
              <input
                type="date"
                value={createdAtTo ?? ''}
                onChange={(e) => setCreatedAtTo(e.target.value === '' ? null : e.target.value)}
                className="focus-ring-brand w-full rounded-md border border-input bg-surface px-3 py-2 text-sm transition-[border-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-out)]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">الإعفاءات</label>
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

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showAlertsOnly"
                checked={showAlertsOnly}
                onChange={(e) => setShowAlertsOnly(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label
                htmlFor="showAlertsOnly"
                className="cursor-pointer text-sm font-medium text-neutral-700"
              >
                لديها تنبيهات فقط
              </label>
            </div>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center justify-between border-t border-border bg-muted/30 p-6">
          <button
            onClick={clearFilters}
            disabled={activeFiltersCount === 0}
            className="touch-feedback flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)] hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4" />
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
    </div>,
    document.body
  )
}
