import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { type EmployeeNotificationThresholds } from '@/utils/employeeAlerts'
import { MultiSelectDropdown } from '@/components/ui/MultiSelectDropdown'

type DocumentStatusValue = 'منتهي' | 'قريب من الانتهاء' | 'صالح'

interface CompanyOption {
  id: string
  name: string
  unified_number?: number
}

interface EmployeesFiltersModalProps {
  activeFiltersCount: number
  colorThresholds: EmployeeNotificationThresholds | null
  companies: CompanyOption[]
  companyFilter: string[]
  setCompanyFilter: (v: string[]) => void
  projects: string[]
  projectFilter: string[]
  setProjectFilter: (v: string[]) => void
  nationalities: string[]
  nationalityFilter: string[]
  setNationalityFilter: (v: string[]) => void
  professions: string[]
  professionFilter: string[]
  setProfessionFilter: (v: string[]) => void
  contractFilter: string
  setContractFilter: (v: string) => void
  hiredWorkerContractFilter: string
  setHiredWorkerContractFilter: (v: string) => void
  residenceFilter: string
  setResidenceFilter: (v: string) => void
  healthInsuranceFilter: string
  setHealthInsuranceFilter: (v: string) => void
  contractStatusDocFilter: string[]
  setContractStatusDocFilter: (v: string[]) => void
  hiredWorkerContractStatusDocFilter: string[]
  setHiredWorkerContractStatusDocFilter: (v: string[]) => void
  residenceStatusDocFilter: string[]
  setResidenceStatusDocFilter: (v: string[]) => void
  healthInsuranceStatusDocFilter: string[]
  setHealthInsuranceStatusDocFilter: (v: string[]) => void
  hasAlertFilter: boolean
  setHasAlertFilter: (v: boolean) => void
  clearFilters: () => void
  onClose: () => void
}

interface MultiStatusOption {
  value: DocumentStatusValue
  label: string
  activeClass: string
}

function MultiStatusButtonGroup({
  label,
  selected,
  onChange,
  options,
}: {
  label: string
  selected: string[]
  onChange: (v: string[]) => void
  options: MultiStatusOption[]
}) {
  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value))
      return
    }
    onChange([...selected, value])
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-neutral-700">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onChange([])}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            selected.length === 0
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-neutral-300 bg-surface text-neutral-600 hover:border-neutral-400 hover:bg-neutral-50'
          }`}
        >
          الكل
        </button>
        {options.map((opt) => {
          const active = selected.includes(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleToggle(opt.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? opt.activeClass
                  : 'border-neutral-300 bg-surface text-neutral-600 hover:border-neutral-400 hover:bg-neutral-50'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const documentStatusOptions: MultiStatusOption[] = [
  { value: 'منتهي', label: 'منتهي', activeClass: 'border-red-500 bg-red-500 text-white' },
  {
    value: 'قريب من الانتهاء',
    label: 'قريب من الانتهاء',
    activeClass: 'border-orange-500 bg-orange-500 text-white',
  },
  { value: 'صالح', label: 'صالح', activeClass: 'border-green-500 bg-green-500 text-white' },
]

export function EmployeesFiltersModal({
  activeFiltersCount,
  colorThresholds: _colorThresholds,
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
  contractFilter: _contractFilter,
  setContractFilter: _setContractFilter,
  hiredWorkerContractFilter: _hiredWorkerContractFilter,
  setHiredWorkerContractFilter: _setHiredWorkerContractFilter,
  residenceFilter: _residenceFilter,
  setResidenceFilter: _setResidenceFilter,
  healthInsuranceFilter: _healthInsuranceFilter,
  setHealthInsuranceFilter: _setHealthInsuranceFilter,
  contractStatusDocFilter,
  setContractStatusDocFilter,
  hiredWorkerContractStatusDocFilter,
  setHiredWorkerContractStatusDocFilter,
  residenceStatusDocFilter,
  setResidenceStatusDocFilter,
  healthInsuranceStatusDocFilter,
  setHealthInsuranceStatusDocFilter,
  hasAlertFilter,
  setHasAlertFilter,
  clearFilters,
  onClose,
}: EmployeesFiltersModalProps) {
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 p-0 md:items-center md:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-xl md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">فلترة الموظفين</h2>
            {activeFiltersCount > 0 && (
              <p className="mt-0.5 text-xs text-neutral-500">{activeFiltersCount} فلتر نشط</p>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg p-2 transition-colors hover:bg-muted">
            <X className="h-5 w-5 text-neutral-500" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">تصنيف</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">المؤسسة</label>
                <MultiSelectDropdown
                  options={companies.map((company) => ({
                    value: company.name,
                    label: company.unified_number
                      ? `${company.name} (${company.unified_number})`
                      : company.name,
                  }))}
                  selected={companyFilter}
                  onChange={setCompanyFilter}
                  placeholder="جميع المؤسسات"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">المشروع</label>
                <MultiSelectDropdown
                  options={projects.map((project) => ({ value: project, label: project }))}
                  selected={projectFilter}
                  onChange={setProjectFilter}
                  placeholder="جميع المشاريع"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">الجنسية</label>
                <MultiSelectDropdown
                  options={nationalities.map((nationality) => ({
                    value: nationality,
                    label: nationality,
                  }))}
                  selected={nationalityFilter}
                  onChange={setNationalityFilter}
                  placeholder="جميع الجنسيات"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">المهنة</label>
                <MultiSelectDropdown
                  options={professions.map((profession) => ({
                    value: profession,
                    label: profession,
                  }))}
                  selected={professionFilter}
                  onChange={setProfessionFilter}
                  placeholder="جميع المهن"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="has-alert-filter"
                checked={hasAlertFilter}
                onChange={(e) => setHasAlertFilter(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600"
              />
              <label htmlFor="has-alert-filter" className="block text-sm font-medium text-neutral-700">
                فقط الموظفين الذين لديهم تنبيهات
              </label>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              حالة الوثائق
            </h3>
            <div className="space-y-4">
              <MultiStatusButtonGroup
                label="حالة العقد"
                selected={contractStatusDocFilter}
                onChange={setContractStatusDocFilter}
                options={documentStatusOptions}
              />

              <MultiStatusButtonGroup
                label="حالة عقد الأجير"
                selected={hiredWorkerContractStatusDocFilter}
                onChange={setHiredWorkerContractStatusDocFilter}
                options={documentStatusOptions}
              />

              <MultiStatusButtonGroup
                label="حالة الإقامة"
                selected={residenceStatusDocFilter}
                onChange={setResidenceStatusDocFilter}
                options={documentStatusOptions}
              />

              <MultiStatusButtonGroup
                label="حالة التأمين الصحي"
                selected={healthInsuranceStatusDocFilter}
                onChange={setHealthInsuranceStatusDocFilter}
                options={documentStatusOptions}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center justify-between border-t border-border bg-muted/30 px-5 py-4">
          <button
            onClick={clearFilters}
            disabled={activeFiltersCount === 0}
            className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            مسح الفلاتر
          </button>
          <button
            onClick={onClose}
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-[filter] hover:brightness-95"
          >
            تطبيق
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
