import { Company, Employee } from '@/lib/supabase'
import {
  Building2,
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
  expiredCommercialReg: number
  urgentCommercialReg: number
  highCommercialReg: number
  mediumCommercialReg: number
  validCommercialReg: number
  noDocumentCommercialReg: number
  expiredPower: number
  urgentPower: number
  highPower: number
  mediumPower: number
  validPower: number
  noDocumentPower: number
  expiredMoqeem: number
  urgentMoqeem: number
  highMoqeem: number
  mediumMoqeem: number
  validMoqeem: number
  noDocumentMoqeem: number
}

interface CompanyThresholds {
  commercial_reg_urgent_days: number
  commercial_reg_high_days: number
  commercial_reg_medium_days: number
  power_subscription_urgent_days: number
  power_subscription_high_days: number
  power_subscription_medium_days: number
  moqeem_subscription_urgent_days: number
  moqeem_subscription_high_days: number
  moqeem_subscription_medium_days: number
}

interface DashboardCompaniesTabProps {
  stats: Stats
  companyThresholds: CompanyThresholds
  companies: Company[]
  employees: Employee[]
}

export function DashboardCompaniesTab({
  stats,
  companyThresholds,
  companies,
  employees,
}: DashboardCompaniesTabProps) {
  const navigate = useNavigate()

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* إحصائيات السجل التجاري */}
        <div className="app-panel border-orange-200/60 bg-surface p-3 dark:border-orange-500/20">
          <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-orange-600" />
            إحصائيات السجل التجاري
          </h3>
          <div className={`grid grid-cols-1 gap-1.5 ${stats.noDocumentCommercialReg > 0 ? 'md:grid-cols-6' : 'md:grid-cols-5'}`}>
            <div className="bg-surface rounded-lg p-2.5 border border-orange-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">منتهية</span>
                <XCircle className="w-3 h-3 text-danger-500" />
              </div>
              <p className="text-lg font-bold text-red-600">{stats.expiredCommercialReg}</p>
            </div>
            <div className="bg-surface rounded-lg p-2.5 border border-orange-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">طارئة</span>
                <AlertTriangle className="w-3 h-3 text-red-600" />
              </div>
              <p className="text-lg font-bold text-red-600">{stats.urgentCommercialReg}</p>
              <p className="text-xs text-foreground-tertiary mt-0.5">
                خلال {companyThresholds.commercial_reg_urgent_days} أيام
              </p>
            </div>
            <div className="bg-surface rounded-lg p-2.5 border border-orange-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">عاجل</span>
                <Clock className="w-3 h-3 text-orange-500" />
              </div>
              <p className="text-lg font-bold text-orange-600">{stats.highCommercialReg}</p>
              <p className="text-xs text-foreground-tertiary mt-0.5">
                خلال {companyThresholds.commercial_reg_high_days} يوم
              </p>
            </div>
            <div className="bg-surface rounded-lg p-2.5 border border-orange-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">متوسط</span>
                <Calendar className="w-3 h-3 text-yellow-500" />
              </div>
              <p className="text-lg font-bold text-yellow-600">{stats.mediumCommercialReg}</p>
              <p className="text-xs text-foreground-tertiary mt-0.5">
                {companyThresholds.commercial_reg_medium_days} يوم
              </p>
            </div>
            <div className="bg-surface rounded-lg p-2.5 border border-orange-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">ساري</span>
                <Shield className="w-3 h-3 text-green-500" />
              </div>
              <p className="text-lg font-bold text-green-600">{stats.validCommercialReg}</p>
              <p className="text-xs text-foreground-tertiary mt-0.5">
                أكثر من {companyThresholds.commercial_reg_medium_days} يوم
              </p>
            </div>
            {stats.noDocumentCommercialReg > 0 && (
              <div className="bg-surface rounded-lg p-2.5 border border-orange-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-foreground-secondary">بلا وثيقة</span>
                  <FileText className="w-3 h-3 text-neutral-400" />
                </div>
                <p className="text-lg font-bold text-neutral-500">{stats.noDocumentCommercialReg}</p>
              </div>
            )}
          </div>
        </div>

        {/* إحصائيات اشتراك قوى */}
        <div className="app-panel border-sky-200/60 bg-surface p-3 dark:border-sky-500/20">
          <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-cyan-600" />
            إحصائيات اشتراك قوى
          </h3>
          <div className={`grid grid-cols-1 gap-1.5 ${stats.noDocumentPower > 0 ? 'md:grid-cols-6' : 'md:grid-cols-5'}`}>
            <div className="bg-surface rounded-lg p-2.5 border border-cyan-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">منتهية</span>
                <XCircle className="w-3 h-3 text-danger-500" />
              </div>
              <p className="text-lg font-bold text-red-600">{stats.expiredPower}</p>
            </div>
            <div className="bg-surface rounded-lg p-2.5 border border-cyan-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">طارئة</span>
                <AlertTriangle className="w-3 h-3 text-red-600" />
              </div>
              <p className="text-lg font-bold text-red-600">{stats.urgentPower}</p>
              <p className="text-xs text-foreground-tertiary mt-0.5">
                خلال {companyThresholds.power_subscription_urgent_days} أيام
              </p>
            </div>
            <div className="bg-surface rounded-lg p-2.5 border border-cyan-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">عاجل</span>
                <Clock className="w-3 h-3 text-orange-500" />
              </div>
              <p className="text-lg font-bold text-orange-600">{stats.highPower}</p>
              <p className="text-xs text-foreground-tertiary mt-0.5">
                خلال {companyThresholds.power_subscription_high_days} يوم
              </p>
            </div>
            <div className="bg-surface rounded-lg p-2.5 border border-cyan-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">متوسط</span>
                <Calendar className="w-3 h-3 text-yellow-500" />
              </div>
              <p className="text-lg font-bold text-yellow-600">{stats.mediumPower}</p>
              <p className="text-xs text-foreground-tertiary mt-0.5">
                {companyThresholds.power_subscription_medium_days} يوم
              </p>
            </div>
            <div className="bg-surface rounded-lg p-2.5 border border-cyan-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">ساري</span>
                <Shield className="w-3 h-3 text-green-500" />
              </div>
              <p className="text-lg font-bold text-green-600">{stats.validPower}</p>
              <p className="text-xs text-foreground-tertiary mt-0.5">
                أكثر من {companyThresholds.power_subscription_medium_days} يوم
              </p>
            </div>
            {stats.noDocumentPower > 0 && (
              <div className="bg-surface rounded-lg p-2.5 border border-cyan-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-foreground-secondary">بلا وثيقة</span>
                  <Shield className="w-3 h-3 text-neutral-400" />
                </div>
                <p className="text-lg font-bold text-neutral-500">{stats.noDocumentPower}</p>
              </div>
            )}
          </div>
        </div>

        {/* إحصائيات اشتراك مقيم */}
        <div className="app-panel border-emerald-200/60 bg-surface p-3 dark:border-emerald-500/20">
          <h3 className="text-sm font-bold text-neutral-900 mb-2 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-teal-600" />
            إحصائيات اشتراك مقيم
          </h3>
          <div className={`grid grid-cols-1 gap-1.5 ${stats.noDocumentMoqeem > 0 ? 'md:grid-cols-6' : 'md:grid-cols-5'}`}>
            <div className="bg-surface rounded-lg p-2.5 border border-teal-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">منتهية</span>
                <XCircle className="w-3 h-3 text-danger-500" />
              </div>
              <p className="text-lg font-bold text-red-600">{stats.expiredMoqeem}</p>
            </div>
            <div className="bg-surface rounded-lg p-2.5 border border-teal-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">طارئة</span>
                <AlertTriangle className="w-3 h-3 text-red-600" />
              </div>
              <p className="text-lg font-bold text-red-600">{stats.urgentMoqeem}</p>
              <p className="text-xs text-foreground-tertiary mt-0.5">
                خلال {companyThresholds.moqeem_subscription_urgent_days} أيام
              </p>
            </div>
            <div className="bg-surface rounded-lg p-2.5 border border-teal-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">عاجل</span>
                <Clock className="w-3 h-3 text-orange-500" />
              </div>
              <p className="text-lg font-bold text-orange-600">{stats.highMoqeem}</p>
              <p className="text-xs text-foreground-tertiary mt-0.5">
                خلال {companyThresholds.moqeem_subscription_high_days} يوم
              </p>
            </div>
            <div className="bg-surface rounded-lg p-2.5 border border-teal-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">متوسط</span>
                <Calendar className="w-3 h-3 text-yellow-500" />
              </div>
              <p className="text-lg font-bold text-yellow-600">{stats.mediumMoqeem}</p>
              <p className="text-xs text-foreground-tertiary mt-0.5">
                {companyThresholds.moqeem_subscription_medium_days} يوم
              </p>
            </div>
            <div className="bg-surface rounded-lg p-2.5 border border-teal-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-secondary">ساري</span>
                <Shield className="w-3 h-3 text-green-500" />
              </div>
              <p className="text-lg font-bold text-green-600">{stats.validMoqeem}</p>
              <p className="text-xs text-foreground-tertiary mt-0.5">
                أكثر من {companyThresholds.moqeem_subscription_medium_days} يوم
              </p>
            </div>
            {stats.noDocumentMoqeem > 0 && (
              <div className="bg-surface rounded-lg p-2.5 border border-teal-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-foreground-secondary">بلا وثيقة</span>
                  <Shield className="w-3 h-3 text-neutral-400" />
                </div>
                <p className="text-lg font-bold text-neutral-500">{stats.noDocumentMoqeem}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* قائمة مختصرة بالمؤسسات */}
      <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-primary" />
            المؤسسات الأخيرة
          </h3>
          <button
            onClick={() => navigate('/companies')}
            className="text-primary hover:brightness-90 text-xs font-medium flex items-center gap-1"
          >
            عرض الكل
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="space-y-1">
          {companies.slice(0, 5).map((company) => {
            const employeesInCompany = employees.filter((emp) => emp.company_id === company.id).length
            return (
              <div
                key={company.id}
                onClick={() => navigate(`/companies?id=${company.id}`)}
                className="rounded-lg border border-border bg-surface p-2.5 transition cursor-pointer hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-xs text-neutral-900">{company.name}</p>
                    <p className="text-xs text-neutral-600">
                      {employeesInCompany} موظف
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
          {companies.length === 0 && (
            <div className="text-center py-5 text-neutral-500 text-xs">لا توجد مؤسسات مسجلة</div>
          )}
        </div>
      </div>
    </div>
  )
}
