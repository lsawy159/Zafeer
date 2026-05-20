import { useState, useEffect, useMemo } from 'react'
import { Building2, Users, AlertTriangle, FileX, FileMinus, Bell, Info } from 'lucide-react'
import { useAllCompanies } from '@/hooks/useCompanies'
import { useAllEmployeesPage } from '@/hooks/useEmployees'
import { DEFAULT_STATUS_THRESHOLDS, getStatusThresholds } from '@/utils/autoCompanyStatus'
import { DEFAULT_EMPLOYEE_THRESHOLDS, getEmployeeNotificationThresholdsPublic } from '@/utils/employeeAlerts'
import {
  calculateCompanyStats,
  calculateEmployeeStats,
  calculateCompanyAlertStats,
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
  CompanyMissingDataResult,
} from '@/types/statsTypes'
import type { Company, EmployeeWithRelations } from '@/lib/supabase'
import StatCard from './StatCard'
import StatsDetailModal from './StatsDetailModal'

// Detect if thresholds are defaults (not customized in DB)
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

  // today is stable per mount
  const today = useMemo(() => new Date(), [])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getStatusThresholds(),
      getEmployeeNotificationThresholdsPublic(),
    ]).then(([st, et]) => {
      if (!cancelled) {
        setStatusThresholds(st)
        setEmployeeThresholds(et)
        setThresholdsLoaded(true)
      }
    })
    return () => { cancelled = true }
  }, [])

  // Map to StatsRow types — single pass
  const statsCompanies = useMemo((): StatsCompanyRow[] =>
    companies.map(c => ({
      id: c.id,
      name: c.name,
      unified_number: c.unified_number,
      commercial_registration_expiry: c.commercial_registration_expiry ?? null,
      ending_subscription_power_date: c.ending_subscription_power_date ?? null,
      ending_subscription_moqeem_date: c.ending_subscription_moqeem_date ?? null,
    })),
  [companies])

  const statsEmployees = useMemo((): StatsEmployeeRow[] =>
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
  [employees])

  // ── Section A ─ حالة المؤسسات
  const companyStats = useMemo(() => calculateCompanyStats(statsCompanies, today), [statsCompanies, today])

  // ── Section A' ─ حالة الموظفين
  const employeeStats = useMemo(() => calculateEmployeeStats(statsEmployees, today), [statsEmployees, today])

  // ── Section B ─ تنبيهات المؤسسات
  const companyAlerts = useMemo(
    () => calculateCompanyAlertStats(statsCompanies, statusThresholds as StatusThresholds, today),
    [statsCompanies, statusThresholds, today]
  )

  // ── Section F ─ بيانات المؤسسات الناقصة
  const companyMissing = useMemo(() => calculateCompanyMissingData(statsCompanies), [statsCompanies])

  // ── Section C ─ وثائق الموظفين المنتهية
  const employeeExpired = useMemo(() => calculateEmployeeExpiredDocs(statsEmployees, today), [statsEmployees, today])

  // ── Section D ─ بيانات الموظفين الناقصة
  const employeeMissing = useMemo(() => calculateEmployeeMissingDocs(statsEmployees), [statsEmployees])

  // ── Section E ─ تنبيهات الموظفين
  const employeeAlerts = useMemo(
    () => calculateEmployeeAlertStats(statsEmployees, employeeThresholds as EmployeeThresholds, today),
    [statsEmployees, employeeThresholds, today]
  )

  const dataLoading = companiesLoading || employeesLoading

  // Helpers for opening modal
  const openCompanyModal = (title: string, predicate: (row: StatsCompanyRow, today: Date) => boolean) =>
    setModalState({ title, type: 'company', companyPredicate: predicate })

  const openEmployeeModal = (title: string, predicate: (row: StatsEmployeeRow, today: Date) => boolean) =>
    setModalState({ title, type: 'employee', employeePredicate: predicate })

  // Pre-filter entities for modal — lazy, only when modal opens
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

      {/* ── Section A — حالة المؤسسات ────────────────── */}
      <section>
        <SectionHeader icon={<Building2 size={16} />} title="حالة المؤسسات" />
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="المؤسسات السليمة"
            count={companyStats.healthy}
            color="green"
            loading={dataLoading}
            onClick={() => openCompanyModal('المؤسسات السليمة', predicates.isHealthyCompany)}
          />
          <StatCard
            label="المؤسسات المتضررة"
            count={companyStats.damaged}
            color="red"
            loading={dataLoading}
            onClick={() => openCompanyModal('المؤسسات المتضررة', predicates.isDamagedCompany)}
          />
          <StatCard
            label="المؤسسات الناقصة"
            count={companyStats.missing}
            color="gray"
            loading={dataLoading}
            onClick={() => openCompanyModal('المؤسسات الناقصة', predicates.isMissingCompany)}
          />
        </div>
      </section>

      {/* ── Section A' — حالة الموظفين ───────────────── */}
      <section>
        <SectionHeader icon={<Users size={16} />} title="حالة الموظفين" />
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="الموظفون السليمون"
            count={employeeStats.healthy}
            color="green"
            loading={dataLoading}
            onClick={() => openEmployeeModal('الموظفون السليمون', predicates.isHealthyEmployee)}
          />
          <StatCard
            label="الموظفون المتضررون"
            count={employeeStats.damaged}
            color="red"
            loading={dataLoading}
            onClick={() => openEmployeeModal('الموظفون المتضررون', predicates.isDamagedEmployee)}
          />
          <StatCard
            label="الموظفون الناقصون"
            count={employeeStats.missing}
            color="gray"
            loading={dataLoading}
            onClick={() => openEmployeeModal('الموظفون الناقصون', predicates.isMissingEmployee)}
          />
        </div>
      </section>

      {/* ── Section B — تنبيهات المؤسسات ─────────────── */}
      <section>
        <SectionHeader
          icon={<Bell size={16} />}
          title="تنبيهات المؤسسات"
          subtitle="السليمة فقط"
          tooltip="تحسب المؤسسات السليمة (لديها جميع التواريخ الثلاثة وكلها غير منتهية) التي ستنتهي قريباً. المؤسسات الناقصة والمتضررة تظهر في أقسام أخرى."
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

      {/* ── Section F — بيانات المؤسسات الناقصة ─────── */}
      <section>
        <SectionHeader icon={<FileMinus size={16} />} title="بيانات المؤسسات الناقصة" />
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="سجل تجاري ناقص"
            count={companyMissing.commercial_reg}
            color="gray"
            loading={dataLoading}
            onClick={() => openCompanyModal('مؤسسات بدون سجل تجاري', predicates.isMissingCommercialReg)}
          />
          <StatCard
            label="اشتراك قوى ناقص"
            count={companyMissing.power_subscription}
            color="gray"
            loading={dataLoading}
            onClick={() => openCompanyModal('مؤسسات بدون اشتراك قوى', predicates.isMissingPowerDate)}
          />
          <StatCard
            label="اشتراك مقيم ناقص"
            count={companyMissing.moqeem_subscription}
            color="gray"
            loading={dataLoading}
            onClick={() => openCompanyModal('مؤسسات بدون اشتراك مقيم', predicates.isMissingMoqeemDate)}
          />
        </div>
      </section>

      {/* ── Section C — وثائق الموظفين المنتهية ─────── */}
      <section>
        <SectionHeader icon={<FileX size={16} />} title="وثائق الموظفين المنتهية" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="إقامات منتهية"
            count={employeeExpired.residence}
            color="red"
            loading={dataLoading}
            onClick={() => openEmployeeModal('إقامات منتهية', predicates.hasExpiredResidence)}
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
            label="تأمين صحي منتهٍ"
            count={employeeExpired.health_insurance}
            color="red"
            loading={dataLoading}
            onClick={() => openEmployeeModal('تأمين صحي منتهٍ', predicates.hasExpiredHealthInsurance)}
          />
        </div>
      </section>

      {/* ── Section D — بيانات الموظفين الناقصة ────── */}
      <section>
        <SectionHeader icon={<FileMinus size={16} />} title="بيانات الموظفين الناقصة" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="إقامة ناقصة" count={employeeMissing.residence} color="gray" loading={dataLoading}
            onClick={() => openEmployeeModal('إقامة ناقصة', predicates.isMissingResidenceDate)} />
          <StatCard label="عقد عمل ناقص" count={employeeMissing.contract} color="gray" loading={dataLoading}
            onClick={() => openEmployeeModal('عقد عمل ناقص', predicates.isMissingContractDate)} />
          <StatCard label="عقد أجير ناقص" count={employeeMissing.hired_worker_contract} color="gray" loading={dataLoading}
            onClick={() => openEmployeeModal('عقد أجير ناقص', predicates.isMissingHiredWorkerContractDate)} />
          <StatCard label="تأمين صحي ناقص" count={employeeMissing.health_insurance} color="gray" loading={dataLoading}
            onClick={() => openEmployeeModal('تأمين صحي ناقص', predicates.isMissingHealthInsuranceDate)} />
          <StatCard label="راتب ناقص أو صفر" count={employeeMissing.salary} color="gray" loading={dataLoading}
            onClick={() => openEmployeeModal('راتب ناقص أو صفر', predicates.isMissingSalary)} />
          <StatCard label="مهنة ناقصة" count={employeeMissing.profession} color="gray" loading={dataLoading}
            onClick={() => openEmployeeModal('مهنة ناقصة', predicates.isMissingProfession)} />
          <StatCard label="حساب بنكي ناقص" count={employeeMissing.bank_account} color="gray" loading={dataLoading}
            onClick={() => openEmployeeModal('حساب بنكي ناقص', predicates.isMissingBankAccount)} />
          <StatCard label="صورة إقامة ناقصة" count={employeeMissing.residence_image} color="gray" loading={dataLoading}
            onClick={() => openEmployeeModal('صورة إقامة ناقصة', predicates.isMissingResidenceImage)} />
          <StatCard label="رقم موحد ناقص" count={employeeMissing.company_unified_number} color="gray" loading={dataLoading}
            onClick={() => openEmployeeModal('رقم موحد ناقص', predicates.isMissingCompanyUnifiedNumber)} />
        </div>
      </section>

      {/* ── Section E — تنبيهات الموظفين ────────────── */}
      <section>
        <SectionHeader icon={<AlertTriangle size={16} />} title="تنبيهات الموظفين" subtitle="الموظفون السليمون فقط" />
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

      {/* ── StatsDetailModal ──────────────────────────── */}
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

// ──────────────────────────────────────────────
// Section header helper
// ──────────────────────────────────────────────

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
