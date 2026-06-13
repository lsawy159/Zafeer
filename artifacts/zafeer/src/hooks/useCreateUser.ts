import { useMutation } from '@tanstack/react-query'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase, type User } from '@/lib/supabase'

type CreateUserVariables = {
  data: {
    full_name: string
    email: string
    password: string
    role: User['role']
  }
}

export function useCreateUser() {
  return useMutation({
    mutationFn: async ({ data }: CreateUserVariables) => {
      const { data: result, error } = await supabase.functions.invoke('admin-users', {
        body: data,
        headers: {
          'x-action': 'create',
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

      const createdUser = (result as { user: User }).user
      try {
        await supabase.from('activity_log').insert({
          entity_type: 'user',
          entity_id: createdUser.id,
          action: 'إنشاء مستخدم',
          details: {
            user_name: createdUser.full_name,
            user_email: createdUser.email,
            user_role: createdUser.role,
          },
        })
      } catch { /* non-blocking */ }
      return { user: createdUser }
    },
  })
}
