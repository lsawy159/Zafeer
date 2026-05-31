import { useState, useEffect } from 'react'
import { supabase, Employee, Company, Project } from '@/lib/supabase'
import { toast } from 'sonner'
import { EmployeeListSkeleton } from '@/components/ui/Skeleton'
import { CompanyWithStats, ExportTabProps, EmployeeWithRelations } from './ExportTab/exportTypes'
import { EmployeeExport } from './ExportTab/EmployeeExport'
import { CompanyExport } from './ExportTab/CompanyExport'

export default function ExportTab({
  initialExportType = 'employees',
  hideTypeSelector = false,
}: ExportTabProps = {}) {
  const [exportType, setExportType] = useState<'employees' | 'companies'>(initialExportType)
  const [employees, setEmployees] = useState<EmployeeWithRelations[]>([])
  const [companies, setCompanies] = useState<CompanyWithStats[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [employeesRes, companiesRes] = await Promise.all([
        supabase
          .from('employees')
          .select(
            'id,company_id,name,profession,nationality,birth_date,phone,passport_number,residence_number,joining_date,contract_expiry,hired_worker_contract_expiry,residence_expiry,project_id,project_name,bank_account,residence_image_url,health_insurance_expiry,salary,notes,additional_fields,is_deleted,deleted_at,created_at,updated_at, company:companies(id,name,unified_number), project:projects(id,name)'
          )
          .eq('is_deleted', false)
          .order('name'),
        supabase
          .from('companies')
          .select(
            'id,name,unified_number,labor_subscription_number,commercial_registration_expiry,social_insurance_number,commercial_registration_status,additional_fields,ending_subscription_power_date,ending_subscription_moqeem_date,employee_count,max_employees,notes,exemptions,company_type,created_at,updated_at'
          )
          .order('name'),
      ])

      if (employeesRes.error) throw employeesRes.error
      if (companiesRes.error) throw companiesRes.error

      setEmployees(
        (employeesRes.data || []) as unknown as (Employee & {
          company: Company
          project?: Project
        })[]
      )

      const employeeCounts: Record<string, number> = {}
      employeesRes.data?.forEach((emp) => {
        if (emp.company_id) {
          employeeCounts[emp.company_id] = (employeeCounts[emp.company_id] || 0) + 1
        }
      })

      const companiesWithStats = (companiesRes.data || []).map((company) => {
        const employeeCount = employeeCounts[company.id] || 0
        const maxEmployees = company.max_employees || 4
        const availableSlots = Math.max(0, maxEmployees - employeeCount)

        return {
          ...company,
          employee_count: employeeCount,
          available_slots: availableSlots,
        } as CompanyWithStats
      })

      setCompanies(companiesWithStats)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('فشل تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [])

  const isInitialLoading = loading && employees.length === 0 && companies.length === 0

  if (isInitialLoading) {
    return (
      <div className="space-y-4 text-[13px] leading-5">
        <div className="app-filter-surface">
          <div className="h-5 w-40 animate-pulse rounded-md bg-slate-200" />
        </div>
        <EmployeeListSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-3 text-[13px] leading-5">
      {!hideTypeSelector && (
        <div>
          <label className="block text-[12px] font-medium text-neutral-700 mb-1">
            نوع البيانات المراد تصديرها
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setExportType('employees')}
              className={`flex-1 rounded-md border px-3 py-2 font-medium transition ${
                exportType === 'employees'
                  ? 'border-primary bg-primary/15 text-slate-900'
                  : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
              }`}
            >
              موظفين
            </button>
            <button
              onClick={() => setExportType('companies')}
              className={`flex-1 px-3 py-2 rounded-md border font-medium transition ${
                exportType === 'companies'
                  ? 'border-green-600 bg-green-50 text-success-700'
                  : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
              }`}
            >
              مؤسسات
            </button>
          </div>
        </div>
      )}

      {exportType === 'employees' && (
        <EmployeeExport
          employees={employees}
          companies={companies}
          dataLoading={loading}
        />
      )}

      {exportType === 'companies' && (
        <CompanyExport
          companies={companies}
          dataLoading={loading}
        />
      )}
    </div>
  )
}
