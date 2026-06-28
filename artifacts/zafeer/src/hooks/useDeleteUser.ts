import { useMutation } from '@tanstack/react-query'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { logActivity as writeActivity } from '@/utils/logActivity'

type DeleteUserVariables = {
  id: string
  /** بيانات اختيارية لسجل النشاط */
  full_name?: string
  email?: string
}

export function useDeleteUser() {
  return useMutation({
    mutationFn: async ({ id, full_name, email }: DeleteUserVariables) => {
      const { data: result, error } = await supabase.functions.invoke('admin-users', {
        body: { id },
        headers: {
          'x-action': 'delete',
        },
      })

      if (error) {
        let message: string = error.message
        if (error instanceof FunctionsHttpError) {
          try {
            const body = await error.context.json()
            if (typeof body?.error === 'string') message = body.error
          } catch { /* keep generic message */ }
        }
        throw new Error(message)
      }

      if (result?.error) {
        throw new Error(result.error)
      }

      // تسجيل النشاط — غير معيق
      try {
        await writeActivity({
          entity_type: 'user',
          entity_id: id,
          action: 'حذف مستخدم',
          details: {
            user_name: full_name,
            user_email: email,
          },
        })
      } catch { /* non-blocking */ }

      return { success: true }
    },
  })
}
