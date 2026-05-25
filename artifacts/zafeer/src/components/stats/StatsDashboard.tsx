import { useState, useEffect, useMemo } from 'react'
import { AlertTriangle, FileX, FileMinus, Bell, Info } from 'lucide-react'
import { useAllCompanies } from '@/hooks/useCompanies'
import { useAllEmployeesPage } from '@/hooks/useEmployees'
import { DEFAULT_STATUS_THRESHOLDS, getStatusThresholds } from '@/utils/autoCompanyStatus'
import { DEFAULT_EMPLOYEE_THRESHOLDS, getEmployeeNotificationThresholdsPublic } from '@/utils/employeeAlerts'
import {
  calculateCompanyAlertStats,
  calculateCompanyExpiredDocs,
  calculateCompanyMissingData,
  calculateEmployeeAlertStats,
  calculateEmployeeExpiredDocs,
  calculateEmployeeMissingDocs,
  predicates,
} from '@/utils/statsCalculator'
import type {
  StatsCompanyRow,
  StatsEmployeeRow,
  StatusThresholds,
  EmployeeThresholds,
  ModalState,
} from '@/types/statsTypes'
import type { Company, EmployeeWithRelations } from '@/lib/supabase'
import StatCard from './StatCard'
import StatsDetailModal from './StatsDetailModal'

function isDefaultStatusThresholds(t: typeof DEFAULT_STATUS_THRESHOLDS): boolean {
  return t === DEFAULT_STATUS_THRESHOLDS
}
function isDefaultEmployeeThresholds(t: typeof DEFAULT_EMPLOYEE_THRESHOLDS): boolean {
  return t === DEFAULT_EMPLOYEE_THRESHOLDS
}

