import { useEffect } from 'react'

/**
 * يقفل التمرير في الـ body عند فتح المودال ويعيده عند الإغلاق.
 * يحفظ القيمة الأصلية مرة واحدة فقط عند فتح أول مودال،
 * ويعيدها عند إغلاق آخر مودال مفتوح — يتعامل مع المودالات المتداخلة بشكل صحيح.
 */
let lockCount = 0
let savedOverflow = ''

export function useModalScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return

    if (lockCount === 0) {
      savedOverflow = document.body.style.overflow
    }
    lockCount++
    document.body.style.overflow = 'hidden'

    return () => {
      lockCount = Math.max(0, lockCount - 1)
      if (lockCount === 0) {
        document.body.style.overflow = savedOverflow
        savedOverflow = ''
      }
    }
  }, [isOpen])
}
