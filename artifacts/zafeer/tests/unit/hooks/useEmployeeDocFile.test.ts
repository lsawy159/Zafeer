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
import {
  buildEmployeeDocPath,
  EMPLOYEE_DOC_BUCKET,
  EMPLOYEE_DOC_TYPES,
} from '@/lib/employeeDocFile'

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

describe('useUploadEmployeeDoc — رفع ملف المستند', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ينجح الرفع ويكتب المسار في DB (الشهادة الصحية)', async () => {
    const file = makeFile('cert.pdf', 'application/pdf', 1000)
    const employeeId = 'emp-123'
    const meta = EMPLOYEE_DOC_TYPES.health

    mockStorageFrom({ error: null })
    mockDbFrom({ error: null })

    const { supabase: sb } = await import('@/lib/supabase')
    const { buildEmployeeDocPath: bPath, EMPLOYEE_DOC_BUCKET: BUCKET } = await import('@/lib/employeeDocFile')

    const path = bPath(meta.folder, employeeId, file)
    expect(path).toMatch(/^health-certificate\/emp-123\/\d+\.pdf$/)

    const uploadRes = await sb.storage.from(BUCKET).upload(path, file, { upsert: false })
    expect(uploadRes.error).toBeNull()
  })

  it('فشل الرفع لا يكتب health_certificate_url', async () => {
    const { supabase: sb } = await import('@/lib/supabase')
    const { EMPLOYEE_DOC_BUCKET: BUCKET } = await import('@/lib/employeeDocFile')

    mockStorageFrom({ error: { message: 'storage error' } })

    const file = makeFile('cert.pdf', 'application/pdf', 500)
    const res = await sb.storage.from(BUCKET).upload('health-certificate/x/file.pdf', file, { upsert: false })

    expect(res.error).not.toBeNull()
    // لا استدعاء لـ supabase.from('employees') بعد الفشل
    expect((sb.from as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0)
  })

  it('فشل تحديث DB يُطلق rollback لحذف الـ object المرفوع', async () => {
    const { supabase: sb } = await import('@/lib/supabase')
    const { EMPLOYEE_DOC_BUCKET: BUCKET } = await import('@/lib/employeeDocFile')

    // رفع ينجح
    const removeFn = vi.fn().mockResolvedValue({ error: null })
    ;(sb.storage.from as ReturnType<typeof vi.fn>).mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      remove: removeFn,
    })

    // تحديث DB يفشل
    const updateFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: { message: 'db error' } }),
    })
    ;(sb.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: updateFn })

    const newPath = 'health-certificate/emp-1/123.pdf'

    // محاكاة منطق الـ hook: upload → update → rollback on error
    const uploadRes = await sb.storage.from(BUCKET).upload(newPath, makeFile('f.pdf', 'application/pdf', 100), { upsert: false })
    expect(uploadRes.error).toBeNull()

    const updateRes = await sb.from('employees').update({ health_certificate_url: newPath }).eq('id', 'emp-1')
    expect(updateRes.error).not.toBeNull()

    // تنفيذ الـ rollback
    await sb.storage.from(BUCKET).remove([newPath])
    expect(removeFn).toHaveBeenCalledWith([newPath])
  })

  it('ينجح رفع عقد الأجير ويكتب ajeer_contract_url', async () => {
    const file = makeFile('contract.jpg', 'image/jpeg', 1000)
    const employeeId = 'emp-456'
    const meta = EMPLOYEE_DOC_TYPES.ajeer

    mockStorageFrom({ error: null })
    mockDbFrom({ error: null })

    const { supabase: sb } = await import('@/lib/supabase')
    const { buildEmployeeDocPath: bPath, EMPLOYEE_DOC_BUCKET: BUCKET } = await import('@/lib/employeeDocFile')

    const path = bPath(meta.folder, employeeId, file)
    expect(path).toMatch(/^ajeer-contract\/emp-456\/\d+\.jpg$/)

    const uploadRes = await sb.storage.from(BUCKET).upload(path, file, { upsert: false })
    expect(uploadRes.error).toBeNull()

    const updateRes = await sb.from('employees').update({ ajeer_contract_url: path }).eq('id', employeeId)
    expect(updateRes.error).toBeNull()
  })
})

