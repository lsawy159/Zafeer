import { useState } from 'react'
import { ImportTabProps } from './ImportTab/importTypes'
import { EmployeeImport } from './ImportTab/EmployeeImport'
import { CompanyImport } from './ImportTab/CompanyImport'

export default function ImportTab({
  initialImportType = 'employees',
  onImportSuccess,
  isInModal = false,
}: ImportTabProps = {}) {
  const [importType, setImportType] = useState<'employees' | 'companies'>(initialImportType)

  return (
    <div className="space-y-4">
      {!isInModal && (
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1.5">
            نوع البيانات المراد استيرادها
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setImportType('employees')}
              className={`flex-1 rounded-lg border-2 px-3 py-1.5 text-sm font-medium transition ${
                importType === 'employees'
                  ? 'border-primary bg-primary/15 text-slate-900'
                  : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
              }`}
            >
              موظفين
            </button>
            <button
              onClick={() => setImportType('companies')}
              className={`flex-1 px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition ${
                importType === 'companies'
                  ? 'border-green-600 bg-green-50 text-success-600'
                  : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
              }`}
            >
              مؤسسات
            </button>
          </div>
        </div>
      )}

      {importType === 'employees' ? (
        <EmployeeImport
          key="employees"
          onImportSuccess={onImportSuccess}
          isInModal={isInModal}
        />
      ) : (
        <CompanyImport
          key="companies"
          onImportSuccess={onImportSuccess}
          isInModal={isInModal}
        />
      )}
    </div>
  )
}
