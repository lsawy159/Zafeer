import { createPortal } from 'react-dom'
import { Employee, Company } from '@/lib/supabase'
import { usePermissions } from '@/utils/permissions'
import { RotateCcw, Save, X } from 'lucide-react'
import { EmployeeExpirySection } from './EmployeeExpirySection'
import { EmployeeHistoryModal } from './EmployeeHistoryModal'
import { EmployeeCardHeader } from './EmployeeCard/EmployeeCardHeader'
import { EmployeeCardInfo } from './EmployeeCard/EmployeeCardInfo'
import { EmployeeCardObligations } from './EmployeeCard/EmployeeCardObligations'
import { useEmployeeCardLogic } from './EmployeeCard/useEmployeeCardLogic'

interface EmployeeCardProps {
  employee: Employee & { company: Company }
  onClose: () => void
  onUpdate: () => void
  onDelete?: (employee: Employee & { company: Company }) => void
  defaultFinancialOverlayOpen?: boolean
}

export default function EmployeeCard({
  employee,
  onClose,
  onUpdate,
  onDelete,
  defaultFinancialOverlayOpen = false,
}: EmployeeCardProps) {
  const { canEdit, canDelete } = usePermissions()
  const logic = useEmployeeCardLogic({ employee, onClose, onUpdate, onDelete, defaultFinancialOverlayOpen })

  return createPortal(
    <>
      <div
        dir="rtl"
        className="fixed inset-0 z-[120] overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm"
        onClick={() => {
          if (!logic.isEditMode) {
            onClose()
          } else {
            logic.setShowUnsavedConfirm(true)
          }
        }}
      >
        <div className="flex min-h-full items-start justify-center py-2 md:items-center md:py-4">
          <div
            className="app-modal-surface relative isolate w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <EmployeeCardHeader
              employee={employee}
              isEditMode={logic.isEditMode}
              canEdit={canEdit}
              onClose={onClose}
              onEdit={logic.handleEdit}
              onCancel={logic.handleCancel}
              onHistoryOpen={() => logic.setShowHistoryModal(true)}
              onFinancialOpen={() => logic.setShowFinancialOverlay(true)}
            />

            <EmployeeExpirySection
              employee={employee}
              residenceImagePath={logic.formData.residence_image_url || null}
              residenceThumbnailPath={logic.formData.residence_thumbnail_url || null}
              thumbnailPreviewUrl={logic.thumbnailPreviewUrl}
            />

            <div className="p-6">
              <EmployeeCardInfo
                employee={employee}
                formData={logic.formData}
                setFormData={logic.setFormData}
                isEditMode={logic.isEditMode}
                employeeBusinessFields={logic.employeeBusinessFields}
                companySearchQuery={logic.companySearchQuery}
                setCompanySearchQuery={logic.setCompanySearchQuery}
                isCompanyDropdownOpen={logic.isCompanyDropdownOpen}
                setIsCompanyDropdownOpen={logic.setIsCompanyDropdownOpen}
                companyDropdownRef={logic.companyDropdownRef}
                filteredCompanies={logic.filteredCompanies}
                projectSearchQuery={logic.projectSearchQuery}
                setProjectSearchQuery={logic.setProjectSearchQuery}
                isProjectDropdownOpen={logic.isProjectDropdownOpen}
                setIsProjectDropdownOpen={logic.setIsProjectDropdownOpen}
                projectDropdownRef={logic.projectDropdownRef}
                filteredProjects={logic.filteredProjects}
                showCreateOption={logic.showCreateOption}
                newProjectName={logic.newProjectName}
                setNewProjectName={logic.setNewProjectName}
                showCreateProjectModal={logic.showCreateProjectModal}
                setShowCreateProjectModal={logic.setShowCreateProjectModal}
                creatingProject={logic.creatingProject}
                handleCreateProject={logic.handleCreateProject}
                thumbnailPreviewUrl={logic.thumbnailPreviewUrl}
                hasPendingResidenceFile={logic.hasPendingResidenceFile}
                handleFilesReady={logic.handleFilesReady}
              />
            </div>

            {/* Footer */}
            <div className="app-modal-footer flex justify-between p-6">
              {canDelete('employees') && onDelete && (
                <button
                  onClick={logic.handleDelete}
                  className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  title="حذف الموظف"
                >
                  <X className="w-4 h-4" />
                  حذف الموظف
                </button>
              )}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="app-button-secondary px-6 py-2"
                  disabled={logic.saving}
                >
                  إغلاق
                </button>
                {logic.isEditMode && (
                  <div className="flex gap-3">
                    <button
                      onClick={logic.handleCancel}
                      className="app-button-secondary px-6 py-2"
                      disabled={logic.saving}
                    >
                      <RotateCcw className="w-4 h-4" />
                      إلغاء
                    </button>
                    <button
                      onClick={logic.handleSave}
                      disabled={logic.saving}
                      className="app-button-primary px-6 py-2"
                    >
                      <Save className="w-4 h-4" />
                      {logic.saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History Modal */}
      {logic.showHistoryModal && (
        <EmployeeHistoryModal
          employee={employee}
          onClose={() => logic.setShowHistoryModal(false)}
        />
      )}

      {/* Financial Overlay + Obligation Modals */}
      <EmployeeCardObligations
        employee={employee}
        canEdit={canEdit}
        showFinancialOverlay={logic.showFinancialOverlay}
        setShowFinancialOverlay={logic.setShowFinancialOverlay}
        isLoadingObligations={logic.isLoadingObligations}
        hasObligationsError={logic.hasObligationsError}
        obligationPlans={logic.obligationPlans}
        activeObligationPlans={logic.activeObligationPlans}
        allObligationLines={logic.allObligationLines}
        openObligationLines={logic.openObligationLines}
        recentObligationLines={logic.recentObligationLines}
        remainingObligationAmount={logic.remainingObligationAmount}
        paidObligationAmount={logic.paidObligationAmount}
        obligationBucketSummary={logic.obligationBucketSummary}
        editingObligationLineId={logic.editingObligationLineId}
        obligationPaymentForm={logic.obligationPaymentForm}
        setObligationPaymentForm={logic.setObligationPaymentForm}
        updateObligationLinePayment={logic.updateObligationLinePayment}
        handleOpenEditPlan={logic.handleOpenEditPlan}
        setDeletingPlanId={logic.setDeletingPlanId}
        startEditingObligationLine={logic.startEditingObligationLine}
        handleSaveObligationPayment={logic.handleSaveObligationPayment}
        setEditingObligationLineId={logic.setEditingObligationLineId}
        onAddObligation={() => logic.setShowObligationForm(true)}
        showObligationForm={logic.showObligationForm}
        setShowObligationForm={logic.setShowObligationForm}
        obligationForm={logic.obligationForm}
        setObligationForm={logic.setObligationForm}
        installmentPreview={logic.installmentPreview}
        startMonthConflict={logic.startMonthConflict}
        checkingStartMonth={logic.checkingStartMonth}
        createEmployeeObligationPlan={logic.createEmployeeObligationPlan}
        handleCreateObligationPlan={logic.handleCreateObligationPlan}
        editingPlanId={logic.editingPlanId}
        setEditingPlanId={logic.setEditingPlanId}
        editPlanForm={logic.editPlanForm}
        setEditPlanForm={logic.setEditPlanForm}
        updateObligationPlan={logic.updateObligationPlan}
        handleUpdatePlan={logic.handleUpdatePlan}
        deletingPlanId={logic.deletingPlanId}
        setDeletingPlanId2={logic.setDeletingPlanId}
        deleteObligationPlan={logic.deleteObligationPlan}
        handleDeletePlan={logic.handleDeletePlan}
      />

      {/* Unsaved Changes Confirm */}
      {logic.showUnsavedConfirm && (
        <div
          className="fixed inset-0 z-[145] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
          dir="rtl"
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-neutral-900 mb-2 text-center">تغييرات غير محفوظة</h3>
            <p className="text-sm text-neutral-500 text-center mb-5">هل تريد حفظ التغييرات أم تجاهلها؟</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={async () => {
                  await logic.handleSave()
                  logic.setShowUnsavedConfirm(false)
                  onClose()
                }}
                disabled={logic.saving}
                className="app-button-primary w-full py-2.5 disabled:opacity-60"
              >
                {logic.saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
              <button
                onClick={() => {
                  logic.handleCancel()
                  logic.setShowUnsavedConfirm(false)
                  onClose()
                }}
                className="app-button-secondary w-full py-2.5"
              >
                تجاهل التغييرات
              </button>
              <button
                onClick={() => logic.setShowUnsavedConfirm(false)}
                className="w-full py-2.5 text-sm text-neutral-400 hover:text-neutral-600 transition rounded-xl"
              >
                إلغاء (العودة للتعديل)
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  )
}