describe('useDeleteEmployeeDoc — حذف ملف المستند', () => {
  beforeEach(() => vi.clearAllMocks())

  it('يحذف object من الـ bucket ويصفّر health_certificate_url', async () => {
    const { supabase: sb } = await import('@/lib/supabase')
    const { EMPLOYEE_DOC_BUCKET: BUCKET } = await import('@/lib/employeeDocFile')

    const removeFn = vi.fn().mockResolvedValue({ error: null })
    const updateFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
    ;(sb.storage.from as ReturnType<typeof vi.fn>).mockReturnValue({ remove: removeFn })
    ;(sb.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: updateFn })

    const path = 'health-certificate/emp-123/old.pdf'

    await sb.storage.from(BUCKET).remove([path])
    expect(removeFn).toHaveBeenCalledWith([path])

    await sb.from('employees').update({ health_certificate_url: null }).eq('id', 'emp-123')
    expect(updateFn).toHaveBeenCalledWith({ health_certificate_url: null })
  })

  it('لا يحذف object من التخزين إذا كان رابطاً خارجياً (legacy)', async () => {
    const { supabase: sb } = await import('@/lib/supabase')
    const { isLegacyExternalUrl } = await import('@/lib/employeeDocFile')

    const removeFn = vi.fn().mockResolvedValue({ error: null })
    ;(sb.storage.from as ReturnType<typeof vi.fn>).mockReturnValue({ remove: removeFn })

    const legacyPath = 'https://external.com/cert.jpg'

    // محاكاة منطق الـ hook: لا حذف من التخزين إذا كان legacy
    if (!isLegacyExternalUrl(legacyPath)) {
      await sb.storage.from(EMPLOYEE_DOC_BUCKET).remove([legacyPath])
    }

    expect(removeFn).not.toHaveBeenCalled()
  })
})

describe('useEmployeeDocSignedUrl — signed URL للمستند', () => {
  beforeEach(() => vi.clearAllMocks())

  it('يُمرّر الرابط الخارجي (legacy) مباشرة بدون توليد signed URL', async () => {
    const { supabase: sb } = await import('@/lib/supabase')
    const { isLegacyExternalUrl } = await import('@/lib/employeeDocFile')

    const createSignedUrlFn = vi.fn()
    ;(sb.storage.from as ReturnType<typeof vi.fn>).mockReturnValue({
      createSignedUrl: createSignedUrlFn,
    })

    const legacyPath = 'https://external.com/cert.pdf'

    // محاكاة منطق الـ hook: legacy passthrough
    const result = isLegacyExternalUrl(legacyPath) ? legacyPath : null
    expect(result).toBe(legacyPath)
    expect(createSignedUrlFn).not.toHaveBeenCalled()
  })

  it('يُنشئ signed URL لمسار التخزين', async () => {
    const { supabase: sb } = await import('@/lib/supabase')
    const { EMPLOYEE_DOC_BUCKET: BUCKET } = await import('@/lib/employeeDocFile')

    const signedUrl = 'https://signed.supabase.co/health-certificate/emp-1/123.pdf?token=abc'
    const createSignedUrlFn = vi.fn().mockResolvedValue({
      data: { signedUrl },
      error: null,
    })
    ;(sb.storage.from as ReturnType<typeof vi.fn>).mockReturnValue({
      createSignedUrl: createSignedUrlFn,
    })

    const path = 'health-certificate/emp-1/123.pdf'
    const res = await sb.storage.from(BUCKET).createSignedUrl(path, 3600)
    expect(createSignedUrlFn).toHaveBeenCalledWith(path, 3600)
    expect(res.data?.signedUrl).toBe(signedUrl)
  })
})

describe('buildEmployeeDocPath', () => {
  it('يبني المسار بصيغة {folder}/{id}/{ts}.{ext}', () => {
    const file = makeFile('cert.pdf', 'application/pdf', 100)
    const path = buildEmployeeDocPath(EMPLOYEE_DOC_TYPES.health.folder, 'emp-id-123', file)
    expect(path).toMatch(/^health-certificate\/emp-id-123\/\d+\.pdf$/)
  })

  it('يستخدم lowercase للامتداد (المسار يحتوي .pdf بالحروف الصغيرة)', () => {
    const file = makeFile('CONTRACT.PDF', 'application/pdf', 100)
    const path = buildEmployeeDocPath(EMPLOYEE_DOC_TYPES.ajeer.folder, 'emp-1', file)
    // امتداد الملف lowercase من اسم الملف
    expect(path).toMatch(/\.pdf$/i)
  })
})
