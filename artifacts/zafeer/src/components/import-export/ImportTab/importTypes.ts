export interface ValidationError {
  row: number
  field: string
  message: string
  severity: 'error' | 'warning'
}

export interface ImportResult {
  total: number
  success: number
  failed: number
  errors: ValidationError[]
}

export interface ImportTabProps {
  initialImportType?: 'employees' | 'companies'
  onImportSuccess?: () => void
  isInModal?: boolean
}

// ترتيب الأعمدة المطلوب لعرض بيانات الموظفين
export const EMPLOYEE_COLUMNS_ORDER = [
  'الاسم',
  'المهنة',
  'الجنسية',
  'رقم الإقامة',
  'رقم الجواز',
  'رقم الهاتف',
  'الحساب البنكي',
  'اسم البنك',
  'الراتب',
  'حالة عقد أجير',
  'المشروع',
  'الشركة أو المؤسسة',
  'الرقم الموحد',
  'تاريخ الميلاد',
  'تاريخ الالتحاق',
  'تاريخ انتهاء الإقامة',
  'تاريخ انتهاء العقد',
  'تاريخ انتهاء عقد أجير',
  'تاريخ انتهاء التأمين الصحي',
  'الملاحظات',
]

// ترتيب الأعمدة المطلوب لعرض بيانات المؤسسات
export const COMPANY_COLUMNS_ORDER = [
  'اسم المؤسسة',
  'الرقم الموحد',
  'رقم اشتراك التأمينات الاجتماعية',
  'رقم اشتراك قوى',
  'تاريخ انتهاء السجل التجاري',
  'تاريخ انتهاء اشتراك قوى',
  'تاريخ انتهاء اشتراك مقيم',
  'الاعفاءات',
  'نوع المؤسسة',
  'الملاحظات',
]
