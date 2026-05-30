import { Bell, X } from 'lucide-react'
import Layout from '@/components/layout/Layout'
import CompanyCard from '@/components/companies/CompanyCard'
import CompanyModal from '@/components/companies/CompanyModal'
import EmployeeCard from '@/components/employees/EmployeeCard'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { AlertSnoozeModal } from '@/components/alerts/AlertSnoozeModal'
import { useAlertsPage } from './alerts/useAlertsPage'
import { AlertsFilterBar } from './alerts/AlertsFilterBar'
import { AlertsDisplay } from './alerts/AlertsDisplay'

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

        <AlertsFilterBar
          activeTab={p.activeTab}
          setActiveTab={p.setActiveTab}
          readFilterTab={p.readFilterTab}
          setReadFilterTab={p.setReadFilterTab}
          totalAlerts={p.totalAlerts}
          totalReadAlerts={p.totalReadAlerts}
          totalDeferredAlerts={p.totalDeferredAlerts}
          companyAlertsStats={p.companyAlertsStats}
          employeeAlertsStats={p.employeeAlertsStats}
          searchTerm={p.searchTerm}
          setSearchTerm={p.setSearchTerm}
          activeFilter={p.activeFilter}
          togglePriorityFilter={p.togglePriorityFilter}
          clearPriorityFilter={p.clearPriorityFilter}
          alertStatusFilter={p.alertStatusFilter}
          setAlertStatusFilter={p.setAlertStatusFilter}
          alertSortField={p.alertSortField}
          setAlertSortField={p.setAlertSortField}
          alertSortDir={p.alertSortDir}
          setAlertSortDir={p.setAlertSortDir}
          viewMode={p.viewMode}
          setViewMode={p.setViewMode}
          handleMarkAllAsRead={p.handleMarkAllAsRead}
          handleMarkAllAsUnread={p.handleMarkAllAsUnread}
        />

        <AlertsDisplay
          viewMode={p.viewMode}
          activeTab={p.activeTab}
          searchTerm={p.searchTerm}
          readFilterTab={p.readFilterTab}
          alertTableRows={p.alertTableRows}
          companyCardsToRender={p.companyCardsToRender}
          employeeCardsToRender={p.employeeCardsToRender}
          readAlerts={p.readAlerts}
          snoozedAlertIds={p.snoozedAlertIds}
          snoozedAlertsById={p.snoozedAlertsById}
          handleShowCompanyCard={p.handleShowCompanyCard}
          handleViewEmployee={p.handleViewEmployee}
          handleMarkAsRead={p.handleMarkAsRead}
          handleMarkAsUnread={p.handleMarkAsUnread}
          handleOpenSnooze={p.handleOpenSnooze}
          handleUnsnooze={p.handleUnsnooze}
        />
      </div>

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
