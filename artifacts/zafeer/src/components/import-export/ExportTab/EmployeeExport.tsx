import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase, ObligationType } from '@/lib/supabase'
import {
  FileDown,
  CheckSquare,
  Square,
  Calendar,
  Shield,
  FileText,
  Building2,
  RotateCcw,
  Search,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { saveAs } from 'file-saver'
import { loadXlsx } from '@/utils/lazyXlsx'
import { formatDateShortWithHijri } from '@/utils/dateFormatter'
import { getEmployeeBusinessFields } from '@/utils/employeeBusinessFields'
import {
  EMPTY_PAYROLL_OBLIGATION_BREAKDOWN,
  getPayrollComponentBucket,
  getPayrollObligationBreakdownTotal,
  getPayrollObligationBucketFromType,
  normalizePayrollObligationBreakdown,
} from '@/utils/payrollObligationBuckets'
import { isLegacyExternalUrl } from '@/lib/residenceFile'
import { EMPLOYEE_DOC_BUCKET } from '@/lib/employeeDocFile'
import {
  CompanyWithStats,
  EmployeeWithRelations,
  isExpired,
  isExpiringWithin30Days,
  computeEmployeeDisplayData,
} from './exportTypes'
import { Chip, EmployeeTableRow, EmployeeCardItem } from './exportComponents'

interface EmployeeExportProps {
  employees: EmployeeWithRelations[]
  companies: CompanyWithStats[]
  dataLoading: boolean
}

export function EmployeeExport({ employees, companies, dataLoading }: EmployeeExportProps) {
  const [loading, setLoading] = useState(false)
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [companiesFilterQuery, setCompaniesFilterQuery] = useState('')
  const [selectedProjectName, setSelectedProjectName] = useState<string>('')
  const [projectFilterQuery, setProjectFilterQuery] = useState<string>('')
  const [expandedFilterGroup, setExpandedFilterGroup] = useState<string | null>(null)
  const [employeeExportMode, setEmployeeExportMode] = useState<'basic' | 'monthly'>('basic')
  const [monthlyExportMonth, setMonthlyExportMonth] = useState(new Date().toISOString().slice(0, 7))
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<string>>(new Set())
  const [employeeFilters, setEmployeeFilters] = useState({
    expiredResidence: false,
    expiringResidence30: false,
    expiredHealthInsurance: false,
    expiringHealthInsurance30: false,
    expiredHiredContract: false,
    expiringHiredContract30: false,
    expiredContract: false,
    expiringContract30: false,
  })
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true
  )

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        !searchQuery ||
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.profession.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(emp.residence_number ?? '')
          .toLowerCase()
          .includes(searchQuery.toLowerCase())

      const matchesCompany =
        selectedCompanyIds.size === 0 || selectedCompanyIds.has(emp.company_id?.toString() || '')

      const matchesProject =
        !selectedProjectName ||
        (emp.project?.name || emp.project_name || '').toLowerCase() ===
          selectedProjectName.toLowerCase()

      if (!matchesSearch || !matchesCompany || !matchesProject) return false

      if (employeeFilters.expiredResidence && !isExpired(emp.residence_expiry)) return false
      if (employeeFilters.expiringResidence30 && !isExpiringWithin30Days(emp.residence_expiry))
        return false
      if (employeeFilters.expiredHealthInsurance && !isExpired(emp.health_insurance_expiry))
        return false
      if (
        employeeFilters.expiringHealthInsurance30 &&
        !isExpiringWithin30Days(emp.health_insurance_expiry)
      )
        return false
      if (employeeFilters.expiredHiredContract && !isExpired(emp.hired_worker_contract_expiry))
        return false
      if (
        employeeFilters.expiringHiredContract30 &&
        !isExpiringWithin30Days(emp.hired_worker_contract_expiry)
      )
        return false
      if (employeeFilters.expiredContract && !isExpired(emp.contract_expiry)) return false
      if (employeeFilters.expiringContract30 && !isExpiringWithin30Days(emp.contract_expiry))
        return false

      return true
    })
  }, [employees, searchQuery, selectedCompanyIds, selectedProjectName, employeeFilters])

  const today = useMemo(() => new Date(), [])

  const employeeDisplayData = useMemo(
    () => new Map(filteredEmployees.map(emp => [emp.id, computeEmployeeDisplayData(emp, today)])),
    [filteredEmployees, today]
  )

  const handleToggleEmployee = useCallback((id: string) => {
    setSelectedEmployees(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const companiesForEmployeeFilter = useMemo(() => {
    if (!companiesFilterQuery) return companies
    const q = companiesFilterQuery.toLowerCase()
    return companies.filter(
      (c) =>
        (c.name || '').toLowerCase().includes(q) ||
        String(c.unified_number ?? '')
          .toLowerCase()
          .includes(q)
    )
  }, [companies, companiesFilterQuery])

  const projectsForEmployeeFilter = useMemo(() => {
    const all = employees
      .map((e) => (e.project?.name || e.project_name || '').trim())
      .filter(Boolean) as string[]
    const unique = Array.from(new Set(all))
    if (!projectFilterQuery) return unique.sort()
    const q = projectFilterQuery.toLowerCase()
    return unique.filter((name) => name.toLowerCase().includes(q)).sort()
  }, [employees, projectFilterQuery])

  const toggleAllEmployees = () => {
    if (selectedEmployees.size === filteredEmployees.length) {
      setSelectedEmployees(new Set())
    } else {
      setSelectedEmployees(new Set(filteredEmployees.map((e) => e.id)))
    }
  }

  const toggleCompanySelectionForEmployees = (id: string) => {
    const newSet = new Set(selectedCompanyIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedCompanyIds(newSet)
  }

  const toggleAllCompaniesForEmployees = () => {
    if (selectedCompanyIds.size === companies.length) {
      setSelectedCompanyIds(new Set())
    } else {
      setSelectedCompanyIds(new Set(companies.map((c) => c.id)))
    }
  }

  const toggleEmployeeFilter = (filterKey: keyof typeof employeeFilters) => {
    setEmployeeFilters((prev) => ({
      ...prev,
      [filterKey]: !prev[filterKey],
    }))
  }

  const toggleFilterGroup = (group: string) => {
    setExpandedFilterGroup(expandedFilterGroup === group ? null : group)
  }

  const getActiveEmployeeFiltersCount = useMemo(() => {
    let count = 0
    Object.values(employeeFilters).forEach((val) => {
      if (val) count++
    })
    if (selectedCompanyIds.size > 0) count++
    if (selectedProjectName) count++
    return count
  }, [employeeFilters, selectedCompanyIds, selectedProjectName])

  const resetEmployeeFilters = () => {
    setEmployeeFilters({
      expiredResidence: false,
      expiringResidence30: false,
      expiredHealthInsurance: false,
      expiringHealthInsurance30: false,
      expiredHiredContract: false,
      expiringHiredContract30: false,
      expiredContract: false,
      expiringContract30: false,
    })
    setSelectedCompanyIds(new Set())
    setSearchQuery('')
    toast.success('تم إعادة تعيين جميع الفلاتر')
  }

  const exportEmployees = async () => {
    if (selectedEmployees.size === 0) {
      toast.error('الرجاء اختيار موظف واحد على الأقل')
      return
    }

    setLoading(true)
    try {
      const XLSX = await loadXlsx()
      const selectedData = filteredEmployees.filter((e) => selectedEmployees.has(e.id))
      const selectedIds = selectedData.map((emp) => emp.id)

      const payrollMap = new Map<
        string,
        {
          overtime_amount?: number
          deductions_amount?: number
          installment_deducted_amount?: number
          deductions_notes?: string
          overtime_notes?: string
          breakdown: typeof EMPTY_PAYROLL_OBLIGATION_BREAKDOWN
        }
      >()

      const obligationTotalsMap = new Map<string, typeof EMPTY_PAYROLL_OBLIGATION_BREAKDOWN>()

      if (selectedIds.length > 0) {
        const obligationHeaders: { employee_id: string; obligation_type: ObligationType; total_amount: number | null; status: string }[] = []
        for (let i = 0; i < selectedIds.length; i += 200) {
          const { data, error } = await supabase
            .from('employee_obligation_headers')
            .select('employee_id, obligation_type, total_amount, status')
            .in('employee_id', selectedIds.slice(i, i + 200))
          if (error) throw error
          obligationHeaders.push(...(data || []))
        }
        ;(obligationHeaders).forEach((header) => {
          const bucket = getPayrollObligationBucketFromType(header.obligation_type)
          const current = normalizePayrollObligationBreakdown(
            obligationTotalsMap.get(header.employee_id)
          )
          current[bucket] += Number(header.total_amount || 0)
          obligationTotalsMap.set(header.employee_id, current)
        })
      }

      if (employeeExportMode === 'monthly' && selectedIds.length > 0) {
        const monthStart = `${monthlyExportMonth}-01`
        const nextMonthDate = new Date(`${monthlyExportMonth}-01T00:00:00`)
        nextMonthDate.setMonth(nextMonthDate.getMonth() + 1)
        const nextMonthStart = nextMonthDate.toISOString().slice(0, 10)

        const { data: monthRuns, error: runsError } = await supabase
          .from('payroll_runs')
          .select('id')
          .gte('payroll_month', monthStart)
          .lt('payroll_month', nextMonthStart)
        if (runsError) throw runsError
        const runIds = (monthRuns || []).map((r) => r.id)

        const payrollEntries: { id: string; employee_id: string; overtime_amount: number | null; deductions_amount: number | null; installment_deducted_amount: number | null; deductions_notes: string | null; overtime_notes: string | null }[] = []
        if (runIds.length > 0) {
          for (let i = 0; i < selectedIds.length; i += 200) {
            const { data, error } = await supabase
              .from('payroll_entries')
              .select('id,employee_id,overtime_amount,deductions_amount,installment_deducted_amount,deductions_notes,overtime_notes')
              .in('payroll_run_id', runIds)
              .in('employee_id', selectedIds.slice(i, i + 200))
            if (error) throw error
            payrollEntries.push(...(data || []))
          }
        }

        const entryIds = payrollEntries.map((entry) => entry.id)
        const components: { payroll_entry_id: string; component_code: string | null; amount: number | null }[] = []
        for (let i = 0; i < entryIds.length; i += 200) {
          const { data, error } = await supabase
            .from('payroll_entry_components')
            .select('payroll_entry_id, component_code, amount')
            .in('payroll_entry_id', entryIds.slice(i, i + 200))
          if (error) throw error
          components.push(...(data || []))
        }

        const breakdownByEntryId = new Map<string, typeof EMPTY_PAYROLL_OBLIGATION_BREAKDOWN>()
        ;(components).forEach((component) => {
          const bucket = getPayrollComponentBucket(component.component_code)
          if (!bucket) return

          const current = normalizePayrollObligationBreakdown(
            breakdownByEntryId.get(component.payroll_entry_id)
          )
          current[bucket] += Number(component.amount || 0)
          breakdownByEntryId.set(component.payroll_entry_id, current)
        })
        ;(payrollEntries).forEach((entry) => {
          const currentBreakdown = normalizePayrollObligationBreakdown(
            breakdownByEntryId.get(entry.id) ?? {
              ...EMPTY_PAYROLL_OBLIGATION_BREAKDOWN,
              penalty: Number(entry.deductions_amount || 0),
              advance: Number(entry.installment_deducted_amount || 0),
            }
          )

          payrollMap.set(entry.employee_id, {
            overtime_amount: Number(entry.overtime_amount || 0),
            deductions_amount: Number(entry.deductions_amount || 0),
            installment_deducted_amount: Number(entry.installment_deducted_amount || 0),
            deductions_notes: entry.deductions_notes || '',
            overtime_notes: entry.overtime_notes || '',
            breakdown: currentBreakdown,
          })
        })
      }

      // جمع مسارات الملفات الثلاثة في batch واحد:
      // الإقامة + الشهادة الصحية + عقد الأجير — كلها في bucket واحد (employee-documents).
      // RESIDENCE_BUCKET === EMPLOYEE_DOC_BUCKET === 'employee-documents'، لذا batch واحد يكفي.
      const allDocPaths = Array.from(
        new Set(
          selectedData.flatMap((emp) => [
            emp.residence_image_url,
            emp.health_certificate_url,
            emp.ajeer_contract_url,
          ]).filter((p): p is string => !!p && !isLegacyExternalUrl(p))
        )
      )

      const signedUrlMap = new Map<string, string>()
      if (allDocPaths.length > 0) {
        for (let i = 0; i < allDocPaths.length; i += 100) {
          const chunk = allDocPaths.slice(i, i + 100)
          const { data: signedResults, error: signErr } = await supabase.storage
            .from(EMPLOYEE_DOC_BUCKET)
            .createSignedUrls(chunk, 604800)
          if (signErr) {
            toast.warning('تعذّر توليد روابط ملفات الموظفين — سيُصدَّر الملف بدونها')
            break
          }
          if (signedResults) {
            for (const result of signedResults) {
              if (result.signedUrl && result.path && !result.error) {
                signedUrlMap.set(result.path, result.signedUrl)
              }
            }
          }
        }
      }

      const excelData = selectedData.map((emp) => {
        const businessFields = getEmployeeBusinessFields(emp)
        const obligationTotals = normalizePayrollObligationBreakdown(
          obligationTotalsMap.get(emp.id)
        )
        const baseRow = {
          الاسم: emp.name,
          المهنة: emp.profession || '',
          الجنسية: emp.nationality || '',
          'رقم الإقامة': emp.residence_number,
          'رقم الجواز': emp.passport_number || '',
          'رقم الهاتف': emp.phone || '',
          'الحساب البنكي': emp.bank_account || '',
          'اسم البنك': businessFields.bank_name,
          الراتب: emp.salary || '',
          'حالة عقد أجير': businessFields.hired_worker_contract_status,
          'إجمالي رسوم نقل وتجديد': obligationTotals.transfer_renewal,
          'إجمالي جزاءات وغرامات': obligationTotals.penalty,
          'إجمالي السلف': obligationTotals.advance,
          'إجمالي أخرى': obligationTotals.other,
          'إجمالي الاستقطاعات': getPayrollObligationBreakdownTotal(obligationTotals),
          المشروع: emp.project?.name || emp.project_name || '',
          'الشركة أو المؤسسة': emp.company?.name || '',
          'الرقم الموحد': emp.company?.unified_number || '',
          'تاريخ الميلاد': emp.birth_date ? formatDateShortWithHijri(emp.birth_date) : '',
          'تاريخ الالتحاق': emp.joining_date ? formatDateShortWithHijri(emp.joining_date) : '',
          'تاريخ انتهاء الإقامة': emp.residence_expiry
            ? formatDateShortWithHijri(emp.residence_expiry)
            : '',
          'تاريخ انتهاء العقد': emp.contract_expiry
            ? formatDateShortWithHijri(emp.contract_expiry)
            : '',
          'تاريخ انتهاء عقد أجير': emp.hired_worker_contract_expiry
            ? formatDateShortWithHijri(emp.hired_worker_contract_expiry)
            : '',
          'تاريخ انتهاء التأمين الصحي': emp.health_insurance_expiry
            ? formatDateShortWithHijri(emp.health_insurance_expiry)
            : '',
          'رابط صورة الإقامة': (() => {
            const p = emp.residence_image_url
            if (!p) return ''
            if (isLegacyExternalUrl(p)) return p
            return signedUrlMap.get(p) ?? ''
          })(),
          'رابط ملف الشهادة الصحية': (() => {
            const p = emp.health_certificate_url
            if (!p) return ''
            if (isLegacyExternalUrl(p)) return p
            return signedUrlMap.get(p) ?? ''
          })(),
          'رابط ملف عقد الأجير': (() => {
            const p = emp.ajeer_contract_url
            if (!p) return ''
            if (isLegacyExternalUrl(p)) return p
            return signedUrlMap.get(p) ?? ''
          })(),
          الملاحظات: emp.notes || '',
        }

        if (employeeExportMode !== 'monthly') {
          return baseRow
        }

        const payrollEntry = payrollMap.get(emp.id)
        const monthlyBreakdown = normalizePayrollObligationBreakdown(payrollEntry?.breakdown)

        return {
          ...baseRow,
          الشهر: monthlyExportMonth,
          الإضافي: Number(payrollEntry?.overtime_amount || 0),
          'ملاحظات الجزاءات': payrollEntry?.deductions_notes || '',
          'ملاحظات الإضافي': payrollEntry?.overtime_notes || '',
          'قسط رسوم نقل وتجديد': monthlyBreakdown.transfer_renewal,
          'قسط جزاءات وغرامات': monthlyBreakdown.penalty,
          'قسط سلفة': monthlyBreakdown.advance,
          'قسط أخرى': monthlyBreakdown.other,
          'إجمالي استقطاعات الشهر': getPayrollObligationBreakdownTotal(monthlyBreakdown),
        }
      })

      const ws = XLSX.utils.json_to_sheet(excelData)
      const wsRef = ws['!ref']
      if (wsRef) {
        const wsRange = XLSX.utils.decode_range(wsRef)
        // تعريف رؤوس الأعمدة التي تحتوي روابط + نص الـ hyperlink لكل منها
        const linkHeaders: { header: string; label: string; tooltip: string }[] = [
          { header: 'رابط صورة الإقامة', label: 'اضغط هنا لعرض الإقامة', tooltip: 'فتح صورة الإقامة' },
          { header: 'رابط ملف الشهادة الصحية', label: 'اضغط هنا لعرض الملف', tooltip: 'فتح الملف' },
          { header: 'رابط ملف عقد الأجير', label: 'اضغط هنا لعرض الملف', tooltip: 'فتح الملف' },
        ]
        for (const { header, label, tooltip } of linkHeaders) {
          let colIdx = -1
          for (let c = wsRange.s.c; c <= wsRange.e.c; c++) {
            if (ws[XLSX.utils.encode_cell({ r: wsRange.s.r, c })]?.v === header) {
              colIdx = c; break
            }
          }
          if (colIdx !== -1) {
            for (let r = wsRange.s.r + 1; r <= wsRange.e.r; r++) {
              const cRef = XLSX.utils.encode_cell({ r, c: colIdx })
              const rawUrl = typeof ws[cRef]?.v === 'string' ? (ws[cRef].v as string) : ''
              ws[cRef] = rawUrl.startsWith('http')
                ? { t: 's', v: label, l: { Target: rawUrl, Tooltip: tooltip } }
                : { t: 's', v: rawUrl }
            }
          }
        }
      }
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(
        wb,
        ws,
        employeeExportMode === 'monthly' ? 'تصدير شهري' : 'الموظفين'
      )

      ws['!cols'] =
        employeeExportMode === 'monthly'
          ? [
              { wch: 20 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
              { wch: 25 }, { wch: 25 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
              { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 24 }, { wch: 16 },
              { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 },
              { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 28 }, { wch: 25 }, { wch: 25 },
              { wch: 28 }, { wch: 22 }, { wch: 22 },
            ]
          : [
              { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
              { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 14 }, { wch: 18 },
              { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 25 },
              { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
              { wch: 20 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 },
            ]

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const dateLabel = new Date().toISOString().split('T')[0]
      const exportFileName =
        employeeExportMode === 'monthly'
          ? `employees_monthly_export_${monthlyExportMonth}_${dateLabel}.xlsx`
          : `employees_export_${dateLabel}.xlsx`

      saveAs(blob, exportFileName)
      toast.success(`تم تصدير ${selectedEmployees.size} موظف بنجاح`)
    } catch (error) {
      console.error('Export error:', error)
      const msg =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message: unknown }).message)
            : String(error)
      toast.error(`فشل تصدير البيانات: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[14px] font-bold text-neutral-900">تصدير الموظفين</h3>
        <button
          onClick={exportEmployees}
          disabled={loading || dataLoading || selectedEmployees.size === 0}
          className="app-button-primary px-3 py-1.5"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileDown className="w-5 h-5" />
          )}
          {loading ? 'جارٍ التصدير...' : `تصدير المحدد (${selectedEmployees.size})`}
        </button>
      </div>

      <div className="app-filter-surface mb-3 flex flex-col gap-3 md:flex-row md:items-end">
        <div className="min-w-[220px]">
          <label className="mb-1 block text-xs font-semibold text-slate-700">
            نوع تصدير الموظفين
          </label>
          <select
            value={employeeExportMode}
            onChange={(e) => setEmployeeExportMode(e.target.value as 'basic' | 'monthly')}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="basic">تصدير أساسي للموظفين</option>
            <option value="monthly">تصدير شهري بالتفاصيل المالية</option>
          </select>
        </div>

        <div
          className="min-w-[180px]"
          style={{ visibility: employeeExportMode === 'monthly' ? 'visible' : 'hidden' }}
        >
          <label className="mb-1 block text-xs font-semibold text-slate-700">
            الشهر المطلوب
          </label>
          <input
            type="month"
            value={monthlyExportMonth}
            onChange={(e) => setMonthlyExportMonth(e.target.value)}
            className="app-input py-2.5"
          />
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-2">
        <div className="flex-1">
          <input
            type="text"
            placeholder="بحث بالاسم أو المهنة أو رقم الإقامة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="app-input py-2"
          />
        </div>
      </div>

      {/* Active Filters Bar */}
      {(getActiveEmployeeFiltersCount > 0 ||
        selectedCompanyIds.size > 0 ||
        companiesFilterQuery) && (
        <div className="flex flex-wrap gap-1 mb-2">
          {employeeFilters.expiredResidence && (
            <Chip active={true} onClick={() => toggleEmployeeFilter('expiredResidence')} color="blue">
              الإقامات المنتهية ✕
            </Chip>
          )}
          {employeeFilters.expiringResidence30 && (
            <Chip active={true} onClick={() => toggleEmployeeFilter('expiringResidence30')} color="blue">
              تنتهي خلال 30 يوم ✕
            </Chip>
          )}
          {employeeFilters.expiredHealthInsurance && (
            <Chip active={true} onClick={() => toggleEmployeeFilter('expiredHealthInsurance')} color="blue">
              تأمين صحي منتهي ✕
            </Chip>
          )}
          {employeeFilters.expiringHealthInsurance30 && (
            <Chip active={true} onClick={() => toggleEmployeeFilter('expiringHealthInsurance30')} color="blue">
              تأمين صحي ينتهي خلال 30 يوم ✕
            </Chip>
          )}
          {employeeFilters.expiredHiredContract && (
            <Chip active={true} onClick={() => toggleEmployeeFilter('expiredHiredContract')} color="blue">
              أجير منتهي ✕
            </Chip>
          )}
          {employeeFilters.expiringHiredContract30 && (
            <Chip active={true} onClick={() => toggleEmployeeFilter('expiringHiredContract30')} color="blue">
              أجير ينتهي خلال 30 يوم ✕
            </Chip>
          )}
          {employeeFilters.expiredContract && (
            <Chip active={true} onClick={() => toggleEmployeeFilter('expiredContract')} color="blue">
              عقد منتهي ✕
            </Chip>
          )}
          {employeeFilters.expiringContract30 && (
            <Chip active={true} onClick={() => toggleEmployeeFilter('expiringContract30')} color="blue">
              عقد ينتهي خلال 30 يوم ✕
            </Chip>
          )}
          {selectedCompanyIds.size > 0 && (
            <Chip active={true} onClick={() => setSelectedCompanyIds(new Set())} color="blue">
              {selectedCompanyIds.size} مؤسسة ✕
            </Chip>
          )}
          {selectedProjectName && (
            <Chip active={true} onClick={() => setSelectedProjectName('')} color="blue">
              {selectedProjectName} ✕
            </Chip>
          )}
        </div>
      )}

      {/* Filter Group Buttons */}
      <div className="flex gap-1.5 mb-2 flex-wrap">
        <button
          onClick={() => toggleFilterGroup('companies')}
          className={`app-toggle-button text-[12px] ${expandedFilterGroup === 'companies' ? 'app-toggle-button-active' : ''}`}
        >
          <Building2 className="w-3.5 h-3.5 inline mr-1" />
          المؤسسات
        </button>
        <button
          onClick={() => toggleFilterGroup('residence')}
          className={`app-toggle-button text-[12px] ${expandedFilterGroup === 'residence' ? 'app-toggle-button-active' : ''}`}
        >
          <Calendar className="w-3.5 h-3.5 inline mr-1" />
          الإقامة
        </button>
        <button
          onClick={() => toggleFilterGroup('insurance')}
          className={`app-toggle-button text-[12px] ${expandedFilterGroup === 'insurance' ? 'app-toggle-button-active' : ''}`}
        >
          <Shield className="w-3.5 h-3.5 inline mr-1" />
          التأمين الصحي
        </button>
        <button
          onClick={() => toggleFilterGroup('project')}
          className={`app-toggle-button text-[12px] ${expandedFilterGroup === 'project' ? 'app-toggle-button-active' : ''}`}
        >
          <FileText className="w-3.5 h-3.5 inline mr-1" />
          المشروع
        </button>
        <button
          onClick={() => toggleFilterGroup('hiredContract')}
          className={`app-toggle-button text-[12px] ${expandedFilterGroup === 'hiredContract' ? 'app-toggle-button-active' : ''}`}
        >
          <FileText className="w-3.5 h-3.5 inline mr-1" />
          عقد أجير
        </button>
        <button
          onClick={() => toggleFilterGroup('employeeContract')}
          className={`app-toggle-button text-[12px] ${expandedFilterGroup === 'employeeContract' ? 'app-toggle-button-active' : ''}`}
        >
          <FileText className="w-3.5 h-3.5 inline mr-1" />
          العقد
        </button>
        {getActiveEmployeeFiltersCount > 0 && (
          <button
            onClick={resetEmployeeFilters}
            className="px-3 py-1.5 rounded-md text-[12px] font-medium bg-red-50 text-red-700 hover:bg-red-100 transition"
          >
            <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
            إعادة تعيين
          </button>
        )}
      </div>

      {/* Expanded Filter Groups */}
      {expandedFilterGroup === 'companies' && (
        <div className="bg-neutral-50 rounded-md p-2 mb-2 space-y-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-2.5" />
            <input
              type="text"
              value={companiesFilterQuery}
              onChange={(e) => setCompaniesFilterQuery(e.target.value)}
              placeholder="فلترة المؤسسات بالاسم أو الرقم الموحد"
              className="app-input bg-white py-2 pr-8 text-[12px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleAllCompaniesForEmployees}
              className="text-[11px] text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
            >
              {selectedCompanyIds.size === companies.length
                ? 'إلغاء تحديد الكل'
                : `تحديد الكل (${companies.length})`}
            </button>
          </div>
          <div className="border border-neutral-200 rounded-md bg-white max-h-40 overflow-y-auto p-2 space-y-1">
            {companiesForEmployeeFilter.map((company) => (
              <div
                key={company.id}
                className="flex items-center gap-2 py-1 px-2 hover:bg-blue-50 rounded cursor-pointer transition"
                onClick={() => toggleCompanySelectionForEmployees(company.id)}
              >
                {selectedCompanyIds.has(company.id) ? (
                  <CheckSquare className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                )}
                <span className="text-[12px] text-neutral-700">
                  {company.name} - {company.unified_number || 'بدون رقم موحد'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {expandedFilterGroup === 'residence' && (
        <div className="bg-neutral-50 rounded-md p-2 mb-2 flex flex-wrap gap-2">
          <Chip active={employeeFilters.expiredResidence} onClick={() => toggleEmployeeFilter('expiredResidence')} color="blue">
            الإقامات المنتهية
          </Chip>
          <Chip active={employeeFilters.expiringResidence30} onClick={() => toggleEmployeeFilter('expiringResidence30')} color="blue">
            تنتهي خلال 30 يوم
          </Chip>
        </div>
      )}

      {expandedFilterGroup === 'insurance' && (
        <div className="bg-neutral-50 rounded-md p-2 mb-2 flex flex-wrap gap-2">
          <Chip active={employeeFilters.expiredHealthInsurance} onClick={() => toggleEmployeeFilter('expiredHealthInsurance')} color="blue">
            منتهي
          </Chip>
          <Chip active={employeeFilters.expiringHealthInsurance30} onClick={() => toggleEmployeeFilter('expiringHealthInsurance30')} color="blue">
            ينتهي خلال 30 يوم
          </Chip>
        </div>
      )}

      {expandedFilterGroup === 'project' && (
        <div className="bg-neutral-50 rounded-md p-2 mb-2 space-y-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-2.5" />
            <input
              type="text"
              value={projectFilterQuery}
              onChange={(e) => setProjectFilterQuery(e.target.value)}
              placeholder="بحث باسم المشروع"
              className="app-input bg-white py-2 pr-8 text-[12px]"
            />
          </div>
          <div className="border border-neutral-200 rounded-md bg-white max-h-40 overflow-y-auto p-2 space-y-1">
            <div
              className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer transition ${selectedProjectName === '' ? 'bg-blue-50' : 'hover:bg-blue-50'}`}
              onClick={() => setSelectedProjectName('')}
            >
              <span className="text-[12px] text-neutral-700">الكل (بدون تحديد مشروع)</span>
            </div>
            {projectsForEmployeeFilter.map((name) => (
              <div
                key={name}
                className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer transition ${selectedProjectName === name ? 'bg-blue-50' : 'hover:bg-blue-50'}`}
                onClick={() => setSelectedProjectName(name)}
              >
                <span className="text-[12px] text-neutral-700">{name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {expandedFilterGroup === 'hiredContract' && (
        <div className="bg-neutral-50 rounded-md p-2 mb-2 flex flex-wrap gap-2">
          <Chip active={employeeFilters.expiredHiredContract} onClick={() => toggleEmployeeFilter('expiredHiredContract')} color="blue">
            منتهي
          </Chip>
          <Chip active={employeeFilters.expiringHiredContract30} onClick={() => toggleEmployeeFilter('expiringHiredContract30')} color="blue">
            ينتهي خلال 30 يوم
          </Chip>
        </div>
      )}

      {expandedFilterGroup === 'employeeContract' && (
        <div className="bg-neutral-50 rounded-md p-2 mb-2 flex flex-wrap gap-2">
          <Chip active={employeeFilters.expiredContract} onClick={() => toggleEmployeeFilter('expiredContract')} color="blue">
            منتهي
          </Chip>
          <Chip active={employeeFilters.expiringContract30} onClick={() => toggleEmployeeFilter('expiringContract30')} color="blue">
            ينتهي خلال 30 يوم
          </Chip>
        </div>
      )}

      {/* Employees List - Desktop Table */}
      <div className="bg-white rounded-md border border-neutral-200 overflow-hidden" style={{ contain: 'layout paint', display: isDesktop ? '' : 'none' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-3 py-1.5 text-center text-[11px] font-medium text-neutral-700 uppercase w-10">
                  <button
                    onClick={toggleAllEmployees}
                    className="flex items-center justify-center w-4 h-4"
                  >
                    {selectedEmployees.size === filteredEmployees.length &&
                    filteredEmployees.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4 text-neutral-400" />
                    )}
                  </button>
                </th>
                <th className="px-3 py-1.5 text-right text-[11px] font-medium text-neutral-700 uppercase">الاسم</th>
                <th className="px-3 py-1.5 text-right text-[11px] font-medium text-neutral-700 uppercase">المهنة</th>
                <th className="px-3 py-1.5 text-right text-[11px] font-medium text-neutral-700 uppercase">الجنسية</th>
                <th className="px-3 py-1.5 text-right text-[11px] font-medium text-neutral-700 uppercase">الشركة</th>
                <th className="px-3 py-1.5 text-right text-[11px] font-medium text-neutral-700 uppercase">المشروع</th>
                <th className="px-3 py-1.5 text-right text-[11px] font-medium text-neutral-700 uppercase">رقم الإقامة</th>
                <th className="px-3 py-1.5 text-right text-[11px] font-medium text-neutral-700 uppercase">انتهاء العقد</th>
                <th className="px-3 py-1.5 text-right text-[11px] font-medium text-neutral-700 uppercase">عقد أجير</th>
                <th className="px-3 py-1.5 text-right text-[11px] font-medium text-neutral-700 uppercase">انتهاء الإقامة</th>
                <th className="px-3 py-1.5 text-right text-[11px] font-medium text-neutral-700 uppercase">التأمين الصحي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEmployees.map((emp) => (
                <EmployeeTableRow
                  key={emp.id}
                  emp={emp}
                  displayData={employeeDisplayData.get(emp.id)!}
                  isSelected={selectedEmployees.has(emp.id)}
                  onToggle={handleToggleEmployee}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employees Grid - Mobile View */}
      <div className="space-y-3" style={{ display: isDesktop ? 'none' : '' }}>
        <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
          <button
            onClick={toggleAllEmployees}
            className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            {selectedEmployees.size === filteredEmployees.length &&
            filteredEmployees.length > 0 ? (
              <CheckSquare className="w-5 h-5" />
            ) : (
              <Square className="w-5 h-5" />
            )}
            <span>تحديد الكل ({filteredEmployees.length})</span>
          </button>
        </div>

        {filteredEmployees.map((emp) => (
          <EmployeeCardItem
            key={emp.id}
            emp={emp}
            displayData={employeeDisplayData.get(emp.id)!}
            isSelected={selectedEmployees.has(emp.id)}
            onToggle={handleToggleEmployee}
          />
        ))}
      </div>
    </div>
  )
}
