import { createPortal } from 'react-dom'
import { Company } from '@/lib/supabase'
import { X, Building2, Loader2 } from 'lucide-react'
import {
  calculateCommercialRegistrationStatus,
  calculatePowerSubscriptionStatus,
  calculateMoqeemSubscriptionStatus,
} from '@/utils/autoCompanyStatus'
import { useCompanyModal } from './CompanyModal/useCompanyModal'
import ConfirmationDialog from '@/components/dialogs/ConfirmationDialog'

interface CompanyModalProps {
  isOpen: boolean
  company?: Company | null
  onClose: () => void
  onSuccess: () => void
}

export default function CompanyModal(props: CompanyModalProps) {
  const {
    formData, handleChange, handleSubmit, handleOverlayClick, loading, isEditing,
    showUnsavedConfirm, handleUnsavedConfirm, handleUnsavedCancel,
  } = useCompanyModal(props)

  if (!props.isOpen) return null

  const commercialStatus = formData.commercial_registration_expiry
    ? calculateCommercialRegistrationStatus(formData.commercial_registration_expiry)
    : null
  const powerStatus = formData.ending_subscription_power_date
    ? calculatePowerSubscriptionStatus(formData.ending_subscription_power_date)
    : null
  const moqeemStatus = formData.ending_subscription_moqeem_date
    ? calculateMoqeemSubscriptionStatus(formData.ending_subscription_moqeem_date)
    : null

  const portal = createPortal(
    <div
      className="fixed inset-0 z-[120] bg-slate-950/55 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div
        className="app-modal-surface max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="app-modal-header flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/15 p-2">
              <Building2 className="h-6 w-6 text-slate-900" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-900">
              {isEditing ? 'تعديل المؤسسة' : 'إضافة مؤسسة جديدة'}
            </h2>
          </div>
          <button
            onClick={props.onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition"
            disabled={loading}
          >
            <X className="w-6 h-6 text-neutral-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* اسم المؤسسة */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                اسم المؤسسة <span className="text-danger-500">*</span>
              </label>
              <input type="text" name="name" value={formData.name} onChange={handleChange}
                className="app-input py-2.5" placeholder="أدخل اسم المؤسسة" required disabled={loading} />
            </div>

            {/* الرقم الموحد */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                الرقم الموحد <span className="text-danger-500">*</span>
              </label>
              <input type="number" name="unified_number" value={formData.unified_number} onChange={handleChange}
                className="app-input py-2.5 font-mono" placeholder="أدخل الرقم الموحد" required disabled={loading} />
            </div>

            {/* رقم اشتراك التأمينات الاجتماعية */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                رقم اشتراك التأمينات الاجتماعية
              </label>
              <input type="text" name="social_insurance_number" value={formData.social_insurance_number}
                onChange={handleChange} placeholder="رقم اشتراك التأمينات الاجتماعية"
                className="app-input py-2.5" disabled={loading} />
            </div>

            {/* رقم اشتراك قوى */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                رقم اشتراك قوى <span className="text-danger-500">*</span>
              </label>
              <input type="text" name="labor_subscription_number" value={formData.labor_subscription_number}
                onChange={handleChange} className="app-input py-2.5" placeholder="أدخل رقم اشتراك قوى" disabled={loading} />
            </div>

            {/* تاريخ انتهاء السجل التجاري */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                تاريخ انتهاء السجل التجاري
              </label>
              <input type="date" name="commercial_registration_expiry"
                value={formData.commercial_registration_expiry} onChange={handleChange}
                className="app-input py-2.5" disabled={loading} />
            </div>

            {/* تاريخ انتهاء اشتراك قوى */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                تاريخ انتهاء اشتراك قوى
              </label>
              <input type="date" name="ending_subscription_power_date"
                value={formData.ending_subscription_power_date} onChange={handleChange}
                className="app-input py-2.5" disabled={loading} />
            </div>

            {/* تاريخ انتهاء اشتراك مقيم */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                تاريخ انتهاء اشتراك مقيم
              </label>
              <input type="date" name="ending_subscription_moqeem_date"
                value={formData.ending_subscription_moqeem_date} onChange={handleChange}
                className="app-input py-2.5" disabled={loading} />
            </div>

            {/* حالة السجل التجاري */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">حالة السجل التجاري</label>
              <div className="p-3 border border-neutral-200 rounded-lg bg-neutral-50">
                {commercialStatus ? (
                  <div className={`p-2 rounded-md ${commercialStatus.color.backgroundColor}`}>
                    <div className={`font-medium ${commercialStatus.color.textColor}`}>{commercialStatus.status}</div>
                    <div className={`text-sm mt-1 ${commercialStatus.color.textColor}`}>{commercialStatus.description}</div>
                  </div>
                ) : (
                  <div className="text-neutral-500 text-sm">يرجى إدخال تاريخ انتهاء السجل التجاري أولاً</div>
                )}
              </div>
            </div>

            {/* حالة اشتراك قوى */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">حالة اشتراك قوى</label>
              <div className="p-3 border border-neutral-200 rounded-lg bg-neutral-50">
                {powerStatus ? (
                  <div className={`p-2 rounded-md ${powerStatus.color.backgroundColor}`}>
                    <div className={`font-medium ${powerStatus.color.textColor}`}>{powerStatus.status}</div>
                    <div className={`text-sm mt-1 ${powerStatus.color.textColor}`}>{powerStatus.description}</div>
                  </div>
                ) : (
                  <div className="text-neutral-500 text-sm">يرجى إدخال تاريخ انتهاء اشتراك قوى أولاً</div>
                )}
              </div>
            </div>

            {/* حالة اشتراك مقيم */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">حالة اشتراك مقيم</label>
              <div className="p-3 border border-neutral-200 rounded-lg bg-neutral-50">
                {moqeemStatus ? (
                  <div className={`p-2 rounded-md ${moqeemStatus.color.backgroundColor}`}>
                    <div className={`font-medium ${moqeemStatus.color.textColor}`}>{moqeemStatus.status}</div>
                    <div className={`text-sm mt-1 ${moqeemStatus.color.textColor}`}>{moqeemStatus.description}</div>
                  </div>
                ) : (
                  <div className="text-neutral-500 text-sm">يرجى إدخال تاريخ انتهاء اشتراك مقيم أولاً</div>
                )}
              </div>
            </div>

            {/* عدد الموظفين الأقصى */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">عدد الموظفين الأقصى</label>
              <input type="number" name="max_employees" value={formData.max_employees} onChange={handleChange}
                className="app-input py-2.5" placeholder="أدخل عدد الموظفين الأقصى (افتراضي: 4)" disabled={loading} />
            </div>

            {/* الاعفاءات */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">الاعفاءات</label>
              <select name="exemptions" value={formData.exemptions} onChange={handleChange}
                className="app-input py-2.5" disabled={loading}>
                <option value="">اختر حالة الاعفاءات</option>
                <option value="تم الاعفاء">تم الاعفاء</option>
                <option value="لم يتم الاعفاء">لم يتم الاعفاء</option>
                <option value="أخرى">أخرى</option>
              </select>
            </div>

            {/* نوع المؤسسة */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">نوع المؤسسة</label>
              <input type="text" name="company_type" value={formData.company_type} onChange={handleChange}
                className="app-input py-2.5" placeholder="أدخل نوع المؤسسة" disabled={loading} />
            </div>
          </div>

          {/* الملاحظات */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-neutral-700 mb-2">الملاحظات</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={4}
              className="app-input min-h-[110px] resize-none py-2.5"
              placeholder="أدخل أي ملاحظات إضافية عن المؤسسة..." disabled={loading} />
          </div>

          {/* Footer */}
          <div className="app-modal-footer mt-8 flex items-center gap-4 border-t border-neutral-200 pt-6">
            <button type="submit" disabled={loading}
              className="app-button-primary flex-1 justify-center px-6 py-3">
              {loading ? (
                <><Loader2 className="h-5 w-5 animate-spin" />جاري {isEditing ? 'التحديث' : 'الإضافة'}...</>
              ) : (
                <><Building2 className="w-5 h-5" />{isEditing ? 'تحديث المؤسسة' : 'إضافة المؤسسة'}</>
              )}
            </button>
            <button type="button" onClick={props.onClose} disabled={loading}
              className="app-button-secondary flex-1 justify-center px-6 py-3">
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )

  return (
    <>
      {portal}
      <ConfirmationDialog
        isOpen={showUnsavedConfirm}
        onClose={handleUnsavedCancel}
        onConfirm={handleUnsavedConfirm}
        title="تغييرات غير محفوظة"
        message="لديك تغييرات غير محفوظة. هل تريد الخروج بدون حفظ؟"
        confirmText="خروج بدون حفظ"
        cancelText="البقاء"
        isDangerous={true}
        icon="alert"
      />
    </>
  )
}
