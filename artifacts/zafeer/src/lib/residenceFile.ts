export const RESIDENCE_MAX_BYTES = 512000 // 500 KB شامل

export const RESIDENCE_ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const

export const RESIDENCE_BUCKET = 'employee-documents'

export type ResidenceFileKind = 'image' | 'pdf'

export type ResidenceValidation =
  | { ok: true }
  | { ok: false; messageAr: string }

export function validateResidenceFile(file: File): ResidenceValidation {
  if (file.size === 0) {
    return { ok: false, messageAr: 'الملف فارغ' }
  }
  if (file.size > RESIDENCE_MAX_BYTES) {
    return { ok: false, messageAr: 'حجم الملف يجب ألا يتجاوز 500 كيلوبايت' }
  }
  if (!(RESIDENCE_ALLOWED_MIME as readonly string[]).includes(file.type)) {
    return { ok: false, messageAr: 'الملف يجب أن يكون صورة (JPEG، PNG، WebP) أو PDF' }
  }
  return { ok: true }
}

export function residenceKindFromPath(path: string): ResidenceFileKind | null {
  const ext = path.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return 'pdf'
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp') return 'image'
  return null
}

export function isLegacyExternalUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://')
}

export function buildResidencePath(employeeId: string, file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  return `residence/${employeeId}/${Date.now()}.${ext}`
}

export function buildResidenceThumbnailPath(employeeId: string, file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  return `residence/${employeeId}/${Date.now()}_thumb.${ext}`
}
