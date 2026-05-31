/**
 * توزيع مبلغ متبقي على عدد أقساط — دقة الهللة
 *
 * الخوارزمية:
 * 1. تحويل المبلغ إلى هللات (× 100) لتجنب أخطاء الفاصلة العائمة
 * 2. توزيع القسط الأساسي (floor) على كل قسط
 * 3. القسط الأخير يمتص الفارق — يضمن أن المجموع === إجمالي المبلغ بالضبط
 *
 * @throws إذا كان newRemaining < 0
 */
export function distributeRemainingAmount(
  newRemaining: number,
  unpaidCount: number
): number[] {
  if (newRemaining < 0) throw new Error('المبلغ الجديد أقل مما تم سداده بالفعل')
  if (unpaidCount <= 0) return []

  const baseHalalas = Math.floor((newRemaining * 100) / unpaidCount)
  const amounts: number[] = []
  let distributedHalalas = 0

  for (let i = 0; i < unpaidCount; i++) {
    const isLast = i === unpaidCount - 1
    const amtHalalas = isLast
      ? Math.round(newRemaining * 100) - distributedHalalas
      : baseHalalas
    distributedHalalas += amtHalalas
    amounts.push(amtHalalas / 100)
  }

  return amounts
}
