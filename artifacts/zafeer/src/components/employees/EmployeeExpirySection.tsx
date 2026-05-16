import { Employee, Company } from '@/lib/supabase'
import { ExpiryStatusRow } from './ExpiryStatusRow'
import { calculateDaysRemaining } from '@/utils/statusHelpers'
import { ResidenceProfilePhoto } from './ResidenceProfilePhoto'

interface EmployeeExpirySectionProps {
  employee: Employee & { company: Company }
  residenceImagePath?: string | null
  residenceThumbnailPath?: string | null
  thumbnailPreviewUrl?: string | null
}

export function EmployeeExpirySection({
  employee,
  residenceImagePath,
  residenceThumbnailPath,
  thumbnailPreviewUrl,
}: EmployeeExpirySectionProps) {
  const residenceDays = calculateDaysRemaining(employee?.residence_expiry)
  const contractDays = calculateDaysRemaining(employee?.contract_expiry)
  const hiredWorkerContractDays = calculateDaysRemaining(employee?.hired_worker_contract_expiry)
  const healthInsuranceDays = calculateDaysRemaining(employee?.health_insurance_expiry)

  return (
    <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100">
      <div className="flex items-center gap-3">
        {/* Alerts — first in DOM → right half in RTL */}
        <div className="w-1/2 space-y-1.5 min-w-0">
          <ExpiryStatusRow
            label="انتهاء الإقامة"
            date={employee?.residence_expiry}
            daysRemaining={residenceDays}
          />

          {contractDays !== null && (
            <ExpiryStatusRow
              label="انتهاء العقد"
              date={employee?.contract_expiry}
              daysRemaining={contractDays}
            />
          )}

          {hiredWorkerContractDays !== null && (
            <ExpiryStatusRow
              label="انتهاء عقد أجير"
              date={employee?.hired_worker_contract_expiry}
              daysRemaining={hiredWorkerContractDays}
            />
          )}

          <ExpiryStatusRow
            label="انتهاء التأمين الصحي"
            date={employee?.health_insurance_expiry}
            daysRemaining={healthInsuranceDays}
          />
        </div>

        {/* Profile photo — second in DOM → left half in RTL */}
        <div className="w-1/2 flex justify-center items-center">
          <ResidenceProfilePhoto
            path={residenceImagePath}
            thumbnailPath={residenceThumbnailPath}
            previewUrl={thumbnailPreviewUrl}
          />
        </div>
      </div>
    </div>
  )
}
