import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase, Company } from '@/lib/supabase'
import { usePermissions } from '@/utils/permissions'
import { useIsMobileView } from '@/hooks/useIsMobileView'
import { useCardColumns } from '@/hooks/useUiPreferences'
import { useModalScrollLock } from '@/hooks/useModalScrollLock'
import { useSnoozedAlerts } from '@/hooks/useSnoozedAlerts'
import { normalizeArabic } from '@/utils/textUtils'
import { differenceInDays } from 'date-fns'
import { toast } from 'sonner'
import { type PostgrestError } from '@supabase/supabase-js'
import { logger } from '@/utils/logger'
import {
  calculateCommercialRegistrationStatus,
  calculatePowerSubscriptionStatus,
  calculateMoqeemSubscriptionStatus,
  getStatusThresholds,
  DEFAULT_STATUS_THRESHOLDS,
} from '@/utils/autoCompanyStatus'

// ─── Types ───────────────────────────────────────────────────────────────────

export type SortField =
  | 'name'
  | 'created_at'
  | 'commercial_registration_status'
  | 'employee_count'
  | 'power_subscription_status'
  | 'moqeem_subscription_status'
export type SortDirection = 'asc' | 'desc'
export type AvailableSlotsFilter = 'all' | '0' | '1' | '2' | '3' | '4+'
export type ExemptionsFilter = string
export type ViewMode = 'grid' | 'table'
export type CompanyCardStatus = 'ساري' | 'متوسط' | 'عاجل' | 'طارئ' | 'منتهي'
export type CardStatusFilter = 'all' | CompanyCardStatus | 'مؤجلة' | null
export type CompanyWithCount = Company & { employee_count: number; available_slots?: number }

type CommercialRegStatus = 'expired' | 'expiring_soon' | 'valid'
type PowerSubscriptionStatus = 'expired' | 'expiring_soon' | 'valid'
type MoqeemSubscriptionStatus = 'expired' | 'expiring_soon' | 'valid'

// ─── Pure helpers ─────────────────────────────────────────────────────────────

export function companyAlertId(prefix: 'commercial' | 'power' | 'moqeem', id: string, expiry: string | null | undefined): string {
  return `${prefix}_${id}_${expiry ?? ''}`
}

function normalizeArrayFilter(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  if (typeof value === 'string' && value !== '' && value !== 'all') return [value]
  return []
}

function normalizeNumberFilter(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function normalizeDateFilter(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

function getTodayInputValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getLegacyCreatedAtRange(dateRangeFilter: unknown): [string | null, string | null] {
  if (typeof dateRangeFilter !== 'string') return [null, null]
  const today = new Date()
  const todayInput = getTodayInputValue(today)
  if (dateRangeFilter === 'last_month') return [getTodayInputValue(new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())), todayInput]
  if (dateRangeFilter === 'last_3_months') return [getTodayInputValue(new Date(today.getFullYear(), today.getMonth() - 3, today.getDate())), todayInput]
  if (dateRangeFilter === 'last_year') return [getTodayInputValue(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())), todayInput]
  return [null, null]
}

function compareSortableValues(aValue: string | number | null, bValue: string | number | null, direction: SortDirection) {
  if (aValue === null && bValue === null) return 0
  if (aValue === null) return 1
  if (bValue === null) return -1
  if (aValue === bValue) return 0
  const comparison = aValue > bValue ? 1 : -1
  return direction === 'asc' ? comparison : -comparison
}

export function getAvailableSlotsColor(availableSlots: number) {
  if (availableSlots === 0) return 'text-red-600 bg-red-50 border-red-200'
  if (availableSlots === 1) return 'text-warning-600 bg-orange-50 border-orange-200'
  if (availableSlots <= 3) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
  return 'text-success-600 bg-green-50 border-green-200'
}

export function getAvailableSlotsTextColor(availableSlots: number) {
  if (availableSlots === 0) return 'text-red-600'
  if (availableSlots === 1) return 'text-warning-600'
  if (availableSlots <= 3) return 'text-yellow-600'
  return 'text-success-600'
}

