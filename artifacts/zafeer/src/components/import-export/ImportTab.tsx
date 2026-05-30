import { ImportTabProps } from './ImportTab/importTypes'
import { EmployeeImport } from './ImportTab/EmployeeImport'
import { CompanyImport } from './ImportTab/CompanyImport'

export default function ImportTab({
  initialImportType = 'employees',
  onImportSuccess,
  isInModal = false,
}: ImportTabProps = {}) {
  return initialImportType === 'employees' ? (
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
  )
}
