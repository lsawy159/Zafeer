import { Company, Employee } from '@/lib/supabase'
import {
  Users,
  FileText,
  Shield,
  AlertTriangle,
  XCircle,
  Clock,
  Calendar,
  ArrowRight,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Stats {
  expiredContracts: number
  urgentContracts: number
  highContracts: number
  mediumContracts: number
  validContracts: number
  expiredResidences: number
  urgentResidences: number
  highResidences: number
  mediumResidences: number
  validResidences: number
  expiredInsurance: number
  urgentInsurance: number
  highInsurance: number
  mediumInsurance: number
  validInsurance: number
  expiredHiredWorkerContracts: number
  urgentHiredWorkerContracts: number
  highHiredWorkerContracts: number
  mediumHiredWorkerContracts: number
  validHiredWorkerContracts: number
}

interface EmployeeThresholds {
  contract_urgent_days: number
  contract_high_days: number
  contract_medium_days: number
  residence_urgent_days: number
  residence_high_days: number
  residence_medium_days: number
  health_insurance_urgent_days: number
  health_insurance_high_days: number
  health_insurance_medium_days: number
  hired_worker_contract_urgent_days: number
  hired_worker_contract_high_days: number
  hired_worker_contract_medium_days: number
}

interface DashboardEmployeesTabProps {
  stats: Stats
  employeeThresholds: EmployeeThresholds
  employees: Employee[]
  companies: Company[]
}

export function DashboardEmployeesTab({
  stats,
  employeeThresholds,
  employees,
  companies,
}: DashboardEmployeesTabProps) {
  const navigate = useNavigate()

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* إحصائيات العقود */}
        <div className="app-panel border-sky-200/60 bg-surface p-3 dark:border-sky-500/20">
          <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            إحصائيات العقود
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-1.5">
            <div className="bg-surface rounded-lg p-2.5 border border-blue-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">منتهية</span>
                <XCircle className="w-3 h-3 text-danger-500" />
              </div>
              <p className="text-lg font-bold text-red-600">{stats.expiredContracts}</p>
            </div>
            <div className="bg-surface rounded-lg p-2.5 border border-blue-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">طارئة</span>
                <AlertTriangle className="w-3 h-3 text-red-600" />
              </div>
              <p className="text-lg font-bold text-red-600">{stats.urgentContracts}</p>
              <p className="text-xs text-foreground-tertiary mt-0.5">
                خلال {employeeThresholds.contract_urgent_days} أيام
              </p>
            </div>
            <div className="bg-surface rounded-lg p-2.5 border border-blue-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">عاجل</span>
                <Clock className="w-3 h-3 text-orange-500" />
              </div>
              <p className="text-lg font-bold text-orange-600">{stats.highContracts}</p>
              <p className="text-xs text-foreground-tertiary mt-0.5">
                خلال {employeeThresholds.contract_high_days} يوم
              </p>
            </div>
            <div className="bg-surface rounded-lg p-2.5 border border-blue-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">متوسط</span>
                <Calendar className="w-3 h-3 text-yellow-500" />
              </div>
              <p className="text-lg font-bold text-yellow-600">{stats.mediumContracts}</p>
              <p className="text-xs text-foreground-tertiary mt-0.5">
                {employeeThresholds.contract_medium_days} يوم
              </p>
            </div>
            <div className="bg-surface rounded-lg p-2.5 border border-blue-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">ساري</span>
                <Shield className="w-3 h-3 text-green-500" />
              </div>
              <p className="text-lg font-bold text-green-600">{stats.validContracts}</p>
              <p className="text-xs text-foreground-tertiary mt-0.5">
                أكثر من {employeeThresholds.contract_medium_days} يوم
              </p>
            </div>
          </div>
        </div>

        {/* إحصائيات الإقامات */}
        <div className="app-panel border-violet-200/60 bg-surface p-3 dark:border-violet-500/20">
          <h3 className="text-sm font-bold text-neutral-900 mb-2 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-purple-600" />
            إحصائيات الإقامات
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-1.5">
            <div className="bg-surface rounded-lg p-2.5 border border-purple-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">منتهية</span>
                <XCircle className="w-3 h-3 text-danger-500" />
              </div>
              <p className="text-lg font-bold text-red-600">{stats.expiredResidences}</p>
            </div>
            <div className="bg-surface rounded-lg p-2.5 border border-purple-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">طارئة</span>
                <AlertTriangle className="w-3 h-3 text-red-600" />
              </div>
              <p className="text-lg font-bold text-red-600">{stats.urgentResidences}</p>
              <p className="text-xs text-foreground-tertiary mt-0.5">
                خلال {employeeThresholds.residence_urgent_days} أيام
              </p>
            </div>
            <div className="bg-surface rounded-lg p-2.5 border border-purple-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">عاجل</span>
                <Clock className="w-3 h-3 text-orange-500" />
              </div>
              <p className="text-lg font-bold text-orange-600">{stats.highResidences}</p>
              <p className="text-xs text-foreground-tertiary mt-0.5">
                خلال {employeeThresholds.residence_high_days} يوم
              </p>
            </div>
            <div className="bg-surface rounded-lg p-2.5 border border-purple-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">متوسط</span>
                <Calendar className="w-3 h-3 text-yellow-500" />
              </div>
              <p className="text-lg font-bold text-yellow-600">{stats.mediumResidences}</p>
              <p className="text-xs text-foreground-tertiary mt-0.5">
                {employeeThresholds.residence_medium_days} يوم
              </p>
            </div>
            <div className="bg-surface rounded-lg p-2.5 border border-purple-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">ساري</span>
                <Shield className="w-3 h-3 text-green-500" />
              </div>
              <p className="text-lg font-bold text-green-600">{stats.validResidences}</p>
              <p className="text-xs text-foreground-tertiary mt-0.5">
                أكثر من {employeeThresholds.residence_medium_days} يوم
              </p>
            </div>
          </div>
        </div>

        {/* إحصائيات التأمين الصحي */}
        <div className="app-panel border-emerald-200/60 bg-surface p-3 dark:border-emerald-500/20">
          <h3 className="text-sm font-bold text-neutral-900 mb-2 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-green-600" />
            إحصائيات التأمين الصحي
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-1.5">
            <div className="bg-surface rounded-lg p-2.5 border border-green-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">منتهية</span>
                <XCircle className="w-3 h-3 text-danger-500" />
              </div>
              <p className="text-lg font-bold text-red-600">{stats.expiredInsurance}</p>
            </div>
            <div className="bg-surface rounded-lg p-2.5 border border-green-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">طارئة</span>
                <AlertTriangle className="w-3 h-3 text-red-600" />
              </div>
              <p className="text-lg font-bold text-red-600">{stats.urgentInsurance}</p>
              <p className="text-xs text-foreground-tertiary mt-0.5">
                خلال {employeeThresholds.health_insurance_urgent_days} أيام
              </p>
            </div>
            <div className="bg-surface rounded-lg p-2.5 border border-green-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">عاجل</span>
                <Clock className="w-3 h-3 text-orange-500" />
              </div>
              <p className="text-lg font-bold text-orange-600">{stats.highInsurance}</p>
              <p className="text-xs text-foreground-tertiary mt-0.5">
                خلال {employeeThresholds.health_insurance_high_days} يوم
              </p>
            </div>
            <div className="bg-surface rounded-lg p-2.5 border border-green-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">متوسط</span>
                <Calendar className="w-3 h-3 text-yellow-500" />
              </div>
              <p className="text-lg font-bold text-yellow-600">{stats.mediumInsurance}</p>
              <p className="text-xs text-foreground-tertiary mt-0.5">
                {employeeThresholds.health_insurance_medium_days} يوم
              </p>
            </div>
            <div className="bg-surface rounded-lg p-2.5 border border-green-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">ساري</span>
                <Shield className="w-3 h-3 text-green-500" />
              </div>
              <p className="text-lg font-bold text-green-600">{stats.validInsurance}</p>
              <p className="text-xs text-foreground-tertiary mt-0.5">
                أكثر من {employeeThresholds.health_insurance_medium_days} يوم
              </p>
            </div>
          </div>
        </div>

        {/* إحصائيات عقد أجير */}
        <div className="app-panel border-amber-200/60 bg-surface p-3 dark:border-amber-500/20">
          <h3 className="text-sm font-bold text-neutral-900 mb-2 flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-amber-600" />
            إحصائيات عقد أجير
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-1.5">
            <div className="bg-surface rounded-lg p-2.5 border border-amber-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">منتهية</span>
                <XCircle className="w-3 h-3 text-danger-500" />
              </div>
              <p className="text-lg font-bold text-red-600">{stats.expiredHiredWorkerContracts}</p>
            </div>
            <div className="bg-surface rounded-lg p-2.5 border border-amber-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">طارئة</span>
                <AlertTriangle className="w-3 h-3 text-red-600" />
              </div>
              <p className="text-lg font-bold text-red-600">{stats.urgentHiredWorkerContracts}</p>
              <p className="text-xs text-foreground-tertiary mt-0.5">
                خلال {employeeThresholds.hired_worker_contract_urgent_days} أيام
              </p>
            </div>
            <div className="bg-surface rounded-lg p-2.5 border border-amber-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">عاجل</span>
                <Clock className="w-3 h-3 text-orange-500" />
              </div>
              <p className="text-lg font-bold text-orange-600">{stats.highHiredWorkerContracts}</p>
              <p className="text-xs text-foreground-tertiary mt-0.5">
                خلال {employeeThresholds.hired_worker_contract_high_days} يوم
              </p>
            </div>
            <div className="bg-surface rounded-lg p-2.5 border border-amber-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">متوسط</span>
                <Calendar className="w-3 h-3 text-yellow-500" />
              </div>
              <p className="text-lg font-bold text-yellow-600">{stats.mediumHiredWorkerContracts}</p>
              <p className="text-xs text-foreground-tertiary mt-0.5">
                {employeeThresholds.hired_worker_contract_medium_days} يوم
              </p>
            </div>
            <div className="bg-surface rounded-lg p-2.5 border border-amber-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">ساري</span>
                <Shield className="w-3 h-3 text-green-500" />
              </div>
              <p className="text-lg font-bold text-green-600">{stats.validHiredWorkerContracts}</p>
              <p className="text-xs text-foreground-tertiary mt-0.5">
                أكثر من {employeeThresholds.hired_worker_contract_medium_days} يوم
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* قائمة مختصرة بالموظفين */}
      <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-primary" />
            الموظفين الأخيرين
          </h3>
          <button
            onClick={() => navigate('/employees')}
            className="text-primary hover:brightness-90 text-xs font-medium flex items-center gap-1"
          >
            عرض الكل
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="space-y-1">
          {employees.slice(0, 5).map((employee) => {
            const company = companies.find((c) => c.id === employee.company_id)
            return (
              <div
                key={employee.id}
                onClick={() => navigate(`/employees?id=${employee.id}`)}
                className="rounded-lg border border-border bg-surface p-2.5 transition cursor-pointer hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-xs text-neutral-900">{employee.name}</p>
                    <p className="text-xs text-neutral-600">
                      {employee.profession} - {company?.name || 'غير معروف'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-neutral-500">{employee.nationality}</p>
                  </div>
                </div>
              </div>
            )
          })}
          {employees.length === 0 && (
            <div className="text-center py-5 text-neutral-500 text-xs">لا يوجد موظفين مسجلين</div>
          )}
        </div>
      </div>
    </div>
  )
}
