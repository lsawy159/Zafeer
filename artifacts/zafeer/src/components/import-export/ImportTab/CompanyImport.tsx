import { ImportBase } from './ImportBase'

interface CompanyImportProps {
  onImportSuccess?: () => void
  isInModal?: boolean
}

export function CompanyImport({ onImportSuccess, isInModal }: CompanyImportProps) {
  return (
    <ImportBase
      initialImportType="companies"
      onImportSuccess={onImportSuccess}
      isInModal={isInModal}
      hideTypeSelector={true}
    />
  )
}
