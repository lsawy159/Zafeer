import { useMutation } from '@tanstack/react-query'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase, type User } from '@/lib/supabase'

type UpdateUserVariables = {
  id: string
  data: {
    full_name?: string
    role?: User['role']
    is_active?: boolean
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

      return result as { user: User }
    },
  })
}