export default function StatsDashboard() {
  const { data: companies = [], isLoading: companiesLoading } = useAllCompanies()
  const { data: employees = [], isLoading: employeesLoading } = useAllEmployeesPage()

  const [statusThresholds, setStatusThresholds] = useState<typeof DEFAULT_STATUS_THRESHOLDS>(DEFAULT_STATUS_THRESHOLDS)
  const [employeeThresholds, setEmployeeThresholds] = useState<typeof DEFAULT_EMPLOYEE_THRESHOLDS>(DEFAULT_EMPLOYEE_THRESHOLDS)
  const [thresholdsLoaded, setThresholdsLoaded] = useState(false)

  const [modalState, setModalState] = useState<ModalState | null>(null)
  const [activeTab, setActiveTab] = useState<'companies' | 'employees'>('companies')

  const today = useMemo(() => new Date(), [])

  useEffect(() => {
    let cancelled = false
    Promise.all([getStatusThresholds(), getEmployeeNotificationThresholdsPublic()]).then(([st, et]) => {
      if (!cancelled) {
        setStatusThresholds(st)
        setEmployeeThresholds(et)
        setThresholdsLoaded(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

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

  const companyAlerts = useMemo(
    () => calculateCompanyAlertStats(statsCompanies, statusThresholds as StatusThresholds, today),
    [statsCompanies, statusThresholds, today]
  )

  const companyExpired = useMemo(() => calculateCompanyExpiredDocs(statsCompanies, today), [statsCompanies, today])
  const companyMissing = useMemo(() => calculateCompanyMissingData(statsCompanies), [statsCompanies])
  const employeeExpired = useMemo(() => calculateEmployeeExpiredDocs(statsEmployees, today), [statsEmployees, today])
  const employeeMissing = useMemo(() => calculateEmployeeMissingDocs(statsEmployees), [statsEmployees])
  const employeeAlerts = useMemo(
    () => calculateEmployeeAlertStats(statsEmployees, employeeThresholds as EmployeeThresholds, today),
    [statsEmployees, employeeThresholds, today]
  )

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

  const statusBadge = isDefaultStatusThresholds(statusThresholds) ? 'غير مضبوط' : undefined
  const employeeBadge = isDefaultEmployeeThresholds(employeeThresholds) ? 'غير مضبوط' : undefined

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex gap-1 border-b border-gray-200 mb-2">
        <button
          onClick={() => setActiveTab('companies')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'companies'
              ? 'border-blue-500 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          المؤسسات
        </button>
        <button
          onClick={() => setActiveTab('employees')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'employees'
              ? 'border-blue-500 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          الموظفون
        </button>
      </div>

      {/* ── Section B ─ تنبيهات المؤسسات ─────────────── */}
      <section className={activeTab === 'companies' ? '' : 'hidden'}>
        <SectionHeader
          icon={<Bell size={16} />}
          title="تنبيهات المؤسسات"
          tooltip="تشمل كل المؤسسات التي لديها وثيقة ستنتهي قريباً بغض النظر عن حالتها العامة. الوثائق المنتهية فعلاً لا تُحتسب."
        />
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="طارئ"
            count={companyAlerts.urgent}
            color="red"
            loading={!thresholdsLoaded || dataLoading}
            badge={statusBadge}
            onClick={() => openCompanyModal('تنبيهات المؤسسات — طارئ', (r, t) => predicates.isUrgentAlertCompany(r, statusThresholds as StatusThresholds, t))}
          />
          <StatCard
            label="عاجل"
            count={companyAlerts.high}
            color="orange"
            loading={!thresholdsLoaded || dataLoading}
            badge={statusBadge}
            onClick={() => openCompanyModal('تنبيهات المؤسسات — عاجل', (r, t) => predicates.isHighAlertCompany(r, statusThresholds as StatusThresholds, t))}
          />
          <StatCard
            label="متوسط"
            count={companyAlerts.medium}
            color="yellow"
            loading={!thresholdsLoaded || dataLoading}
            badge={statusBadge}
            onClick={() => openCompanyModal('تنبيهات المؤسسات — متوسط', (r, t) => predicates.isMediumAlertCompany(r, statusThresholds as StatusThresholds, t))}
          />
        </div>
      </section>

      {/* ── Section G ─ وثائق المؤسسات المنتهية ───────── */}
      <section className={activeTab === 'companies' ? '' : 'hidden'}>
        <SectionHeader icon={<FileX size={16} />} title="وثائق المؤسسات المنتهية" />
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="سجل تجاري منتهي"
            count={companyExpired.commercial_reg}
            color="red"
            loading={dataLoading}
            onClick={() => openCompanyModal('سجل تجاري منتهي', predicates.hasExpiredCommercialReg)}
          />
          <StatCard
            label="اشتراك قوى منتهي"
            count={companyExpired.power_subscription}
            color="red"
            loading={dataLoading}
            onClick={() => openCompanyModal('اشتراك قوى منتهي', predicates.hasExpiredPowerDate)}
          />
          <StatCard
            label="اشتراك مقيم منتهي"
            count={companyExpired.moqeem_subscription}
            color="red"
            loading={dataLoading}
            onClick={() => openCompanyModal('اشتراك مقيم منتهي', predicates.hasExpiredMoqeemDate)}
          />
        </div>
      </section>

      {/* ── Section F ─ بيانات المؤسسات الناقصة ─────── */}
      <section className={activeTab === 'companies' ? '' : 'hidden'}>
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

      {/* ── Section C ─ وثائق الموظفين المنتهية ───────── */}
      <section className={activeTab === 'employees' ? '' : 'hidden'}>
        <SectionHeader icon={<FileX size={16} />} title="وثائق الموظفين المنتهية" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="إقامة منتهية"
            count={employeeExpired.residence}
            color="red"
            loading={dataLoading}
            onClick={() => openEmployeeModal('إقامة منتهية', predicates.hasExpiredResidence)}
          />
          <StatCard
            label="عقود منتهية"
            count={employeeExpired.contract}
            color="red"
            loading={dataLoading}
            onClick={() => openEmployeeModal('عقود منتهية', predicates.hasExpiredContract)}
          />
          <StatCard
            label="عقود أجير منتهية"
            count={employeeExpired.hired_worker_contract}
            color="red"
            loading={dataLoading}
            onClick={() => openEmployeeModal('عقود أجير منتهية', predicates.hasExpiredHiredWorkerContract)}
          />
          <StatCard
            label="تأمين صحي منته"
            count={employeeExpired.health_insurance}
            color="red"
            loading={dataLoading}
            onClick={() => openEmployeeModal('تأمين صحي منته', predicates.hasExpiredHealthInsurance)}
          />
        </div>
      </section>

      {/* ── Section D ─ بيانات الموظفين الناقصة ───────── */}
      <section className={activeTab === 'employees' ? '' : 'hidden'}>
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

      {/* ── Section E ─ تنبيهات الموظفين ────────────── */}
      <section className={activeTab === 'employees' ? '' : 'hidden'}>
        <SectionHeader icon={<AlertTriangle size={16} />} title="تنبيهات الموظفين" />
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="طارئ"
            count={employeeAlerts.urgent}
            color="red"
            loading={!thresholdsLoaded || dataLoading}
            badge={employeeBadge}
            onClick={() => openEmployeeModal('تنبيهات الموظفين — طارئ', (r, t) => predicates.isUrgentAlertEmployee(r, employeeThresholds as EmployeeThresholds, t))}
          />
          <StatCard
            label="عاجل"
            count={employeeAlerts.high}
            color="orange"
            loading={!thresholdsLoaded || dataLoading}
            badge={employeeBadge}
            onClick={() => openEmployeeModal('تنبيهات الموظفين — عاجل', (r, t) => predicates.isHighAlertEmployee(r, employeeThresholds as EmployeeThresholds, t))}
          />
          <StatCard
            label="متوسط"
            count={employeeAlerts.medium}
            color="yellow"
            loading={!thresholdsLoaded || dataLoading}
            badge={employeeBadge}
            onClick={() => openEmployeeModal('تنبيهات الموظفين — متوسط', (r, t) => predicates.isMediumAlertEmployee(r, employeeThresholds as EmployeeThresholds, t))}
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