export function getAvailableSlotsText(availableSlots: number) {
  if (availableSlots === 0) return 'مكتملة'
  if (availableSlots === 1) return 'مكان واحد متبقي'
  if (availableSlots <= 3) return 'أماكن قليلة متاحة'
  return 'أماكن متاحة'
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useCompaniesPage() {
  const { canView, canCreate, canEdit, canDelete } = usePermissions()
  const location = useLocation()
  const isMobileView = useIsMobileView()
  const { gridClass: companyGridClass } = useCardColumns()
  const { snoozedAlertIds } = useSnoozedAlerts()

  const [companies, setCompanies] = useState<CompanyWithCount[]>([])
  const [loading, setLoading] = useState(true)

  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showCompanyDetailModal, setShowCompanyDetailModal] = useState(false)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [selectedCompanyForDetail, setSelectedCompanyForDetail] = useState<CompanyWithCount | null>(null)
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([])

  const [searchTerm, setSearchTerm] = useState('')
  const [commercialRegStatus, setCommercialRegStatus] = useState<string[]>([])
  const [powerSubscriptionStatus, setPowerSubscriptionStatus] = useState<string[]>([])
  const [moqeemSubscriptionStatus, setMoqeemSubscriptionStatus] = useState<string[]>([])
  const [showAlertsOnly, setShowAlertsOnly] = useState(false)
  const [cardStatusFilter, setCardStatusFilter] = useState<CardStatusFilter>(null)
  const [employeeCountMin, setEmployeeCountMin] = useState<number | null>(null)
  const [employeeCountMax, setEmployeeCountMax] = useState<number | null>(null)
  const [availableSlotsFilter, setAvailableSlotsFilter] = useState<AvailableSlotsFilter>('all')
  const [createdAtFrom, setCreatedAtFrom] = useState<string | null>(null)
  const [createdAtTo, setCreatedAtTo] = useState<string | null>(null)
  const [exemptionsFilter, setExemptionsFilter] = useState<ExemptionsFilter>('all')
  const [showFiltersModal, setShowFiltersModal] = useState(false)
  const [companyThresholds, setCompanyThresholds] = useState(DEFAULT_STATUS_THRESHOLDS)

  useModalScrollLock(showDeleteModal || showBulkDeleteModal || showFiltersModal)

  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null)
  const [showSortDropdown, setShowSortDropdown] = useState(false)

  const tableRef = useRef<HTMLTableElement>(null)
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([])

  const loadSavedFilters = useCallback(() => {
    try {
      const saved = localStorage.getItem('companiesFilters')
      if (!saved) return
      const filters = JSON.parse(saved)
      setSearchTerm(filters.searchTerm || '')
      setCommercialRegStatus(normalizeArrayFilter(filters.commercialRegStatus))
      setPowerSubscriptionStatus(normalizeArrayFilter(filters.powerSubscriptionStatus))
      setMoqeemSubscriptionStatus(normalizeArrayFilter(filters.moqeemSubscriptionStatus))
      setShowAlertsOnly(filters.showAlertsOnly || false)

      const savedMin = normalizeNumberFilter(filters.employeeCountMin)
      const savedMax = normalizeNumberFilter(filters.employeeCountMax)
      const legacyFilter = typeof filters.employeeCountFilter === 'string' ? filters.employeeCountFilter : 'all'
      if (savedMin !== null || savedMax !== null) {
        setEmployeeCountMin(savedMin)
        setEmployeeCountMax(savedMax)
      } else if (legacyFilter === '4+') {
        setEmployeeCountMin(4)
        setEmployeeCountMax(null)
      } else if (legacyFilter !== 'all') {
        const parsed = normalizeNumberFilter(legacyFilter)
        setEmployeeCountMin(parsed)
        setEmployeeCountMax(parsed)
      }

      setAvailableSlotsFilter(filters.availableSlotsFilter || 'all')

      const savedFrom = normalizeDateFilter(filters.createdAtFrom)
      const savedTo = normalizeDateFilter(filters.createdAtTo)
      if (savedFrom !== null || savedTo !== null) {
        setCreatedAtFrom(savedFrom)
        setCreatedAtTo(savedTo)
      } else {
        const legacyRange = filters.dateRangeFilter
        if (legacyRange === 'custom') {
          setCreatedAtFrom(normalizeDateFilter(filters.customStartDate))
          setCreatedAtTo(normalizeDateFilter(filters.customEndDate))
        } else {
          const [from, to] = getLegacyCreatedAtRange(legacyRange)
          setCreatedAtFrom(from)
          setCreatedAtTo(to)
        }
      }

      setExemptionsFilter(filters.exemptionsFilter || 'all')
      setSortField(filters.sortField || 'name')
      setSortDirection(filters.sortDirection || 'asc')
    } catch (error) {
      logger.error('Error loading saved filters:', error)
    }
  }, [])

  const saveFiltersToStorage = useCallback(() => {
    try {
      localStorage.setItem('companiesFilters', JSON.stringify({
        searchTerm, commercialRegStatus, powerSubscriptionStatus, moqeemSubscriptionStatus,
        showAlertsOnly, employeeCountMin, employeeCountMax, availableSlotsFilter,
        createdAtFrom, createdAtTo, exemptionsFilter, sortField, sortDirection,
      }))
    } catch (error) {
      logger.error('Error saving filters:', error)
    }
  }, [searchTerm, commercialRegStatus, powerSubscriptionStatus, moqeemSubscriptionStatus,
    showAlertsOnly, cardStatusFilter, employeeCountMin, employeeCountMax,
    availableSlotsFilter, createdAtFrom, createdAtTo, exemptionsFilter, sortField, sortDirection])

  const loadCompanies = useCallback(async () => {
    try {
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id,name,unified_number,labor_subscription_number,commercial_registration_expiry,social_insurance_number,commercial_registration_status,additional_fields,ending_subscription_power_date,ending_subscription_moqeem_date,employee_count,max_employees,notes,exemptions,company_type,created_at,updated_at')
        .order('name')

      if (companiesError) throw companiesError
      if (!companiesData) { setCompanies([]); return }

      const { data: employeesData, error: employeesError } = await supabase.from('employees').select('company_id')
      if (employeesError) throw employeesError

      const employeeCounts: Record<string, number> = {}
      employeesData?.forEach((emp) => {
        if (emp.company_id) employeeCounts[emp.company_id] = (employeeCounts[emp.company_id] || 0) + 1
      })

      const companiesWithCount = companiesData.map((company) => {
        try {
          const employeeCount = employeeCounts[company.id] || 0
          const maxEmployees = company.max_employees || 4
          return { ...company, employee_count: employeeCount, available_slots: Math.max(0, maxEmployees - employeeCount) }
        } catch (err) {
          logger.error(`Error processing company ${company.id}:`, err)
          return { ...company, employee_count: 0, available_slots: company.max_employees || 4 }
        }
      })
      setCompanies(companiesWithCount)
    } catch (error) {
      logger.error('Critical error in loadCompanies:', error)
      setCompanies([])
    } finally {
      setLoading(false)
    }
  }, [])

  const getDaysRemaining = useCallback((date: string) => differenceInDays(new Date(date), new Date()), [])

  const hasCompanyAlert = useCallback((company: Company): boolean => {
    const crId = companyAlertId('commercial', company.id, company.commercial_registration_expiry)
    const pwId = companyAlertId('power', company.id, company.ending_subscription_power_date)
    const mqId = companyAlertId('moqeem', company.id, company.ending_subscription_moqeem_date)
    const crStatus = calculateCommercialRegistrationStatus(company.commercial_registration_expiry)
    const powerStatus = calculatePowerSubscriptionStatus(company.ending_subscription_power_date)
    const moqeemStatus = calculateMoqeemSubscriptionStatus(company.ending_subscription_moqeem_date)
    return (
      (['منتهي', 'طارئ', 'عاجل', 'متوسط'].includes(crStatus.status) && !snoozedAlertIds.has(crId)) ||
      (['منتهي', 'طارئ', 'عاجل', 'متوسط'].includes(powerStatus.status) && !snoozedAlertIds.has(pwId)) ||
      (['منتهي', 'طارئ', 'عاجل', 'متوسط'].includes(moqeemStatus.status) && !snoozedAlertIds.has(mqId))
    )
  }, [snoozedAlertIds])

  const getCompanyUnifiedStatus = useCallback((company: Company): CompanyCardStatus => {
    const crId = companyAlertId('commercial', company.id, company.commercial_registration_expiry)
    const pwId = companyAlertId('power', company.id, company.ending_subscription_power_date)
    const mqId = companyAlertId('moqeem', company.id, company.ending_subscription_moqeem_date)
    const crStatus = calculateCommercialRegistrationStatus(company.commercial_registration_expiry)
    const powerStatus = calculatePowerSubscriptionStatus(company.ending_subscription_power_date)
    const moqeemStatus = calculateMoqeemSubscriptionStatus(company.ending_subscription_moqeem_date)
    const activeStatuses = [
      { ...crStatus, snoozed: snoozedAlertIds.has(crId) },
      { ...powerStatus, snoozed: snoozedAlertIds.has(pwId) },
      { ...moqeemStatus, snoozed: snoozedAlertIds.has(mqId) },
    ].filter((s) => !s.snoozed)
    if (activeStatuses.some((s) => s.status === 'منتهي')) return 'منتهي'
    if (activeStatuses.some((s) => s.priority === 'urgent')) return 'طارئ'
    if (activeStatuses.some((s) => s.priority === 'high')) return 'عاجل'
    if (activeStatuses.some((s) => s.priority === 'medium')) return 'متوسط'
    return 'ساري'
  }, [snoozedAlertIds])

  const companyAlertsCount = useMemo(() => companies.filter((c) => hasCompanyAlert(c)).length, [companies, hasCompanyAlert])

  const snoozedCompaniesCount = useMemo(() => {
    return companies.filter((company) => {
      const alertStatuses = [
        { status: calculateCommercialRegistrationStatus(company.commercial_registration_expiry), id: companyAlertId('commercial', company.id, company.commercial_registration_expiry) },
        { status: calculatePowerSubscriptionStatus(company.ending_subscription_power_date), id: companyAlertId('power', company.id, company.ending_subscription_power_date) },
        { status: calculateMoqeemSubscriptionStatus(company.ending_subscription_moqeem_date), id: companyAlertId('moqeem', company.id, company.ending_subscription_moqeem_date) },
      ]
      return alertStatuses.some(({ status, id }) => ['منتهي', 'طارئ', 'عاجل', 'متوسط'].includes(status.status) && snoozedAlertIds.has(id))
    }).length
  }, [companies, snoozedAlertIds])

  const filteredCompanies = useMemo(() => {
    let filtered = [...companies]

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      filtered = filtered.filter((c) => c.name.toLowerCase().includes(q) || c.unified_number?.toString().includes(q) || c.social_insurance_number?.toString().includes(q))
    }

    if (commercialRegStatus.length > 0) {
      filtered = filtered.filter((company) => {
        if (!company.commercial_registration_expiry) return false
        const statusInfo = calculateCommercialRegistrationStatus(company.commercial_registration_expiry)
        const statusText = String(statusInfo.status)
        const calcStatus: CommercialRegStatus = statusText === 'منتهي' || statusText === 'طارئ' ? 'expired' : statusText === 'ساري' ? 'valid' : 'expiring_soon'
        return commercialRegStatus.includes(calcStatus)
      })
    }

    if (powerSubscriptionStatus.length > 0) {
      const today = new Date()
      const thirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
      filtered = filtered.filter((company) => {
        if (!company.ending_subscription_power_date) return false
        const d = new Date(company.ending_subscription_power_date)
        const s: PowerSubscriptionStatus = d < today ? 'expired' : d <= thirtyDays ? 'expiring_soon' : 'valid'
        return powerSubscriptionStatus.includes(s)
      })
    }

    if (moqeemSubscriptionStatus.length > 0) {
      const today = new Date()
      const thirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
      filtered = filtered.filter((company) => {
        if (!company.ending_subscription_moqeem_date) return false
        const d = new Date(company.ending_subscription_moqeem_date)
        const s: MoqeemSubscriptionStatus = d < today ? 'expired' : d <= thirtyDays ? 'expiring_soon' : 'valid'
        return moqeemSubscriptionStatus.includes(s)
      })
    }

    if (showAlertsOnly) filtered = filtered.filter((c) => hasCompanyAlert(c))

    if (cardStatusFilter) {
      if (cardStatusFilter === 'مؤجلة') {
        filtered = filtered.filter((company) => {
          const alertStatuses = [
            { status: calculateCommercialRegistrationStatus(company.commercial_registration_expiry), id: companyAlertId('commercial', company.id, company.commercial_registration_expiry) },
            { status: calculatePowerSubscriptionStatus(company.ending_subscription_power_date), id: companyAlertId('power', company.id, company.ending_subscription_power_date) },
            { status: calculateMoqeemSubscriptionStatus(company.ending_subscription_moqeem_date), id: companyAlertId('moqeem', company.id, company.ending_subscription_moqeem_date) },
          ]
          return alertStatuses.some(({ status, id }) => ['منتهي', 'طارئ', 'عاجل', 'متوسط'].includes(status.status) && snoozedAlertIds.has(id))
        })
      } else if (cardStatusFilter === 'all') {
        filtered = filtered.filter((c) => hasCompanyAlert(c))
      } else {
        filtered = filtered.filter((c) => getCompanyUnifiedStatus(c) === cardStatusFilter)
      }
    }

    if (employeeCountMin !== null || employeeCountMax !== null) {
      filtered = filtered.filter((c) => (employeeCountMin === null || c.employee_count >= employeeCountMin) && (employeeCountMax === null || c.employee_count <= employeeCountMax))
    }

    if (availableSlotsFilter !== 'all') {
      filtered = filtered.filter((c) => {
        const slots = c.available_slots || 0
        if (availableSlotsFilter === '0') return slots === 0
        if (availableSlotsFilter === '4+') return slots >= 4
        return slots === parseInt(availableSlotsFilter)
      })
    }

    if (createdAtFrom || createdAtTo) {
      const startDate = createdAtFrom ? new Date(`${createdAtFrom}T00:00:00`) : null
      const endDate = createdAtTo ? new Date(`${createdAtTo}T23:59:59.999`) : null
      filtered = filtered.filter((c) => {
        if (!c.created_at) return false
        const d = new Date(c.created_at)
        return (startDate === null || d >= startDate) && (endDate === null || d <= endDate)
      })
    }

    if (exemptionsFilter !== 'all') {
      filtered = filtered.filter((c) => {
        const isExempt = normalizeArabic(c.exemptions).includes(normalizeArabic('تم الاعفاء'))
        return exemptionsFilter === 'تم الاعفاء' ? isExempt : !isExempt
      })
    }

    filtered.sort((a, b) => {
      let aValue: string | number | null
      let bValue: string | number | null
      switch (sortField) {
        case 'name': aValue = a.name.toLowerCase(); bValue = b.name.toLowerCase(); break
        case 'created_at': aValue = a.created_at ? new Date(a.created_at).getTime() : null; bValue = b.created_at ? new Date(b.created_at).getTime() : null; break
        case 'commercial_registration_status': aValue = a.commercial_registration_expiry ? calculateCommercialRegistrationStatus(a.commercial_registration_expiry).daysRemaining : null; bValue = b.commercial_registration_expiry ? calculateCommercialRegistrationStatus(b.commercial_registration_expiry).daysRemaining : null; break
        case 'employee_count': aValue = typeof a.employee_count === 'number' ? a.employee_count : null; bValue = typeof b.employee_count === 'number' ? b.employee_count : null; break
        case 'power_subscription_status': aValue = a.ending_subscription_power_date ? getDaysRemaining(a.ending_subscription_power_date) : null; bValue = b.ending_subscription_power_date ? getDaysRemaining(b.ending_subscription_power_date) : null; break
        case 'moqeem_subscription_status': aValue = a.ending_subscription_moqeem_date ? getDaysRemaining(a.ending_subscription_moqeem_date) : null; bValue = b.ending_subscription_moqeem_date ? getDaysRemaining(b.ending_subscription_moqeem_date) : null; break
        default: aValue = a.name.toLowerCase(); bValue = b.name.toLowerCase()
      }
      return compareSortableValues(aValue, bValue, sortDirection)
    })

    return filtered
  }, [companies, searchTerm, commercialRegStatus, powerSubscriptionStatus, moqeemSubscriptionStatus,
    showAlertsOnly, cardStatusFilter, employeeCountMin, employeeCountMax, availableSlotsFilter,
    createdAtFrom, createdAtTo, exemptionsFilter, sortField, sortDirection,
    getDaysRemaining, hasCompanyAlert, getCompanyUnifiedStatus, snoozedAlertIds])

  useEffect(() => { void getStatusThresholds().then(setCompanyThresholds) }, [])
  useEffect(() => { loadCompanies(); loadSavedFilters() }, [loadCompanies, loadSavedFilters])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('filter') === 'alerts') setShowAlertsOnly(true)
  }, [location.search])

  const openCompanyHandledRef = useRef(false)
  useEffect(() => {
    if (openCompanyHandledRef.current || loading || companies.length === 0) return
    const openId = new URLSearchParams(location.search).get('open')
    if (!openId) return
    const company = companies.find((c) => c.id === openId)
    if (company) {
      setSelectedCompanyForDetail(company)
      setShowCompanyDetailModal(true)
      openCompanyHandledRef.current = true
    }
  }, [companies, loading, location.search])

  useEffect(() => { saveFiltersToStorage() }, [saveFiltersToStorage])

  // Arrow key navigation for table
  useEffect(() => {
    if (showAddModal || showEditModal || showDeleteModal || showCompanyDetailModal || showFiltersModal || viewMode === 'grid') return

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return
      if (paginatedCompanies.length === 0) return
      let newIndex: number | null = selectedRowIndex
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); newIndex = selectedRowIndex === null ? 0 : Math.min(selectedRowIndex + 1, paginatedCompanies.length - 1); break
        case 'ArrowUp': e.preventDefault(); newIndex = selectedRowIndex === null ? paginatedCompanies.length - 1 : Math.max(selectedRowIndex - 1, 0); break
        case 'Home': e.preventDefault(); newIndex = 0; break
        case 'End': e.preventDefault(); newIndex = paginatedCompanies.length - 1; break
        case 'Enter': e.preventDefault(); if (selectedRowIndex !== null && paginatedCompanies[selectedRowIndex]) handleCompanyCardClick(paginatedCompanies[selectedRowIndex]); return
        default: return
      }
      if (newIndex !== null && newIndex !== selectedRowIndex) {
        setSelectedRowIndex(newIndex)
        setTimeout(() => { const row = rowRefs.current[newIndex]; if (row) row.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, 0)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedRowIndex, showAddModal, showEditModal, showDeleteModal, showCompanyDetailModal, showFiltersModal, viewMode])

  useEffect(() => { setSelectedRowIndex(null) }, [searchTerm, commercialRegStatus, powerSubscriptionStatus, moqeemSubscriptionStatus, showAlertsOnly, cardStatusFilter, employeeCountMin, employeeCountMax, availableSlotsFilter, createdAtFrom, createdAtTo, exemptionsFilter, sortField, sortDirection, currentPage])
  useEffect(() => { setCurrentPage(1) }, [filteredCompanies.length, itemsPerPage])

  const clearFilters = () => {
    setSearchTerm(''); setCommercialRegStatus([]); setPowerSubscriptionStatus([]); setMoqeemSubscriptionStatus([])
    setShowAlertsOnly(false); setCardStatusFilter(null); setEmployeeCountMin(null); setEmployeeCountMax(null)
    setAvailableSlotsFilter('all'); setCreatedAtFrom(null); setCreatedAtTo(null); setExemptionsFilter('all')
  }

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) { setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc') } else { setSortField(field); setSortDirection('asc') }
  }, [sortField, sortDirection])

  const handleSelectCompany = (companyId: string, isSelected: boolean) => {
    setSelectedCompanyIds((prev) => isSelected ? [...prev, companyId] : prev.filter((id) => id !== companyId))
  }

  // Pagination
  const totalResults = filteredCompanies.length
  const totalPages = Math.ceil(totalResults / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedCompanies = filteredCompanies.slice(startIndex, endIndex)

  const handleSelectAllCompanies = (isSelected: boolean) => {
    setSelectedCompanyIds(isSelected ? paginatedCompanies.map((c) => c.id) : [])
  }

  const handleBulkDelete = async () => {
    if (selectedCompanyIds.length === 0) return
    setLoading(true)
    try {
      const { error: detachError } = await supabase.from('employees').update({ company_id: null }).in('company_id', selectedCompanyIds)
      if (detachError) throw detachError
      const { error } = await supabase.from('companies').delete().in('id', selectedCompanyIds)
      if (error) throw error
      toast.success(`تم حذف ${selectedCompanyIds.length} مؤسسة بنجاح`)
      setSelectedCompanyIds([])
      setShowBulkDeleteModal(false)
      loadCompanies()
    } catch (error) {
      logger.error('Error deleting companies in bulk:', error)
      const e = error as PostgrestError | null
      if (e?.code === '23503') toast.error('تعذر حذف بعض المؤسسات بسبب وجود سجلات مرتبطة بها.')
      else if (e?.code === '23502') toast.error('فشل فصل الموظفين عن المؤسسة. تحقق من صلاحيات قاعدة البيانات.')
      else toast.error('فشل حذف الشركات. يرجى المحاولة مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddCompany = useCallback(() => { setSelectedCompany(null); setShowAddModal(true) }, [])
  const handleEditCompany = useCallback((company: Company) => { setSelectedCompany(company); setShowEditModal(true) }, [])
  const handleDeleteCompany = useCallback((company: Company) => { setSelectedCompany(company); setShowDeleteModal(true) }, [])
  const handleCompanyCardClick = useCallback((company: CompanyWithCount) => { setSelectedCompanyForDetail(company); setShowCompanyDetailModal(true) }, [])
  const handleCloseCompanyDetailModal = useCallback(() => { setShowCompanyDetailModal(false); setSelectedCompanyForDetail(null); setSelectedRowIndex(null) }, [])

  const handleDeleteConfirm = async () => {
    if (!selectedCompany) return
    try {
      const { data: employees, error: fetchError } = await supabase.from('employees').select('id').eq('company_id', selectedCompany.id)
      if (fetchError) throw fetchError
      if (employees && employees.length > 0) {
        const { error: updateError } = await supabase.from('employees').update({ company_id: null }).eq('company_id', selectedCompany.id)
        if (updateError) throw updateError
      }
      const { error: deleteError } = await supabase.from('companies').delete().eq('id', selectedCompany.id)
      if (deleteError) throw deleteError
      await supabase.from('activity_log').insert({ action: 'حذف مؤسسة', entity_type: 'company', entity_id: selectedCompany.id, details: { company_name: selectedCompany.name, unified_number: selectedCompany.unified_number, employees_detached: employees?.length || 0 } })
      const employeeCount = employees?.length || 0
      toast.success(employeeCount > 0 ? `تم حذف المؤسسة وفصل ${employeeCount} موظف بنجاح. سيبقى الموظفون في النظام بدون تعيين` : 'تم حذف المؤسسة بنجاح')
      await loadCompanies()
      setShowDeleteModal(false)
      setSelectedCompany(null)
    } catch (error) {
      logger.error('Error deleting company:', error)
      const e = error as PostgrestError | null
      toast.error(e?.code === '23503' ? 'تعذر حذف المؤسسة بسبب وجود سجلات مرتبطة بها.' : 'حدث خطأ أثناء حذف المؤسسة. يرجى المحاولة مرة أخرى')
    }
  }

  const handleModalClose = useCallback(() => { setShowAddModal(false); setShowEditModal(false); setShowDeleteModal(false); setSelectedCompany(null) }, [])
  const handleModalSuccess = useCallback(async () => {
    try { handleModalClose(); await loadCompanies() }
    catch (error) { logger.error('Error in handleModalSuccess:', error); toast.error('حدث خطأ أثناء تحديث القائمة') }
  }, [handleModalClose, loadCompanies])

  const activeFiltersCount = [
    searchTerm !== '', commercialRegStatus.length > 0, powerSubscriptionStatus.length > 0,
    moqeemSubscriptionStatus.length > 0, showAlertsOnly, cardStatusFilter !== null,
    employeeCountMin !== null || employeeCountMax !== null, availableSlotsFilter !== 'all',
    createdAtFrom !== null || createdAtTo !== null, exemptionsFilter !== 'all',
  ].filter(Boolean).length

  const goToPage = (page: number) => setCurrentPage(page)
  const goToNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1) }
  const goToPreviousPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1) }

  const getPageNumbers = () => {
    const max = 5
    if (totalPages <= max) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (currentPage <= 3) return [1, 2, 3, 4, 5]
    if (currentPage >= totalPages - 2) return Array.from({ length: 5 }, (_, i) => totalPages - 4 + i)
    return Array.from({ length: 5 }, (_, i) => currentPage - 2 + i)
  }

  return {
    // Permissions
    canView, canCreate, canEdit, canDelete,
    // UI
    isMobileView, companyGridClass,
    // Data
    companies, loading,
    // Modals
    showAddModal, setShowAddModal, showEditModal, setShowEditModal,
    showDeleteModal, setShowDeleteModal, showCompanyDetailModal, setShowCompanyDetailModal,
    showBulkDeleteModal, setShowBulkDeleteModal,
    selectedCompany, selectedCompanyForDetail, selectedCompanyIds, setSelectedCompanyIds,
    // Filters
    searchTerm, setSearchTerm, commercialRegStatus, setCommercialRegStatus,
    powerSubscriptionStatus, setPowerSubscriptionStatus,
    moqeemSubscriptionStatus, setMoqeemSubscriptionStatus,
    showAlertsOnly, setShowAlertsOnly, cardStatusFilter, setCardStatusFilter,
    employeeCountMin, setEmployeeCountMin, employeeCountMax, setEmployeeCountMax,
    availableSlotsFilter, setAvailableSlotsFilter,
    createdAtFrom, setCreatedAtFrom, createdAtTo, setCreatedAtTo,
    exemptionsFilter, setExemptionsFilter,
    showFiltersModal, setShowFiltersModal, clearFilters, activeFiltersCount,
    companyThresholds,
    // Sort
    sortField, setSortField, sortDirection, setSortDirection, handleSort,
    showSortDropdown, setShowSortDropdown,
    // View + Pagination
    viewMode, setViewMode, itemsPerPage, setItemsPerPage, currentPage, setCurrentPage,
    totalResults, totalPages, startIndex, endIndex, paginatedCompanies,
    goToPage, goToNextPage, goToPreviousPage, getPageNumbers,
    // Table refs
    tableRef, rowRefs, selectedRowIndex,
    // Selection
    handleSelectCompany, handleSelectAllCompanies,
    // Computed
    filteredCompanies, companyAlertsCount, snoozedCompaniesCount,
    getCompanyUnifiedStatus, hasCompanyAlert,
    // Handlers
    handleAddCompany, handleEditCompany, handleDeleteCompany,
    handleCompanyCardClick, handleCloseCompanyDetailModal,
    handleDeleteConfirm, handleModalClose, handleModalSuccess,
    handleBulkDelete, loadCompanies,
  }
}
