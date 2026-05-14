import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { type EmployeeNotificationThresholds } from '@/utils/employeeAlerts'
import { COLOR_THRESHOLD_FALLBACK } from './employeeUtils'

type StatusFilter = '' | 'منتهي' | 'طارئ' | 'عاجل' | 'متوسط' | 'ساري'

interface CompanyOption {
  id: string
  name: string
  unified_number?: number
}

interface FieldThresholds {
  urgent: number
  high: number
  medium: number
}

interface EmployeesFiltersModalProps {
  activeFiltersCount: number
  colorThresholds: EmployeeNotificationThresholds | null
  // تصنيف
  companies: CompanyOption[]
  companyFilter: string
  setCompanyFilter: (v: string) => void
  projects: string[]
  projectFilter: string
  setProjectFilter: (v: string) => void
  nationalities: string[]
  nationalityFilter: string
  setNationalityFilter: (v: string) => void
  professions: string[]
  professionFilter: string
  setProfessionFilter: (v: string) => void
  // حالة الوثائق
  contractFilter: string
  setContractFilter: (v: string) => void
  hiredWorkerContractFilter: string
  setHiredWorkerContractFilter: (v: string) => void
  residenceFilter: string
  setResidenceFilter: (v: string) => void
  healthInsuranceFilter: string
  setHealthInsuranceFilter: (v: string) => void
  clearFilters: () => void
  onClose: () => void
}

function getStatusOptions(t: FieldThresholds): { value: StatusFilter; label: string }[] {
  return [
    { value: '', label: 'الكل' },
    { value: 'منتهي', label: 'منتهي' },
    { value: 'طارئ', label: `طارئ (≤${t.urgent}ي)` },
    { value: 'عاجل', label: `عاجل (≤${t.high}ي)` },
    { value: 'متوسط', label: `متوسط (≤${t.medium}ي)` },
    { value: 'ساري', label: 'ساري' },
  ]
}

function StatusButtonGroup({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: StatusFilter; label: string }[]
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-2">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              value === opt.value
                ? opt.value === 'منتهي'
                  ? 'bg-red-500 text-white border-red-500'
                  : opt.value === 'طارئ'
                    ? 'bg-orange-500 text-white border-orange-500'
                    : opt.value === 'عاجل'
                      ? 'bg-yellow-500 text-white border-yellow-500'
                      : opt.value === 'متوسط'
                        ? 'bg-blue-500 text-white border-blue-500'
                        : opt.value === 'ساري'
                          ? 'bg-green-500 text-white border-green-500'
                          : 'bg-primary text-primary-foreground border-primary'
                : 'bg-surface text-neutral-600 border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function EmployeesFiltersModal({
  activeFiltersCount,
  colorThresholds,
  companies,
  companyFilter,
  setCompanyFilter,
  projects,
  projectFilter,
  setProjectFilter,
  nationalities,
  nationalityFilter,
  setNationalityFilter,
  professions,
  professionFilter,
  setProfessionFilter,
  contractFilter,
  setContractFilter,
  hiredWorkerContractFilter,
  setHiredWorkerContractFilter,
  residenceFilter,
  setResidenceFilter,
  healthInsuranceFilter,
  setHealthInsuranceFilter,
  clearFilters,
  onClose,
}: EmployeesFiltersModalProps) {
  const t = colorThresholds ?? COLOR_THRESHOLD_FALLBACK

  const contractOpts = getStatusOptions({
    urgent: t.contract_urgent_days,
    high: t.contract_high_days,
    medium: t.contract_medium_days,
  })
  const hiredWorkerOpts = getStatusOptions({
    urgent: t.hired_worker_contract_urgent_days,
    high: t.hired_worker_contract_high_days,
    medium: t.hired_worker_contract_medium_days,
  })
  const residenceOpts = getStatusOptions({
    urgent: t.residence_urgent_days,
    high: t.residence_high_days,
    medium: t.residence_medium_days,
  })
  const insuranceOpts = getStatusOptions({
    urgent: t.health_insurance_urgent_days,
    high: t.health_insurance_high_days,
    medium: t.health_insurance_medium_days,
  })

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 p-0 md:items-center md:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-h-[92vh] max-w-3xl flex flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-xl md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">فلترة الموظفين</h2>
            {activeFiltersCount > 0 && (
              <p className="text-xs text-neutral-500 mt-0.5">{activeFiltersCount} فلتر نشط</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* القسم 1: التصنيف */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">
              تصنيف
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* المؤسسة */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">المؤسسة</label>
                <select
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  className="focus-ring-brand w-full rounded-md border border-input bg-surface px-3 py-2 text-sm"
                >
                  <option value="">جميع المؤسسات</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.unified_number ? `${c.name} (${c.unified_number})` : c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* المشروع */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">المشروع</label>
                <select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className="focus-ring-brand w-full rounded-md border border-input bg-surface px-3 py-2 text-sm"
                >
                  <option value="">جميع المشاريع</option>
                  {projects.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* الجنسية */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">الجنسية</label>
                <select
                  value={nationalityFilter}
                  onChange={(e) => setNationalityFilter(e.target.value)}
                  className="focus-ring-brand w-full rounded-md border border-input bg-surface px-3 py-2 text-sm"
                >
                  <option value="">جميع الجنسيات</option>
                  {nationalities.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              {/* المهنة */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">المهنة</label>
                <select
                  value={professionFilter}
                  onChange={(e) => setProfessionFilter(e.target.value)}
                  className="focus-ring-brand w-full rounded-md border border-input bg-surface px-3 py-2 text-sm"
                >
                  <option value="">جميع المهن</option>
                  {professions.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* القسم 2: حالة الوثائق */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">
              حالة الوثائق
            </h3>
            <div className="space-y-4">
              <StatusButtonGroup
                label="الإقامة"
                value={residenceFilter}
                onChange={setResidenceFilter}
                options={residenceOpts}
              />
              <StatusButtonGroup
                label="التأمين الطبي"
                value={healthInsuranceFilter}
                onChange={setHealthInsuranceFilter}
                options={insuranceOpts}
              />
              <StatusButtonGroup
                label="عقد العمل"
                value={contractFilter}
                onChange={setContractFilter}
                options={contractOpts}
              />
              <StatusButtonGroup
                label="عقد الأجير"
                value={hiredWorkerContractFilter}
                onChange={setHiredWorkerContractFilter}
                options={hiredWorkerOpts}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-between border-t border-border bg-muted/30 px-5 py-4">
          <button
            onClick={clearFilters}
            disabled={activeFiltersCount === 0}
            className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="w-4 h-4" />
            مسح الفلاتر
          </button>
          <button
            onClick={onClose}
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:brightness-95 transition-[filter]"
          >
            تطبيق
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
