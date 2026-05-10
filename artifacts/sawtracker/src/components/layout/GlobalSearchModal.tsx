import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Search, Users, Building2, FolderKanban, Truck, Wallet,
  X, Loader2, Calendar, FileText, Hash,
} from 'lucide-react'
import { supabase, Company, Employee, Project, EmployeeWithRelations } from '@/lib/supabase'
import EmployeeCard from '@/components/employees/EmployeeCard'
import CompanyDetailModal from '@/components/companies/CompanyDetailModal'
import ProjectDetailModal from '@/components/projects/ProjectDetailModal'

type SearchTab = 'employees' | 'companies' | 'projects' | 'transfers' | 'payroll'

interface SearchResult {
  id: string
  primary: string
  secondary?: string
  tertiary?: string
  extra?: string
}

const TABS: { id: SearchTab; label: string; icon: React.ComponentType<{ className?: string }>; placeholder: string }[] = [
  { id: 'employees', label: 'موظفين', icon: Users, placeholder: 'الاسم أو رقم الإقامة أو الجواز أو المهنة أو الجنسية...' },
  { id: 'companies', label: 'مؤسسات', icon: Building2, placeholder: 'الاسم أو الرقم الموحد أو رقم التأمينات...' },
  { id: 'projects', label: 'مشاريع', icon: FolderKanban, placeholder: 'اسم المشروع أو وصفه...' },
  { id: 'transfers', label: 'إجراءات النقل', icon: Truck, placeholder: 'الاسم أو رقم الإقامة...' },
  { id: 'payroll', label: 'الرواتب', icon: Wallet, placeholder: 'الاسم أو رقم الإقامة...' },
]

// ─── Raw list-fetch types (lightweight, for search results) ──────────────────

type EmpRow = {
  id: string; name: string; residence_number: number | string | null
  passport_number?: string | null; profession?: string | null
  nationality?: string | null; company?: { name?: string } | null
}
type CompanyRow = {
  id: string; name: string; unified_number?: number | string | null
  social_insurance_number?: string | null; labor_subscription_number?: string | null
}
type ProjectRow = { id: string; name: string; description?: string | null; status?: string | null }
type TransferRow = { id: string; name: string; iqama: number | string | null; status?: string | null }
type PayrollRow = {
  id: string; employee_name_snapshot?: string | null
  residence_number_snapshot?: string | number | null
  entry_status?: string | null
  payroll_run?: { id?: string; payroll_month?: string | null } | null
}

// ─── Full-record types (for detail modals) ────────────────────────────────────

type TransferDetail = {
  id: string; name: string; iqama: number | string | null; status: string | null
  request_date: string | null; notes: string | null
  current_unified_number: number | string | null
  created_at: string
  project?: { id: string; name: string } | null
}

type PayrollDetail = {
  id: string; employee_name_snapshot: string | null
  residence_number_snapshot: string | number | null
  entry_status: string | null; created_at: string
  payroll_run?: { id: string; payroll_month: string | null; status: string | null } | null
}

type OpenDetail =
  | { kind: 'employee'; data: EmployeeWithRelations }
  | { kind: 'company'; data: Company }
  | { kind: 'project'; data: Project }
  | { kind: 'transfer'; data: TransferDetail }
  | { kind: 'payroll'; data: PayrollDetail }

// ─── List fetchers (cached, lightweight) ─────────────────────────────────────

async function fetchEmployees(): Promise<EmpRow[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, residence_number, passport_number, profession, nationality, company:companies(name)')
    .order('name').limit(1000)
  if (error) { console.error('[GlobalSearch] employees:', error.message); return [] }
  return (data || []) as unknown as EmpRow[]
}

async function fetchCompanies(): Promise<CompanyRow[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, unified_number, social_insurance_number, labor_subscription_number')
    .order('name').limit(1000)
  if (error) { console.error('[GlobalSearch] companies:', error.message); return [] }
  return (data || []) as CompanyRow[]
}

async function fetchProjects(): Promise<ProjectRow[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, description, status')
    .order('name').limit(500)
  if (error) { console.error('[GlobalSearch] projects:', error.message); return [] }
  return (data || []) as ProjectRow[]
}

async function fetchTransfers(): Promise<TransferRow[]> {
  const { data, error } = await supabase
    .from('transfer_procedures')
    .select('id, name, iqama, status')
    .order('created_at', { ascending: false }).limit(1000)
  if (error) { console.error('[GlobalSearch] transfers:', error.message); return [] }
  return (data || []) as TransferRow[]
}

