import { memo, type CSSProperties } from 'react'
import { User, Edit2, Trash2, FileText } from 'lucide-react'
import { type EmployeeWithRelations } from '@/lib/supabase'
import { getDaysRemaining } from './employeeUtils'

interface DateStatus {
  status: string
  description: string
  emoji: string
  color: string
}

function getDateStatus(days: number | null, expiredText: string = 'منتهي'): DateStatus {
  if (days === null)
    return { status: 'غير محدد', description: '', emoji: '❌', color: 'bg-neutral-100 text-neutral-600 border-neutral-200' }
  if (days < 0)
    return { status: expiredText, description: 'منتهي', emoji: '🚨', color: 'bg-red-50 text-red-700 border-red-300' }
  if (days <= 7)
    return { status: 'طارئ', description: `${days} يوم`, emoji: '🚨', color: 'bg-red-50 text-red-700 border-red-300' }
  if (days <= 15)
    return { status: 'عاجل', description: `${days} يوم`, emoji: '🔥', color: 'bg-orange-50 text-warning-700 border-orange-300' }
  if (days <= 30)
    return { status: 'متوسط', description: `${days} يوم`, emoji: '⚠️', color: 'bg-yellow-50 text-yellow-700 border-yellow-300' }
  return { status: 'ساري', description: `${days} يوم`, emoji: '✅', color: 'bg-green-50 text-success-700 border-green-300' }
}

function getBorderColor(
  contractDays: number | null,
  hiredWorkerContractDays: number | null,
  residenceDays: number | null,
  healthInsuranceDays: number | null,
): string {
  const priority = (days: number | null) =>
    days !== null && (days < 0 || days <= 7) ? 'critical' : days !== null && days <= 30 ? 'medium' : 'low'
  const priorities = [
    priority(contractDays),
    priority(hiredWorkerContractDays),
    priority(residenceDays),
    priority(healthInsuranceDays),
  ]
  if (priorities.includes('critical')) return 'border-red-400'
  if (priorities.includes('medium')) return 'border-yellow-400'
  if (priorities.includes('low')) return 'border-green-400'
  return 'border-neutral-200'
}

interface StatusBoxProps {
  label: string
  hasValue: boolean
  status: DateStatus
}

function StatusBox({ label, hasValue, status }: StatusBoxProps) {
  return (
    <div>
      <div className="mb-1 text-[12px] font-semibold text-neutral-600">{label}</div>
      {hasValue ? (
        <div className={`rounded-lg border-2 px-2 py-1 text-xs font-medium ${status.color}`}>
          <div className="flex items-center gap-1">
            <div className="text-xs">{status.emoji}</div>
            <div className="flex flex-col">
              <span className="font-bold">{status.status}</span>
              <span className="text-xs opacity-75">{status.description}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border-2 border-neutral-200 bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-600">
          غير محدد
        </div>
      )}
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
      className={`stagger-item group relative cursor-pointer overflow-hidden rounded-2xl border-2 ${borderColor} bg-surface/95 p-3.5 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.8)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-26px_rgba(14,116,144,0.65)]`}
      style={{ '--i': Math.min(index, 11) } as CSSProperties}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400/70 via-sky-300/60 to-emerald-300/70 opacity-70 transition group-hover:opacity-100" />

      <div className="flex items-start justify-between mb-2.5">
        <div className="app-icon-chip scale-90">
          <User className="h-4 w-4" />
        </div>
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          {canEditEmployee && (
            <button
              onClick={() => onEmployeeClick(employee)}
              className="rounded-md p-1 text-foreground-secondary transition hover:bg-primary/10"
              title="عرض/تعديل الموظف"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {canDeleteEmployee && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDeleteEmployee(employee)
              }}
              className="p-1 text-red-600 hover:bg-red-100 rounded-md transition"
              title="حذف الموظف"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <h3 className="mb-1.5 line-clamp-1 text-base font-bold text-neutral-900">{employee.name}</h3>

      <div className="app-card-meta text-[12.5px]">
        {employee.project?.name || employee.project_name ? (
          <div className="app-card-meta-row">
            <span className="app-card-meta-label">المشروع:</span>
            <span className="app-badge-brand text-[13px] font-medium">
              {employee.project?.name || employee.project_name}
            </span>
          </div>
        ) : null}
        <div className="app-card-meta-row">
          <span className="app-card-meta-label">الشركة:</span>
          <span className="app-card-meta-value">
            {employee.company?.name || '-'}
            {employee.company?.unified_number && (
              <span className="text-neutral-500 mr-1">({employee.company.unified_number})</span>
            )}
          </span>
        </div>
        {employee.residence_number && (
          <div className="app-card-meta-row">
            <span className="app-card-meta-label">رقم الإقامة:</span>
            <span className="app-card-meta-value font-mono">{employee.residence_number}</span>
          </div>
        )}
        {employee.profession && (
          <div className="app-card-meta-row">
            <span className="app-card-meta-label">المهنة:</span>
            <span className="app-card-meta-value">{employee.profession}</span>
          </div>
        )}
        {employee.nationality && (
          <div className="app-card-meta-row">
            <span className="app-card-meta-label">الجنسية:</span>
            <span className="app-card-meta-value">{employee.nationality}</span>
          </div>
        )}
      </div>

      {/* مربعات الحالات */}
      <div className="pt-2.5 border-t border-neutral-200">
        <div className="grid grid-cols-2 gap-2">
          <StatusBox label="انتهاء العقد" hasValue={!!employee.contract_expiry} status={contractStatus} />
          <StatusBox label="انتهاء عقد أجير" hasValue={!!employee.hired_worker_contract_expiry} status={hiredWorkerStatus} />
          <StatusBox label="انتهاء الإقامة" hasValue={!!employee.residence_expiry} status={residenceStatus} />
          <StatusBox label="حالة التأمين" hasValue={!!employee.health_insurance_expiry} status={insuranceStatus} />
        </div>
      </div>

      {/* الملاحظات */}
      <div className="pt-2.5 border-t border-neutral-200">
        <div className="mb-1.5 flex items-center gap-2 text-[12px] font-semibold text-neutral-600">
          <FileText className="w-3.5 h-3.5" />
          الملاحظات
        </div>
        <div className="min-h-[42px] whitespace-pre-wrap rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-700">
          {employee.notes || 'لا توجد ملاحظات'}
        </div>
      </div>
    </div>
  )
})
