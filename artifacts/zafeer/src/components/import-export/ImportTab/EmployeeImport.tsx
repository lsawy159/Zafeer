import { ImportBase } from './ImportBase'

interface EmployeeImportProps {
  onImportSuccess?: () => void
  isInModal?: boolean
}

export function EmployeeImport({ onImportSuccess, isInModal }: EmployeeImportProps) {
  return (
    <ImportBase
      initialImportType="employees"
      onImportSuccess={onImportSuccess}
      isInModal={isInModal}
      hideTypeSelector={true}
    />
  )
}
