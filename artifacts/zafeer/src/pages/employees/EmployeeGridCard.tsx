import { memo, type CSSProperties } from 'react'
import { User, Edit2, Trash2 } from 'lucide-react'
import { type EmployeeWithRelations } from '@/lib/supabase'
import { getDaysRemaining } from './employeeUtils'

interface DateStatus {
  status: string
  emoji: string
  color: string
}

function getDateStatus(days: number | null, expiredText: string = 'منتهي'): DateStatus {
  if (days === null)
    return { status: 'غير محدد', emoji: '—', color: 'bg-neutral-100 text-neutral-500 border-neutral-200' }
  if (days < 0)
    return { status: `${expiredText} (${Math.abs(days)})`, emoji: '🚨', color: 'bg-red-50 text-red-700 border-red-300' }
  if (days <= 15)
    return { status: `${days}ي`, emoji: '🔥', color: 'bg-orange-50 text-orange-700 border-orange-300' }
  if (days <= 30)
    return { status: `${days}ي`, emoji: '⚠️', color: 'bg-yellow-50 text-yellow-700 border-yellow-300' }
  return { status: `ساري (${days})`, emoji: '✅', color: 'bg-green-50 text-green-700 border-green-200' }
}

function getBorderColor(
  contractDays: number | null,
  hiredWorkerContractDays: number | null,
  residenceDays: number | null,
  healthInsuranceDays: number | null,
): string {
  const isCritical = (d: number | null) => d !== null && (d < 0 || d <= 15)
  const isMedium = (d: number | null) => d !== null && d <= 30
  const vals = [contractDays, hiredWorkerContractDays, residenceDays, healthInsuranceDays]
  if (vals.some(isCritical)) return 'border-red-400'
  if (vals.some(isMedium)) return 'border-yellow-400'
  return 'border-neutral-200'
}

function StatusPill({ label, status }: { label: string; status: DateStatus }) {
  return (
    <div className={`rounded border px-1.5 py-1 ${status.color}`}>
      <div className="text-[9px] text-neutral-400 leading-none mb-0.5 truncate">{label}</div>
      <div className="flex items-center gap-0.5 leading-none">
        <span className="text-[9px]">{status.emoji}</span>
        <span className="text-[10px] font-bold truncate">{status.status}</span>
      </div>
    </div>
  )
}

interface EmployeeGridCardProps {
  employee: EmployeeWithRelations
  index: number
  canEditEmployee: boolean
  canDeleteEmployee: boolean
  onEmployeeClick: (employee: EmployeeWithRelations) => void
  onDeleteEmployee: (employee: EmployeeWithRelations) => void
}

export const EmployeeGridCard = memo(function EmployeeGridCard({
  employee,
  index,
  canEditEmployee,
  canDeleteEmployee,
  onEmployeeClick,
  onDeleteEmployee,
}: EmployeeGridCardProps) {
  const contractDays = employee.contract_expiry ? getDaysRemaining(employee.contract_expiry) : null
  const hiredWorkerContractDays = employee.hired_worker_contract_expiry
    ? getDaysRemaining(employee.hired_worker_contract_expiry)
    : null
  const residenceDays = employee.residence_expiry ? getDaysRemaining(employee.residence_expiry) : null
  const healthInsuranceDays = employee.health_insurance_expiry
    ? getDaysRemaining(employee.health_insurance_expiry)
    : null

  const borderColor = getBorderColor(contractDays, hiredWorkerContractDays, residenceDays, healthInsuranceDays)
  const contractStatus = getDateStatus(contractDays, 'منتهي')
  const hiredWorkerStatus = getDateStatus(hiredWorkerContractDays, 'منتهي')
  const residenceStatus = getDateStatus(residenceDays, 'منتهية')
  const insuranceStatus = getDateStatus(healthInsuranceDays, 'منتهي')

  return (
    <div
      onClick={() => onEmployeeClick(employee)}
      className={`stagger-item group relative cursor-pointer overflow-hidden rounded-xl border-2 ${borderColor} bg-surface/95 p-2.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
      style={{ '--i': Math.min(index, 11) } as CSSProperties}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-cyan-400/70 via-sky-300/60 to-emerald-300/70 opacity-60 transition group-hover:opacity-100" />

      {/* رأس الكارت */}
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
            <User className="h-3 w-3 text-primary" />
          </div>
          <p className="text-[11px] font-bold text-foreground line-clamp-1 leading-tight m-0">{employee.name}</p>
        </div>
        <div className="flex gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {canEditEmployee && (
            <button
              onClick={() => onEmployeeClick(employee)}
              className="rounded p-0.5 text-neutral-400 transition hover:bg-primary/10 hover:text-primary"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          )}
          {canDeleteEmployee && (
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteEmployee(employee) }}
              className="rounded p-0.5 text-neutral-400 transition hover:bg-red-100 hover:text-red-600"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* معلومات أساسية */}
      <div className="space-y-0.5 mb-2">
        {(employee.company?.name) && (
          <div className="flex items-center gap-1 text-[11px] text-foreground-tertiary leading-tight">
            <span className="text-foreground-tertiary flex-shrink-0">م:</span>
            <span className="truncate font-medium text-foreground-secondary">{employee.company.name}</span>
          </div>
        )}
        {(employee.project?.name || employee.project_name) && (
          <div className="flex items-center gap-1 text-[11px] text-foreground-tertiary leading-tight">
            <span className="text-foreground-tertiary flex-shrink-0">مش:</span>
            <span className="truncate font-medium text-foreground-secondary">{employee.project?.name || employee.project_name}</span>
          </div>
        )}
        {employee.profession && (
          <div className="flex items-center gap-1 text-[11px] text-foreground-tertiary leading-tight">
            <span className="text-foreground-tertiary flex-shrink-0">مهنة:</span>
            <span className="truncate text-foreground-tertiary">{employee.profession}</span>
          </div>
        )}
      </div>

      {/* حالات الوثائق */}
      <div className="grid grid-cols-2 gap-1 border-t border-neutral-100 pt-1.5">
        <StatusPill label="عقد عمل" status={contractStatus} />
        <StatusPill label="عقد أجير" status={hiredWorkerStatus} />
        <StatusPill label="إقامة" status={residenceStatus} />
        <StatusPill label="تأمين" status={insuranceStatus} />
      </div>
    </div>
  )
})
