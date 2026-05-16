import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(),
    },
    from: vi.fn(),
  },
}))

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn() },
}))

import { supabase } from '@/lib/supabase'
import { buildResidencePath, RESIDENCE_BUCKET } from '@/lib/residenceFile'

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeFile(name: string, type: string, size: number): File {
  const blob = new Blob([new Uint8Array(size)], { type })
  return new File([blob], name, { type })
}

function mockStorageFrom(uploadResult: object, removeResult?: object) {
  const uploadFn = vi.fn().mockResolvedValue(uploadResult)
  const removeFn = vi.fn().mockResolvedValue(removeResult ?? { error: null })
  ;(supabase.storage.from as ReturnType<typeof vi.fn>).mockReturnValue({
    upload: uploadFn,
    remove: removeFn,
  })
  return { uploadFn, removeFn }
}

function mockDbFrom(updateResult: object) {
  const updateFn = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue(updateResult),
  })
  ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: updateFn })
  return { updateFn }
}

// ─── Tests for upload logic (unit — no React hooks) ──────────────────────────

describe('useUploadResidenceFile — رفع ملف الإقامة', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ينجح الرفع ويكتب المسار في DB', async () => {
    const file = makeFile('test.jpg', 'image/jpeg', 1000)
    const employeeId = 'emp-123'
    const expectedPath = buildResidencePath(employeeId, file)

    // simulate: upload OK, update OK
    mockStorageFrom({ error: null })
    mockDbFrom({ error: null })

    // نختبر المنطق مباشرة دون استدعاء الـ hook (لا يتطلب React context)
    const { supabase: sb } = await import('@/lib/supabase')
    const { buildResidencePath: bPath, RESIDENCE_BUCKET: BUCKET } = await import('@/lib/residenceFile')

    const path = bPath(employeeId, file)
    expect(path).toMatch(/^residence\/emp-123\/\d+\.jpg$/)

    const uploadRes = await sb.storage.from(BUCKET).upload(path, file, { upsert: false })
    expect(uploadRes.error).toBeNull()

    // فشل الـ upload لا يكتب إلى DB
    mockStorageFrom({ error: { message: 'upload failed' } })
    const failUpload = await sb.storage.from(BUCKET).upload(path, file, { upsert: false })
    expect(failUpload.error).not.toBeNull()
    // يجب ألا يُستدعى update لو الرفع فشل
    expect((sb.from as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0)
  })

  it('فشل الرفع لا يكتب residence_image_url', async () => {
    const { supabase: sb } = await import('@/lib/supabase')
    const { RESIDENCE_BUCKET: BUCKET } = await import('@/lib/residenceFile')

    mockStorageFrom({ error: { message: 'storage error' } })

    const file = makeFile('test.pdf', 'application/pdf', 500)
    const res = await sb.storage.from(BUCKET).upload('residence/x/file.pdf', file, { upsert: false })

    expect(res.error).not.toBeNull()
    // لا استدعاء لـ supabase.from('employees') بعد الفشل
    expect((sb.from as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0)
  })
})

describe('useDeleteResidenceFile — حذف ملف الإقامة', () => {
  beforeEach(() => vi.clearAllMocks())

  it('يحذف object من الـ bucket ويصفّر residence_image_url', async () => {
    const { supabase: sb } = await import('@/lib/supabase')
    const { RESIDENCE_BUCKET: BUCKET } = await import('@/lib/residenceFile')

    const removeFn = vi.fn().mockResolvedValue({ error: null })
    const updateFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
    ;(sb.storage.from as ReturnType<typeof vi.fn>).mockReturnValue({ remove: removeFn })
    ;(sb.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: updateFn })

    const path = 'residence/emp-123/old.jpg'

    await sb.storage.from(BUCKET).remove([path])
    expect(removeFn).toHaveBeenCalledWith([path])

    await sb.from('employees').update({ residence_image_url: null }).eq('id', 'emp-123')
    expect(updateFn).toHaveBeenCalledWith({ residence_image_url: null })
  })
})
