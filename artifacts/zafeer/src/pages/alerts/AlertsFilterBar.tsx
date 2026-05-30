import { CheckCircle2, Mail, ArrowUpDown, List, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SearchInput } from '@/components/ui/SearchInput'
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import {
  PRIORITY_OPTIONS, getPriorityFilterLabel,
  type AlertPriority, type AlertSortField, type SortDirection,
} from './useAlertsPage'

interface AlertsFilterBarProps {
  activeTab: 'companies' | 'employees' | 'all' | 'deferred'
  setActiveTab: (tab: 'companies' | 'employees' | 'all' | 'deferred') => void
  readFilterTab: 'new' | 'read'
  setReadFilterTab: (t: 'new' | 'read') => void
  totalAlerts: number
  totalReadAlerts: number
  totalDeferredAlerts: number
  companyAlertsStats: { total: number }
  employeeAlertsStats: { total: number }
  searchTerm: string
  setSearchTerm: (s: string) => void
  activeFilter: AlertPriority[]
  togglePriorityFilter: (p: AlertPriority) => void
  clearPriorityFilter: () => void
  alertStatusFilter: 'all' | 'active' | 'expired'
  setAlertStatusFilter: (s: 'all' | 'active' | 'expired') => void
  alertSortField: AlertSortField
  setAlertSortField: (f: AlertSortField) => void
  alertSortDir: SortDirection
  setAlertSortDir: (d: SortDirection) => void
  viewMode: 'table' | 'grid'
  setViewMode: (m: 'table' | 'grid') => void
  handleMarkAllAsRead: () => void
  handleMarkAllAsUnread: () => void
}

export function AlertsFilterBar(p: AlertsFilterBarProps) {
  return (
    <div className="app-panel mb-8 v3-panel">
      <div className="v3-bar">
        <div className="v3-chips">
          <button type="button" onClick={() => p.setActiveTab('all')} className={`v3-chip ${p.activeTab === 'all' ? 'v3-on' : ''}`}>الكل ({p.totalAlerts})</button>
          <button type="button" onClick={() => p.setActiveTab('companies')} className={`v3-chip ${p.activeTab === 'companies' ? 'v3-on' : ''}`}>مؤسسات ({p.companyAlertsStats.total})</button>
          <button type="button" onClick={() => p.setActiveTab('employees')} className={`v3-chip ${p.activeTab === 'employees' ? 'v3-on' : ''}`}>موظفين ({p.employeeAlertsStats.total})</button>
          <button type="button" onClick={() => p.setActiveTab('deferred')} className={`v3-chip ${p.activeTab === 'deferred' ? 'v3-on' : ''}`}>مؤجلة ({p.totalDeferredAlerts})</button>
        </div>
        <div className="v3-chips">
          <button type="button" onClick={() => p.setReadFilterTab('new')} className={`v3-chip ${p.readFilterTab === 'new' ? 'v3-on' : ''}`}>جديدة ({p.totalAlerts})</button>
          <button type="button" onClick={() => p.setReadFilterTab('read')} className={`v3-chip ${p.readFilterTab === 'read' ? 'v3-on' : ''}`}>مقروءة ({p.totalReadAlerts})</button>
        </div>
        <div className="v3-vsep" />
        <SearchInput type="text" placeholder="البحث..." value={p.searchTerm} onChange={(e) => p.setSearchTerm(e.target.value)} wrapperClassName="v3-search" />
        <div className="v3-vsep" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" className="h-9 px-3 text-sm">
              <span className="truncate max-w-[120px]">{getPriorityFilterLabel(p.activeFilter)}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={8} className="w-56">
            <DropdownMenuLabel>اختر الأولويات</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => p.clearPriorityFilter()}>جميع الأولويات</DropdownMenuItem>
            <DropdownMenuSeparator />
            {PRIORITY_OPTIONS.map((option) => (
              <DropdownMenuCheckboxItem key={option.value} checked={p.activeFilter.includes(option.value)} onCheckedChange={() => p.togglePriorityFilter(option.value)} onSelect={(event) => event.preventDefault()}>
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="v3-secondary">
          <Select value={p.alertStatusFilter} onValueChange={(value) => p.setAlertStatusFilter(value as typeof p.alertStatusFilter)}>
            <SelectTrigger className="h-9 min-w-[100px] text-sm"><SelectValue placeholder="الحالة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="expired">منتهي</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" className="h-9 w-9 px-0" title="الترتيب"><ArrowUpDown className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-52">
              <DropdownMenuLabel>الترتيب</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={`${p.alertSortField}_${p.alertSortDir}`} onValueChange={(value) => {
                const parts = value.split('_')
                const dir = parts.pop() as SortDirection
                p.setAlertSortField(parts.join('_') as AlertSortField)
                p.setAlertSortDir(dir)
              }}>
                <DropdownMenuRadioItem value="priority_desc">الأولوية ↓</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="priority_asc">الأولوية ↑</DropdownMenuRadioItem>
                <DropdownMenuSeparator />
                <DropdownMenuRadioItem value="entity_name_desc">اسم الكيان ↓</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="entity_name_asc">اسم الكيان ↑</DropdownMenuRadioItem>
                <DropdownMenuSeparator />
                <DropdownMenuRadioItem value="days_remaining_desc">الأيام المتبقية ↓</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="days_remaining_asc">الأيام المتبقية ↑</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="app-toggle-shell">
          <button type="button" onClick={() => p.setViewMode('table')} className={`app-toggle-button ${p.viewMode === 'table' ? 'app-toggle-button-active' : ''}`} title="عرض جدول"><List className="h-4 w-4" /></button>
          <button type="button" onClick={() => p.setViewMode('grid')} className={`app-toggle-button ${p.viewMode === 'grid' ? 'app-toggle-button-active' : ''}`} title="عرض بطاقات"><LayoutGrid className="h-4 w-4" /></button>
        </div>
        {p.readFilterTab === 'new' && p.totalAlerts > 0 && (
          <Button onClick={p.handleMarkAllAsRead} variant="default" className="h-9 px-3 text-sm whitespace-nowrap">
            <CheckCircle2 className="w-4 h-4" />
            <span>اطلع على الكل</span>
          </Button>
        )}
        {p.readFilterTab === 'read' && p.totalReadAlerts > 0 && (
          <Button onClick={p.handleMarkAllAsUnread} variant="secondary" className="h-9 px-3 text-sm whitespace-nowrap">
            <Mail className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
