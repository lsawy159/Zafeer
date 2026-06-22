import { Search, Wallet, ClipboardList } from 'lucide-react'
import { usePayrollDeductionsContent } from './PayrollDeductionsContent/usePayrollDeductionsContent'
import PDCSearchSection from './PayrollDeductionsContent/PDCSearchSection'
import PDCRunsSection from './PayrollDeductionsContent/PDCRunsSection'
import PDCObligationsSection from './PayrollDeductionsContent/PDCObligationsSection'
import ExportObligationsDialog from '../payroll/ExportObligationsDialog'
import BulkPenaltyDialog from '../payroll/BulkPenaltyDialog'
import ObligationImportDialog from '../payroll/ObligationImportDialog'
import CreatePayrollRunModal from '../payroll/CreatePayrollRunModal'
import ObligationDetailModal from '../payroll/ObligationDetailModal'
import AddObligationDialog from '../payroll/AddObligationDialog'
import PayrollSlipModal from '../payroll/PayrollSlipModal'
import {
  outlineCompactButtonClass,
  primaryCompactButtonClass,
  successCompactButtonClass,
  compactButtonBaseClass,
} from '../payroll/payrollStyles'

interface Props {
  defaultTab?: 'search' | 'runs' | 'obligations'
  hideTabBar?: boolean
}

