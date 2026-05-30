import { Button } from '@/components/ui/Button'
import { AlertCircle, Eye, Trash2, User } from 'lucide-react'
import { Employee, Company } from '@/lib/supabase'
import { type EmployeeWithRelations } from '@/lib/supabase'
import { type EmployeeNotificationThresholds } from '@/utils/employeeAlerts'
import { getDaysRemaining } from './employeeUtils'

type EmployeeDateField = 'contract_expiry' | 'hired_worker_contract_expiry' | 'residence_expiry' | 'health_insurance_expiry'

function getEmployeeDateDays(employee: EmployeeWithRelations, field: EmployeeDateField): number | null {
  switch (field) {
    case 'contract_expiry': return getDaysRemaining(employee.contract_expiry)
    case 'hired_worker_contract_expiry': return getDaysRemaining(employee.hired_worker_contract_expiry)
    case 'residence_expiry': return getDaysRemaining(employee.residence_expiry)
    case 'health_insurance_expiry': return getDaysRemaining(employee.health_insurance_expiry)
  }
}

function getEmployeeDateCellClass(days: number | null, field: EmployeeDateField, thresholds: EmployeeNotificationThresholds): string {
  const t = {
    contract_expiry: { urgent: thresholds.contract_urgent_days, high: thresholds.contract_high_days, medium: thresholds.contract_medium_days },
    hired_worker_contract_expiry: { urgent: thresholds.hired_worker_contract_urgent_days, high: thresholds.hired_worker_contract_high_days, medium: thresholds.hired_worker_contract_medium_days },
    residence_expiry: { urgent: thresholds.residence_urgent_days, high: thresholds.residence_high_days, medium: thresholds.residence_medium_days },
    health_insurance_expiry: { urgent: thresholds.health_insurance_urgent_days, high: thresholds.health_insurance_high_days, medium: thresholds.health_insurance_medium_days },
  }[field]
  if (days === null) return 'bg-neutral-100 text-neutral-500 border-neutral-200'
  if (days < 0 || days <= t.urgent) return 'bg-red-100 text-red-700 border-red-300'
  if (days <= t.high) return 'bg-orange-100 text-warning-700 border-orange-300'
  if (days <= t.medium) return 'bg-yellow-100 text-yellow-700 border-yellow-300'
  return 'bg-green-100 text-success-700 border-green-200'
}

interface EmployeesTableProps {
  sortedAndFilteredEmployees: (Employee & { company: Company })[]
  selectedEmployees: Set<string>
  selectedRowIndex: number | null
  tableRef: React.RefObject<HTMLTableElement | null>
  rowRefs: React.RefObject<(HTMLTableRowElement | null)[]>
  canDelete: (resource: string) => boolean
  employeeTableThresholds: EmployeeNotificationThresholds
  onEmployeeClick: (employee: Employee & { company: Company }) => void
  onDeleteEmployee: (employee: Employee & { company: Company }) => void
  onToggleSelection: (id: string) => void
  onToggleSelectAll: () => void
  onBulkDeleteClick: () => void
  onClearSelection: () => void
}

