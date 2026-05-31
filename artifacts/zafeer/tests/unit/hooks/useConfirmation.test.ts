import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useConfirmation } from '@/hooks/useConfirmation'

describe('useConfirmation', () => {
  it('initial state: dialog closed with defaults', () => {
    const { result } = renderHook(() => useConfirmation())

    expect(result.current.isOpen).toBe(false)
    expect(result.current.title).toBe('')
    expect(result.current.message).toBe('')
    expect(result.current.confirmText).toBe('تأكيد')
    expect(result.current.cancelText).toBe('إلغاء')
    expect(result.current.isDangerous).toBe(false)
    expect(result.current.icon).toBe('question')
  })

  it('confirm() opens dialog with provided options', async () => {
    const { result } = renderHook(() => useConfirmation())

    act(() => {
      result.current.confirm({
        title: 'حذف العنصر',
        message: 'هل أنت متأكد؟',
        confirmText: 'حذف',
        isDangerous: true,
        icon: 'alert',
      })
    })

    expect(result.current.isOpen).toBe(true)
    expect(result.current.title).toBe('حذف العنصر')
    expect(result.current.message).toBe('هل أنت متأكد؟')
    expect(result.current.confirmText).toBe('حذف')
    expect(result.current.isDangerous).toBe(true)
    expect(result.current.icon).toBe('alert')
  })

  it('confirm() uses default confirmText when not provided', () => {
    const { result } = renderHook(() => useConfirmation())

    act(() => {
      result.current.confirm({ title: 'عنوان', message: 'رسالة' })
    })

    expect(result.current.confirmText).toBe('تأكيد')
    expect(result.current.cancelText).toBe('إلغاء')
  })

  it('onConfirm() resolves promise with true and closes dialog', async () => {
    const { result } = renderHook(() => useConfirmation())

    let resolvedValue: boolean | undefined

    act(() => {
      result.current
        .confirm({ title: 'تأكيد', message: 'هل تريد المتابعة؟' })
        .then((v) => { resolvedValue = v })
    })

    expect(result.current.isOpen).toBe(true)

    act(() => {
      result.current.onConfirm()
    })

    // Promise should have resolved
    await act(async () => { await Promise.resolve() })

    expect(resolvedValue).toBe(true)
    expect(result.current.isOpen).toBe(false)
  })

  it('close() closes dialog without resolving to true', () => {
    const { result } = renderHook(() => useConfirmation())

    act(() => {
      result.current.confirm({ title: 'test', message: 'test' })
    })
    expect(result.current.isOpen).toBe(true)

    act(() => {
      result.current.close()
    })
    expect(result.current.isOpen).toBe(false)
  })

  it('confirm() returns Promise', () => {
    const { result } = renderHook(() => useConfirmation())
    let promise: Promise<boolean> | undefined

    act(() => {
      promise = result.current.confirm({ title: 'T', message: 'M' })
    })

    expect(promise).toBeInstanceOf(Promise)
    // Prevent unhandled rejection
    promise?.catch(() => {})
  })
})
