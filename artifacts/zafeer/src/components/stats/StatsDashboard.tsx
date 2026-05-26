import { useState, useMemo } from 'react'
import { FileMinus, Info } from 'lucide-react'
import { useAllCompanies } from '@/hooks/useCompanies'
import { useAllEmployeesPage } from '@/hooks/useEmployees'
import {
  calculateCompanyMissingData,
  calculateEmployeeMissingDocs,
  predicates,
} from '@/utils/statsCalculator'
import type {
  StatsCompanyRow,
  StatsEmployeeRow,
  ModalState,
} from '@/types/statsTypes'
import type { Company, EmployeeWithRelations } from '@/lib/supabase'
import StatCard from './StatCard'
import StatsDetailModal from './StatsDetailModal'

export default function StatsDashboard() {
  const { data: companies = [], isLoading: companiesLoading } = useAllCompanies()
  const { data: employees = [], isLoading: employeesLoading } = useAllEmployeesPage()

  const [modalState, setModalState] = useState<ModalState | null>(null)

  const today = useMemo(() => new Date(), [])

  const statsCompanies = useMemo(
    (): StatsCompanyRow[] =>
      companies.map(c => ({
        id: c.id,
        name: c.name,
        unified_number: c.unified_number,
        commercial_registration_expiry: c.commercial_registration_expiry ?? null,
        ending_subscription_power_date: c.ending_subscription_power_date ?? null,
        ending_subscription_moqeem_date: c.ending_subscription_moqeem_date ?? null,
        labor_subscription_number: c.labor_subscription_number ?? null,
        social_insurance_number: c.social_insurance_number ?? null,
      })),
    [companies]
  )

  const statsEmployees = useMemo(
    (): StatsEmployeeRow[] =>
      employees.map(e => ({
        id: e.id,
        name: e.name,
        residence_expiry: e.residence_expiry ?? null,
        contract_expiry: e.contract_expiry ?? null,
        hired_worker_contract_expiry: e.hired_worker_contract_expiry ?? null,
        health_insurance_expiry: e.health_insurance_expiry ?? null,
        salary: e.salary ?? null,
        profession: e.profession ?? null,
        bank_account: e.bank_account ?? null,
        residence_image_url: e.residence_image_url ?? null,
        company_unified_number: e.company?.unified_number ?? null,
        company_name: e.company?.name ?? null,
        is_deleted: e.is_deleted ?? null,
      })),
    [employees]
  )

  const companyMissing = useMemo(() => calculateCompanyMissingData(statsCompanies), [statsCompanies])
  const employeeMissing = useMemo(() => calculateEmployeeMissingDocs(statsEmployees), [statsEmployees])

  const dataLoading = companiesLoading || employeesLoading

  const openCompanyModal = (title: string, predicate: (row: StatsCompanyRow, today: Date) => boolean) =>
    setModalState({ title, type: 'company', companyPredicate: predicate })

  const openEmployeeModal = (title: string, predicate: (row: StatsEmployeeRow, today: Date) => boolean) =>
    setModalState({ title, type: 'employee', employeePredicate: predicate })

  const modalCompanies = useMemo((): Company[] => {
    if (!modalState || modalState.type !== 'company' || !modalState.companyPredicate) return []
    const pred = modalState.companyPredicate
    return companies.filter(c => pred(c as unknown as StatsCompanyRow, today))
  }, [modalState, companies, today])

  const modalEmployees = useMemo((): EmployeeWithRelations[] => {
    if (!modalState || modalState.type !== 'employee' || !modalState.employeePredicate) return []
    const pred = modalState.employeePredicate
    return employees.filter(e => {
      const row: StatsEmployeeRow = {
        id: e.id,
        name: e.name,
        residence_expiry: e.residence_expiry ?? null,
        contract_expiry: e.contract_expiry ?? null,
        hired_worker_contract_expiry: e.hired_worker_contract_expiry ?? null,
        health_insurance_expiry: e.health_insurance_expiry ?? null,
        salary: e.salary ?? null,
        profession: e.profession ?? null,
        bank_account: e.bank_account ?? null,
        residence_image_url: e.residence_image_url ?? null,
        company_unified_number: e.company?.unified_number ?? null,
        is_deleted: e.is_deleted ?? null,
      }
      return pred(row, today)
    })
  }, [modalState, employees, today])

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Section F ─ بيانات المؤسسات الناقصة ─────── */}
      <section>
        <SectionHeader icon={<FileMinus size={16} />} title="بيانات المؤسسات الناقصة" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard
            label="تاريخ السجل التجاري ناقص"
            count={companyMissing.commercial_reg}
            color="gray"
            loading={dataLoading}
            onClick={() => openCompanyModal('مؤسسات بدون سجل تجاري', predicates.isMissingCommercialReg)}
          />
          <StatCard
            label="تاريخ اشتراك قوى ناقص"
            count={companyMissing.power_subscription}
            color="gray"
            loading={dataLoading}
            onClick={() => openCompanyModal('مؤسسات بدون اشتراك قوى', predicates.isMissingPowerDate)}
          />
          <StatCard
            label="تاريخ اشتراك مقيم ناقص"
            count={companyMissing.moqeem_subscription}
            color="gray"
            loading={dataLoading}
            onClick={() => openCompanyModal('مؤسسات بدون اشتراك مقيم', predicates.isMissingMoqeemDate)}
          />
          <StatCard
            label="رقم اشتراك قوى ناقص"
            count={companyMissing.labor_subscription}
            color="gray"
            loading={dataLoading}
            onClick={() => openCompanyModal('مؤسسات بدون رقم اشتراك قوى', predicates.isMissingLaborSubscription)}
          />
          <StatCard
            label="رقم اشتراك التأمينات ناقص"
            count={companyMissing.social_insurance}
            color="gray"
            loading={dataLoading}
            onClick={() => openCompanyModal('مؤسسات بدون رقم اشتراك التأمينات', predicates.isMissingInsuranceNumber)}
          />
        </div>
      </section>

      {/* ── Section D ─ بيانات الموظفين الناقصة ───────── */}
      <section>
        <SectionHeader icon={<FileMinus size={16} />} title="بيانات الموظفين الناقصة" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard
            label="تاريخ إقامة ناقص"
            count={employeeMissing.residence}
            color="gray"
            loading={dataLoading}
            onClick={() => openEmployeeModal('تاريخ إقامة ناقص', predicates.isMissingResidenceDate)}
          />
          <StatCard
            label="تاريخ عقد عمل ناقص"
            count={employeeMissing.contract}
            color="gray"
            loading={dataLoading}
            onClick={() => openEmployeeModal('تاريخ عقد عمل ناقص', predicates.isMissingContractDate)}
          />
          <StatCard
            label="تاريخ عقد أجير ناقص"
            count={employeeMissing.hired_worker_contract}
            color="gray"
            loading={dataLoading}
            onClick={() => openEmployeeModal('تاريخ عقد أجير ناقص', predicates.isMissingHiredWorkerContractDate)}
          />
          <StatCard
            label="تاريخ تأمين صحي ناقص"
            count={employeeMissing.health_insurance}
            color="gray"
            loading={dataLoading}
            onClick={() => openEmployeeModal('تاريخ تأمين صحي ناقص', predicates.isMissingHealthInsuranceDate)}
          />
          <StatCard
            label="راتب ناقص أو صفر"
            count={employeeMissing.salary}
            color="gray"
            loading={dataLoading}
            onClick={() => openEmployeeModal('راتب ناقص أو صفر', predicates.isMissingSalary)}
          />
          <StatCard
            label="مهنة ناقصة"
            count={employeeMissing.profession}
            color="gray"
            loading={dataLoading}
            onClick={() => openEmployeeModal('مهنة ناقصة', predicates.isMissingProfession)}
          />
          <StatCard
            label="حساب بنكي ناقص"
            count={employeeMissing.bank_account}
            color="gray"
            loading={dataLoading}
            onClick={() => openEmployeeModal('حساب بنكي ناقص', predicates.isMissingBankAccount)}
          />
          <StatCard
            label="صورة إقامة ناقصة"
            count={employeeMissing.residence_image}
            color="gray"
            loading={dataLoading}
            onClick={() => openEmployeeModal('صورة إقامة ناقصة', predicates.isMissingResidenceImage)}
          />
          <StatCard
            label="رقم موحد ناقص"
            count={employeeMissing.company_unified_number}
            color="gray"
            loading={dataLoading}
            onClick={() => openEmployeeModal('رقم موحد ناقص', predicates.isMissingCompanyUnifiedNumber)}
          />
        </div>
      </section>

      {modalState && (
        <StatsDetailModal
          title={modalState.title}
          type={modalState.type}
          companies={modalState.type === 'company' ? modalCompanies : undefined}
          employees={modalState.type === 'employee' ? modalEmployees : undefined}
          today={today}
          onClose={() => setModalState(null)}
        />
      )}
    </div>
  )
}

function SectionHeader({
  icon,
  title,
  subtitle,
  tooltip,
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string
  tooltip?: string
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-gray-500">{icon}</span>
      <h3 className="font-semibold text-gray-700 text-sm">{title}</h3>
      {subtitle && <span className="text-xs text-gray-400">({subtitle})</span>}
      {tooltip && (
        <span
          title={tooltip}
          className="cursor-help text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={tooltip}
        >
          <Info size={13} />
        </span>
      )}
    </div>
  )
}
