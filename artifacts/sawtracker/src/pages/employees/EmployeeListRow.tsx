import { CheckSquare, Square, Eye, Trash2 } from 'lucide-react'
import { type EmployeeWithRelations } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import {
  getDaysRemaining,
  getCellBackgroundColor,
  getTextColor,
  formatDateStatus,
} from './employeeUtils'

interface EmployeeListRowProps {
  employee: EmployeeWithRelations
  index: number
  isSelected: boolean
  isChecked: boolean
  setRowRef: (el: HTMLElement | null) => void
  canDeleteEmployee: boolean
  onEmployeeClick: (employee: EmployeeWithRelations) => void
  onDeleteEmployee: (employee: EmployeeWithRelations) => void
  onToggleSelection: (id: string) => void
}

export function EmployeeListRow({
  employee,
  index: _index,
  isSelected,
  isChecked,
  setRowRef,
  canDeleteEmployee,
  onEmployeeClick,
  onDeleteEmployee,
  onToggleSelection,
}: EmployeeListRowProps) {
  const contractDays = employee.contract_expiry ? getDaysRemaining(employee.contract_expiry) : null
  const hiredWorkerContractDays = employee.hired_worker_contract_expiry
    ? getDaysRemaining(employee.hired_worker_contract_expiry)
    : null
  const residenceDays = employee.residence_expiry ? getDaysRemaining(employee.residence_expiry) : null
  const healthInsuranceDays = employee.health_insurance_expiry
    ? getDaysRemaining(employee.health_insurance_expiry)
    : null

  return (
    <div
      ref={setRowRef}
      className={`app-data-strip ${isSelected ? 'border-blue-500/80 ring-2 ring-blue-500/20' : ''}`}
    >
      <div className="flex min-h-fit flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleSelection(employee.id)
            }}
            className="mt-1 flex h-5 w-5 items-center justify-center"
          >
            {isChecked ? (
              <CheckSquare className="w-4 h-4 text-info-600" />
            ) : (
              <Square className="w-4 h-4 text-foreground-tertiary" />
            )}
          </button>

          <div className="cursor-pointer" onClick={() => onEmployeeClick(employee)}>
            <p className="text-sm font-semibold text-foreground dark:text-foreground">{employee.name}</p>
            <p className="text-xs text-foreground-secondary dark:text-foreground-secondary">
              {employee.profession || '-'} • {employee.nationality || '-'}
            </p>
            <p className="text-xs text-foreground-tertiary dark:text-foreground-tertiary">
              {employee.company?.name || '-'}
              {employee.company?.unified_number ? ` (${employee.company.unified_number})` : ''}
            </p>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 lg:max-w-[760px]">
          <div className={`rounded-xl border px-3 py-2 text-xs ${getCellBackgroundColor(contractDays)}`}>
            <p className="mb-1 text-[11px] text-foreground-tertiary">العقد</p>
            <p className={getTextColor(contractDays)}>{formatDateStatus(contractDays, 'منتهي')}</p>
          </div>
          <div className={`rounded-xl border px-3 py-2 text-xs ${getCellBackgroundColor(hiredWorkerContractDays)}`}>
            <p className="mb-1 text-[11px] text-foreground-tertiary">عقد أجير</p>
            <p className={getTextColor(hiredWorkerContractDays)}>{formatDateStatus(hiredWorkerContractDays, 'منتهي')}</p>
          </div>
          <div className={`rounded-xl border px-3 py-2 text-xs ${getCellBackgroundColor(residenceDays)}`}>
            <p className="mb-1 text-[11px] text-foreground-tertiary">الإقامة</p>
            <p className={getTextColor(residenceDays)}>{formatDateStatus(residenceDays, 'منتهية')}</p>
          </div>
          <div className={`rounded-xl border px-3 py-2 text-xs ${getCellBackgroundColor(healthInsuranceDays)}`}>
            <p className="mb-1 text-[11px] text-foreground-tertiary">التأمين</p>
            <p className={getTextColor(healthInsuranceDays)}>{formatDateStatus(healthInsuranceDays, 'منتهي')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={(e) => {
              e.stopPropagation()
              onEmployeeClick(employee)
            }}
            size="sm"
          >
            <Eye className="w-3.5 h-3.5" />
            عرض
          </Button>
          {canDeleteEmployee && (
            <Button
              onClick={(e) => {
                e.stopPropagation()
                onDeleteEmployee(employee)
              }}
              variant="destructive"
              size="sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              حذف
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
