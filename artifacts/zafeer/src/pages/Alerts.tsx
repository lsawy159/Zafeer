import { type ReactNode } from 'react'
import { AlertCard } from '@/components/alerts/AlertCard'
import { EmployeeAlertCard } from '@/components/alerts/EmployeeAlertCard'
import { AlertSnoozeModal } from '@/components/alerts/AlertSnoozeModal'
import { formatDateShortWithHijri } from '@/utils/dateFormatter'
import { HijriDateDisplay } from '@/components/ui/HijriDateDisplay'
import {
  Bell, AlertTriangle, Building2, Users, X, CheckCircle2, Mail, ArrowUpDown, List, LayoutGrid,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import CompanyCard from '@/components/companies/CompanyCard'
import CompanyModal from '@/components/companies/CompanyModal'
import EmployeeCard from '@/components/employees/EmployeeCard'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { Button } from '@/components/ui/Button'
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import {
  useAlertsPage, PRIORITY_OPTIONS, ALERT_GRID_CLASS, getPriorityFilterLabel, compareAlerts,
  type AlertPriority, type AlertSortField, type SortDirection,
} from './alerts/useAlertsPage'

const PRIORITY_BADGE: Record<AlertPriority, ReactNode> = {
  urgent: <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">طارئ</span>,
  high: <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">عاجل</span>,
  medium: <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">متوسط</span>,
  low: <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">خفيف</span>,
}

interface AlertsProps {
  initialTab?: 'companies' | 'employees' | 'all' | 'deferred'
  initialFilter?: 'all' | 'urgent' | 'high' | 'medium' | 'low'
}

export default function Alerts({ initialTab = 'all', initialFilter = 'all' }: AlertsProps) {
  const p = useAlertsPage({ initialTab, initialFilter })

  if (!p.canView('alerts')) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Bell className="w-16 h-16 mx-auto mb-4 text-danger-500" />
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">غير مصرح</h2>
            <p className="text-neutral-600">عذراً، ليس لديك صلاحية لعرض هذه الصفحة.</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (p.loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="app-page app-tech-grid">
        <PageHeader
          title="التنبيهات"
          description={`عرض ذكي للتنبيهات بحسب الأولوية وحالة القراءة. الحالي: ${p.totalAlerts} جديد و ${p.totalReadAlerts} مقروء.`}
          breadcrumbs={[{ label: 'الرئيسية', href: '/dashboard' }, { label: 'التنبيهات' }]}
          className="mb-6"
        />

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8 mb-8">
          {p.alertSummaryCards.map((card) => {
            const isActive = card.key === null ? p.cardFilter === null : p.cardFilter === card.key
            return (
              <div
                key={String(card.key ?? 'all')}
                onClick={() => {
                  if (card.key === null) { p.setCardFilter(null); p.setActiveTab('all'); return }
                  const next = p.cardFilter === card.key ? null : card.key
                  p.setCardFilter(next)
                  if (card.key === 'companies' || card.key === 'employees') p.setActiveTab(next === null ? 'all' : card.key as typeof p.activeTab)
                  else if (card.key === 'مؤجلة') p.setActiveTab(next === null ? 'all' : 'deferred')
                }}
                className={`app-panel cursor-pointer px-2 py-2 text-center transition-shadow ${card.accentClass} ${isActive ? 'ring-2 ring-offset-1 ring-primary shadow-md' : 'hover:shadow-sm'}`}
              >
                <div className="text-[10px] font-medium leading-4 text-foreground-secondary md:text-[11px]">{card.title}</div>
                <div className={`text-base font-bold leading-none md:text-lg ${card.valueClass}`}>{card.value.toLocaleString('en-US')}</div>
                <div className="text-[10px] leading-4 text-foreground-secondary md:text-[11px]">{card.label}</div>
              </div>
            )
          })}
        </div>

        {/* Filter Bar */}
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

        {/* Alerts Display */}
        {p.viewMode === 'table' ? (
          <div className="app-panel overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="sticky top-0 z-[1] bg-neutral-50 shadow-sm">
                <tr className="border-b border-neutral-200 text-right">
                  <th className="px-3 py-3 font-semibold text-neutral-700">م</th>
                  <th className="px-3 py-3 font-semibold text-neutral-700">نوع الكيان</th>
                  <th className="px-3 py-3 font-semibold text-neutral-700">اسم الكيان</th>
                  <th className="px-3 py-3 font-semibold text-neutral-700">نوع التنبيه</th>
                  <th className="px-3 py-3 font-semibold text-neutral-700">الأولوية</th>
                  <th className="px-3 py-3 font-semibold text-neutral-700">الأيام المتبقية</th>
                  <th className="px-3 py-3 font-semibold text-neutral-700">تاريخ الانتهاء</th>
                  <th className="px-3 py-3 font-semibold text-neutral-700">الحالة</th>
                  <th className="px-3 py-3 font-semibold text-neutral-700">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {p.alertTableRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-3 text-neutral-500">
                        <Bell className="h-10 w-10 text-neutral-300" />
                        <div>
                          <div className="text-base font-medium text-neutral-900">
                            {p.searchTerm ? 'لا توجد نتائج' : p.readFilterTab === 'new' ? 'لا توجد تنبيهات جديدة' : 'لا توجد تنبيهات مقروءة'}
                          </div>
                          <div className="mt-1 text-sm text-neutral-500">
                            {p.searchTerm ? `لم يتم العثور على تنبيهات تحتوي على "${p.searchTerm}"` : p.readFilterTab === 'new' ? 'جميع مؤسساتك وموظفيك محدثون ولا يحتاجون إلى إجراءات فورية' : 'لم تقم بالاطلاع على أي تنبيهات بعد'}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  p.alertTableRows.map((row, index) => {
                    const entityName = row.kind === 'company' ? row.alert.company.name : row.alert.employee.name
                    const entityType = row.kind === 'company' ? 'مؤسسة' : 'موظف'
                    const isRead = p.readAlerts.has(row.alert.id)
                    const snoozedRecord = p.snoozedAlertsById.get(row.alert.id)
                    return (
                      <tr
                        key={row.alert.id}
                        className="cursor-pointer transition-colors hover:bg-neutral-50"
                        onClick={() => row.kind === 'company' ? p.handleShowCompanyCard(row.alert.company.id) : void p.handleViewEmployee(row.alert.employee.id)}
                      >
                        <td className="px-3 py-3 text-xs text-neutral-500">{index + 1}</td>
                        <td className="px-3 py-3"><span className="inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">{entityType}</span></td>
                        <td className="px-3 py-3 font-medium text-neutral-900">{entityName}</td>
                        <td className="px-3 py-3 text-neutral-700">{row.alert.title}</td>
                        <td className="px-3 py-3">{PRIORITY_BADGE[row.alert.priority]}</td>
                        <td className="px-3 py-3">
                          {row.alert.days_remaining == null ? <span className="text-neutral-400">—</span> : <span className={row.alert.days_remaining < 0 ? 'font-medium text-red-600' : 'text-neutral-700'}>{row.alert.days_remaining}</span>}
                        </td>
                        <td className="px-3 py-3 text-xs text-neutral-600">
                          {row.alert.expiry_date ? <HijriDateDisplay date={row.alert.expiry_date}>{formatDateShortWithHijri(row.alert.expiry_date)}</HijriDateDisplay> : '—'}
                        </td>
                        <td className="px-3 py-3">
                          {p.activeTab === 'deferred' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              {snoozedRecord?.is_deferred ? 'مؤجل حتى تفعيل يدوي' : snoozedRecord?.snoozed_until ? `مؤجل حتى ${new Date(snoozedRecord.snoozed_until).toLocaleDateString('ar-SA')}` : 'مؤجل'}
                            </span>
                          ) : isRead ? (
                            <span className="text-xs text-neutral-400">مقروء</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary" />جديد</span>
                          )}
                        </td>
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          {p.activeTab === 'deferred' ? (
                            <button type="button" onClick={() => void p.handleUnsnooze(row.alert.id)} className="text-xs text-amber-700 underline-offset-2 hover:text-amber-800 hover:underline">إلغاء التأجيل</button>
                          ) : isRead ? (
                            <button type="button" onClick={() => p.handleMarkAsUnread(row.alert.id)} className="text-xs text-neutral-500 underline-offset-2 hover:text-neutral-700 hover:underline">إلغاء القراءة</button>
                          ) : (
                            <div className="flex items-center gap-3">
                              <button type="button" onClick={() => p.handleMarkAsRead(row.alert.id)} className="text-xs text-primary underline-offset-2 hover:underline">تحديد كمقروء</button>
                              <button type="button" onClick={() => p.handleOpenSnooze(row.alert.id)} className="text-xs text-amber-700 underline-offset-2 hover:text-amber-800 hover:underline">تأجيل</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-8">
            {(p.activeTab === 'all' || p.activeTab === 'companies' || p.activeTab === 'deferred') && p.companyCardsToRender.length > 0 && (
              <div>
                <div className="mb-6 flex items-center gap-3">
                  <Building2 className="h-6 w-6 text-primary" />
                  <h2 className="text-xl font-bold text-neutral-900">{p.activeTab === 'deferred' ? 'التنبيهات المؤجلة للمؤسسات' : 'تنبيهات المؤسسات'}</h2>
                  <span className="rounded-full bg-primary/15 px-2 py-1 text-sm font-medium text-foreground">{p.companyCardsToRender.length}</span>
                </div>
                <div className={ALERT_GRID_CLASS}>
                  {p.companyCardsToRender.map((alert) => (
                    <AlertCard key={alert.id} alert={alert} onShowCompanyCard={p.handleShowCompanyCard} onMarkAsRead={p.handleMarkAsRead} onMarkAsUnread={p.handleMarkAsUnread} onSnooze={p.activeTab !== 'deferred' ? p.handleOpenSnooze : undefined} onUnsnooze={p.activeTab === 'deferred' ? p.handleUnsnooze : undefined} isRead={p.readAlerts.has(alert.id)} isSnoozed={p.snoozedAlertIds.has(alert.id)} snoozedUntil={p.snoozedAlertsById.get(alert.id)?.snoozed_until ?? null} />
                  ))}
                </div>
              </div>
            )}
            {(p.activeTab === 'all' || p.activeTab === 'employees' || p.activeTab === 'deferred') && p.employeeCardsToRender.length > 0 && (
              <div>
                <div className="mb-6 flex items-center gap-3">
                  <Users className="h-6 w-6 text-foreground-secondary" />
                  <h2 className="text-xl font-bold text-neutral-900">{p.activeTab === 'deferred' ? 'التنبيهات المؤجلة للموظفين' : 'تنبيهات الموظفين'}</h2>
                  <span className="rounded-full bg-surface-secondary px-2 py-1 text-sm font-medium text-foreground-secondary">{p.employeeCardsToRender.length}</span>
                </div>
                <div className={ALERT_GRID_CLASS}>
                  {p.employeeCardsToRender.map((alert) => (
                    <EmployeeAlertCard key={alert.id} alert={alert} onViewEmployee={p.handleViewEmployee} onMarkAsRead={p.handleMarkAsRead} onMarkAsUnread={p.handleMarkAsUnread} onSnooze={p.activeTab !== 'deferred' ? p.handleOpenSnooze : undefined} onUnsnooze={p.activeTab === 'deferred' ? p.handleUnsnooze : undefined} isRead={p.readAlerts.has(alert.id)} isSnoozed={p.snoozedAlertIds.has(alert.id)} snoozedUntil={p.snoozedAlertsById.get(alert.id)?.snoozed_until ?? null} />
                  ))}
                </div>
              </div>
            )}
            {p.companyCardsToRender.length === 0 && p.employeeCardsToRender.length === 0 && (
              <div className="rounded-xl border border-neutral-200 bg-surface p-12 text-center shadow-sm">
                <Bell className="mx-auto mb-4 h-16 w-16 text-neutral-300" />
                <h3 className="mb-2 text-lg font-medium text-neutral-900">
                  {p.searchTerm ? 'لا توجد نتائج' : p.activeTab === 'deferred' ? 'لا توجد تنبيهات مؤجلة' : p.readFilterTab === 'new' ? 'لا توجد تنبيهات جديدة' : 'لا توجد تنبيهات مقروءة'}
                </h3>
                <p className="text-neutral-600">
                  {p.searchTerm ? `لم يتم العثور على تنبيهات تحتوي على "${p.searchTerm}"` : p.activeTab === 'deferred' ? 'لا توجد تنبيهات في تبويب المؤجلة حالياً' : p.readFilterTab === 'new' ? 'جميع مؤسساتك وموظفيك محدثون ولا يحتاجون إلى إجراءات فورية' : 'لم تقم بالاطلاع على أي تنبيهات بعد'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Company Card Modal */}
      {p.showCompanyCard && p.selectedCompany && (
        <div className="fixed inset-0 z-[100] bg-foreground/55 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => p.setShowCompanyCard(false)}>
          <div className="app-modal-surface max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="app-modal-header flex items-center justify-between px-6 py-4">
              <h2 className="text-xl font-bold text-neutral-900">تفاصيل المؤسسة</h2>
              <Button onClick={() => p.setShowCompanyCard(false)} variant="ghost" size="icon"><X className="w-6 h-6 text-neutral-500" /></Button>
            </div>
            <div className="p-6">
              <CompanyCard
                company={{ ...p.selectedCompany, employee_count: 0, available_slots: 0, max_employees: p.selectedCompany.max_employees || 4 }}
                onEdit={p.handleEditCompany}
                onDelete={() => {}}
                getAvailableSlotsColor={(slots) => slots > 0 ? 'text-success-600' : 'text-red-600'}
                getAvailableSlotsTextColor={(slots) => slots > 0 ? 'text-success-600' : 'text-red-600'}
                getAvailableSlotsText={(slots) => `متاح: ${slots} أماكن`}
              />
            </div>
          </div>
        </div>
      )}

      {p.showEmployeeCard && p.selectedEmployee && (
        <EmployeeCard employee={p.selectedEmployee} onClose={p.handleCloseEmployeeCard} onUpdate={p.handleUpdateEmployee} />
      )}

      {p.showEditModal && (
        <CompanyModal isOpen={p.showEditModal} company={p.selectedCompany} onClose={p.handleCloseEditModal} onSuccess={p.handleEditModalSuccess} />
      )}

      {p.snoozeTarget && (
        <AlertSnoozeModal
          alertId={p.snoozeTarget.id}
          alertTitle={p.snoozeTarget.title}
          open={Boolean(p.snoozeTarget)}
          onClose={() => p.setSnoozeTarget(null)}
          onSuccess={() => { p.refreshStats(); p.refreshSnoozedAlerts(); p.setSnoozeTarget(null) }}
        />
      )}
    </Layout>
  )
}
