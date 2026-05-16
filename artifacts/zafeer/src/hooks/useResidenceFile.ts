import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import {
  RESIDENCE_BUCKET,
  buildResidencePath,
  isLegacyExternalUrl,
  validateResidenceFile,
} from '@/lib/residenceFile'
import { logger } from '@/utils/logger'

// ─── Upload / Replace ────────────────────────────────────────────────────────

export function useUploadResidenceFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      employeeId,
      file,
      oldPath,
    }: {
      employeeId: string
      file: File
      oldPath?: string
    }): Promise<string> => {
      const validation = validateResidenceFile(file)
      if (!validation.ok) throw new Error(validation.messageAr)

      const newPath = buildResidencePath(employeeId, file)

      const { error: uploadError } = await supabase.storage
        .from(RESIDENCE_BUCKET)
        .upload(newPath, file, { upsert: false })

      if (uploadError) {
        logger.error('فشل رفع ملف الإقامة:', uploadError)
        throw new Error('فشل رفع الملف، يرجى المحاولة مرة أخرى')
      }

      // كتابة المسار فقط بعد نجاح الرفع (FR-011)
      const { error: updateError } = await supabase
        .from('employees')
        .update({ residence_image_url: newPath })
        .eq('id', employeeId)

      if (updateError) {
        // تراجع: حذف الـ object المرفوع لأن السجل لم يُحدَّث
        await supabase.storage.from(RESIDENCE_BUCKET).remove([newPath])
        logger.error('فشل تحديث سجل الموظف:', updateError)
        throw new Error('فشل حفظ مرجع الملف')
      }

      // حذف الملف القديم بعد نجاح الحفظ
      if (oldPath && !isLegacyExternalUrl(oldPath)) {
        await supabase.storage.from(RESIDENCE_BUCKET).remove([oldPath])
      }

      return newPath
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      queryClient.invalidateQueries({ queryKey: ['employees-page-all'] })
      toast.success('تم رفع ملف الإقامة بنجاح')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export function useDeleteResidenceFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      employeeId,
      path,
    }: {
      employeeId: string
      path: string
    }): Promise<void> => {
      if (!isLegacyExternalUrl(path)) {
        const { error: storageError } = await supabase.storage
          .from(RESIDENCE_BUCKET)
          .remove([path])
        if (storageError) {
          logger.error('فشل حذف ملف من التخزين:', storageError)
          throw new Error('فشل حذف الملف من التخزين')
        }
      }

      const { error: updateError } = await supabase
        .from('employees')
        .update({ residence_image_url: null })
        .eq('id', employeeId)

      if (updateError) {
        logger.error('فشل تصفير مرجع الملف:', updateError)
        throw new Error('فشل تحديث سجل الموظف')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      queryClient.invalidateQueries({ queryKey: ['employees-page-all'] })
      toast.success('تم حذف ملف الإقامة')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ─── Signed URL ──────────────────────────────────────────────────────────────

export function useResidenceSignedUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ['residence-signed-url', path],
    queryFn: async (): Promise<string | null> => {
      if (!path) return null
      if (isLegacyExternalUrl(path)) return path

      const { data, error } = await supabase.storage
        .from(RESIDENCE_BUCKET)
        .createSignedUrl(path, 3600) // صلاحية ساعة واحدة

      if (error) {
        logger.error('فشل إنشاء signed URL:', error)
        return null
      }
      return data.signedUrl
    },
    enabled: !!path,
    staleTime: 50 * 60 * 1000, // تجديد قبل انتهاء الصلاحية بـ 10 دقائق
    gcTime: 60 * 60 * 1000,
  })
}
