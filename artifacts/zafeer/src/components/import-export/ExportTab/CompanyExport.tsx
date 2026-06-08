import { useState, useMemo } from 'react'
import {
  FileDown,
  CheckSquare,
  Square,
  FileText,
  Building2,
  RotateCcw,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { saveAs } from 'file-saver'
import { loadXlsx } from '@/utils/lazyXlsx'
import { formatDateShortWithHijri } from '@/utils/dateFormatter'
import { normalizeArabic } from '@/utils/textUtils'
import { CompanyWithStats, isExpired, isExpiringWithin30Days } from './exportTypes'
import { Chip } from './exportComponents'

interface CompanyExportProps {
  companies: CompanyWithStats[]
  dataLoading: boolean
}

export function CompanyExport({ companies, dataLoading }: CompanyExportProps) {
  const [loading, setLoading] = useState(false)
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set())
  const [companySearchQuery, setCompanySearchQuery] = useState('')
  const [expandedCompanyFilterGroup, setExpandedCompanyFilterGroup] = useState<string | null>(null)
  const [companyFilters, setCompanyFilters] = useState({
    completed: false,
    vacant1: false,
    vacant2: false,
    vacant3: false,
    vacant4: false,
    expiredCommercialReg: false,
    expiringCommercialReg30: false,
    expiredPowerSub: false,
    expiringPowerSub30: false,
    expiredMoqeemSub: false,
    expiringMoqeemSub30: false,
    exempted: false,
    notExempted: false,
  })

  const calculateAvailableSlots = (company: CompanyWithStats): number => {
    const employeeCount = company.employee_count || 0
    const maxEmployees = company.max_employees || 4
    return Math.max(0, maxEmployees - employeeCount)
  }

  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      const matchesSearch =
        !companySearchQuery ||
        (company.name || '').toLowerCase().includes(companySearchQuery.toLowerCase()) ||
        String(company.unified_number ?? '')
          .toLowerCase()
          .includes(companySearchQuery.toLowerCase())
      if (!matchesSearch) return false

      if (companyFilters.completed) {
        if (calculateAvailableSlots(company) !== 0) return false
      }
      if (companyFilters.vacant1) {
        if (calculateAvailableSlots(company) !== 1) return false
      }
      if (companyFilters.vacant2) {
        if (calculateAvailableSlots(company) !== 2) return false
      }
      if (companyFilters.vacant3) {
        if (calculateAvailableSlots(company) !== 3) return false
      }
      if (companyFilters.vacant4) {
        if (calculateAvailableSlots(company) !== 4) return false
      }
      if (companyFilters.expiredCommercialReg && !isExpired(company.commercial_registration_expiry))
        return false
      if (companyFilters.expiringCommercialReg30 && !isExpiringWithin30Days(company.commercial_registration_expiry))
        return false
      if (companyFilters.expiredPowerSub && !isExpired(company.ending_subscription_power_date))
        return false
      if (companyFilters.expiringPowerSub30 && !isExpiringWithin30Days(company.ending_subscription_power_date))
        return false
      if (companyFilters.expiredMoqeemSub && !isExpired(company.ending_subscription_moqeem_date))
        return false
      if (companyFilters.expiringMoqeemSub30 && !isExpiringWithin30Days(company.ending_subscription_moqeem_date))
        return false

      if (companyFilters.exempted || companyFilters.notExempted) {
        const targetPhrase = normalizeArabic('تم الاعفاء')
        const normalizedValue = normalizeArabic(company.exemptions)
        const isExempt = normalizedValue.includes(targetPhrase)

        if (companyFilters.exempted && !companyFilters.notExempted && !isExempt) return false
        if (!companyFilters.exempted && companyFilters.notExempted && isExempt) return false
      }

      return true
    })
  }, [companies, companyFilters, companySearchQuery])

  const toggleCompanySelection = (id: string) => {
    const newSet = new Set(selectedCompanies)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedCompanies(newSet)
  }

  const toggleAllCompanies = () => {
    if (selectedCompanies.size === filteredCompanies.length) {
      setSelectedCompanies(new Set())
    } else {
      setSelectedCompanies(new Set(filteredCompanies.map((c) => c.id)))
    }
  }

  const toggleCompanyFilter = (filterKey: keyof typeof companyFilters) => {
    setCompanyFilters((prev) => ({
      ...prev,
      [filterKey]: !prev[filterKey],
    }))
  }

  const toggleCompanyFilterGroup = (group: string) => {
    setExpandedCompanyFilterGroup(expandedCompanyFilterGroup === group ? null : group)
  }

  const getActiveCompanyFiltersCount = useMemo(() => {
    let count = 0
    Object.values(companyFilters).forEach((val) => {
      if (val) count++
    })
    return count
  }, [companyFilters])

  const resetCompanyFilters = () => {
    setCompanyFilters({
      completed: false,
      vacant1: false,
      vacant2: false,
      vacant3: false,
      vacant4: false,
      expiredCommercialReg: false,
      expiringCommercialReg30: false,
      expiredPowerSub: false,
      expiringPowerSub30: false,
      expiredMoqeemSub: false,
      expiringMoqeemSub30: false,
      exempted: false,
      notExempted: false,
    })
    setCompanySearchQuery('')
    toast.success('تم إعادة تعيين جميع الفلاتر')
  }

  const exportCompanies = async () => {
    if (selectedCompanies.size === 0) {
      toast.error('الرجاء اختيار مؤسسة واحدة على الأقل')
      return
    }

    setLoading(true)
    try {
      const XLSX = await loadXlsx()
      const selectedData = filteredCompanies.filter((c) => selectedCompanies.has(c.id))

      const excelData = selectedData.map((company) => ({
        'اسم المؤسسة': company.name,
        'الرقم الموحد': company.unified_number || '',
        'رقم اشتراك التأمينات الاجتماعية': company.social_insurance_number || '',
        'رقم اشتراك قوى': company.labor_subscription_number || '',
        'تاريخ انتهاء السجل التجاري': company.commercial_registration_expiry
          ? formatDateShortWithHijri(company.commercial_registration_expiry)
          : '',
        'تاريخ انتهاء اشتراك قوى': company.ending_subscription_power_date
          ? formatDateShortWithHijri(company.ending_subscription_power_date)
          : '',
        'تاريخ انتهاء اشتراك مقيم': company.ending_subscription_moqeem_date
          ? formatDateShortWithHijri(company.ending_subscription_moqeem_date)
          : '',
        'عدد الموظفين': company.employee_count || 0,
        'الحد الأقصى للموظفين': company.max_employees || 0,
        الاعفاءات: company.exemptions || '',
        'نوع المؤسسة': company.company_type || '',
        الملاحظات: company.notes || '',
      }))

      const ws = XLSX.utils.json_to_sheet(excelData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'المؤسسات')

      ws['!cols'] = [
        { wch: 30 }, { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 25 },
        { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 20 },
        { wch: 20 }, { wch: 25 },
      ]

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      saveAs(blob, `companies_export_${new Date().toISOString().split('T')[0]}.xlsx`)

      toast.success(`تم تصدير ${selectedCompanies.size} مؤسسة بنجاح`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('فشل تصدير البيانات')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[14px] font-bold text-neutral-900">تصدير المؤسسات</h3>
        <button
          onClick={exportCompanies}
          disabled={loading || dataLoading || selectedCompanies.size === 0}
          className="app-button-success px-3 py-1.5"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileDown className="w-5 h-5" />
          )}
          {loading ? 'جارٍ التصدير...' : `تصدير المحدد (${selectedCompanies.size})`}
        </button>
      </div>

      {/* Company Search */}
      <div className="flex gap-2 mb-2">
        <div className="flex-1">
          <input
            type="text"
            placeholder="بحث باسم المؤسسة أو الرقم الموحد..."
            value={companySearchQuery}
            onChange={(e) => setCompanySearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Active Filters Bar */}
      {getActiveCompanyFiltersCount > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {companyFilters.completed && (
            <Chip active={true} onClick={() => toggleCompanyFilter('completed')} color="green">
              مكتملة ✕
            </Chip>
          )}
          {companyFilters.vacant1 && (
            <Chip active={true} onClick={() => toggleCompanyFilter('vacant1')} color="green">
              مكان شاغر ✕
            </Chip>
          )}
          {companyFilters.vacant2 && (
            <Chip active={true} onClick={() => toggleCompanyFilter('vacant2')} color="green">
              مكانين شاغرين ✕
            </Chip>
          )}
          {companyFilters.vacant3 && (
            <Chip active={true} onClick={() => toggleCompanyFilter('vacant3')} color="green">
              3 أماكن ✕
            </Chip>
          )}
          {companyFilters.vacant4 && (
            <Chip active={true} onClick={() => toggleCompanyFilter('vacant4')} color="green">
              4 أماكن ✕
            </Chip>
          )}
          {companyFilters.expiredCommercialReg && (
            <Chip active={true} onClick={() => toggleCompanyFilter('expiredCommercialReg')} color="green">
              سجل تجاري منتهي ✕
            </Chip>
          )}
          {companyFilters.expiringCommercialReg30 && (
            <Chip active={true} onClick={() => toggleCompanyFilter('expiringCommercialReg30')} color="green">
              سجل ينتهي خلال 30 يوم ✕
            </Chip>
          )}
          {companyFilters.expiredPowerSub && (
            <Chip active={true} onClick={() => toggleCompanyFilter('expiredPowerSub')} color="green">
              اشتراك قوى منتهي ✕
            </Chip>
          )}
          {companyFilters.expiringPowerSub30 && (
            <Chip active={true} onClick={() => toggleCompanyFilter('expiringPowerSub30')} color="green">
              قوى ينتهي خلال 30 يوم ✕
            </Chip>
          )}
          {companyFilters.expiredMoqeemSub && (
            <Chip active={true} onClick={() => toggleCompanyFilter('expiredMoqeemSub')} color="green">
              اشتراك مقيم منتهي ✕
            </Chip>
          )}
          {companyFilters.expiringMoqeemSub30 && (
            <Chip active={true} onClick={() => toggleCompanyFilter('expiringMoqeemSub30')} color="green">
              مقيم ينتهي خلال 30 يوم ✕
            </Chip>
          )}
          {companyFilters.exempted && (
            <Chip active={true} onClick={() => toggleCompanyFilter('exempted')} color="green">
              تم الاعفاء ✕
            </Chip>
          )}
          {companyFilters.notExempted && (
            <Chip active={true} onClick={() => toggleCompanyFilter('notExempted')} color="green">
              غير معفى ✕
            </Chip>
          )}
        </div>
      )}

      {/* Horizontal Collapsible Filter Groups */}
      <div className="flex gap-1.5 mb-2 flex-wrap">
        <button
          onClick={() => toggleCompanyFilterGroup('slots')}
          className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition ${
            expandedCompanyFilterGroup === 'slots'
              ? 'bg-green-600 text-white'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 inline mr-1" />
          الأماكن الشاغرة
        </button>
        <button
          onClick={() => toggleCompanyFilterGroup('commercial')}
          className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition ${
            expandedCompanyFilterGroup === 'commercial'
              ? 'bg-green-600 text-white'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5 inline mr-1" />
          السجل التجاري
        </button>
        <button
          onClick={() => toggleCompanyFilterGroup('subscriptions')}
          className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition ${
            expandedCompanyFilterGroup === 'subscriptions'
              ? 'bg-green-600 text-white'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          }`}
        >
          الاشتراكات
        </button>
        <button
          onClick={() => toggleCompanyFilterGroup('exemptions')}
          className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition ${
            expandedCompanyFilterGroup === 'exemptions'
              ? 'bg-green-600 text-white'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          }`}
        >
          الاعفاءات
        </button>
        {getActiveCompanyFiltersCount > 0 && (
          <button
            onClick={resetCompanyFilters}
            className="px-3 py-1.5 rounded-md text-[12px] font-medium bg-red-50 text-red-700 hover:bg-red-100 transition"
          >
            <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
            إعادة تعيين
          </button>
        )}
      </div>

      {/* Expanded Filter Group Content */}
      {expandedCompanyFilterGroup === 'slots' && (
        <div className="bg-neutral-50 rounded-md p-2 mb-2 flex flex-wrap gap-2">
          <Chip active={companyFilters.completed} onClick={() => toggleCompanyFilter('completed')} color="green">مكتملة</Chip>
          <Chip active={companyFilters.vacant1} onClick={() => toggleCompanyFilter('vacant1')} color="green">مكان شاغر</Chip>
          <Chip active={companyFilters.vacant2} onClick={() => toggleCompanyFilter('vacant2')} color="green">مكانين شاغرين</Chip>
          <Chip active={companyFilters.vacant3} onClick={() => toggleCompanyFilter('vacant3')} color="green">3 أماكن</Chip>
          <Chip active={companyFilters.vacant4} onClick={() => toggleCompanyFilter('vacant4')} color="green">4 أماكن</Chip>
        </div>
      )}

      {expandedCompanyFilterGroup === 'commercial' && (
        <div className="bg-neutral-50 rounded-md p-2 mb-2 flex flex-wrap gap-2">
          <Chip active={companyFilters.expiredCommercialReg} onClick={() => toggleCompanyFilter('expiredCommercialReg')} color="green">سجل منتهي</Chip>
          <Chip active={companyFilters.expiringCommercialReg30} onClick={() => toggleCompanyFilter('expiringCommercialReg30')} color="green">ينتهي خلال 30 يوم</Chip>
        </div>
      )}

      {expandedCompanyFilterGroup === 'subscriptions' && (
        <div className="bg-neutral-50 rounded-md p-2 mb-2 space-y-2">
          <div className="flex flex-wrap gap-2">
            <span className="text-[11px] font-semibold text-neutral-600">اشتراك قوى:</span>
            <Chip active={companyFilters.expiredPowerSub} onClick={() => toggleCompanyFilter('expiredPowerSub')} color="green">منتهي</Chip>
            <Chip active={companyFilters.expiringPowerSub30} onClick={() => toggleCompanyFilter('expiringPowerSub30')} color="green">ينتهي خلال 30 يوم</Chip>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-[11px] font-semibold text-neutral-600">اشتراك مقيم:</span>
            <Chip active={companyFilters.expiredMoqeemSub} onClick={() => toggleCompanyFilter('expiredMoqeemSub')} color="green">منتهي</Chip>
            <Chip active={companyFilters.expiringMoqeemSub30} onClick={() => toggleCompanyFilter('expiringMoqeemSub30')} color="green">ينتهي خلال 30 يوم</Chip>
          </div>
        </div>
      )}

      {expandedCompanyFilterGroup === 'exemptions' && (
        <div className="bg-neutral-50 rounded-md p-2 mb-2 flex flex-wrap gap-2">
          <Chip active={companyFilters.exempted} onClick={() => toggleCompanyFilter('exempted')} color="green">تم الاعفاء</Chip>
          <Chip active={companyFilters.notExempted} onClick={() => toggleCompanyFilter('notExempted')} color="green">غير معفى</Chip>
        </div>
      )}

      {/* Companies List - Desktop View */}
      <div className="hidden md:block border border-neutral-200 rounded-md overflow-hidden">
        <div className="bg-neutral-50 px-3 py-1.5 border-b border-neutral-200 flex items-center gap-2 text-[13px] overflow-x-auto">
          <button
            onClick={toggleAllCompanies}
            className="text-success-600 hover:text-success-700 flex-shrink-0"
          >
            {selectedCompanies.size === filteredCompanies.length ? (
              <CheckSquare className="w-4 h-4" />
            ) : (
              <Square className="w-4 h-4" />
            )}
          </button>
          <span className="font-medium text-neutral-700 whitespace-nowrap">
            تحديد الكل ({filteredCompanies.length})
          </span>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {filteredCompanies.map((company) => (
            <div
              key={company.id}
              className="px-3 py-2 border-b border-neutral-100 hover:bg-neutral-50 flex items-center gap-2 cursor-pointer"
              onClick={() => toggleCompanySelection(company.id)}
            >
              {selectedCompanies.has(company.id) ? (
                <CheckSquare className="w-4 h-4 text-success-600 flex-shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              )}
              <div className="flex-1">
                <div className="font-medium text-neutral-900">
                  {company.unified_number
                    ? `${company.name} (${company.unified_number})`
                    : company.name}
                </div>
                <div className="text-neutral-600">
                  {company.max_employees && ` | الحد: ${company.max_employees} موظف`}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Companies Grid - Mobile View */}
      <div className="md:hidden space-y-3">
        <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
          <button
            onClick={toggleAllCompanies}
            className="flex items-center gap-2 text-sm font-medium text-success-600 hover:text-success-700"
          >
            {selectedCompanies.size === filteredCompanies.length ? (
              <CheckSquare className="w-5 h-5" />
            ) : (
              <Square className="w-5 h-5" />
            )}
            <span>تحديد الكل ({filteredCompanies.length})</span>
          </button>
        </div>

        {filteredCompanies.map((company) => (
          <div
            key={company.id}
            onClick={() => toggleCompanySelection(company.id)}
            className={`bg-white border-2 rounded-lg p-4 cursor-pointer transition-all shadow-sm ${
              selectedCompanies.has(company.id)
                ? 'border-green-500 bg-green-50'
                : 'border-neutral-200 hover:border-green-300 hover:shadow'
            }`}
          >
            <div className="flex items-start gap-3 mb-3 pb-3 border-b border-neutral-200">
              <div className="pt-0.5">
                {selectedCompanies.has(company.id) ? (
                  <CheckSquare className="w-5 h-5 text-success-600" />
                ) : (
                  <Square className="w-5 h-5 text-neutral-400" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-neutral-900 text-base leading-tight">
                  {company.name}
                </h4>
                {company.unified_number && (
                  <p className="text-xs text-neutral-600 mt-1 font-mono">
                    🏢 {company.unified_number}
                  </p>
                )}
                {company.company_type && (
                  <p className="text-xs text-blue-600 mt-0.5">{company.company_type}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-blue-50 p-2 rounded">
                <p className="text-xs text-neutral-600">عدد الموظفين</p>
                <p className="text-lg font-bold text-blue-700">{company.employee_count || 0}</p>
              </div>
              {company.max_employees && (
                <div className="bg-purple-50 p-2 rounded">
                  <p className="text-xs text-neutral-600">الحد الأقصى</p>
                  <p className="text-lg font-bold text-purple-700">{company.max_employees}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {company.commercial_registration_expiry && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-600">السجل التجاري</span>
                  <span className="font-medium">{company.commercial_registration_expiry}</span>
                </div>
              )}
              {company.ending_subscription_power_date && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-600">اشتراك قوى</span>
                  <span className="font-medium">{company.ending_subscription_power_date}</span>
                </div>
              )}
              {company.ending_subscription_moqeem_date && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-600">اشتراك مقيم</span>
                  <span className="font-medium">{company.ending_subscription_moqeem_date}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