export default function PayrollDeductionsContent({
  defaultTab = 'search',
  hideTabBar = false,
}: Props = {}) {
  const ctx = usePayrollDeductionsContent({ defaultTab, hideTabBar })

  const {
    hasPayrollViewPermission,
    activePageTab, setActivePageTab,
    // search
    exportObligationsToExcel,
    // dialogs state
    showExportObligationsDialog, setShowExportObligationsDialog,
    exportScope, setExportScope, exportTypes, setExportTypes, exportColumns, setExportColumns,
    exportingObligations, filteredObligationsSummary, allObligationsSummary,
    showBulkPenaltyDialog, setShowBulkPenaltyDialog,
    confirmingBulkPenalty, bulkPenaltySearch, setBulkPenaltySearch,
    bulkPenaltySelectedIds, setBulkPenaltySelectedIds,
    bulkPenaltyAmount, setBulkPenaltyAmount,
    bulkPenaltyMonth, setBulkPenaltyMonth,
    bulkPenaltyNotes, setBulkPenaltyNotes,
    allActiveEmployees,
    handleConfirmBulkPenalty,
    showObligationImportDialog, setShowObligationImportDialog,
    obligationImportStep, setObligationImportStep,
    obligationImportRows, importingObligations, obligationImportFileName,
    obligationImportHeaderError, setObligationImportRows,
    allEmployees,
    handleObligationImportFile, handleConfirmObligationImport,
    // CreatePayrollRunModal
    showPayrollRunForm, canCreate,
    payrollForm, setPayrollForm,
    scopeOptions, newPayrollRunRows, selectedNewPayrollRunRows, allNewPayrollRunRowsSelected,
    payrollRunSeedEmployeesLoading, seedEmployeeIds, normalizedPayrollFormMonth,
    createPayrollRun, upsertPayrollEntry,
    getRunDisplayName,
    handleToggleSelectAllNewPayrollRows, handleUpdateNewPayrollRunRow,
    handleTogglePayrollRunForm, handleCreatePayrollRun,
    // ObligationDetailModal
    obligationDetailEmployeeId, detailObligationPlans, detailObligationsLoading,
    editingObligationLineId, setEditingObligationLineId,
    obligationPaymentForm, setObligationPaymentForm,
    updateObligationLinePayment, setDeletingDetailPlanId,
    canEdit,
    handleCloseObligationDetail, handleOpenEditDetailPlan,
    handleStartEditObligationLine, handleSaveObligationLinePayment,
    // AddObligationDialog
    showAddObligationDialog, setShowAddObligationDialog,
    addObligationEmployeeSearch, setAddObligationEmployeeSearch,
    addObligationSelectedEmployeeId, setAddObligationSelectedEmployeeId,
    addObligationForm, setAddObligationForm,
    addObligationStartMonthConflict, checkingAddObligationMonth,
    dialogEmployeeOptions, createObligationPlan,
    handleAddObligation,
    // PayrollSlipModal
    selectedPayrollSlip, selectedSlipEntry, selectedSlipComponents, selectedSlipTotals,
    setSelectedPayrollSlipEntryId,
    handleDownloadPayrollSlipPdf,
    downloadingSlipPdf,
    canExport,
  } = ctx

  if (!hasPayrollViewPermission) return null

  return (
    <div dir="rtl">
      {/* ─── Tab bar ─── */}
      {!hideTabBar && (
        <div className="mb-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActivePageTab('search')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activePageTab === 'search'
                ? 'bg-primary text-white shadow-soft'
                : 'border border-border-200 bg-surface text-foreground-secondary hover:bg-surface-secondary-50'
            }`}
          >
            <Search className="h-4 w-4" />
            البحث في الاستقطاعات
          </button>
          <button
            type="button"
            onClick={() => setActivePageTab('runs')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activePageTab === 'runs'
                ? 'bg-primary text-white shadow-soft'
                : 'border border-border-200 bg-surface text-foreground-secondary hover:bg-surface-secondary-50'
            }`}
          >
            <Wallet className="h-4 w-4" />
            مسيرات الرواتب
          </button>
          <button
            type="button"
            onClick={() => setActivePageTab('obligations')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activePageTab === 'obligations'
                ? 'bg-primary text-white shadow-soft'
                : 'border border-border-200 bg-surface text-foreground-secondary hover:bg-surface-secondary-50'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            قائمة الالتزامات
          </button>
        </div>
      )}

      {/* ─── Sections ─── */}
      {activePageTab === 'search' && <PDCSearchSection {...ctx} />}
      <PDCRunsSection {...ctx} />
      {activePageTab === 'obligations' && <PDCObligationsSection {...ctx} />}

      {/* ─── Global dialogs ─── */}
      <ExportObligationsDialog
        show={showExportObligationsDialog}
        canExport={canExport('payroll')}
        exportingObligations={exportingObligations}
        exportScope={exportScope}
        exportTypes={exportTypes}
        exportColumns={exportColumns}
        filteredObligationsSummary={filteredObligationsSummary}
        allObligationsSummary={allObligationsSummary}
        onClose={() => setShowExportObligationsDialog(false)}
        onSetExportScope={setExportScope}
        onSetExportTypes={setExportTypes}
        onSetExportColumns={setExportColumns}
        onExport={exportObligationsToExcel}
      />
      <BulkPenaltyDialog
        show={showBulkPenaltyDialog}
        confirmingBulkPenalty={confirmingBulkPenalty}
        bulkPenaltySearch={bulkPenaltySearch}
        bulkPenaltySelectedIds={bulkPenaltySelectedIds}
        bulkPenaltyAmount={bulkPenaltyAmount}
        bulkPenaltyMonth={bulkPenaltyMonth}
        bulkPenaltyNotes={bulkPenaltyNotes}
        allActiveEmployees={allActiveEmployees}
        compactButtonBaseClass={compactButtonBaseClass}
        outlineCompactButtonClass={outlineCompactButtonClass}
        onClose={() => setShowBulkPenaltyDialog(false)}
        onSetSearch={setBulkPenaltySearch}
        onSetSelectedIds={setBulkPenaltySelectedIds}
        onSetAmount={setBulkPenaltyAmount}
        onSetMonth={setBulkPenaltyMonth}
        onSetNotes={setBulkPenaltyNotes}
        onConfirm={handleConfirmBulkPenalty}
      />
      <ObligationImportDialog
        show={showObligationImportDialog}
        obligationImportStep={obligationImportStep}
        obligationImportRows={obligationImportRows}
        importingObligations={importingObligations}
        obligationImportFileName={obligationImportFileName}
        obligationImportHeaderError={obligationImportHeaderError}
        allEmployees={allActiveEmployees}
        compactButtonBaseClass={compactButtonBaseClass}
        outlineCompactButtonClass={outlineCompactButtonClass}
        onClose={() => setShowObligationImportDialog(false)}
        onSetStep={setObligationImportStep}
        onSetRows={setObligationImportRows}
        onImportFile={handleObligationImportFile}
        onConfirmImport={handleConfirmObligationImport}
      />
      <CreatePayrollRunModal
        show={showPayrollRunForm && canCreate('payroll')}
        payrollForm={payrollForm}
        scopeOptions={scopeOptions}
        newPayrollRunRows={newPayrollRunRows}
        selectedNewPayrollRunRows={selectedNewPayrollRunRows}
        allNewPayrollRunRowsSelected={allNewPayrollRunRowsSelected}
        payrollRunSeedEmployeesLoading={payrollRunSeedEmployeesLoading}
        seedEmployeeIds={seedEmployeeIds}
        normalizedPayrollFormMonth={normalizedPayrollFormMonth}
        createPayrollRunPending={createPayrollRun.isPending}
        upsertPayrollEntryPending={upsertPayrollEntry.isPending}
        outlineCompactButtonClass={outlineCompactButtonClass}
        successCompactButtonClass={successCompactButtonClass}
        getPayrollRunDisplayName={getRunDisplayName}
        onSetPayrollForm={setPayrollForm}
        onToggleSelectAll={handleToggleSelectAllNewPayrollRows}
        onUpdateRow={handleUpdateNewPayrollRunRow}
        onClose={handleTogglePayrollRunForm}
        onSubmit={handleCreatePayrollRun}
      />
      <ObligationDetailModal
        obligationDetailEmployeeId={obligationDetailEmployeeId}
        allObligationsSummary={allObligationsSummary}
        detailObligationPlans={detailObligationPlans}
        detailObligationsLoading={detailObligationsLoading}
        editingObligationLineId={editingObligationLineId}
        obligationPaymentForm={obligationPaymentForm}
        updateObligationLinePaymentPending={updateObligationLinePayment.isPending}
        outlineCompactButtonClass={outlineCompactButtonClass}
        successCompactButtonClass={successCompactButtonClass}
        canEditEmployees={canEdit('employees')}
        onClose={handleCloseObligationDetail}
        onOpenEditDetailPlan={handleOpenEditDetailPlan}
        onSetDeletingDetailPlanId={setDeletingDetailPlanId}
        onStartEditObligationLine={handleStartEditObligationLine}
        onSetEditingObligationLineId={setEditingObligationLineId}
        onSetObligationPaymentForm={setObligationPaymentForm}
        onSaveObligationLinePayment={(lineId: string, amountDue: number) => void handleSaveObligationLinePayment(lineId, amountDue)}
      />
      <AddObligationDialog
        show={showAddObligationDialog}
        addObligationEmployeeSearch={addObligationEmployeeSearch}
        addObligationSelectedEmployeeId={addObligationSelectedEmployeeId}
        addObligationForm={addObligationForm}
        addObligationStartMonthConflict={addObligationStartMonthConflict}
        checkingAddObligationMonth={checkingAddObligationMonth}
        dialogEmployeeOptions={dialogEmployeeOptions}
        isCreatingPending={createObligationPlan.isPending}
        outlineCompactButtonClass={outlineCompactButtonClass}
        primaryCompactButtonClass={primaryCompactButtonClass}
        onClose={() => setShowAddObligationDialog(false)}
        onSetEmployeeSearch={setAddObligationEmployeeSearch}
        onSetSelectedEmployeeId={setAddObligationSelectedEmployeeId}
        onSetForm={setAddObligationForm}
        onSubmit={() => void handleAddObligation()}
      />
      <PayrollSlipModal
        selectedPayrollSlip={selectedPayrollSlip}
        selectedSlipEntry={selectedSlipEntry}
        selectedSlipComponents={selectedSlipComponents}
        selectedSlipTotals={selectedSlipTotals}
        allObligationsSummary={allObligationsSummary}
        onClose={() => setSelectedPayrollSlipEntryId(null)}
        onDownloadPdf={handleDownloadPayrollSlipPdf}
        downloadingPdf={downloadingSlipPdf}
      />
    </div>
  )
}
