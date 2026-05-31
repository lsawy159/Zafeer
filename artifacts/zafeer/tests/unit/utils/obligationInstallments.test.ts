import { describe, it, expect } from 'vitest'
import { distributeRemainingAmount } from '@/utils/obligationInstallments'

describe('distributeRemainingAmount', () => {
  // ─── توزيع متساوٍ ───────────────────────────────────────────────────────────

  it('يوزع بالتساوي على 3 أقساط (300 ÷ 3)', () => {
    const result = distributeRemainingAmount(300, 3)
    expect(result).toEqual([100, 100, 100])
  })

  it('يوزع بالتساوي على قسط واحد', () => {
    expect(distributeRemainingAmount(500, 1)).toEqual([500])
  })

  it('يوزع صفر على أي عدد → كلهم أصفار', () => {
    expect(distributeRemainingAmount(0, 3)).toEqual([0, 0, 0])
  })

  // ─── فارق الهللات — القسط الأخير يمتص الفارق ─────────────────────────────

  it('100 ÷ 3 → القسط الأخير يمتص الهللة الزائدة', () => {
    const result = distributeRemainingAmount(100, 3)
    // 100 * 100 = 10000 هللة ÷ 3 = 3333 base
    // [33.33, 33.33, 33.34]
    expect(result[0]).toBe(33.33)
    expect(result[1]).toBe(33.33)
    expect(result[2]).toBe(33.34)
  })

  it('مجموع الأقساط === المبلغ الأصلي دائماً (بدون فارق تقريب)', () => {
    const amounts = [100, 7, 99.99, 1000.01, 0.01]
    const counts = [3, 7, 4, 9, 1]
    for (let i = 0; i < amounts.length; i++) {
      const result = distributeRemainingAmount(amounts[i], counts[i])
      const sum = result.reduce((a, b) => a + b, 0)
      // مقارنة بدقة هللة واحدة (0.01)
      expect(Math.abs(sum - amounts[i])).toBeLessThanOrEqual(0.01)
    }
  })

  it('مجموع الأقساط === المبلغ بالضبط لأرقام قابلة للقسمة', () => {
    const result = distributeRemainingAmount(600, 4)
    const sum = result.reduce((a, b) => a + b, 0)
    expect(sum).toBe(600)
  })

  it('1 هللة (0.01) ÷ 3 → [0, 0, 0.01]', () => {
    const result = distributeRemainingAmount(0.01, 3)
    // 1 هللة ÷ 3 = 0 base, الأخير يمتص الـ 1 هللة
    expect(result[0]).toBe(0)
    expect(result[1]).toBe(0)
    expect(result[2]).toBe(0.01)
  })

  // ─── حالات الحد ────────────────────────────────────────────────────────────

  it('unpaidCount = 0 → مصفوفة فارغة', () => {
    expect(distributeRemainingAmount(500, 0)).toEqual([])
  })

  it('يرمي خطأ إذا كان المبلغ سالباً', () => {
    expect(() => distributeRemainingAmount(-100, 3)).toThrow('أقل مما تم سداده')
  })

  it('2 قسط متبقي', () => {
    const result = distributeRemainingAmount(99.99, 2)
    expect(result).toHaveLength(2)
    const sum = result[0] + result[1]
    expect(Math.abs(sum - 99.99)).toBeLessThanOrEqual(0.01)
  })

  it('مبالغ كبيرة (10,000 SAR ÷ 7)', () => {
    const result = distributeRemainingAmount(10000, 7)
    expect(result).toHaveLength(7)
    const sum = result.reduce((a, b) => a + b, 0)
    expect(Math.abs(sum - 10000)).toBeLessThanOrEqual(0.01)
  })
})
