import { useState, useEffect, useCallback } from 'react'
import Layout from '@/components/layout/Layout'
import {
  BarChart3,
  RefreshCw,
  Download,
  AlertTriangle,
  Calendar,
  TrendingUp,
  Building2,
  Users,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { differenceInDays } from 'date-fns'
import { toast } from 'sonner'
import { saveAs } from 'file-saver'
import { loadXlsx } from '@/utils/lazyXlsx'
import { DEFAULT_STATUS_THRESHOLDS, getStatusThresholds } from '@/utils/autoCompanyStatus'
import { usePermissions } from '@/utils/permissions'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'

interface SubscriptionItem {
  type: string
  name: string
  expiryDate: string
  daysRemaining: number
  status: 'expired' | 'urgent' | 'medium' | 'valid'
}

type TabType = 'companies' | 'employees'

const COMPANY_TYPES = ['سجل تجاري', 'تأمينات اجتماعية', 'اشتراك مقيم', 'اشتراك قوى']
const EMPLOYEE_TYPES = ['إقامة', 'عقد', 'عقد أجير', 'تأمين صحي']

const MONTH_NAMES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDateDDMmmYYYY(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const day = String(d.getDate()).padStart(2, '0')
  const month = MONTH_NAMES_EN[d.getMonth()]
  const year = d.getFullYear()
  return `${day}-${month}-${year}`
}

type RawEmployee = {
  id: string
  name: string
  residence_number: string | null
  passport_number: string | null
  profession: string | null
  nationality: string | null
  project_name: string | null
  company_id: string | null
  residence_expiry: string | null
  contract_expiry: string | null
  hired_worker_contract_expiry: string | null
  health_insurance_expiry: string | null
}

type RawCompany = {
  id: string
  name: string
  unified_number: string | null
  labor_subscription_number: string | null
  social_insurance_number: string | null
  commercial_registration_expiry: string | null
  ending_subscription_moqeem_date: string | null
  ending_subscription_power_date: string | null
}

export default function Reports() {
  const { canExport } = usePermissions()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('companies')
  const [totalExpired, setTotalExpired] = useState(0)
  const [totalUrgent, setTotalUrgent] = useState(0)
  const [totalMedium, setTotalMedium] = useState(0)
  const [totalValid, setTotalValid] = useState(0)
  const [subscriptionItems, setSubscriptionItems] = useState<SubscriptionItem[]>([])
  const [filteredItems, setFilteredItems] = useState<SubscriptionItem[]>([])
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [statusThresholds, setStatusThresholds] =
    useState<typeof DEFAULT_STATUS_THRESHOLDS>(DEFAULT_STATUS_THRESHOLDS)
  const [rawEmployees, setRawEmployees] = useState<RawEmployee[]>([])
  const [rawCompanies, setRawCompanies] = useState<RawCompany[]>([])

  useEffect(() => {
    const loadThresholds = async () => {
      const thresholds = await getStatusThresholds()
      setStatusThresholds(thresholds)
    }
    loadThresholds()
  }, [])

  const categorizeExpiry = useCallback(
    (expiryDate: string | null | undefined): SubscriptionItem['status'] | null => {
      if (!expiryDate) return null

      const days = differenceInDays(new Date(expiryDate), new Date())
      if (days < 0) return 'expired'

      const urgentDays = statusThresholds.commercial_reg_urgent_days || 7
      const highDays = statusThresholds.commercial_reg_high_days || 15
      const mediumDays = statusThresholds.commercial_reg_medium_days || 30

      if (days <= urgentDays) return 'urgent'
      if (days <= highDays) return 'urgent'
      if (days <= mediumDays) return 'medium'
      return 'valid'
    },
    [statusThresholds]
  )

  const statusLabel = useCallback(
    (expiryDate: string | null | undefined): string => {
      const s = categorizeExpiry(expiryDate)
      if (!s) return ''
      return s === 'expired' ? 'منتهي' : s === 'urgent' ? 'عاجل' : s === 'medium' ? 'متوسط' : 'ساري'
    },
    [categorizeExpiry]
  )

  const updateTabStatistics = useCallback((items: SubscriptionItem[], tab: TabType) => {
    const types = tab === 'companies' ? COMPANY_TYPES : EMPLOYEE_TYPES
    const tabItems = items.filter((item) => types.includes(item.type))

    setTotalExpired(tabItems.filter((item) => item.status === 'expired').length)
    setTotalUrgent(tabItems.filter((item) => item.status === 'urgent').length)
    setTotalMedium(tabItems.filter((item) => item.status === 'medium').length)
    setTotalValid(tabItems.filter((item) => item.status === 'valid').length)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)

    try {
      const [
        { data: employeesData, error: employeesError },
        { data: companiesData, error: companiesError },
      ] = await Promise.all([
        supabase
          .from('employees')
          .select(
            'id,company_id,name,profession,nationality,birth_date,phone,passport_number,residence_number,joining_date,contract_expiry,hired_worker_contract_expiry,residence_expiry,project_id,project_name,bank_account,residence_image_url,health_insurance_expiry,salary,notes,additional_fields,is_deleted,deleted_at,created_at,updated_at'
          )
          .order('name'),
        supabase
          .from('companies')
          .select(
            'id,name,unified_number,labor_subscription_number,commercial_registration_expiry,social_insurance_number,commercial_registration_status,additional_fields,ending_subscription_power_date,ending_subscription_moqeem_date,employee_count,max_employees,notes,exemptions,company_type,created_at,updated_at'
          )
          .order('name'),
      ])

      if (employeesError) throw employeesError
      if (companiesError) throw companiesError

      if (!employeesData || !companiesData) {
        setSubscriptionItems([])
        setRawEmployees([])
        setRawCompanies([])
        return
      }

      setRawEmployees(employeesData as unknown as RawEmployee[])
      setRawCompanies(companiesData as unknown as RawCompany[])

      const items: SubscriptionItem[] = []

      employeesData.forEach((employee) => {
        const employeeFields = [
          { type: 'إقامة', expiry: employee.residence_expiry },
          { type: 'عقد', expiry: employee.contract_expiry },
          { type: 'عقد أجير', expiry: employee.hired_worker_contract_expiry },
          { type: 'تأمين صحي', expiry: employee.health_insurance_expiry },
        ]

        employeeFields.forEach((field) => {
          if (!field.expiry) return

          const status = categorizeExpiry(field.expiry)
          if (!status) return

          items.push({
            type: field.type,
            name: employee.name,
            expiryDate: field.expiry,
            daysRemaining: differenceInDays(new Date(field.expiry), new Date()),
            status,
          })
        })
      })

      companiesData.forEach((company) => {
        const companyFields = [
          { type: 'سجل تجاري', expiry: company.commercial_registration_expiry },
          { type: 'اشتراك مقيم', expiry: company.ending_subscription_moqeem_date },
          { type: 'اشتراك قوى', expiry: company.ending_subscription_power_date },
        ]

        companyFields.forEach((field) => {
          if (!field.expiry) return

          const status = categorizeExpiry(field.expiry)
          if (!status) return

          items.push({
            type: field.type,
            name: company.name,
            expiryDate: field.expiry,
            daysRemaining: differenceInDays(new Date(field.expiry), new Date()),
            status,
          })
        })
      })

      items.sort((left, right) => {
        const priority = { expired: 0, urgent: 1, medium: 2, valid: 3 }
        if (priority[left.status] !== priority[right.status]) {
          return priority[left.status] - priority[right.status]
        }

        return left.daysRemaining - right.daysRemaining
      })

      setSubscriptionItems(items)
      updateTabStatistics(items, activeTab)
    } catch (error) {
      console.error('Error loading reports data:', error)
      toast.error('حدث خطأ أثناء تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }, [activeTab, categorizeExpiry, updateTabStatistics])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (subscriptionItems.length > 0) {
      updateTabStatistics(subscriptionItems, activeTab)
    } else {
      setTotalExpired(0)
      setTotalUrgent(0)
      setTotalMedium(0)
      setTotalValid(0)
    }
  }, [activeTab, subscriptionItems, updateTabStatistics])

  useEffect(() => {
    setFilterType('all')
  }, [activeTab])

  useEffect(() => {
    const allowedTypes = activeTab === 'companies' ? COMPANY_TYPES : EMPLOYEE_TYPES

    let nextItems = subscriptionItems.filter((item) => allowedTypes.includes(item.type))

    if (filterType !== 'all') {
      nextItems = nextItems.filter((item) => item.type === filterType)
    }

    if (filterStatus !== 'all') {
      nextItems = nextItems.filter((item) => item.status === filterStatus)
    }

    setFilteredItems(nextItems)
  }, [activeTab, filterStatus, filterType, subscriptionItems])

  const exportExpiryReportToExcel = async () => {
    try {
      const XLSX = await loadXlsx()
      const wb = XLSX.utils.book_new()

      if (activeTab === 'employees') {
        const rows = rawEmployees.map((emp) => ({
          'اسم الموظف': emp.name,
          'رقم الإقامة': emp.residence_number ?? '',
          'رقم جواز السفر': emp.passport_number ?? '',
          'المهنة': emp.profession ?? '',
          'الجنسية': emp.nationality ?? '',
          'المشروع': emp.project_name ?? '',

          'حالة الإقامة': statusLabel(emp.residence_expiry),
          'تاريخ انتهاء الإقامة': formatDateDDMmmYYYY(emp.residence_expiry),
          'أيام متبقية للإقامة': emp.residence_expiry
            ? differenceInDays(new Date(emp.residence_expiry), new Date())
            : '',

          'حالة التأمين الصحي': statusLabel(emp.health_insurance_expiry),
          'تاريخ انتهاء التأمين الصحي': formatDateDDMmmYYYY(emp.health_insurance_expiry),
          'أيام متبقية للتأمين الصحي': emp.health_insurance_expiry
            ? differenceInDays(new Date(emp.health_insurance_expiry), new Date())
            : '',

          'حالة العقد': statusLabel(emp.contract_expiry),
          'تاريخ انتهاء العقد': formatDateDDMmmYYYY(emp.contract_expiry),
          'أيام متبقية للعقد': emp.contract_expiry
            ? differenceInDays(new Date(emp.contract_expiry), new Date())
            : '',

          'حالة عقد الأجير': statusLabel(emp.hired_worker_contract_expiry),
          'تاريخ انتهاء عقد الأجير': formatDateDDMmmYYYY(emp.hired_worker_contract_expiry),
          'أيام متبقية لعقد الأجير': emp.hired_worker_contract_expiry
            ? differenceInDays(new Date(emp.hired_worker_contract_expiry), new Date())
            : '',
        }))

        const ws = XLSX.utils.json_to_sheet(rows)
        ws['!cols'] = [
          { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 18 },
          { wch: 14 }, { wch: 20 }, { wch: 18 },
          { wch: 18 }, { wch: 24 }, { wch: 22 },
          { wch: 12 }, { wch: 20 }, { wch: 16 },
          { wch: 14 }, { wch: 22 }, { wch: 18 },
        ]
        XLSX.utils.book_append_sheet(wb, ws, 'الموظفين')
      } else {
        const rows = rawCompanies.map((co) => ({
          'اسم المؤسسة': co.name,
          'الرقم الموحد': co.unified_number ?? '',
          'رقم السجل التجاري': co.labor_subscription_number ?? '',
          'رقم التأمينات الاجتماعية': co.social_insurance_number ?? '',

          'حالة السجل التجاري': statusLabel(co.commercial_registration_expiry),
          'تاريخ انتهاء السجل التجاري': formatDateDDMmmYYYY(co.commercial_registration_expiry),
          'أيام متبقية للسجل التجاري': co.commercial_registration_expiry
            ? differenceInDays(new Date(co.commercial_registration_expiry), new Date())
            : '',

          'حالة اشتراك مقيم': statusLabel(co.ending_subscription_moqeem_date),
          'تاريخ انتهاء اشتراك مقيم': formatDateDDMmmYYYY(co.ending_subscription_moqeem_date),
          'أيام متبقية لاشتراك مقيم': co.ending_subscription_moqeem_date
            ? differenceInDays(new Date(co.ending_subscription_moqeem_date), new Date())
            : '',

          'حالة اشتراك قوى': statusLabel(co.ending_subscription_power_date),
          'تاريخ انتهاء اشتراك قوى': formatDateDDMmmYYYY(co.ending_subscription_power_date),
          'أيام متبقية لاشتراك قوى': co.ending_subscription_power_date
            ? differenceInDays(new Date(co.ending_subscription_power_date), new Date())
            : '',
        }))

        const ws = XLSX.utils.json_to_sheet(rows)
        ws['!cols'] = [
          { wch: 28 }, { wch: 14 }, { wch: 20 }, { wch: 20 },
          { wch: 18 }, { wch: 24 }, { wch: 22 },
          { wch: 18 }, { wch: 24 }, { wch: 22 },
          { wch: 18 }, { wch: 24 }, { wch: 22 },
        ]
        XLSX.utils.book_append_sheet(wb, ws, 'المؤسسات')
      }

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const sheetName = activeTab === 'companies' ? 'المؤسسات' : 'الموظفين'
      saveAs(blob, `تقرير_${sheetName}_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('تم تصدير البيانات بنجاح')
    } catch (err) {
      console.error('Export error:', err)
      toast.error('فشل تصدير البيانات')
    }
  }

  const getStatusBadgeColor = (status: SubscriptionItem['status']) => {
    switch (status) {
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'urgent':
        return 'bg-orange-100 text-warning-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'valid':
        return 'bg-green-100 text-success-800 border-green-200'
      default:
        return 'bg-neutral-100 text-neutral-800 border-neutral-200'
    }
  }

  const getStatusText = (status: SubscriptionItem['status']) => {
    switch (status) {
      case 'expired':
        return 'منتهي'
      case 'urgent':
        return 'عاجل'
      case 'medium':
        return 'متوسط'
      case 'valid':
        return 'ساري'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="app-page app-tech-grid">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-neutral-600">جاري تحميل البيانات...</p>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  const typeOptions = activeTab === 'companies' ? COMPANY_TYPES : EMPLOYEE_TYPES

  return (
    <Layout>
      <div className="app-page app-tech-grid">
        <PageHeader
          title="التقارير"
          description={`عدد النتائج: ${filteredItems.length}`}
          className="mb-6"
          actions={
            <div className="flex gap-2">
              <Button onClick={loadData}>
                <RefreshCw className="w-4 h-4" />
                تحديث البيانات
              </Button>
              {canExport('reports') && (
                <Button onClick={exportExpiryReportToExcel} variant="success">
                  <Download className="w-4 h-4" />
                  تصدير Excel
                </Button>
              )}
            </div>
          }
        />

        <div className="app-panel mb-6">
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab('companies')}
              className={`app-tab-button ${
                activeTab === 'companies'
                  ? 'app-tab-button-active'
                  : 'hover:bg-surface-secondary hover:text-foreground'
              }`}
            >
              <Building2 className="w-5 h-5" />
              <span>المؤسسات</span>
            </button>
            <button
              onClick={() => setActiveTab('employees')}
              className={`app-tab-button ${
                activeTab === 'employees'
                  ? 'app-tab-button-active'
                  : 'hover:bg-surface-secondary hover:text-foreground'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>الموظفين</span>
            </button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="app-panel p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 mb-1">إجمالي المنتهية</p>
                <p className="text-2xl font-bold text-red-600">{totalExpired}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
          <div className="app-panel p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 mb-1">عاجل</p>
                <p className="text-2xl font-bold text-warning-600">{totalUrgent}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <Calendar className="w-6 h-6 text-warning-600" />
              </div>
            </div>
          </div>
          <div className="app-panel p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 mb-1">متوسط</p>
                <p className="text-2xl font-bold text-yellow-600">{totalMedium}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
          <div className="app-panel p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 mb-1">ساري</p>
                <p className="text-2xl font-bold text-success-600">{totalValid}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <BarChart3 className="w-6 h-6 text-success-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="app-panel p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">الاشتراكات القريبة من الانتهاء</h2>
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="جميع الأنواع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  {typeOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="جميع الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="expired">منتهي</SelectItem>
                  <SelectItem value="urgent">عاجل</SelectItem>
                  <SelectItem value="medium">متوسط</SelectItem>
                  <SelectItem value="valid">ساري</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-4 py-2 text-right">النوع</th>
                  <th className="px-4 py-2 text-right">الاسم/المؤسسة</th>
                  <th className="px-4 py-2 text-right">تاريخ الانتهاء</th>
                  <th className="px-4 py-2 text-right">الأيام المتبقية</th>
                  <th className="px-4 py-2 text-right">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                      لا توجد بيانات
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, index) => (
                    <tr
                      key={`${item.type}-${item.name}-${index}`}
                      className="border-t hover:bg-neutral-50"
                    >
                      <td className="px-4 py-2">{item.type}</td>
                      <td className="px-4 py-2 font-medium">{item.name}</td>
                      <td className="px-4 py-2">{formatDateDDMmmYYYY(item.expiryDate)}</td>
                      <td className="px-4 py-2">
                        <span
                          className={
                            item.daysRemaining < 0
                              ? 'text-red-600 font-bold'
                              : item.daysRemaining <= 30
                                ? 'text-warning-600'
                                : ''
                          }
                        >
                          {item.daysRemaining < 0
                            ? `منتهي منذ ${Math.abs(item.daysRemaining)} يوم`
                            : `${item.daysRemaining} يوم`}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs border ${getStatusBadgeColor(item.status)}`}
                        >
                          {getStatusText(item.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3 p-4">
            {filteredItems.length === 0 ? (
              <div className="text-center text-neutral-500 py-8">لا توجد بيانات</div>
            ) : (
              filteredItems.map((item, index) => (
                <div
                  key={`${item.type}-${item.name}-${index}`}
                  className="bg-surface border border-neutral-200 rounded-lg p-4 space-y-2"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="text-xs text-neutral-600 font-semibold">النوع</p>
                      <p className="text-sm font-medium text-neutral-900">{item.type}</p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs border flex-shrink-0 ${getStatusBadgeColor(item.status)}`}
                    >
                      {getStatusText(item.status)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-600 font-semibold">الاسم/المؤسسة</p>
                    <p className="text-sm font-medium text-neutral-900">{item.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-neutral-600 font-semibold">تاريخ الانتهاء</p>
                      <p className="text-sm text-neutral-900">{formatDateDDMmmYYYY(item.expiryDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-600 font-semibold">الأيام المتبقية</p>
                      <p
                        className={`text-sm font-semibold ${item.daysRemaining < 0 ? 'text-red-600' : item.daysRemaining <= 30 ? 'text-warning-600' : 'text-neutral-900'}`}
                      >
                        {item.daysRemaining < 0
                          ? `منتهي منذ ${Math.abs(item.daysRemaining)}`
                          : `${item.daysRemaining} يوم`}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