async function fetchPayroll(): Promise<PayrollRow[]> {
  const { data, error } = await supabase
    .from('payroll_entries')
    .select('id, employee_name_snapshot, residence_number_snapshot, entry_status, payroll_run:payroll_runs(id,payroll_month)')
    .order('created_at', { ascending: false }).limit(1000)
  if (error) { console.error('[GlobalSearch] payroll:', error.message); return [] }
  return (data || []) as unknown as PayrollRow[]
}

// ─── Full-record fetchers (on demand, when result is clicked) ─────────────────

async function fetchFullEmployee(id: string): Promise<EmployeeWithRelations | null> {
  const { data } = await supabase
    .from('employees')
    .select(`id,company_id,name,profession,nationality,birth_date,phone,passport_number,
      residence_number,joining_date,contract_expiry,hired_worker_contract_expiry,residence_expiry,
      project_id,project_name,bank_account,residence_image_url,health_insurance_expiry,salary,
      notes,additional_fields,is_deleted,deleted_at,created_at,updated_at,
      company:companies(id,name,unified_number,labor_subscription_number,commercial_registration_expiry,
        social_insurance_number,commercial_registration_status,additional_fields,
        ending_subscription_power_date,ending_subscription_moqeem_date,employee_count,
        max_employees,notes,exemptions,company_type,created_at,updated_at),
      project:projects(id,name,description,status,created_at,updated_at)`)
    .eq('id', id)
    .single()
  return data as unknown as EmployeeWithRelations | null
}

async function fetchFullCompany(id: string): Promise<Company | null> {
  const { data } = await supabase
    .from('companies')
    .select(`id,name,unified_number,labor_subscription_number,commercial_registration_expiry,
      social_insurance_number,commercial_registration_status,additional_fields,
      ending_subscription_power_date,ending_subscription_moqeem_date,employee_count,
      max_employees,notes,exemptions,company_type,created_at,updated_at`)
    .eq('id', id)
    .single()
  return data as unknown as Company | null
}

async function fetchFullProject(id: string): Promise<Project | null> {
  const { data } = await supabase
    .from('projects')
    .select('id,name,description,status,created_at,updated_at')
    .eq('id', id)
    .single()
  return data as unknown as Project | null
}

async function fetchFullTransfer(id: string): Promise<TransferDetail | null> {
  const { data } = await supabase
    .from('transfer_procedures')
    .select('id,name,iqama,status,request_date,notes,current_unified_number,created_at,project:projects(id,name)')
    .eq('id', id)
    .single()
  return data as unknown as TransferDetail | null
}

async function fetchFullPayroll(id: string): Promise<PayrollDetail | null> {
  const { data } = await supabase
    .from('payroll_entries')
    .select('id,employee_name_snapshot,residence_number_snapshot,entry_status,created_at,payroll_run:payroll_runs(id,payroll_month,status)')
    .eq('id', id)
    .single()
  return data as unknown as PayrollDetail | null
}

// ─── Client-side filters ──────────────────────────────────────────────────────

function filterEmployees(rows: EmpRow[], q: string): SearchResult[] {
  const lower = q.toLowerCase()
  return rows
    .filter((e) =>
      e.name.toLowerCase().includes(lower) ||
      String(e.residence_number ?? '').toLowerCase().includes(lower) ||
      (e.passport_number ?? '').toLowerCase().includes(lower) ||
      (e.profession ?? '').toLowerCase().includes(lower) ||
      (e.nationality ?? '').toLowerCase().includes(lower)
    )
    .slice(0, 15)
    .map((e) => ({
      id: e.id,
      primary: e.name,
      secondary: e.residence_number != null ? `رقم الإقامة: ${e.residence_number}` : undefined,
      tertiary: [e.profession, e.nationality].filter(Boolean).join(' · ') || undefined,
      extra: (e.company as { name?: string } | null)?.name || undefined,
    }))
}

function filterCompanies(rows: CompanyRow[], q: string): SearchResult[] {
  const lower = q.toLowerCase()
  return rows
    .filter((c) =>
      c.name.toLowerCase().includes(lower) ||
      String(c.unified_number ?? '').includes(lower) ||
      String(c.social_insurance_number ?? '').includes(lower) ||
      String(c.labor_subscription_number ?? '').includes(lower)
    )
    .slice(0, 15)
    .map((c) => ({
      id: c.id,
      primary: c.name,
      secondary: c.unified_number != null ? `الرقم الموحد: ${c.unified_number}` : undefined,
      tertiary: c.labor_subscription_number ? `رقم القوى: ${c.labor_subscription_number}` : undefined,
      extra: c.social_insurance_number ? `التأمينات: ${c.social_insurance_number}` : undefined,
    }))
}

