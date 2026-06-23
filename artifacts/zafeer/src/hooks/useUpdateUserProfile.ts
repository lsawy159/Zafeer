import { useMutation } from '@tanstack/react-query'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase, type User } from '@/lib/supabase'
import { logActivity as writeActivity } from '@/utils/logActivity'

type UpdateUserVariables = {
  id: string
  data: {
    full_name?: string
    role?: User['role']
    is_active?: boolean
    email?: string
  }
}

export function useUpdateUserProfile() {
  return useMutation({
    mutationFn: async ({ id, data }: UpdateUserVariables) => {
      const { data: result, error } = await supabase.functions.invoke('admin-users', {
        body: { id, ...data },
        headers: {
          'x-action': 'update',
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

      const updatedUser = (result as { user: User }).user
      try {
        await writeActivity({
          entity_type: 'user',
          entity_id: id,
          action: 'تحديث مستخدم',
          details: {
            user_name: updatedUser.full_name,
            user_email: updatedUser.email,
            user_role: updatedUser.role,
          },
        })
      } catch { /* non-blocking */ }
      return { user: updatedUser }
    },
  })
}
