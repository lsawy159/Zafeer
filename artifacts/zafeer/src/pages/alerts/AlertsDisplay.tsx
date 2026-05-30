import { type ReactNode } from 'react'
import { AlertCard, type Alert } from '@/components/alerts/AlertCard'
import { EmployeeAlertCard, type EmployeeAlert } from '@/components/alerts/EmployeeAlertCard'
import { formatDateShortWithHijri } from '@/utils/dateFormatter'
import { HijriDateDisplay } from '@/components/ui/HijriDateDisplay'
import { Bell, Building2, Users } from 'lucide-react'
import { ALERT_GRID_CLASS, type AlertPriority, type AlertTableRow } from './useAlertsPage'

const PRIORITY_BADGE: Record<AlertPriority, ReactNode> = {
  urgent: <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">طارئ</span>,
  high: <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">عاجل</span>,
  medium: <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">متوسط</span>,
  low: <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">خفيف</span>,
}

interface AlertsDisplayProps {
  viewMode: 'table' | 'grid'
  activeTab: 'companies' | 'employees' | 'all' | 'deferred'
  searchTerm: string
  readFilterTab: 'new' | 'read'
  alertTableRows: AlertTableRow[]
  companyCardsToRender: Alert[]
  employeeCardsToRender: EmployeeAlert[]
  readAlerts: Set<string>
  snoozedAlertIds: Set<string>
  snoozedAlertsById: Map<string, { snoozed_until: string | null; is_deferred?: boolean | null }>
  handleShowCompanyCard: (id: string) => void
  handleViewEmployee: (id: string) => Promise<void>
  handleMarkAsRead: (id: string) => void
  handleMarkAsUnread: (id: string) => void
  handleOpenSnooze: (id: string) => void
  handleUnsnooze: (id: string) => Promise<void>
}

export function AlertsDisplay(p: AlertsDisplayProps) {
  if (p.viewMode === 'table') {
    return (
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
    )
  }

  // Grid view
  return (
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
  )
}