function filterProjects(rows: ProjectRow[], q: string): SearchResult[] {
  const lower = q.toLowerCase()
  return rows
    .filter((p) =>
      p.name.toLowerCase().includes(lower) ||
      (p.description ?? '').toLowerCase().includes(lower)
    )
    .slice(0, 15)
    .map((p) => ({
      id: p.id,
      primary: p.name,
      secondary: p.description || undefined,
      tertiary: p.status || undefined,
    }))
}

function filterTransfers(rows: TransferRow[], q: string): SearchResult[] {
  const lower = q.toLowerCase()
  return rows
    .filter((t) =>
      t.name.toLowerCase().includes(lower) ||
      String(t.iqama ?? '').includes(lower)
    )
    .slice(0, 15)
    .map((t) => ({
      id: t.id,
      primary: t.name,
      secondary: t.iqama != null ? `رقم الإقامة: ${t.iqama}` : undefined,
      tertiary: t.status || undefined,
    }))
}

function filterPayroll(rows: PayrollRow[], q: string): SearchResult[] {
  const lower = q.toLowerCase()
  return rows
    .filter((e) =>
      (e.employee_name_snapshot ?? '').toLowerCase().includes(lower) ||
      String(e.residence_number_snapshot ?? '').includes(lower)
    )
    .slice(0, 15)
    .map((e) => {
      const run = e.payroll_run as { id?: string; payroll_month?: string } | null
      return {
        id: e.id,
        primary: e.employee_name_snapshot || '—',
        secondary: e.residence_number_snapshot != null ? `رقم الإقامة: ${e.residence_number_snapshot}` : undefined,
        tertiary: run?.payroll_month || undefined,
        extra: e.entry_status || undefined,
      }
    })
}

// ─── Simple detail panels for Transfer and Payroll ────────────────────────────

