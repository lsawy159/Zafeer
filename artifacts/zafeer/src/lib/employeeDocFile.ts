// ملفات مستندات إضافية للموظف (الشهادة الصحية + عقد الأجير)
// مرفقات مستندية فقط — لا تُستخدم لاستخراج صورة/أفاتار
export { isLegacyExternalUrl, residenceKindFromPath } from '@/lib/residenceFile'

export type EmployeeDocColumn = 'health_certificate_url' | 'ajeer_contract_url'

export const EMPLOYEE_DOC_MAX_BYTES = 512000 // 500 KB شامل
export const EMPLOYEE_DOC_ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const
export const EMPLOYEE_DOC_BUCKET = 'employee-documents'

export interface EmployeeDocMeta {
  column: EmployeeDocColumn
  folder: 'health-certificate' | 'ajeer-contract'
  labelAr: string         // 'الشهادة الصحية' | 'عقد الأجير'
  exportHeaderAr: string  // 'رابط ملف الشهادة الصحية' | 'رابط ملف عقد الأجير'
}

export const EMPLOYEE_DOC_TYPES: Record<'health' | 'ajeer', EmployeeDocMeta> = {
  health: {
    column: 'health_certificate_url',
    folder: 'health-certificate',
    labelAr: 'الشهادة الصحية',
    exportHeaderAr: 'رابط ملف الشهادة الصحية',
  },
  ajeer: {
    column: 'ajeer_contract_url',
    folder: 'ajeer-contract',
    labelAr: 'عقد الأجير',
    exportHeaderAr: 'رابط ملف عقد الأجير',
  },
}

export type EmployeeDocValidation =
  | { ok: true }
  | { ok: false; messageAr: string }

export function validateEmployeeDocFile(file: File): EmployeeDocValidation {
  if (file.size === 0) {
    return { ok: false, messageAr: 'الملف فارغ' }
  }
  if (file.size > EMPLOYEE_DOC_MAX_BYTES) {
    return { ok: false, messageAr: 'حجم الملف يجب ألا يتجاوز 500 كيلوبايت' }
  }
  if (!(EMPLOYEE_DOC_ALLOWED_MIME as readonly string[]).includes(file.type)) {
    return { ok: false, messageAr: 'الملف يجب أن يكون صورة (JPEG، PNG، WebP) أو PDF' }
  }
  return { ok: true }
}

export function buildEmployeeDocPath(
  folder: EmployeeDocMeta['folder'],
  employeeId: string,
  file: File,
): string {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  return `${folder}/${employeeId}/${Date.now()}.${ext}`
}
