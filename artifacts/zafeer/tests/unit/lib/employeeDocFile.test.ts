import { describe, expect, it } from 'vitest'
import {
  buildEmployeeDocPath,
  EMPLOYEE_DOC_TYPES,
  isLegacyExternalUrl,
  EMPLOYEE_DOC_MAX_BYTES,
  residenceKindFromPath,
  validateEmployeeDocFile,
} from '@/lib/employeeDocFile'

function makeFile(name: string, type: string, size: number): File {
  const blob = new Blob([new Uint8Array(size)], { type })
  return new File([blob], name, { type })
}

describe('validateEmployeeDocFile', () => {
  it('يرفض ملفاً فارغاً (0 بايت)', () => {
    const result = validateEmployeeDocFile(makeFile('test.jpg', 'image/jpeg', 0))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.messageAr).toMatch(/فارغ/)
  })

  it('يرفض ملفاً يتجاوز 500 KB', () => {
    const result = validateEmployeeDocFile(makeFile('big.jpg', 'image/jpeg', EMPLOYEE_DOC_MAX_BYTES + 1))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.messageAr).toMatch(/500/)
  })

  it('يقبل ملفاً بحجم 500 KB بالضبط (الحد شامل)', () => {
    const result = validateEmployeeDocFile(makeFile('exact.jpg', 'image/jpeg', EMPLOYEE_DOC_MAX_BYTES))
    expect(result.ok).toBe(true)
  })

  it('يرفض ملف Word', () => {
    const result = validateEmployeeDocFile(
      makeFile('doc.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 100)
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.messageAr).toMatch(/صورة|PDF/)
  })

  it('يرفض ملف نصي', () => {
    const result = validateEmployeeDocFile(makeFile('file.txt', 'text/plain', 100))
    expect(result.ok).toBe(false)
  })

  it('يقبل JPEG', () => {
    expect(validateEmployeeDocFile(makeFile('a.jpg', 'image/jpeg', 1000)).ok).toBe(true)
  })

  it('يقبل PNG', () => {
    expect(validateEmployeeDocFile(makeFile('a.png', 'image/png', 1000)).ok).toBe(true)
  })

  it('يقبل WebP', () => {
    expect(validateEmployeeDocFile(makeFile('a.webp', 'image/webp', 1000)).ok).toBe(true)
  })

  it('يقبل PDF', () => {
    expect(validateEmployeeDocFile(makeFile('a.pdf', 'application/pdf', 1000)).ok).toBe(true)
  })
})

describe('residenceKindFromPath (re-export from employeeDocFile)', () => {
  it('يُرجع pdf لملفات PDF', () => {
    expect(residenceKindFromPath('health-certificate/123/file.pdf')).toBe('pdf')
  })

  it('يُرجع image لملفات jpg', () => {
    expect(residenceKindFromPath('ajeer-contract/123/file.jpg')).toBe('image')
  })

  it('يُرجع image لملفات jpeg', () => {
    expect(residenceKindFromPath('health-certificate/123/file.jpeg')).toBe('image')
  })

  it('يُرجع image لملفات png', () => {
    expect(residenceKindFromPath('health-certificate/123/file.png')).toBe('image')
  })

  it('يُرجع image لملفات webp', () => {
    expect(residenceKindFromPath('ajeer-contract/123/file.webp')).toBe('image')
  })

  it('يُرجع null لامتداد غير معروف', () => {
    expect(residenceKindFromPath('health-certificate/123/file.docx')).toBeNull()
  })
})

describe('isLegacyExternalUrl (re-export from employeeDocFile)', () => {
  it('يُرجع true لـ http', () => {
    expect(isLegacyExternalUrl('http://example.com/cert.jpg')).toBe(true)
  })

  it('يُرجع true لـ https', () => {
    expect(isLegacyExternalUrl('https://example.com/cert.pdf')).toBe(true)
  })

  it('يُرجع false لمسار storage', () => {
    expect(isLegacyExternalUrl('health-certificate/uuid/123.pdf')).toBe(false)
  })
})

describe('buildEmployeeDocPath', () => {
  it('يبني مسار الشهادة الصحية بصيغة health-certificate/{id}/{ts}.{ext}', () => {
    const file = makeFile('cert.pdf', 'application/pdf', 100)
    const path = buildEmployeeDocPath(EMPLOYEE_DOC_TYPES.health.folder, 'emp-id-123', file)
    expect(path).toMatch(/^health-certificate\/emp-id-123\/\d+\.pdf$/)
  })

  it('يبني مسار عقد الأجير بصيغة ajeer-contract/{id}/{ts}.{ext}', () => {
    const file = makeFile('contract.jpg', 'image/jpeg', 100)
    const path = buildEmployeeDocPath(EMPLOYEE_DOC_TYPES.ajeer.folder, 'emp-id-456', file)
    expect(path).toMatch(/^ajeer-contract\/emp-id-456\/\d+\.jpg$/)
  })

  it('يستخدم امتداد اسم الملف إذا كان بدون نقطة', () => {
    // اسم الملف بدون نقطة: split('.').pop() يُرجع الاسم كاملاً
    const file = makeFile('noext', 'application/pdf', 100)
    const path = buildEmployeeDocPath(EMPLOYEE_DOC_TYPES.health.folder, 'emp-1', file)
    // نتحقق فقط من بنية المسار
    expect(path).toMatch(/^health-certificate\/emp-1\/\d+\./)
  })
})

describe('EMPLOYEE_DOC_TYPES', () => {
  it('health.column يساوي health_certificate_url', () => {
    expect(EMPLOYEE_DOC_TYPES.health.column).toBe('health_certificate_url')
  })

  it('ajeer.column يساوي ajeer_contract_url', () => {
    expect(EMPLOYEE_DOC_TYPES.ajeer.column).toBe('ajeer_contract_url')
  })

  it('health.labelAr يساوي الشهادة الصحية', () => {
    expect(EMPLOYEE_DOC_TYPES.health.labelAr).toBe('الشهادة الصحية')
  })

  it('ajeer.labelAr يساوي عقد الأجير', () => {
    expect(EMPLOYEE_DOC_TYPES.ajeer.labelAr).toBe('عقد الأجير')
  })

  it('health.exportHeaderAr يساوي رابط ملف الشهادة الصحية', () => {
    expect(EMPLOYEE_DOC_TYPES.health.exportHeaderAr).toBe('رابط ملف الشهادة الصحية')
  })

  it('ajeer.exportHeaderAr يساوي رابط ملف عقد الأجير', () => {
    expect(EMPLOYEE_DOC_TYPES.ajeer.exportHeaderAr).toBe('رابط ملف عقد الأجير')
  })
})
