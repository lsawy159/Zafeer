import { memo, ReactNode } from 'react'
import { CheckSquare, Square, Calendar, Shield, FileText } from 'lucide-react'
import {
  EmployeeWithRelations,
  EmployeeDisplayData,
  getDateTextColor,
  formatDateStatus,
} from './exportTypes'

export function Chip({
  active,
  onClick,
  children,
  color = 'blue',
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  color?: 'blue' | 'green'
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-medium leading-4 transition ${
        active
          ? color === 'blue'
            ? 'border-primary bg-primary text-slate-950 hover:bg-primary/90'
            : 'border-green-600 bg-green-600 text-white hover:bg-green-700'
          : color === 'blue'
            ? 'border-neutral-200 bg-white text-neutral-700 hover:bg-primary/10'
            : 'border-neutral-200 bg-white text-neutral-700 hover:bg-green-50'
      }`}
    >
      {children}
    </button>
  )
}

export const EmployeeTableRow = memo(function EmployeeTableRow({
  emp,
  displayData,
  isSelected,
  onToggle,
}: {
  emp: EmployeeWithRelations
  displayData: EmployeeDisplayData
  isSelected: boolean
  onToggle: (id: string) => void
}) {
  return (
    <tr className="hover:bg-neutral-50 cursor-pointer" onClick={() => onToggle(emp.id)}>
      <td className="px-3 py-1.5 text-center">
        {isSelected ? (
          <CheckSquare className="w-4 h-4 text-blue-600" />
        ) : (
          <Square className="w-4 h-4 text-neutral-400" />
        )}
      </td>
      <td className="px-3 py-1.5 text-[12px] font-medium text-neutral-900">{emp.name}</td>
      <td className="px-3 py-1.5 text-[12px] text-neutral-700">{emp.profession}</td>
      <td className="px-3 py-1.5 text-[12px] text-neutral-700">{emp.nationality}</td>
      <td className="px-3 py-1.5 text-[12px] text-neutral-700">
        {emp.company?.unified_number
          ? `${emp.company.name} (${emp.company.unified_number})`
          : emp.company?.name || ''}
      </td>
      <td className="px-3 py-1.5 text-[12px] text-neutral-700">
        {emp.project?.name || emp.project_name || '-'}
      </td>
      <td className="px-3 py-1.5 text-[12px] font-mono text-neutral-900">
        {emp.residence_number || '-'}
      </td>
      <td className="px-3 py-1.5 text-[12px]">
        <div className="flex flex-col gap-0.5 items-start">
          <span className={getDateTextColor(displayData.contractDays)}>
            {displayData.contractFormatted || '-'}
          </span>
          {emp.contract_expiry && (
            <span className="text-[11px] text-neutral-500">
              {formatDateStatus(displayData.contractDays, 'منتهي')}
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-1.5 text-[12px]">
        <div className="flex flex-col gap-0.5 items-start">
          <span className={getDateTextColor(displayData.hiredDays)}>
            {displayData.hiredFormatted || '-'}
          </span>
          {emp.hired_worker_contract_expiry && (
            <span className="text-[11px] text-neutral-500">
              {formatDateStatus(displayData.hiredDays, 'منتهي')}
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-1.5 text-[12px]">
        <div className="flex flex-col gap-0.5 items-start">
          <span className={getDateTextColor(displayData.residenceDays)}>
            {displayData.residenceFormatted || '-'}
          </span>
          {emp.residence_expiry && (
            <span className="text-[11px] text-neutral-500">
              {formatDateStatus(displayData.residenceDays, 'منتهية')}
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-1.5 text-[12px]">
        <div className="flex flex-col gap-0.5 items-start">
          <span className={getDateTextColor(displayData.insuranceDays)}>
            {displayData.insuranceFormatted || '-'}
          </span>
          {emp.health_insurance_expiry && (
            <span className="text-[11px] text-neutral-500">
              {formatDateStatus(displayData.insuranceDays, 'منتهي')}
            </span>
          )}
        </div>
      </td>
    </tr>
  )
})

export const EmployeeCardItem = memo(function EmployeeCardItem({
  emp,
  displayData,
  isSelected,
  onToggle,
}: {
  emp: EmployeeWithRelations
  displayData: EmployeeDisplayData
  isSelected: boolean
  onToggle: (id: string) => void
}) {
  return (
    <div
      onClick={() => onToggle(emp.id)}
      className={`bg-white border-2 rounded-lg p-4 cursor-pointer transition-all shadow-sm ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-neutral-200 hover:border-blue-300 hover:shadow'
      }`}
    >
      <div className="flex items-start gap-3 mb-3 pb-3 border-b border-neutral-200">
        <div className="pt-0.5">
          {isSelected ? (
            <CheckSquare className="w-5 h-5 text-blue-600" />
          ) : (
            <Square className="w-5 h-5 text-neutral-400" />
          )}
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-neutral-900 text-base leading-tight">{emp.name}</h4>
          <div className="flex flex-wrap gap-2 mt-1">
            <span className="text-xs text-neutral-600">{emp.profession}</span>
            <span className="text-xs text-neutral-400">•</span>
            <span className="text-xs text-neutral-600">{emp.nationality}</span>
          </div>
          <p className="text-xs text-blue-600 mt-1">{emp.company?.name || 'غير محدد'}</p>
          {emp.project?.name && (
            <p className="text-xs text-success-600 mt-0.5">📁 {emp.project.name}</p>
          )}
          {emp.residence_number && (
            <p className="text-xs text-neutral-500 mt-0.5 font-mono">🆔 {emp.residence_number}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-neutral-500 flex items-center gap-1">
            <FileText className="w-3 h-3" />
            العقد
          </p>
          {emp.contract_expiry ? (
            <>
              <p className={`text-xs font-medium ${getDateTextColor(displayData.contractDays)}`}>
                {displayData.contractFormatted}
              </p>
              <p className="text-[10px] text-neutral-500">
                {formatDateStatus(displayData.contractDays, 'منتهي')}
              </p>
            </>
          ) : (
            <p className="text-xs text-neutral-400">غير محدد</p>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-neutral-500 flex items-center gap-1">
            <FileText className="w-3 h-3" />
            عقد الأجير
          </p>
          {emp.hired_worker_contract_expiry ? (
            <>
              <p className={`text-xs font-medium ${getDateTextColor(displayData.hiredDays)}`}>
                {displayData.hiredFormatted}
              </p>
              <p className="text-[10px] text-neutral-500">
                {formatDateStatus(displayData.hiredDays, 'منتهي')}
              </p>
            </>
          ) : (
            <p className="text-xs text-neutral-400">غير محدد</p>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-neutral-500 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            الإقامة
          </p>
          {emp.residence_expiry ? (
            <>
              <p className={`text-xs font-medium ${getDateTextColor(displayData.residenceDays)}`}>
                {displayData.residenceFormatted}
              </p>
              <p className="text-[10px] text-neutral-500">
                {formatDateStatus(displayData.residenceDays, 'منتهية')}
              </p>
            </>
          ) : (
            <p className="text-xs text-neutral-400">غير محدد</p>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-neutral-500 flex items-center gap-1">
            <Shield className="w-3 h-3" />
            التأمين
          </p>
          {emp.health_insurance_expiry ? (
            <>
              <p className={`text-xs font-medium ${getDateTextColor(displayData.insuranceDays)}`}>
                {displayData.insuranceFormatted}
              </p>
              <p className="text-[10px] text-neutral-500">
                {formatDateStatus(displayData.insuranceDays, 'منتهي')}
              </p>
            </>
          ) : (
            <p className="text-xs text-neutral-400">غير محدد</p>
          )}
        </div>
      </div>
    </div>
  )
})