export function EmployeesTable({
  sortedAndFilteredEmployees,
  selectedEmployees,
  selectedRowIndex,
  tableRef,
  rowRefs,
  canDelete,
  employeeTableThresholds,
  onEmployeeClick,
  onDeleteEmployee,
  onToggleSelection,
  onToggleSelectAll,
  onBulkDeleteClick,
  onClearSelection,
}: EmployeesTableProps) {
  return (
    <div className="app-panel overflow-hidden">
      {selectedEmployees.size > 0 && (
        <div className="flex items-center justify-between border-b border-primary/30 bg-primary/10 px-6 py-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-neutral-700">تم تحديد {selectedEmployees.size} موظف</span>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={onClearSelection} variant="secondary" size="sm">إلغاء التحديد</Button>
            {canDelete('employees') && (
              <Button onClick={onBulkDeleteClick} variant="destructive" size="sm">حذف المحدد</Button>
            )}
          </div>
        </div>
      )}
      <div className="overflow-x-auto max-h-[calc(100vh-400px)]">
        {sortedAndFilteredEmployees.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-neutral-400" />
            <p>لا توجد نتائج تطابق الفلاتر المحددة</p>
          </div>
        ) : (
          <table className="w-full min-w-[1180px] text-sm" ref={tableRef}>
            <thead className="sticky top-0 z-[1] bg-neutral-50 shadow-sm">
              <tr>
                <th className="w-12 px-4 py-3 text-right font-semibold text-neutral-700">
                  <input
                    type="checkbox"
                    checked={selectedEmployees.size > 0 && selectedEmployees.size === sortedAndFilteredEmployees.length}
                    onChange={onToggleSelectAll}
                    className="h-4 w-4 cursor-pointer rounded"
                  />
                </th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-700">اسم الموظف</th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-700">رقم الإقامة</th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-700">تاريخ انتهاء العقد</th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-700">تاريخ انتهاء عقد أجير</th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-700">تاريخ انتهاء الإقامة</th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-700">تاريخ انتهاء التأمين الصحي</th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-700">المؤسسة</th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-700">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {sortedAndFilteredEmployees.map((employee, index) => {
                const contractDays = getEmployeeDateDays(employee as EmployeeWithRelations, 'contract_expiry')
                const hiredWorkerDays = getEmployeeDateDays(employee as EmployeeWithRelations, 'hired_worker_contract_expiry')
                const residenceDays = getEmployeeDateDays(employee as EmployeeWithRelations, 'residence_expiry')
                const healthInsuranceDays = getEmployeeDateDays(employee as EmployeeWithRelations, 'health_insurance_expiry')
                const isSelected = selectedRowIndex === index
                const isEmployeeSelected = selectedEmployees.has(employee.id)

                return (
                  <tr
                    key={employee.id}
                    ref={(el) => { rowRefs.current[index] = el }}
                    className={`cursor-pointer border-t transition hover:bg-neutral-50 ${isSelected ? 'bg-primary/10 border-l-4 border-primary' : ''}`}
                    onClick={() => onEmployeeClick(employee)}
                  >
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={isEmployeeSelected} onChange={() => onToggleSelection(employee.id)} className="h-4 w-4 cursor-pointer rounded" />
                    </td>
                    <td className="px-4 py-3 font-medium text-neutral-900">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-neutral-900">{employee.name}</div>
                          <div className="truncate text-xs text-neutral-500">
                            {employee.company?.name || '-'}
                            {(employee as Employee & { company: Company; project?: { name: string } }).project?.name ? ` • ${(employee as Employee & { company: Company; project?: { name: string } }).project?.name}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-700"><span className="font-mono text-xs">{employee.residence_number || '-'}</span></td>
                    <td className="px-4 py-3"><span className={`inline-flex min-w-[110px] justify-center rounded-full border px-2 py-1 text-xs ${getEmployeeDateCellClass(contractDays, 'contract_expiry', employeeTableThresholds)}`}>{employee.contract_expiry || '-'}</span></td>
                    <td className="px-4 py-3"><span className={`inline-flex min-w-[110px] justify-center rounded-full border px-2 py-1 text-xs ${getEmployeeDateCellClass(hiredWorkerDays, 'hired_worker_contract_expiry', employeeTableThresholds)}`}>{employee.hired_worker_contract_expiry || '-'}</span></td>
                    <td className="px-4 py-3"><span className={`inline-flex min-w-[110px] justify-center rounded-full border px-2 py-1 text-xs ${getEmployeeDateCellClass(residenceDays, 'residence_expiry', employeeTableThresholds)}`}>{employee.residence_expiry || '-'}</span></td>
                    <td className="px-4 py-3"><span className={`inline-flex min-w-[110px] justify-center rounded-full border px-2 py-1 text-xs ${getEmployeeDateCellClass(healthInsuranceDays, 'health_insurance_expiry', employeeTableThresholds)}`}>{employee.health_insurance_expiry || '-'}</span></td>
                    <td className="px-4 py-3 text-neutral-700">{employee.company?.name || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button onClick={() => onEmployeeClick(employee)} variant="secondary" size="sm">
                          <Eye className="h-3.5 w-3.5" />
                          عرض
                        </Button>
                        {canDelete('employees') && (
                          <Button onClick={() => onDeleteEmployee(employee)} variant="destructive" size="sm">
                            <Trash2 className="h-3.5 w-3.5" />
                            حذف
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
