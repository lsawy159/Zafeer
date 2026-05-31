import { describe, it, expect } from 'vitest'
import { normalizeArabic } from '@/utils/textUtils'

describe('normalizeArabic', () => {
  it('null → empty string', () => expect(normalizeArabic(null)).toBe(''))
  it('undefined → empty string', () => expect(normalizeArabic(undefined)).toBe(''))
  it('empty string → empty string', () => expect(normalizeArabic('')).toBe(''))

  it('removes tashkeel (diacritics)', () => {
    // محمَّد → محمد
    expect(normalizeArabic('محمَّد')).toBe('محمد')
  })

  it('normalizes alef variants to bare alef (ا)', () => {
    // أحمد، إبراهيم، آدم → احمد، ابراهيم، ادم
    expect(normalizeArabic('أحمد')).toBe('احمد')
    expect(normalizeArabic('إبراهيم')).toBe('ابراهيم')
    expect(normalizeArabic('آدم')).toBe('ادم')
  })

  it('normalizes ta marbuta (ة) to ha (ه)', () => {
    // فاطمة → فاطمه
    expect(normalizeArabic('فاطمة')).toBe('فاطمه')
  })

  it('normalizes alef maqsura (ى) to ya (ي)', () => {
    // موسى → موسي
    expect(normalizeArabic('موسى')).toBe('موسي')
  })

  it('trims leading/trailing whitespace', () => {
    expect(normalizeArabic('  محمد  ')).toBe('محمد')
  })

  it('leaves plain Arabic without special chars unchanged', () => {
    expect(normalizeArabic('محمد')).toBe('محمد')
  })

  it('handles mixed normalization: alef + tashkeel + ta marbuta', () => {
    // أسامةُ → اسامه
    expect(normalizeArabic('أسامةُ')).toBe('اسامه')
  })

  it('two strings differing only in alef variant become equal after normalize', () => {
    const a = normalizeArabic('أحمد')
    const b = normalizeArabic('احمد')
    expect(a).toBe(b)
  })

  it('two strings differing only in ta marbuta become equal after normalize', () => {
    expect(normalizeArabic('فاطمة')).toBe(normalizeArabic('فاطمه'))
  })

  it('non-Arabic chars pass through unchanged', () => {
    expect(normalizeArabic('abc123')).toBe('abc123')
  })
})
