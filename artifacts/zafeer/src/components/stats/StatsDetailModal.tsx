import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import { X, Building2, User, Calendar, AlertCircle } from 'lucide-react'
import { type Company, type EmployeeWithRelations } from '@/lib/supabase'
import { classifyCompany, classifyEmployee } from '@/utils/statsCalculator'
import { type StatsCompanyRow, type StatsEmployeeRow } from '@/types/statsTypes'
import { formatDateShortWithHijri } from '@/utils/dateFormatter'
import CompanyDetailModal from '@/components/companies/CompanyDetailModal'
import EmployeeCard from '@/components/employees/EmployeeCard'
import { useQueryClient } from '@tanstack/react-query'

interface StatsDetailModalProps {
  title: string
  type: 'company' | 'employee'
  companies?: Company[]
  employees?: EmployeeWithRelations[]
  today: Date
  onClose: () => void
}

// Status dot for classification
function ClassificationDot({ classification }: { classification: 'healthy' | 'damaged' | 'missing' }) {
  const colorMap = { healthy: 'bg-green-500', damaged: 'bg-red-500', missing: 'bg-gray-400' }
  return <span className={`inline-block w-2 h-2 rounded-full ${colorMap[classification]}`} />
}

function DateCell({ date, today }: { date?: string | null; today: Date }) {
  if (!date) return <span className="text-gray-400 text-xs">—</span>
  const expiry = new Date(date)
  const days = Math.floor((expiry.getTime() - today.getTime()) / 86_400_000)
  const color = days < 0 ? 'text-red-600' : days <= 7 ? 'text-orange-600' : 'text-gray-700'
  return <span className={`text-xs ${color}`}>{formatDateShortWithHijri(date)}</span>
}

export default function StatsDetailModal({
  title,
  type,
  companies,
  employees,
  today,
  onClose,
}: StatsDetailModalProps) {
  const queryClient = useQueryClient()
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<(EmployeeWithRelations & { company: Company }) | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const items = type === 'company' ? (companies ?? []) : (employees ?? [])
  const count = items.length
  const useVirt = count >= 50

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 72,
    overscan: 5,
    enabled: useVirt,
  })

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    // only close if no child modal is open and click was on backdrop
    if (selectedCompany || selectedEmployee) return
    if ((e.target as Element).closest('[data-modal-root]')) return
    onClose()
  }, [selectedCompany, selectedEmployee, onClose])

  const handleCompanyClick = useCallback((company: Company) => {
    setSelectedCompany(company)
  }, [])

  const handleEmployeeClick = useCallback((emp: EmployeeWithRelations) => {
    if (!emp.company) return
    setSelectedEmployee(emp as EmployeeWithRelations & { company: Company })
  }, [])

  const handleEmployeeUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['employees-page'] })
    queryClient.invalidateQueries({ queryKey: ['employees-all'] })
  }, [queryClient])

  const modal = (
    <>
      {/* StatsDetailModal backdrop + panel */}
      <div
        className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
        onClick={handleBackdropClick}
      >
        <div
          data-modal-root
          className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh]"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
            <div className="flex items-center gap-2">
              {type === 'company'
                ? <Building2 size={18} className="text-gray-500" />
                : <User size={18} className="text-gray-500" />
              }
              <h2 className="font-semibold text-gray-800 text-sm">{title}</h2>
              <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                {count.toLocaleString('ar-SA')}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
              aria-label="إغلاق"
            >
              <X size={18} />
            </button>
          </div>

          {/* List */}
          <div ref={scrollRef} className="overflow-y-auto flex-1 px-2 py-2">
            {count === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
                <AlertCircle size={32} />
                <span className="text-sm">لا توجد نتائج</span>
              </div>
            ) : useVirt ? (
              <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
                {virtualizer.getVirtualItems().map((vItem) => (
                  <div
                    key={vItem.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      transform: `translateY(${vItem.start}px)`,
                    }}
                  >
                    {type === 'company'
                      ? <CompanyRow company={(companies ?? [])[vItem.index]} today={today} onClick={handleCompanyClick} />
                      : <EmployeeRow employee={(employees ?? [])[vItem.index]} today={today} onClick={handleEmployeeClick} />
                    }
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {type === 'company'
                  ? (companies ?? []).map(c => <CompanyRow key={c.id} company={c} today={today} onClick={handleCompanyClick} />)
                  : (employees ?? []).map(e => <EmployeeRow key={e.id} employee={e} today={today} onClick={handleEmployeeClick} />)
                }
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Child: Company detail modal — z-60/z-70 */}
      {selectedCompany && (
        <CompanyDetailModal
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
        />
      )}

      {/* Child: Employee card — z-60/z-70 (EmployeeCard uses createPortal internally) */}
      {selectedEmployee && (
        <EmployeeCard
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          onUpdate={handleEmployeeUpdate}
        />
      )}
    </>
  )

  return createPortal(modal, document.body)
}

// ──────────────────────────────────────────────
// Company row
// ──────────────────────────────────────────────

function CompanyRow({
  company,
  today,
  onClick,
}: {
  company: Company
  today: Date
  onClick: (c: Company) => void
}) {
  const classification = classifyCompany(company as unknown as StatsCompanyRow, today)
  return (
    <button
      onClick={() => onClick(company)}
      className="w-full text-right flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
    >
      <ClassificationDot classification={classification} />
      <span className="flex-1 font-medium text-gray-800 truncate">{company.name}</span>
      <span className="text-xs text-gray-500 shrink-0">{company.unified_number}</span>
      <div className="flex gap-3 shrink-0">
        <DateCell date={company.commercial_registration_expiry} today={today} />
        <DateCell date={company.ending_subscription_power_date} today={today} />
        <DateCell date={company.ending_subscription_moqeem_date} today={today} />
      </div>
      <Calendar size={14} className="text-gray-300 shrink-0" />
    </button>
  )
}

// ──────────────────────────────────────────────
// Employee row
// ──────────────────────────────────────────────

function EmployeeRow({
  employee,
  today,
  onClick,
}: {
  employee: EmployeeWithRelations
  today: Date
  onClick: (e: EmployeeWithRelations) => void
}) {
  const statsRow: StatsEmployeeRow = {
    id: employee.id,
    name: employee.name,
    residence_expiry: employee.residence_expiry,
    contract_expiry: employee.contract_expiry,
    hired_worker_contract_expiry: employee.hired_worker_contract_expiry,
    health_insurance_expiry: employee.health_insurance_expiry,
    is_deleted: employee.is_deleted,
  }
  const classification = classifyEmployee(statsRow, today)
  return (
    <button
      onClick={() => onClick(employee)}
      className="w-full text-right flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
    >
      <ClassificationDot classification={classification} />
      <span className="flex-1 font-medium text-gray-800 truncate">{employee.name}</span>
      <span className="text-xs text-gray-500 shrink-0 truncate max-w-[120px]">
        {employee.company?.name ?? '—'}
      </span>
      <div className="flex gap-3 shrink-0">
        <DateCell date={employee.residence_expiry} today={today} />
        <DateCell date={employee.health_insurance_expiry} today={today} />
      </div>
      <Calendar size={14} className="text-gray-300 shrink-0" />
    </button>
  )
}
