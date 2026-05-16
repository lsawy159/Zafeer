import { describe, expect, it } from 'vitest'
import {
  buildResidencePath,
  isLegacyExternalUrl,
  RESIDENCE_MAX_BYTES,
  residenceKindFromPath,
  validateResidenceFile,
} from './residenceFile'

function makeFile(name: string, type: string, size: number): File {
  const blob = new Blob([new Uint8Array(size)], { type })
  return new File([blob], name, { type })
}

describe('validateResidenceFile', () => {
  it('يرفض ملفاً فارغاً (0 بايت)', () => {
    const result = validateResidenceFile(makeFile('test.jpg', 'image/jpeg', 0))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.messageAr).toMatch(/فارغ/)
  })

  it('يرفض ملفاً يتجاوز 500 KB', () => {
    const result = validateResidenceFile(makeFile('big.jpg', 'image/jpeg', RESIDENCE_MAX_BYTES + 1))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.messageAr).toMatch(/500/)
  })

  it('يقبل ملفاً بحجم 500 KB بالضبط (الحد شامل)', () => {
    const result = validateResidenceFile(makeFile('exact.jpg', 'image/jpeg', RESIDENCE_MAX_BYTES))
    expect(result.ok).toBe(true)
  })

  it('يرفض ملف Word', () => {
    const result = validateResidenceFile(
      makeFile('doc.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 100)
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.messageAr).toMatch(/صورة|PDF/)
  })

  it('يرفض ملف نصي', () => {
    const result = validateResidenceFile(makeFile('file.txt', 'text/plain', 100))
    expect(result.ok).toBe(false)
  })

  it('يقبل JPEG', () => {
    expect(validateResidenceFile(makeFile('a.jpg', 'image/jpeg', 1000)).ok).toBe(true)
  })

  it('يقبل PNG', () => {
    expect(validateResidenceFile(makeFile('a.png', 'image/png', 1000)).ok).toBe(true)
  })

  it('يقبل WebP', () => {
    expect(validateResidenceFile(makeFile('a.webp', 'image/webp', 1000)).ok).toBe(true)
  })

  it('يقبل PDF', () => {
    expect(validateResidenceFile(makeFile('a.pdf', 'application/pdf', 1000)).ok).toBe(true)
  })
})

describe('residenceKindFromPath', () => {
  it('يُرجع pdf لملفات PDF', () => {
    expect(residenceKindFromPath('residence/123/file.pdf')).toBe('pdf')
  })

  it('يُرجع image لملفات jpg', () => {
    expect(residenceKindFromPath('residence/123/file.jpg')).toBe('image')
  })

  it('يُرجع image لملفات jpeg', () => {
    expect(residenceKindFromPath('residence/123/file.jpeg')).toBe('image')
  })

  it('يُرجع image لملفات png', () => {
    expect(residenceKindFromPath('residence/123/file.png')).toBe('image')
  })

  it('يُرجع image لملفات webp', () => {
    expect(residenceKindFromPath('residence/123/file.webp')).toBe('image')
  })

  it('يُرجع null لامتداد غير معروف', () => {
    expect(residenceKindFromPath('residence/123/file.docx')).toBeNull()
  })
})

describe('isLegacyExternalUrl', () => {
  it('يُرجع true لـ http', () => {
    expect(isLegacyExternalUrl('http://example.com/img.jpg')).toBe(true)
  })

  it('يُرجع true لـ https', () => {
    expect(isLegacyExternalUrl('https://example.com/img.jpg')).toBe(true)
  })

  it('يُرجع false لمسار storage', () => {
    expect(isLegacyExternalUrl('residence/uuid/123.jpg')).toBe(false)
  })
})

describe('buildResidencePath', () => {
  it('يبني المسار بصيغة residence/{id}/{ts}.{ext}', () => {
    const file = makeFile('photo.jpg', 'image/jpeg', 100)
    const path = buildResidencePath('emp-id-123', file)
    expect(path).toMatch(/^residence\/emp-id-123\/\d+\.jpg$/)
  })
})