function TransferDetailPanel({ data, onClose }: { data: TransferDetail; onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const statusMap: Record<string, string> = {
    pending: 'معلق', approved: 'موافق عليه', rejected: 'مرفوض',
    completed: 'مكتمل', cancelled: 'ملغي',
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="app-modal-surface w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-surface sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-[var(--color-primary-100)] p-2 rounded-[var(--radius-md)]">
              <Truck className="w-5 h-5 text-[var(--color-primary-800)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900">إجراء نقل</h2>
              <p className="text-sm text-neutral-500">{data.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-[var(--radius-md)] transition">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <InfoRow icon={<Users className="w-4 h-4" />} label="الاسم" value={data.name} />
          {data.iqama != null && (
            <InfoRow icon={<Hash className="w-4 h-4" />} label="رقم الإقامة" value={String(data.iqama)} />
          )}
          {data.status && (
            <InfoRow icon={<FileText className="w-4 h-4" />} label="الحالة" value={statusMap[data.status] ?? data.status} />
          )}
          {data.current_unified_number != null && (
            <InfoRow icon={<Hash className="w-4 h-4" />} label="الرقم الموحد الحالي" value={String(data.current_unified_number)} />
          )}
          {data.request_date && (
            <InfoRow icon={<Calendar className="w-4 h-4" />} label="تاريخ الطلب" value={data.request_date} />
          )}
          {data.project?.name && (
            <InfoRow icon={<FolderKanban className="w-4 h-4" />} label="المشروع" value={data.project.name} />
          )}
          {data.notes && (
            <InfoRow icon={<FileText className="w-4 h-4" />} label="ملاحظات" value={data.notes} />
          )}
        </div>
      </div>
    </div>
  )
}

function PayrollDetailPanel({ data, onClose }: { data: PayrollDetail; onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const run = data.payroll_run as { id?: string; payroll_month?: string | null; status?: string | null } | null

  const entryStatusMap: Record<string, string> = {
    draft: 'مسودة', calculated: 'محسوب', finalized: 'نهائي', paid: 'مدفوع', cancelled: 'ملغي',
  }
  const runStatusMap: Record<string, string> = {
    draft: 'مسودة', open: 'مفتوح', closed: 'مغلق', cancelled: 'ملغي',
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="app-modal-surface w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-surface sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-[var(--color-success-subtle)] p-2 rounded-[var(--radius-md)]">
              <Wallet className="w-5 h-5 text-[var(--color-success-foreground)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900">إدخال راتب</h2>
              <p className="text-sm text-neutral-500">{data.employee_name_snapshot || '—'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-[var(--radius-md)] transition">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <InfoRow icon={<Users className="w-4 h-4" />} label="الموظف" value={data.employee_name_snapshot || '—'} />
          {data.residence_number_snapshot != null && (
            <InfoRow icon={<Hash className="w-4 h-4" />} label="رقم الإقامة" value={String(data.residence_number_snapshot)} />
          )}
          {data.entry_status && (
            <InfoRow icon={<FileText className="w-4 h-4" />} label="حالة الإدخال" value={entryStatusMap[data.entry_status] ?? data.entry_status} />
          )}
          {run?.payroll_month && (
            <InfoRow icon={<Calendar className="w-4 h-4" />} label="شهر الراتب" value={run.payroll_month} />
          )}
          {run?.status && (
            <InfoRow icon={<FileText className="w-4 h-4" />} label="حالة الدورة" value={runStatusMap[run.status] ?? run.status} />
          )}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-[var(--radius-md)] bg-muted flex items-center justify-center text-muted-foreground mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground/80 mb-0.5">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  )
}

// ─── Detail renderer ──────────────────────────────────────────────────────────

function DetailRenderer({ detail, onClose }: { detail: OpenDetail; onClose: () => void }) {
  if (detail.kind === 'employee') {
    return (
      <EmployeeCard
        employee={detail.data as Employee & { company: Company }}
        onClose={onClose}
        onUpdate={onClose}
      />
    )
  }
  if (detail.kind === 'company') {
    return <CompanyDetailModal company={detail.data} onClose={onClose} />
  }
  if (detail.kind === 'project') {
    return (
      <ProjectDetailModal
        project={detail.data}
        onClose={onClose}
        onEdit={onClose}
        onDelete={onClose}
      />
    )
  }
  if (detail.kind === 'transfer') {
    return <TransferDetailPanel data={detail.data} onClose={onClose} />
  }
  if (detail.kind === 'payroll') {
    return <PayrollDetailPanel data={detail.data} onClose={onClose} />
  }
  return null
}

// ─── Cache type ────────────────────────────────────────────────────────────────

type CachedData = {
  employees: EmpRow[] | null
  companies: CompanyRow[] | null
  projects: ProjectRow[] | null
  transfers: TransferRow[] | null
  payroll: PayrollRow[] | null
}

// ─── Main component ───────────────────────────────────────────────────────────

interface GlobalSearchModalProps {
  open: boolean
  onClose: () => void
}

export function GlobalSearchModal({ open, onClose }: GlobalSearchModalProps) {
  const [activeTab, setActiveTab] = useState<SearchTab>('employees')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const cache = useRef<CachedData>({
    employees: null, companies: null, projects: null, transfers: null, payroll: null,
  })

  // Detail modal state — independent of search open state
  const [openDetail, setOpenDetail] = useState<OpenDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Reset when tab changes
  useEffect(() => {
    setQuery('')
    setResults([])
    setActiveIndex(0)
  }, [activeTab])

  // Fetch (once, cached) then filter client-side on every keystroke
  useEffect(() => {
    if (!open) return
    const q = query.trim()
    if (!q) { setResults([]); setLoading(false); return }

    let cancelled = false
    setLoading(true)

    const runFilter = (raw: unknown[]) => {
      if (cancelled) return
      let filtered: SearchResult[] = []
      if (activeTab === 'employees') filtered = filterEmployees(raw as EmpRow[], q)
      else if (activeTab === 'companies') filtered = filterCompanies(raw as CompanyRow[], q)
      else if (activeTab === 'projects') filtered = filterProjects(raw as ProjectRow[], q)
      else if (activeTab === 'transfers') filtered = filterTransfers(raw as TransferRow[], q)
      else if (activeTab === 'payroll') filtered = filterPayroll(raw as PayrollRow[], q)
      setResults(filtered)
      setActiveIndex(0)
      setLoading(false)
    }

    const fetchAndFilter = async () => {
      const cached = cache.current[activeTab]
      if (cached) { runFilter(cached); return }
      let data: unknown[] = []
      if (activeTab === 'employees') data = await fetchEmployees()
      else if (activeTab === 'companies') data = await fetchCompanies()
      else if (activeTab === 'projects') data = await fetchProjects()
      else if (activeTab === 'transfers') data = await fetchTransfers()
      else if (activeTab === 'payroll') data = await fetchPayroll()
      if (!cancelled) {
        ;(cache.current as Record<string, unknown[]>)[activeTab] = data
        runFilter(data)
      }
    }

    const timer = setTimeout(fetchAndFilter, 250)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query, activeTab, open])

  // Click a result: close search, fetch full record, open detail modal in-place
  const handleResultClick = useCallback(async (result: SearchResult) => {
    onClose()
    setDetailLoading(true)
    try {
      let detail: OpenDetail | null = null
      if (activeTab === 'employees') {
        const data = await fetchFullEmployee(result.id)
        if (data) detail = { kind: 'employee', data }
      } else if (activeTab === 'companies') {
        const data = await fetchFullCompany(result.id)
        if (data) detail = { kind: 'company', data }
      } else if (activeTab === 'projects') {
        const data = await fetchFullProject(result.id)
        if (data) detail = { kind: 'project', data }
      } else if (activeTab === 'transfers') {
        const data = await fetchFullTransfer(result.id)
        if (data) detail = { kind: 'transfer', data }
      } else if (activeTab === 'payroll') {
        const data = await fetchFullPayroll(result.id)
        if (data) detail = { kind: 'payroll', data }
      }
      setOpenDetail(detail)
    } catch (e) {
      console.error('[GlobalSearch] fetch detail error:', e)
    } finally {
      setDetailLoading(false)
    }
  }, [activeTab, onClose])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, results.length - 1)); return }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); return }
    if (e.key === 'Enter' && results[activeIndex]) { handleResultClick(results[activeIndex]); return }
  }

  // ── Search overlay portal (only when open) ─────────────────────────────────
  const searchPortal = open ? createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/40 backdrop-blur-sm pt-[72px] px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[640px] rounded-[var(--radius-xl)] border border-border bg-surface/98 shadow-[var(--shadow-xl)] dark:bg-[var(--color-card)]/98 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={TABS.find(t => t.id === activeTab)?.placeholder}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0" />}
          <button
            onClick={onClose}
            aria-label="إغلاق البحث"
            className="p-1 rounded-[var(--radius-md)] text-muted-foreground hover:text-foreground hover:bg-muted transition focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-3 py-2 border-b border-border overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? 'bg-[var(--color-primary-800)] text-white'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {!query.trim() ? (
            <p className="px-4 py-6 text-sm text-center text-muted-foreground">
              ابدأ الكتابة للبحث...
            </p>
          ) : loading ? (
            <p className="px-4 py-6 text-sm text-center text-muted-foreground">جارٍ البحث...</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-6 text-sm text-center text-muted-foreground">لا توجد نتائج</p>
          ) : (
            <div className="p-2 space-y-0.5">
              {results.map((result, idx) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-lg)] text-right transition ${
                    idx === activeIndex
                      ? 'bg-[var(--color-primary-100)] dark:bg-[var(--color-primary-800)]/20'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-foreground truncate">
                      {result.primary}
                    </span>
                    {result.secondary && (
                      <span className="block text-xs text-muted-foreground truncate mt-0.5">
                        {result.secondary}
                      </span>
                    )}
                    {result.tertiary && (
                      <span className="block text-xs text-muted-foreground/70 truncate">
                        {result.tertiary}
                      </span>
                    )}
                  </div>
                  {result.extra && (
                    <span className="flex-shrink-0 text-[10px] text-muted-foreground max-w-[110px] truncate text-right">
                      {result.extra}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border text-[11px] text-muted-foreground">
          <span>↑↓ تنقل · Enter للفتح · Esc إغلاق</span>
          <span>{results.length > 0 ? `${results.length} نتيجة` : ''}</span>
        </div>
      </div>
    </div>,
    document.body
  ) : null

  // ── Detail loading overlay ─────────────────────────────────────────────────
  const loadingPortal = detailLoading ? createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm" dir="rtl">
      <div className="bg-surface rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] px-8 py-6 flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--color-primary-800)] flex-shrink-0" />
        <span className="text-sm text-muted-foreground">جارٍ تحميل التفاصيل...</span>
      </div>
    </div>,
    document.body
  ) : null

  // ── Detail modal portal (independent of search open state) ─────────────────
  const detailPortal = openDetail && !detailLoading ? createPortal(
    <DetailRenderer detail={openDetail} onClose={() => setOpenDetail(null)} />,
    document.body
  ) : null

  return (
    <>
      {searchPortal}
      {loadingPortal}
      {detailPortal}
    </>
  )
}
